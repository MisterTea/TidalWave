var ldap = require('ldapjs');
var assert = require('assert');
var _ = require('lodash');

var mongoose = require('mongoose');

var model = require('../server/model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;
var Group = model.Group;

var options = require('../server/options-handler').options;

var mongooseHandler = require('../server/mongoose-handler');

var extractor = require('./LDAPExtractor');

var LDAPEntryToUser = extractor.LDAPEntryToUser;
var LDAPEntryToGroup = extractor.LDAPEntryToGroup;

var fetchUsers = function(successCallback,errorCallback) {
  var client = ldap.createClient({
    url: options['ldap']['server'],
  });

  client.bind('', '', function(err) {
    console.error("RESULT");
    if (err) {
      client.unbind(function(err2) {
        errorCallback(err);
      });
      return;
    }
    var count=0;
    var users = [];
    client.search(options['ldap']['userDN'],{
      scope:"one",
      attributes:extractor.userAttributes,
      timeLimit:60*60
    },function(err, res) {
      if (err) {
        errorCallback(err);
        return;
      }

      res.on('searchEntry', function(entry) {
        var user = LDAPEntryToUser(entry);
        if (!user) {
          return;
        }
        users.push(user);

        count++;
        if(count%1000==0) {
          console.error('USER ' + count);
        }
      });
      res.on('searchReference', function(referral) {
        console.error('referral: ' + referral.uris.join());
      });
      res.on('error', function(err) {
        console.error('error: ' + err.message);
      });
      res.on('end', function(result) {
        console.error('status: ' + result.status);
        if (result.status==0) {
          successCallback(users);
          client.unbind(function(err) {
          });
        } else {
          errorCallback(true);
        }
      });
    });
  });
};

var fetchGroups = function(successCallback,errorCallback) {
  var client = ldap.createClient({
    url: options['ldap']['server']
  });

  client.bind('', '', function(err) {
    console.error("RESULT");
    if (err) {
      client.unbind(function(err2) {
        errorCallback(err);
      });
      return;
    }
    var count=0;
    var userGroupMap = {};
    var groupNames = [];
    client.search(options['ldap']['groupDN'],{
      scope:"one",
      attributes:extractor.LDAPGroupAttributes,
      timeLimit:60*60
    },function(err, res) {
      if (err) {
        errorCallback(err);
        return;
      }

      res.on('searchEntry', function(entry) {
        //console.error('entry: ' + JSON.stringify(entry.object));
        var group = LDAPEntryToGroup(entry);
        if (!group) {
          return;
        }

        var groupName = group.name;
        var userlist = group.userlist;
        groupNames.push(groupName);
        for (var i=0;i<userlist.length;i++) {
          var user = userlist[i];
          if (!userGroupMap[user]) {
            //console.error("new user: " + user);
            userGroupMap[user] = [groupName];
          } else {
            userGroupMap[user].push(groupName);
          }
        }
        count++;
        if(count%1000==0) {
          console.error('GROUP ' + count);
        }
      });
      res.on('searchReference', function(referral) {
        console.error('referral: ' + referral.uris.join());
      });
      res.on('error', function(err) {
        console.error('error: ' + err.message);
      });
      res.on('end', function(result) {
        console.error('status: ' + result.status);
        if (result.status==0) {
          successCallback(groupNames,userGroupMap);
          client.unbind(function(err) {
          });
        } else {
          errorCallback(true);
        }
      });
    });
  });
};

var handoffUsersAndGroups = function(userGroupCollection, success) {
  if ('users' in userGroupCollection && 'groupList' in userGroupCollection) {
    var users = userGroupCollection['users'];
    var groupList = userGroupCollection['groupList'];
    var userGroupMap = userGroupCollection['userGroupMap'];

    var uidMap = {};
    for (var i=0;i<users.length;i++) {
      var user = users[i];
      user.groups = [];
      //console.log(user.username + "\t" + user.email + "\t" + user.fullName);
      uidMap[user.username] = user;
    }

    for (var uid in userGroupMap) {
      if (uidMap[uid]) {
        //console.log('"' + uid + '"\t' + JSON.stringify(userGroupMap[uid]));
        uidMap[uid].groups = userGroupMap[uid];
      }
    }

    success(uidMap,groupList);
    return;
  }

  setTimeout(function() {
    handoffUsersAndGroups(userGroupCollection, success);
  }, 1000);
};

var getUsersAndGroups = function(success,failure) {
  var userGroupCollection = {};
  fetchUsers(
    function(users) {
      userGroupCollection['users'] = users;
    });

  fetchGroups(
    function(groupList,userGroupMap) {
      userGroupCollection['groupList'] = groupList;
      userGroupCollection['userGroupMap'] = userGroupMap;
    });

  handoffUsersAndGroups(userGroupCollection, success);
};

mongooseHandler.init(function callback () {
  getUsersAndGroups(function (userIdMap,groupList) {
    var groupNameMap = {};
    for (var a=0;a<groupList.length;a++) {
      groupNameMap[groupList[a]] = groupList[a];
    }

    var groupNameIdMap = {};

    // This runs after update groups (below)
    var updateUsers = function() {

      // Replace the group names with group ids.
      for (var key in userIdMap) {
        var newUser = userIdMap[key];
        var groupNames = newUser.groups;
        newUser.groups = [];
        for (var b=0;b<groupNames.length;b++) {
          if (groupNames[b] in groupNameIdMap) {
            newUser.groups.push(groupNameIdMap[groupNames[b]]);
          } else {
            console.log("MISSING GROUP ID: " + groupNames[b]);
          }
        }
      }

      // Update users
      var userStream = User
            .find({})
            .stream();

      userStream
        .on('data', function(user) {
            if (userIdMap[user.username]) {
              var newUser = userIdMap[user.username];

              // See if anything has changed
              if (user.fullName != newUser.fullName ||
                  user.email != newUser.email ||
                  !_.isEqual(user.groups,newUser.groups)) {
                // Update the user record from LDAP
                //console.log(JSON.stringify(newUser) + "!= " + JSON.stringify(user));
                user = _.extend(user,newUser);
                user.fromLdap = true;
                console.log("Updating user: " + user.username);
                user.save();
              }

              // Consume the LDAP record
              delete userIdMap[user.username];
            } else if (user.fromLdap) {
              // Record was not in LDAP anymore, remove
              console.log("Removing user: " + user.username);
              user.remove();
            }
        })
      .on('close', function(err) {
        var userCount=0;
        for (var userId in userIdMap) {
          userCount++;
          if (userCount%100==0) {
            console.log(userCount + " / " + Object.keys(userIdMap).length);
          }
          var ldapUser = userIdMap[userId];
          ldapUser.fromLdap = true;
          console.log("Adding user: " + ldapUser.username);
          new User(ldapUser).save();
        }

        setTimeout(function() {
          // Finished, now close the DB
          console.log("FINISHED");
          mongoose.disconnect();
        }, 60000);
      });
    };

    // Update groups
    var groupStream = Group
      .find({})
          .stream();

    groupStream
      .on('data', function(group) {
        if (groupNameMap[group.name]) {
          // The group still exists
          groupNameIdMap[group.name] = group._id;
          delete groupNameMap[group.name];
        } else if(group.fromLdap) {
          // The group is deleted
          console.log("Removing group: " + JSON.stringify(group));
          group.remove();
        }
      })
    .on('close', function() {
        var groupsToSave = [];
        for (var groupName in groupNameMap) {
          var group = new Group({name:groupName,fromLdap:true});
          groupsToSave.push(group);
        }

        if (groupsToSave.length) {
          var onGroup = 0;
          var iterateGroup = function(err, product, numberAffected) {
            console.log("Added group: " + JSON.stringify(product));
            groupNameIdMap[product.name] = product._id;
            onGroup++;
            if (groupsToSave.length>onGroup) {
              groupsToSave[onGroup].save(iterateGroup);
            } else {
              // Finished, now update users
              updateUsers();
            }
          };
          groupsToSave[onGroup].save(iterateGroup);
        } else {
          // Nothing to do, update users
          updateUsers();
        }
      });
  }, function(err) {
    assert.ifError(err);
  });
});
