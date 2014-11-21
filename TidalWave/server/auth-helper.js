var _ = require('lodash');

var model = require('../server/model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;
var Group = model.Group;
var Image = model.Image;

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
  res.redirect('/login?redirect='+req.baseUrl + req.url);
};

exports.queryPermissionWrapper = function(query, user) {
  if (user.groups.length==0) {
    return query.or(
      [{isPublic: true},
       {userPermissions: user._id},
       {derivedUserPermissions: user._id}
      ]);
  }
  return query.or(
    [{isPublic: true},
     {userPermissions: user._id},
     {groupPermissions: user.groups},
     {derivedUserPermissions: user._id},
     {derivedGroupPermissions: user.groups}
    ]);
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

