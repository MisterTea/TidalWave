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

//////
////// lobby template: shows everyone not currently playing, and
////// offers a button to start a fresh game.
//////

Template.lobby.show = function () {
  // only show lobby if we're not in a game
  return !game();
};

Template.lobby.waiting = function () {
  var players = Agents.find({_id: {$ne: Session.get('player_id')},
                              name: {$ne: ''},
                              game_id: {$exists: false}});

  return players;
};

Template.lobby.count = function () {
  var players = Agents.find({_id: {$ne: Session.get('player_id')},
                              name: {$ne: ''},
                              game_id: {$exists: false}});

  return players.count();
};

Template.lobby.disabled = function () {
  var me = player();
  if (me && me.name)
    return '';
  return 'disabled="disabled"';
};


Template.lobby.events({
  'keyup input#myname': function (evt) {
    var name = $('#lobby input#myname').val().trim();
    Agents.update(Session.get('player_id'), {$set: {name: name}});
  },
  'click button.startgame': function () {
    Meteor.call('start_new_game');
  }
});

//////
////// board template: renders the board and the clock given the
////// current game.  if there is no game, show a splash screen.
//////
var SPLASH = ['','','','',
              'W', 'O', 'R', 'D',
              'P', 'L', 'A', 'Y',
              '','','',''];

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

Template.board.square = function (i) {
  var g = game();
  return g && g.board && g.board[i] || SPLASH[i];
};

Template.board.selected = function (i) {
  return Session.get('selected_' + i);
};

Template.board.clock = function () {
  var clock = game() && game().clock;

  if (!clock || clock === 0)
    return;

  // format into M:SS
  var min = Math.floor(clock / 60);
  var sec = clock % 60;
  return min + ':' + (sec < 10 ? ('0' + sec) : sec);
};

Template.board.events({
  'click .square': function (evt) {
    var textbox = $('#scratchpad input');
    textbox.val(textbox.val() + evt.target.innerHTML);
    textbox.focus();
  }
});

Template.GroupEdit.created = function() {
  console.log("CREATED");
};

Template.GroupEdit.rendered = function() {
  console.log("RENDERED");
  Meteor.subscribe("document","test");
  var editor = ace.edit("editor");
  editor.setTheme("ace/theme/monokai");
  editor.getSession().setMode("ace/mode/javascript");
  attach_ace(editor,false);
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

Template.GroupEdit.events({
  'keyup #groupedit': function(evt) {
    console.log("TYPED KEY IN GROUPEDIT");
    var doc = Documents.findOne({name:"test"});
    if (doc) {
      var textbox = $('#groupedit');
      console.log(textbox.val());
      Documents.update(doc._id, {$set: {text:textbox.val()}});
    }
  }
});

//////
////// scratchpad is where we enter new words.
//////

Template.scratchpad.show = function () {
  return game() && game().clock > 0;
};

Template.scratchpad.events({
  'click button, keyup input': function (evt) {
    var textbox = $('#scratchpad input');
    // if we clicked the button or hit enter
    if ((evt.type === "click" || (evt.type === "keyup" && evt.which === 13))
        && textbox.val()) {
      var word_id = Words.insert({player_id: Session.get('player_id'),
                                  game_id: game() && game()._id,
                                  word: textbox.val().toUpperCase(),
                                  state: 'pending'});
      Meteor.call('score_word', word_id);
      textbox.val('');
      textbox.focus();
      clear_selected_positions();
    } else {
      set_selected_positions(textbox.val());
    }
  }
});

Template.postgame.show = function () {
  return game() && game().clock === 0;
};

Template.postgame.events({
  'click button': function (evt) {
    Agents.update(Session.get('player_id'), {$set: {game_id: null}});
  }
});

//////
////// scores shows everyone's score and word list.
//////

Template.scores.show = function () {
  return !!game();
};

Template.scores.players = function () {
  return game() && game().players;
};

Template.player.winner = function () {
  var g = game();
  if (g.winners && _.include(g.winners, this._id))
    return 'winner';
  return '';
};

Template.player.total_score = function () {
  var words = Words.find({game_id: game() && game()._id,
                          player_id: this._id});

  var score = 0;
  words.forEach(function (word) {
    if (word.score)
      score += word.score;
  });
  return score;
};

Template.words.words = function () {
  return Words.find({game_id: game() && game()._id,
                     player_id: this._id});
};


//////
////// Initialization
//////

Meteor.startup(function () {
  initAceLink();

  Deps.autorun(function () {
    Meteor.subscribe('agents_online');
  });

  Deps.autorun(function() {
    if (Meteor.userId() != null) {
      // Make sure there is a corresponding Agent
      Agents.insert({userId:Meteor.userId()});
    }
  });

  // send keepalives so the server can tell when we go away.
  //
  // XXX this is not a great idiom. meteor server does not yet have a
  // way to expose connection status to user code. Once it does, this
  // code can go away.
  Meteor.setInterval(function() {
    if (Meteor.status().connected)
      Meteor.call('keepalive', Session.get('player_id'));
  }, 20*1000);
});

Accounts.ui.config({
  passwordSignupFields: 'USERNAME_ONLY'
});

Accounts.config({
  forbidClientAccountCreation: true
});
