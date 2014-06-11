var player = function () {
  return Agents.findOne(Session.get('player_id'));
};

var game = function () {
  var me = player();
  return me && me.game_id && Games.findOne(me.game_id);
};

var set_selected_positions = function (word) {
  var paths = paths_for_word(game().board, word.toUpperCase());
  var in_a_path = [];
  var last_in_a_path = [];

  for (var i = 0; i < paths.length; i++) {
    in_a_path = in_a_path.concat(paths[i]);
    last_in_a_path.push(paths[i].slice(-1)[0]);
  }

  for (var pos = 0; pos < 16; pos++) {
    if (last_in_a_path.indexOf(pos) !== -1)
      Session.set('selected_' + pos, 'last_in_path');
    else if (in_a_path.indexOf(pos) !== -1)
      Session.set('selected_' + pos, 'in_path');
    else
      Session.set('selected_' + pos, false);
  }
};

var clear_selected_positions = function () {
  for (var pos = 0; pos < 16; pos++)
    Session.set('selected_' + pos, false);
};

Template.page.events({
  "click #sign-in-google": function(e, tmpl){
    console.log("CLICKED GOOGLE SIGNIN.");
    Meteor.loginWithGoogle({

    }, function (err) {
      if (err){
        console.log("ERROR: " + err);//error handling
      } else {
        console.log("NO ERROR ON LOGIN");//show an alert
      }
    })
  },
  'click #logout': function () {
    console.log("LOGGING OUT");
    Meteor.logout();
  }
});

Template.page.loggedIn = function() {
  return Meteor.user() != null;
};

Template.GroupEdit.created = function() {
  console.log("CREATED");
};

Template.GroupEdit.rendered = function() {
  console.log("RENDERED");
  var editor = ace.edit("editor");
  editor.setTheme("ace/theme/monokai");
  editor.getSession().setMode("ace/mode/markdown");
  attach_ace(editor);
};

Template.GroupEdit.pageMode = function() {
  return "ViewOrEdit";
};

Template.ViewOrEdit.ancestors = function() {
  return [{name:"One"},{name:"Two"},{name:"Three"}];
};

Template.ViewOrEdit.title = function() {
  if (Session.get("document")) {
    return Session.get("document");
  } else {
    return "Please wait...";
  }
};

Template.ViewOrEdit.contentHtml = function() {
  var doc = Documents.findOne({name:Session.get("document")});
  if (doc) {
    return marked(compile(doc));
  } else {
    return "Please wait...";
  }
};

Template.GroupEdit.groupedit = function() {
/*
  console.log("CHANGE IN TEXTAREA:" + Documents.find().count());
  if (Documents.find({name:"test"}).count()>0) {
    return Documents.findOne({name: "test"}).text;
  } else {
    return "Please wait...";
  }
*/
};

Template.GroupEdit.groupeditmarkdown = function() {
/*
  console.log("CHANGE IN MARKDOWN:" + Documents.find().count());
  if (Documents.find({name:"test2"}).count()>0) {
    return marked(Documents.findOne({name: "test2"}).text);
  } else {
    return "Please wait...";
  }
*/
};

//////
////// Initialization
//////

Meteor.startup(function () {
  if (Session.get('session_id') != null) {
    if (SessionStates.findOne(Session.get('session_id')) == null) {
      // hot reload but server lost agent, remove the client's
      // context.
      Session.set('session_id',null);
    }
  }

  if (Session.get('session_id') == null) {
    console.log("CREATING SESSION");
    var sessionStateId = SessionStates.insert({userId: Meteor.userId()});
    Session.set('session_id', sessionStateId);
  }
  console.log("SESSION ID: " + Session.get('session_id'));

  if (Session.get("document") == null) {
    Session.set("document", "test2");
  }

  initAceLink();

  Deps.autorun(function () {
    Meteor.subscribe('agents_online');
  });

  Deps.autorun(function() {
    if (Meteor.userId() != null) {
      // Make sure there is a corresponding Agent
      Agents.insert({userId:Meteor.userId()});

      // Create a new SessionState with the user id.
      var sessionStateId = SessionStates.insert({userId: Meteor.userId()});
      Session.set('session_id', sessionStateId);
    }
  });

/*
  // send keepalives so the server can tell when we go away.
  //
  // XXX this is not a great idiom. meteor server does not yet have a
  // way to expose connection status to user code. Once it does, this
  // code can go away.
  Meteor.setInterval(function() {
    if (Meteor.status().connected)
      Meteor.call('keepalive', Session.get('player_id'));
  }, 20*1000);
*/
});

// Use LDAP authentication, no email signup
Accounts.ui.config({
  passwordSignupFields: 'USERNAME_ONLY'
});
// Use LDAP auth, no account creation
Accounts.config({
  forbidClientAccountCreation: true
});
