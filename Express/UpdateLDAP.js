var ldap = require('ldapjs');
var assert = require('assert');
var _ = require('underscore');

var mongoose = require('mongoose');

var model = require('./model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;
var Group = model.Group;

var fetchUsers = function(successCallback,errorCallback) {
  var client = ldap.createClient({
    url: 'ldaps://nod.apple.com:636'
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
    client.search('cn=users,dc=apple,dc=com',{
      scope:"one",
      timeLimit:60*60,
      attributes:["dn","mail","givenName","sn"]
    },function(err, res) {
      if (err) {
        errorCallback(err);
        return;
      }

      res.on('searchEntry', function(entry) {
        //console.error('entry: ' + JSON.stringify(entry.object));
        var email = entry.object['mail'];
        var firstName = entry.object['givenName'];
        var lastName = entry.object['sn'];
        var username = entry.object['dn'].match(new RegExp(/uid\=([^,]+)/))[1];
        if(!email || !firstName || !lastName || !username) {
          //console.error("INVALID ENTRY: " + JSON.stringify(entry.object));
          return;
        }

        users.push({
          email:email,
          firstName:firstName,
          lastName:lastName,
          fullName:firstName + " " + lastName,
          username:username
        });

        count++;
        if(count%1000==0) {
          console.error(count);
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
    url: 'ldaps://nod.apple.com:636'
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
    client.search('cn=groups,dc=apple,dc=com',{
      scope:"one",
      timeLimit:60*60,
      attributes:["cn","gidNumber","memberUid"]
    },function(err, res) {
      if (err) {
        errorCallback(err);
        return;
      }

      res.on('searchEntry', function(entry) {
        //console.error('entry: ' + JSON.stringify(entry.object));
        var userlist = entry.object['memberUid'];
        var groupName = entry.object['cn'];
        if (!userlist) {
          return;
        }
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
          console.error(count);
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

var getUsersAndGroups = function(success,failure) {
  fetchUsers(
    function(users) {
      var uidMap = {};
      for (var i=0;i<users.length;i++) {
        var user = users[i];
        user.groups = [];
        //console.log(user.username + "\t" + user.email + "\t" + user.firstName + "\t" + user.lastName);
        uidMap[user.username] = user;
      }

      fetchGroups(
        function(groupList,userGroupMap) {
          for (var uid in userGroupMap) {
            if (uidMap[uid]) {
              //console.log('"' + uid + '"\t' + JSON.stringify(userGroupMap[uid]));
              uidMap[uid].groups = userGroupMap[uid];
            }
          }

          success(uidMap,groupList);
        },
        function(err) {
          failure(err);
        });
    },
    function(err) {
      failure(err);
    });
};

mongoose.connect('mongodb://localhost/tidalwave');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  getUsersAndGroups(function (userIdMap,groupList) {
    var groupNameMap = {};
    for (var a=0;a<groupList.length;a++) {
      groupNameMap[groupList[a]] = groupList[a];
    }

    // This runs after update groups (below)
    var updateUsers = function() {
      // Update users
      User
        .find({})
        .exec(function(err, results){
          console.log("UPDATING USERS");
          for (var a=0;a<results.length;a++) {
            var user = results[a];
            if (userIdMap[user.username]) {
              var newUser = userIdMap[user.username];
              // See if anything has changed
              if (user.firstName != newUser.firstName ||
                  user.lastName != newUser.lastName ||
                  user.email != newUser.email ||
                  !_.isEqual(user.groups,newUser.groups)) {
                // Update the user record from LDAP
                console.log(JSON.stringify(newUser) + "!= " + JSON.stringify(user));
                user = _.extend(user,newUser);
                console.log("Updating user: " + JSON.stringify(user));
                user.save();
              }

              // Consume the LDAP record
              delete userIdMap[user.username];
            } else {
              // Record was not in LDAP, remove
              console.log("Removing user: " + JSON.stringify(user));
              user.remove();
            }
          }

          var usersToSave = [];
          for (var userId in userIdMap) {
            var ldapUser = userIdMap[userId];
            var userRecord = new User(ldapUser);
            usersToSave.push(userRecord);
          }

          if (usersToSave.length) {
            var onUser = 0;
            var iterateUser = function(err, product, numberAffected) {
              //console.log("Added user: " + JSON.stringify(product));
              onUser++;
              if (usersToSave.length>onUser) {
                usersToSave[onUser].save(iterateUser);
              } else {
                // Finished, now close the DB
                console.log("FINISHED");
                mongoose.disconnect();
              }
            };
            usersToSave[onUser].save(iterateUser);
          } else {
            // Nothing to do, close the DB
            mongoose.disconnect();
          }
        });
    };

    // Update groups
    Group
      .find({})
      .exec(function(err, results) {
        console.log("UPDATING GROUPS");
        if (err) {
          assert.ifError(err);
        }

        if (results) {
          for (var a=0;a<results.length;a++) {
            var group = results[a];
            if (groupNameMap[group.name]) {
              // The group still exists
              delete groupNameMap[group.name];
            } else {
              // The group is deleted
              console.log("Removing group: " + JSON.stringify(group));
              group.remove();
            }
          }
        }

        var groupsToSave = [];
        for (var groupName in groupNameMap) {
          var group = new Group({name:groupName});
          groupsToSave.push(group);
        }

        if (groupsToSave.length) {
          var onGroup = 0;
          var iterateGroup = function(err, product, numberAffected) {
            console.log("Added group: " + JSON.stringify(product));
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

