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
  var totalUrl = req.originalUrl;
  log.warn({invalidAuthentication:true,user:req.user,url:totalUrl});
  res.redirect('/login?redirect='+encodeURIComponent(totalUrl));
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
         {groupPermissions: { $in: user.groups }},
         {derivedUserPermissions: user._id.toString()},
         {derivedGroupPermissions: { $in: user.groups} }
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

  if (!user) {
    callback(false);
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

var updateDerivedPermissions = exports.updateDerivedPermissions = function(page, callback) {
  if (page.parentId) {
    Page.findOne(page.parentId, function(err, parentPage) {
      updateChildrenDerivedPermissions(parentPage, callback);
    });
  } else {
    page.derivedUserPermissions = [];
    page.derivedGroupPermissions = [];
    page.save(function(err) {
      if (err) {
        log.error(err);
      }
      updateChildrenDerivedPermissions(page, callback);
    });
  }
};

var updateChildrenDerivedPermissions = exports.updateChildrenDerivedPermissions = function(page,callback) {
  // Store off the derived permission to propagate
  var baseUserPermissions = _.union(page.derivedUserPermissions,page.userPermissions);
  var baseGroupPermissions = _.union(page.derivedGroupPermissions,page.groupPermissions);

  // Find all children pages
  Page.find({parentId:page._id}, function(err, pages) {
    if (pages.length==0) {
      // No children to update, return
      callback();
    } else {
      // Update all children's derived permissions
      for (var i=0;i<pages.length;i++) {
        pages[i].derivedUserPermissions = baseUserPermissions;
        pages[i].derivedGroupPermissions = baseGroupPermissions;
      }

      // Save all children
      model.saveAllDocuments(pages,function() {

        // Recursively update derived permissions for grandchildren.
        var onUpdate=0;
        var iterate = function() {
          onUpdate++;
          if (onUpdate>=pages.length) {
            // We are done
            callback();
          } else {
            updateChildrenDerivedPermissions(pages[onUpdate],iterate);
          }
        };
        updateChildrenDerivedPermissions(pages[onUpdate],iterate);
      });
    }
  });
};
