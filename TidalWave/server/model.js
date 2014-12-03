var mongoose = require('mongoose');

mongoose.set('debug', true);

var ObjectId = mongoose.Schema.ObjectId;

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
  name: {type:String, index:true, unique:true, required:true},
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
exports.Page = mongoose.model("Page",PageSchema);

var PageVersionSchema = mongoose.Schema({
  pageId: {type:ObjectId, index:true, required:true, validate:isObjectId},
  version: {type: Number, index:true, required:true},
  editorIds:{type:[ObjectId], index:true, validate:isObjectIdArray},
  content:{type:String},
  timestamp: {type: Date, default: Date.now, index:true}
});
exports.PageVersion = mongoose.model("PageVersion",PageVersionSchema);

var UserSchema = mongoose.Schema({
  username: {type:String, index:true, unique:true, required:true},
  fullName: {type:String, index:true},
  email: {type:String, index:true, required:true},
  groups: {type:[String], default: [], validate:isObjectIdArray},
  lastLoginTime: {type:Date, default:null},
  fromLdap: {type:Boolean, required:true},
  watchedPageIds: {type:[ObjectId], default:[]}
});
UserSchema.index({firstName:1, lastName:1});
exports.User = mongoose.model("User",UserSchema);

var UserPasswordSchema = mongoose.Schema({
  userId: {type: ObjectId, required:true, index:true, validate:isObjectId},
  password: { type: String, required:true }
});
exports.UserPassword = mongoose.model("UserPassword",UserPasswordSchema);

var GroupSchema = mongoose.Schema({
  name: {type:String, index:true, unique:true, required:true},
  fromLdap: {type:Boolean, required:true}
});
exports.Group = mongoose.model("Group",GroupSchema);

var ImageSchema = mongoose.Schema({
  data: {type:Buffer, required:true},
  base64: {type:String, required:true},
  mime: {type:String, required:true, index:true},
  name: {type:String, required:true, unique:true, index:true}
});
exports.Image = mongoose.model("Image",ImageSchema);

var saveAllDocuments = function(documents, callback) {
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

