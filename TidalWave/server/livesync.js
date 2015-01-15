var _ = require('lodash');
var EmailHandler = require('./email-handler');
var options = require('./options-handler').options;
var log = require('./logger').log;

var model = require('./model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;

var debug = require('debug')('Sync');
var util = require('../node_modules/livedb/lib/util');

var lastVersionDumped = {};
var driver = null;
var database = null;

exports.init = function(driver_, database_) {
  driver = driver_;
  database = database_;
};

var dumpPageVersion = function(result, callback) {
  log.debug("IN DUMP PAGE VERSION");
  Page.findOne({_id:result.docName}, function(err, page){
    log.debug("FOUND A PAGE");
    if (page == null) {
      log.debug("ERROR: UPDATING PAGE THAT DOES NOT EXIST");
      return;
    }
    if (page.content == result.data) {
      // The page hasn't changed between versions, don't make a new pageversion
      lastVersionDumped[result.docName] = result.v;
      callback();
      return;
    }

    var newPageVersion = new PageVersion({pageId:page._id,version:page.nextVersion,content:result.data,editorIds:[]});
    log.debug("DUMPING " + page.name + " WITH VERSION " + page.nextVersion);
    page.nextVersion++;
    page.content = result.data;
    page.lastModifiedTime = newPageVersion.timestamp;
    console.log("TIMESTAMP: " + page.lastModifiedTime);
    page.save(function (err) {
      log.debug("SAVED PAGE");
      if (err) {
        log.error(err);
        if (callback) {
          callback();
        }
      } else {
        log.debug("DUMPING PAGEVERSION");
        newPageVersion.save(function (err,innerPageVersion) {
          if (err) {
            log.error(err);
          }
          lastVersionDumped[result.docName] = result.v;
          User.find({watchedPageIds:page._id}, function(err, users) {
            if (users.length>0) {
              log.info({message:"Notifying watchers",watchers:users});
            }
            for (var i=0;i<users.length;i++) {
              EmailHandler.sendMail(
                users[i].email,
                page.name+" has been updated.",
                "A friendly reminder that the page you watched, "+page.name+", has been updated.  You can see the latest changes by going here: "+(options.ssl?"https":"http")+"://"+options.hostname+":"+options.port+"/view/"+page.name);
            }
            if (callback) {
              log.debug("EXECUTING CALLBACK");
              callback();
            }
          });
        });
      }
    });
  });
};

exports.sync = function(docName, callback) {
  //console.log("Checking for new versions");
  log.debug("PERFORMING SYNC");
  database.query(null, "users", null, null, function(dummy,results){
    log.debug("LOOKING FOR DOCUMENT " + docName);
    var foundDocument = false;
    for (var i=0;i<results.length;i++) {
      var result = results[i];
      log.debug("GOT RESULT: " + result.docName);
      if (result.docName != docName) {
        continue;
      }
      if (!(lastVersionDumped[result.docName] == result.v)) {
        log.debug("DUMPING NEW VERSION");
        log.debug(result);
        // Dump new PageVersion
        foundDocument = true;
        dumpPageVersion(result, callback);
        return;
      } else {
        // This version is the same as the last version
        return;
      }
    }
    if (!foundDocument) {
      // Something went really wrong
      log.error("COULD NOT FIND DOCUMENT: " + docName);
      callback();
    }
    return;
  });
};

exports.syncAndRemove = function(docName) {
  log.debug("Removing liveDB doc " + docName);
  exports.sync(docName, function() {
    delete database.collections['users'][docName];
    delete database.ops['users'][docName];
    delete driver.versions[util.encodeCD('users', docName)];
  });
};

exports.syncAll = function() {
  //console.log("Checking for new versions");
  database.query(null, "users", null, null, function(dummy,results){
    _.each(results,function(result) {
      if (!(lastVersionDumped[result.docName] == result.v)) {
        // Dump new PageVersion
        dumpPageVersion(result);
      }
    });
  });
};
