var mongoose = require('mongoose');

var PageSchema = new mongoose.Schema({
  name: {type:String, index:true, unique:true, required:true},
  parentId: {type:String, index:true},
  nextVersion: {type:Number, default:1},
  publish: {type:Boolean, default:false},
  userPermissions: {type:[String], default:[]},
  groupPermissions: {type:[String], default:[]},
  content: String
});
exports.Page = mongoose.model("Page",PageSchema);

var PageVersionSchema = mongoose.Schema({
  pageId: {type:String, index:true, required:true},
  version: {type: Number, index:true, required:true},
  editorIds:{type:[String], index:true},
  content:{type:String},
  timestamp: {type: Date, default: Date.now}
});
exports.PageVersion = mongoose.model("PageVersion",PageVersionSchema);

var UserSchema = mongoose.Schema({
  username: {type:String, index:true, unique:true, required:true},
  firstName: {type:String, index:true},
  lastName: {type:String, index:true},
  fullName: {type:String, index:true},
  email: {type:String, index:true, required:true},
  groups: {type:[String], default: []},
  loggedIn: {type:Boolean, default:false}
});
UserSchema.index({firstName:1, lastName:1});
exports.User = mongoose.model("User",UserSchema);

var GroupSchema = mongoose.Schema({
  name: {type:String, index:true, unique:true, required:true}
});
exports.Group = mongoose.model("Group",GroupSchema);
