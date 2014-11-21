var mongoose = require('mongoose');

var PageSchema = new mongoose.Schema({
  name: {type:String, index:true, unique:true, required:true},
  parentId: {type:String, index:true},
  nextVersion: {type:Number, default:1},
  publish: {type:Boolean, default:false},
  userPermissions: {type:[String], default:[]},
  groupPermissions: {type:[String], default:[]},
  derivedUserPermissions: {type:[String], default:[]},
  derivedGroupPermissions: {type:[String], default:[]},
  content: String,
  isPublic: {type: Boolean, default: false}
});
exports.Page = mongoose.model("Page",PageSchema);

var PageVersionSchema = mongoose.Schema({
  pageId: {type:String, index:true, required:true},
  version: {type: Number, index:true, required:true},
  editorIds:{type:[String], index:true},
  content:{type:String},
  timestamp: {type: Date, default: Date.now, index:true}
});
exports.PageVersion = mongoose.model("PageVersion",PageVersionSchema);

var UserSchema = mongoose.Schema({
  username: {type:String, index:true, unique:true, required:true},
  fullName: {type:String, index:true},
  email: {type:String, index:true, required:true},
  groups: {type:[String], default: []},
  lastLoginTime: {type:Date, default:null},
  fromLdap: {type:Boolean, required:true},
  watchedPageIds: {type:[String], default:[]}
});
UserSchema.index({firstName:1, lastName:1});
exports.User = mongoose.model("User",UserSchema);

var UserPasswordSchema = mongoose.Schema({
  userId: {type: String, required:true, index:true},
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

