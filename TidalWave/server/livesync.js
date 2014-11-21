var _ = require('lodash');

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
  console.log("IN DUMP PAGE VERSION");
  Page.findOne({_id:result.docName}, function(err, page){
    console.log("FOUND A PAGE");
    if (page == null) {
      console.log("ERROR: UPDATING PAGE THAT DOES NOT EXIST");
      return;
    }
    console.log(page);
    var newPageVersion = new PageVersion({pageId:page._id,version:page.nextVersion,content:result.data,editorIds:[]});
    console.log("DUMPING " + page.name + " WITH VERSION " + page.nextVersion);
    console.log(newPageVersion);
    page.nextVersion++;
    page.content = result.data;
    page.save(function (err) {
      console.log("SAVED PAGE");
      if (err) {
        console.log(err);
        if (callback) {
          callback();
        }
      } else {
        console.log("DUMPING PAGEVERSION");
        newPageVersion.save(function (err,innerPageVersion) {
          if (err) {
            console.log(err);
          }
          lastVersionDumped[result.docName] = result.v;
          if (callback) {
            console.log("EXECUTING CALLBACK");
            callback();
          }
        });
      }
    });
  });
};

exports.sync = function(docName, callback) {
  //console.log("Checking for new versions");
  console.log("PERFORMING SYNC");
  database.query(null, "users", null, null, function(dummy,results){
    console.log("LOOKING FOR DOCUMENT");
    var foundDocument = false;
    for (var i=0;i<results.length;i++) {
      var result = results[i];
      if (result.docName != docName) {
        continue;
      }
      if (!(lastVersionDumped[result.docName] == result.v)) {
        console.log("DUMPING NEW VERSION");
        console.log(result);
        // Dump new PageVersion
        foundDocument = true;
        dumpPageVersion(result, callback);
        return;
      }
    }
    if (!foundDocument) {
      // Something went really wrong
      callback();
    }
    return;
  });
};

exports.syncAndRemove = function(docName) {
  console.log("Removing liveDB doc " + docName);
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
