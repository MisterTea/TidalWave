var pageHierarchy = [];
var pageAncestry = {};

exports.pageHierarchy = pageHierarchy;
exports.pageAncestry = pageAncestry;

var model = require('./model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;

exports.rebuild = function() {
  pageHierarchy.length = 0;
  pageAncestry.length = 0;

  var completed = {};
  var pageIndexMap = {};
  var allPages = Page.find({},function(err, pages) {
    for (var k=0;k<pages.length;k++) {
      pageIndexMap[pages[k]._id] = k;
    }

    for (var a=0;a<pages.length;a++) {
      pageAncestry[pages[a]._id] = [];
      var onPage = pages[a];
      while (onPage) {
        var parentId = onPage.parentId;
        if (parentId && pageIndexMap[parentId]) {
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
        } else if (pageIndexMap[page.parentId] && completed[pageIndexMap[page.parentId]]) {
          completed[i] = {id:page._id,name:page.name,children:[]};
          completed[pageIndexMap[page.parentId]].children.push(completed[i]);
        }
      }
      if (Object.keys(completed).length == pages.length) {
        break;
      }
    }

    //console.log("FINAL HIERARCHY: " + JSON.stringify(pageHierarchy));
  });
};

exports.fetch = function(filter,cb) {
  var completed = {};
  var pageIndexMap = {};
  var pageHierarchy = [];
  console.log("Finding with filter: " + JSON.stringify(filter));
  var allPages = Page.find(filter,function(err, pages) {
    if (err) {
      console.log(err.message);
    }

    for (var k=0;k<pages.length;k++) {
      pageIndexMap[pages[k]._id] = k;
    }

    for (var a=0;a<pages.length;a++) {
      var onPage = pages[a];
      while (onPage) {
        var parentId = onPage.parentId;
        if (parentId && pageIndexMap[parentId]) {
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
        } else if (pageIndexMap[page.parentId] && completed[pageIndexMap[page.parentId]]) {
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
