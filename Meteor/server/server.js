////////// Server only logic //////////

Meteor.methods({
  add: function (doc_id, revision, position, text) {
    var doc = Documents.findOne(doc_id);
    var newCommand = createAddCommand(doc, revision, position, text);
    console.log(newCommand);
    if (newCommand != null) {
      Documents.update(doc_id, {$push: {commands: newCommand}});
    }
  },
  remove: function(doc_id, revision, position, text) {
    var doc = Documents.findOne(doc_id);
    var newCommand = createRemoveCommand(doc, revision, position, text);
    if (newCommand != null) {
      Documents.update(doc_id, {$push: {commands: newCommand}});
    }
  },
  updateSelection: function(doc_id, revision, session_id, start, end) {
    var doc = Documents.findOne(doc_id);
    var newCommand = createSelectionCommand(doc, revision, start, end);
    newCommand.id = session_id;
    console.log(newCommand);
    if (newCommand != null) {
      Documents.update(doc_id, {$push: {commands: newCommand}});
    }
  }
});

/*
Meteor.setInterval(function () {
  var now = (new Date()).getTime();
  var idle_threshold = now - 60*60*1000; // 1hr

  Agents.update({last_keepalive: {$lt: idle_threshold}},
                 {$set: {idle: true}});
}, 1000);
*/
