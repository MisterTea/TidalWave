var _ = require('underscore');

var model = require('./model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;

var debug = require('debug')('Sync');

var lastVersionDumped = {};
var database = null;

exports.init = function(liveDatabase) {
  database = liveDatabase;
};

var dumpPageVersion = function(result, callback) {
  Page.findOne({name:result.docName}, function(err, page){
    if (page == null) {
      console.log("ERROR: UPDATING PAGE THAT DOES NOT EXIST");
      return;
    }
    console.log(page);
    var newPageVersion = new PageVersion({pageId:page._id,version:page.nextVersion,content:result.data,editorIds:[]});
    debug("DUMPING " + page.name + " WITH VERSION " + page.nextVersion);
    console.log(newPageVersion);
    page.nextVersion++;
    page.content = result.data;
    page.save(function (err) {
      if (err) {
        console.log(err);
      } else {
        debug("DUMPING PAGEVERSION");
        newPageVersion.save(function (err,innerPageVersion) {
          if (err) {
            console.log(err);
          }
          lastVersionDumped[result.docName] = result.v;
          if (callback) {
            callback();
          }
        });
      }
    });
  });
};

exports.sync = function(docName, callback) {
  //console.log("Checking for new versions");
  database.query(null, "users", null, null, function(dummy,results){
    _.each(results,function(result) {
      if (result.docName != docName) {
        return;
      }
      if (!(lastVersionDumped[result.docName] == result.v)) {
        // Dump new PageVersion
        dumpPageVersion(result, callback);
      } else {
        callback();
      }
    });
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
