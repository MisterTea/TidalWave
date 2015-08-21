/// <reference path='../typings/node/node.d.ts' />
/// <reference path='../typings/mongodb/mongodb.d.ts' />
/// <reference path='../typings/express/express.d.ts' />

var mongoose = require('mongoose');

import options = require('./options-handler');
import log = require('./logger');

// Logs to debug every database query
mongoose.set('debug', options['database']['debug']);

var ObjectId = mongoose.Schema.Types.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;

// Ensures that the entry is a valid object ID
var isObjectId = function(n) {
  if (!n) {
    // Allow null/undefined
    return true;
  }

  if (typeof n.toString === 'function') {
    return mongoose.Types.ObjectId.isValid(n.toString());
  } else {
    return false;
  }
};

// Ensures that the entry is an array of valid object IDs
var isObjectIdArray = function(n) {
  if (!n) {
    // Allow null/undefined
    return true;
  }

  if (!Array.isArray(n)) {
    return false;
  }
  for (var a=0;a<n.length;a++) {
    if (!isObjectId(n[a])) {
      return false;
    }
  }
  return true;
};

var PageSchema = new mongoose.Schema({
  name: {type:String, index:true, required:true},
  fullyQualifiedName: {type:String, unique:true, required:true},
  parentId: {type:ObjectId, index:true, validate:isObjectId},
  nextVersion: {type:Number, default:1},
  publish: {type:Boolean, default:false},
  userPermissions: {type:[ObjectId], default:[], validate:isObjectIdArray},
  groupPermissions: {type:[ObjectId], default:[], validate:isObjectIdArray},
  derivedUserPermissions: {type:[ObjectId], default:[], validate:isObjectIdArray},
  derivedGroupPermissions: {type:[ObjectId], default:[], validate:isObjectIdArray},
  content: String,
  lastModifiedTime: {type: Date, default: Date.now, index:true},
  isPublic: {type: Boolean, default: false}
});
export var Page = mongoose.model("Page",PageSchema);

var PageVersionSchema = mongoose.Schema({
  pageId: {type:ObjectId, index:true, required:true, validate:isObjectId},
  version: {type: Number, index:true, required:true},
  editorIds:{type:[ObjectId], index:true, validate:isObjectIdArray},
  content:{type:String},
  timestamp: {type: Date, default: Date.now, index:true}
});
export var PageVersion = mongoose.model("PageVersion",PageVersionSchema);

var UserSchema = mongoose.Schema({
  username: {type:String, index:true, unique:true, required:true},
  fullName: {type:String, index:true},
  email: {type:String, index:true, required:true},
  groups: {type:[ObjectId], default: [], validate:isObjectIdArray},
  lastLoginTime: {type:Date, default:null},
  fromLdap: {type:Boolean, required:true},
  watchedPageIds: {type:[ObjectId], default:[]}
});
UserSchema.index({firstName:1, lastName:1});
export var User = mongoose.model("User",UserSchema);

var UserPasswordSchema = mongoose.Schema({
  userId: {type: ObjectId, required:true, index:true, validate:isObjectId},
  password: { type: String, required:true }
});
export var UserPassword = mongoose.model("UserPassword",UserPasswordSchema);

var GroupSchema = mongoose.Schema({
  name: {type:String, index:true, unique:true, required:true},
  fromLdap: {type:Boolean, required:true}
});
export var Group = mongoose.model("Group",GroupSchema);

var ImageSchema = mongoose.Schema({
  data: {type:Buffer, required:true},
  base64: {type:String, required:true},
  mime: {type:String, required:true, index:true},
  name: {type:String, required:true, unique:true, index:true},
  filename: {type:String, required:true, index:true}
});
export var Image = mongoose.model("Image",ImageSchema);

var FileDataSchema = mongoose.Schema({
  data: {type:Buffer, required:true},
  base64: {type:String, required:true},
  mime: {type:String, required:true, index:true},
  name: {type:String, required:true, unique:true, index:true},
  filename: {type:String, required:true, index:true}
});
export var FileData = mongoose.model("FileData",FileDataSchema);

var AngularErrorSchema = mongoose.Schema({
  message: String,
  stack: String,
  location: Mixed,
  cause: String,
  performance: Mixed,
  context: Mixed
});
export var AngularError = mongoose.model("AngularError",AngularErrorSchema);

export var saveAllDocuments = function(documents, callback) {
  var onDocument = 0;
  var iterate = function(err, product, numberAffected) {
    onDocument++;
    if (documents.length>onDocument) {
      documents[onDocument].save(iterate);
    } else {
      callback();
    }
  };
  documents[onDocument].save(iterate);
};

export var updateFullyQualifiedName = function(page, callback) {
  if (page.parentId) {
    Page.findOne(page.parentId, function(err, parentPage) {
      updateChildrenFullyQualifiedName(parentPage, callback);
    });
  } else {
    page.fullyQualifiedName = page.name;
    log.info("page " + page.name + " FQN: " + page.fullyQualifiedName);
    page.save(function(err) {
      if (err) {
        log.error(err);
      }
      updateChildrenFullyQualifiedName(page, callback);
    });
  }
};

var updateChildrenFullyQualifiedName = function(page, callback) {
  var parentFQN = page.fullyQualifiedName;

  // Find all children pages
  Page.find({parentId:page._id}, function(err, pages) {
    if (pages.length==0) {
      // No children to update, return
      callback();
    } else {
      // Update all children's FQN
      for (var i=0;i<pages.length;i++) {
        pages[i].fullyQualifiedName = parentFQN + "/" + pages[i].name;
      }

      // Save all children
      saveAllDocuments(pages,function() {

        // Recursively update FQN for grandchildren.
        var onUpdate=0;
        var iterate = function() {
          onUpdate++;
          if (onUpdate>=pages.length) {
            // We are done
            callback();
          } else {
            updateChildrenFullyQualifiedName(pages[onUpdate],iterate);
          }
        };
        updateChildrenFullyQualifiedName(pages[onUpdate],iterate);
      });
    }
  });
};
