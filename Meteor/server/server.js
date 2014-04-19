////////// Server only logic //////////

Meteor.methods({
  add: function (doc_id, revision, position, text) {
    var doc = Documents.findOne(doc_id);
    var newCommand = createAddCommand(doc, revision, position, text);
    if (newCommand != null) {
      Documents.update(document._id, {$push: {commands: newCommand}});
    }
  },
  remove: function(doc_id, revision, position, count) {
    var doc = Documents.findOne(doc_id);
    var newCommand = createRemoveCommand(doc, revision, position, count);
    if (newCommand != null) {
      Documents.update(document._id, {$push: {commands: newCommand}});
    }
  }
});

Meteor.setInterval(function () {
  var now = (new Date()).getTime();
  var idle_threshold = now - 60*60*1000; // 1hr

  Agents.update({last_keepalive: {$lt: idle_threshold}},
                 {$set: {idle: true}});
}, 1000);
