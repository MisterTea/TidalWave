var _ = require('lodash');

var model = require('../server/model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;
var Group = model.Group;
var Image = model.Image;
var log = require('./logger').log;

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
exports.ensureAuthenticated = function(req, res, next) {
  if (req.isAuthenticated()) { 
    next();
    return;
  }
  var totalUrl = req.baseUrl + req.url;
  log.warn({invalidAuthentication:true,user:req.user,url:totalUrl});
  res.redirect('/login?redirect='+totalUrl);
};

exports.queryPermissionWrapper = function(query, user) {
  if (user) {
    if (user.groups.length==0) {
      console.log("CHECKING PERMISSIONS");
      console.dir(user);
      console.log(user._id.toString());
      return query.or(
        [{isPublic: true},
         {userPermissions: user._id.toString() },
         {derivedUserPermissions: user._id.toString() }
        ]);
    } else {
      return query.or(
        [{isPublic: true},
         {userPermissions: user._id.toString()},
         {groupPermissions: user.groups},
         {derivedUserPermissions: user._id.toString()},
         {derivedGroupPermissions: user.groups}
        ]);
    }
  } else {
    return query.where({isPublic:true});
  }
  //bypass security
  //return query;
};

var userCanAccessPage = null;
exports.userCanAccessPage = userCanAccessPage = function(user,page,callback) {
  if (page.isPublic) {
    callback(true);
    return;
  }

  if (
    !(_.contains(page.userPermissions,user._id.toString())) &&
      !(_.intersection(page.groupPermissions,user.groups).length>0) &&
      !(_.contains(page.derivedUserPermissions,user._id.toString())) &&
      !(_.intersection(page.derivedGroupPermissions,user.groups).length>0)
  ) {
    callback(false);
    return;
  }
  if (page.parentId) {
    Page.findOne({_id:page.parentId},function(err, parentPage) {
      if (err) {
        // handle error
        callback(false);
        return;
      }
      userCanAccessPage(user,parentPage,callback);
    });
  } else {
    callback(true);
  }
};

