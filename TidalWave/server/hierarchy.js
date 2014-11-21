var log = require('./logger').log;

var pageHierarchy = [];
var pageAncestry = {};

exports.pageHierarchy = pageHierarchy;
exports.pageAncestry = pageAncestry;

var model = require('./model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;

var AuthHelper = require('./auth-helper');

var getAncestry = exports.getAncestry = function(page, callback) {
  console.log("GETTING ANCESTRY");
  console.log(page);
  if (page.parentId) {
    Page.findById(page.parentId,function(err, parentPage) {
      if (err || !parentPage) {
        callback(["Error"]);
        return;
      }
      getAncestry(parentPage, function(parentAncestry) {
        parentAncestry.push({_id:page._id,name:page.name});
        callback(parentAncestry);
      });
    });
  } else {
    callback([{_id:page._id,name:page.name}]);
  }
};

exports.rebuild = function() {
  pageHierarchy.length = 0;
  pageAncestry.length = 0;

  var completed = {};
  var pageIndexMap = {};
  Page.find({},function(err, pages) {
    if (err) {
      log.error({error:err});
      return;
    }

    for (var k=0;k<pages.length;k++) {
      pageIndexMap[pages[k]._id] = k;
    }

    for (var a=0;a<pages.length;a++) {
      pageAncestry[pages[a]._id] = [];
      var onPage = pages[a];
      while (onPage) {
        var parentId = onPage.parentId;
        if (parentId && parentId in pageIndexMap) {
          onPage = pages[pageIndexMap[parentId]];
        } else {
          break;
        }
        pageAncestry[pages[a]._id].push({id:onPage._id,name:onPage.name});
      }
    }

    for (var j=0;j<pages.length;j++) {
      for (var i=0;i<pages.length;i++) {
        if (completed[i]) {
          continue;
        }
        var page = pages[i];
        if (!page.parentId) {
          completed[i] = {id:page._id,name:page.name,children:[]};
          pageHierarchy.push(completed[i]);
        } else if (page.parentId in pageIndexMap && completed[pageIndexMap[page.parentId]]) {
          completed[i] = {id:page._id,name:page.name,children:[]};
          completed[pageIndexMap[page.parentId]].children.push(completed[i]);
        }
      }
      if (Object.keys(completed).length == pages.length) {
        break;
      }
    }
  });
};

exports.fetch = function(user,filter,cb) {
  var completed = {};
  var pageIndexMap = {};
  var pageHierarchy = [];
  log.debug("Finding with filter: " + JSON.stringify(filter));
  AuthHelper.queryPermissionWrapper(Page.find(filter),user)
    .exec(function(err, pages) {
      if (err) {
        log.error({error:err});
        console.log(err.message);
      }

      for (var k=0;k<pages.length;k++) {
        pageIndexMap[pages[k]._id] = k;
      }

      for (var a=0;a<pages.length;a++) {
        var onPage = pages[a];
        while (onPage) {
          var parentId = onPage.parentId;
          if (parentId && parentId in pageIndexMap) {
            onPage = pages[pageIndexMap[parentId]];
          } else {
            break;
          }
        }
      }

      for (var j=0;j<pages.length;j++) {
        for (var i=0;i<pages.length;i++) {
          if (completed[i]) {
            continue;
          }
          var page = pages[i];
          if (!page.parentId) {
            completed[i] = {id:page._id,name:page.name,children:[]};
            pageHierarchy.push(completed[i]);
          } else if (page.parentId in pageIndexMap && completed[pageIndexMap[page.parentId]]) {
            completed[i] = {id:page._id,name:page.name,children:[]};
            completed[pageIndexMap[page.parentId]].children.push(completed[i]);
          }
        }
        if (Object.keys(completed).length == pages.length) {
          break;
        }
      }

      //console.log("FINAL HIERARCHY: " + JSON.stringify(pageHierarchy));
      cb(pageHierarchy);
    });
};
