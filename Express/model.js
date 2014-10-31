var mongoose = require('mongoose');

var PageSchema = new mongoose.Schema({
  name: String,
  nextVersion: {type:Number, default:1}
});
exports.Page = mongoose.model("Page",PageSchema);

var PageVersionSchema = mongoose.Schema({
  pageId:String,
  version:Number,
  editorIds:[String],
  content:String,
  timestamp: {type: Date, default: Date.now}
});
exports.PageVersion = mongoose.model("PageVersion",PageVersionSchema);

var UserSchema = mongoose.Schema({
  name: String
});
exports.User = mongoose.model("User",UserSchema);
