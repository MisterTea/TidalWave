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

  for (var a=0;a<page.userPermissions.length;a++) {
    if (user._id.equals(page.userPermissions[a])) {
      callback(true);
      return;
    }
  }
  for (var a=0;a<page.derivedUserPermissions.length;a++) {
    if (user._id.equals(page.derivedUserPermissions[a])) {
      callback(true);
      return;
    }
  }
  for (var a=0;a<page.groupPermissions.length;a++) {
    for (var b=0;b<user.groups.length;b++) {
      if (page.groupPermissions[a].equals(user.groups[b])) {
        callback(true);
        return;
      }
    }
  }
  for (var a=0;a<page.derivedGroupPermissions.length;a++) {
    for (var b=0;b<user.groups.length;b++) {
      if (page.derivedGroupPermissions[a].equals(user.groups[b])) {
        callback(true);
        return;
      }
    }
  }

  callback(false);
  return;
};

