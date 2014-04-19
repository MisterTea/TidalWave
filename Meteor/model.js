////////// Shared code (client and server) //////////

Agents = new Meteor.Collection('agents');
// {userId:12345}

Documents = new Meteor.Collection('documents');
// {name:"MyDoc", parent:"parentDoc", base:"", changes:[]}

Meteor.methods({
});

if (Meteor.isServer) {
  // publish all the non-idle players.
  Meteor.publish('document_names', function () {
    return Documents.find({}, {fields: {name:1}});
  });

  Meteor.publish('document', function(documentName) {
    console.log("FETCHING DOCUMENT: " + documentName);
    var doc = Documents.find({name:documentName});
    while (doc.count()>1) {
      console.log("REMOVING DUPLICATE DOCUMENT");
      Documents.remove(doc.fetch()[0]._id);
      doc = Documents.find({name:documentName});
    }
    return doc;
  });

  Documents.allow({
    insert: function(userId, doc) {
      // Don't allow documents with duplicate names
      var docCursor = Documents.find({name:doc.name});
      return docCursor.count()==0;
    },
    update: function(userId, doc, fieldNames, modifier) {
      return true;
    },
    remove: function(userId, doc) {
      return true;
    }
  });

  Agents.allow({
    insert: function(userId, agent) {
      console.log("CHECKING1: " + userId + " " + agent.userId);
      return agent.userId == userId;
    },
    update: function(userId, doc, fieldNames, modifier) {
      console.log("CHECKING2: " + userId + " " + agent.userId);
      return agent.userId == userId;
    },
    remove: function(userId, doc) {
      console.log("CHECKING3: " + userId + " " + agent.userId);
      return agent.userId == userId;
    }
  });
}
