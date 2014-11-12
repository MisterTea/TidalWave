var express = require('express');
var router = express.Router();

var Hierarchy = require('../hierarchy');

var model = require('../model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;

var AuthHelper = require('../auth-helper');
var LiveSync = require('../livesync');

var toc = require('marked-toc');

var _ = require('lodash');

var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'warning'
});

var queryPermissionWrapper = AuthHelper.queryPermissionWrapper;

var userCanAccessPage = function(user,page,callback) {
  if (
    !(_.contains(page.userPermissions,user.username)) &&
      !(_.intersection(page.groupPermissions,user.groups).length>0) &&
      !(_.contains(page.derivedUserPermissions,user.username)) &&
      !(_.intersection(page.derivedGroupPermissions,user.groups).length>0)
  ) {
    console.log(JSON.stringify(user) + " CANNOT ACCESS " + JSON.stringify(page));
    callback(false);
    return;
  }
  if (page.parentId) {
    Page.findOne({_id:page.parentId},function(err, parentPage) {
      if (err) {
        // handle error
        console.log(JSON.stringify(user) + " CANNOT FIND PARENT " + JSON.stringify(page));
        callback(false);
        return;
      }
      userCanAccessPage(user,parentPage,callback);
    });
  } else {
    console.log(JSON.stringify(user) + " CAN ACCESS " + JSON.stringify(page));
    callback(true);
  }
};

router.post(
  '/updatePage',
  AuthHelper.ensureAuthenticated,
  function(req, res) {
    console.log("UPDATING PAGE");
    console.log(req.body);
    var page = new Page(req.body);
    Page.findById(
      page._id,
      function(err, outerPage) {
        console.log("FOUND PAGE TO UPDATE");
        console.log(outerPage);
        userCanAccessPage(req.user,outerPage,function(outerSuccess) {
          if (!outerSuccess) {
            console.log("TREID TO UPDATE PAGE WITHOUT ACCESS");
            // Tried to update a page without access
            res.status(403).end();
            return;
          }
          userCanAccessPage(req.user,page,function(success) {
            if (success) {
              console.log("UPDATING PAGE");
              console.log(page);
              Page.findByIdAndUpdate(
                page._id,
                {$set: 
                 {name:page.name,
                  parentId:page.parentId,
                  userPermissions:page.userPermissions,
                  groupPermissions:page.groupPermissions
                 }},function(err, page) {
                   if (err) {
                     console.log("Error updating page");
                     console.log(err);
                     res.status(500).end();
                     return;
                   }
                   console.log("Updated successfully");
                   console.log(page);
                   res.status(200).end();
                 });
            } else {
              console.log("UPDATE WOULD BAN USER FROM HIS OWN PAGE");
              // Tried to change permissions in a way that would ban the user doing the update.
              res.status(403).end();
            }
          });
        });
      });
  }
);

router.post(
  '/getTOC/:pageId',
  AuthHelper.ensureAuthenticated,
  function(req, res) {
    var pageId = req.param('pageId');

    queryPermissionWrapper(Page.findOne({_id:pageId}), req.user)
      .exec(function(err, page) {
        if (err) {
          res.status(404).end();
        } else {
          userCanAccessPage(req.user,page,function(success) {
            if (success) {
              res.status(200).type("text/x-markdown").send(toc(page.content));
            } else {
              res.status(403).end();
            }
          });
        }
      });
  }
);

router.post(
  '/pageStartsWith/:query',
  AuthHelper.ensureAuthenticated,
  function(req, res) {
    var query = req.param('query');

    queryPermissionWrapper(
      Page.find({name:new RegExp("^"+query, "i")}), req.user)
      .limit(10)
      .exec(function(err, pages) {
        console.log("Result for " + query + ": " + JSON.stringify(pages));
        res.status(200).type("application/json").send(JSON.stringify(pages));
      });
  }
);

router.post(
  '/pageDetailsByName/:name',
  AuthHelper.ensureAuthenticated,
  function(req, res) {
    console.log("Getting page details with name: " + req.param('name'));
    queryPermissionWrapper(
      Page.findOne({name:req.param('name')}), req.user)
      .exec(function(err, page) {
        console.log("Got page");
        console.log(page);
        if (page) {
          var pageDetails = {
            page:page,
            ancestry:Hierarchy.pageAncestry[page._id],
            version:null,
            content:page.content,
            userPermissions:[]
          };
          // Get all users on the permissions list
          User.find(
            {'username': { $in: page.userPermissions }},
            function(err,users) {
              if (err) {
                console.log(err);
                res.status(500).end();
                return;
              }
              for (var i=0;i<users.length;i++) {
                pageDetails.userPermissions.push(users[i]);
              }
              res.status(200).type("application/json").send(JSON.stringify(pageDetails));
            });
        } else {
          res.status(404).end();
        }
      });
  }
);


router.post(
  '/setPageParent/:pageId/:parentId',
  AuthHelper.ensureAuthenticated,
  function(req, res) {
    var newParent = req.param('parentId');
    if (newParent == '___null___') {
      newParent = null;
    }
    queryPermissionWrapper(
      Page.findOne({_id:req.param('pageId')}), req.user)
      .exec(function(err, page) {
        page.parentId = newParent;
        page.save(function(err, innerPage) {
          res.status(200).end();
        });
      });
  });

router.post(
  '/createPage/:pageName',
  AuthHelper.ensureAuthenticated,
  function(req, res) {
    var pageName = req.param('pageName');
    queryPermissionWrapper(
      Page.findOne({name:pageName}), req.user)
      .exec(function(err, page){
        if (page == null) {
          // Page does not exist yet, create
          var innerPage = new Page({name:pageName,content:'',userPermissions:[req.user.username]});
          innerPage.save(function(err, innerInnerPage) {
            if (err) {
              console.log(err);
            } else {
              console.log("Rebuilding hierarchy");
              Hierarchy.rebuild();
              res.status(200).end();
            }
          });
        } else {
          res.status(400).end();
        }
      });
  }
);

router.post(
  '/savePageDynamicContent/:pageName',
  AuthHelper.ensureAuthenticated,
  function(req, res) {
    var pageName = req.param('pageName');
    LiveSync.sync(pageName, function() {
      res.status(200).end();
    });
  }
);

router.post(
  '/findUserFullName/:fullName',
  AuthHelper.ensureAuthenticated,
  function(req, res) {
    var fullName = req.param('fullName');
    client.search({
      index: 'tidalwave.users',
      body: {
        from:0,
        size:5,
        query: {
          filtered: {
            filter: {
              not: {
                filter: {
                  term: {
                    lastLoginTime: "none"
                  }
                }
              }
            },
            query: {
              match_phrase_prefix: {        
                fullName: {
                  query:'"'+fullName+'"',
                  prefix_length:3,
                  max_expansions : 1024
                }
              }
            }
          }
        }
      }
    }).then(function (body) {
      var hits = body.hits.hits;
      console.log(hits);
      var results = [];
      for (var i=0;i<hits.length;i++) {
        var result = hits[i]._source;
        result._id = hits[i]._id;
        results.push(result);
      }
      res.status(200).type("application/json").send(JSON.stringify(results));
    }, function (error) {
      console.log(error.message);
      res.status(500).done();
    });
  }
);

router.post(
  '/findGroupName/:name',
  AuthHelper.ensureAuthenticated,
  function(req, res) {
    var name = req.param('name');
    client.search({
      index: 'tidalwave.groups',
      body: {
        from:0,
        size:10,
        query: {
          match_phrase_prefix: {        
            name: {
              query:'"'+name+'"',
              prefix_length:3,
              max_expansions : 1024
            }
          }
        }
      }
    }).then(function (body) {
      var hits = body.hits.hits;
      console.log(hits);
      var results = [];
      for (var i=0;i<hits.length;i++) {
        var result = hits[i]._source;
        result._id = hits[i]._id;
        results.push(result);
        if (results.length==5) {
          break;
        }
      }
      res.status(200).type("application/json").send(JSON.stringify(results));
    }, function (error) {
      console.log(error.message);
      res.status(500).done();
    });
  }
);

router.post(
  '/findPageContent/:content',
  AuthHelper.ensureAuthenticated,
  function(req, res) {
    var content = req.param('content');
    client.search({
      index: 'tidalwave.pages',
      body: {
        from:0,
        size:10,
        query: {
          filtered: {
            filter: {
              or: [
                {
                  terms: {
                    userPermissions: [req.user.username]
                  }
                },
                {
                  terms: {
                    groupPermissions: req.user.groups
                  }
                },
                {
                  terms: {
                    derivedUserPermissions: [req.user.username]
                  }
                },
                {
                  terms: {
                    derivedGroupPermissions: req.user.groups
                  }
                }
              ]
            },
            query: {
              match_phrase_prefix: {        
                content: {
                  query:'"'+content+'"',
                  prefix_length:3,
                  max_expansions : 100000
                }
              }
            }
          }
        }
      }
    }).then(function (body) {
      var hits = body.hits.hits;
      console.log(hits);
      var results = [];
      for (var i=0;i<hits.length;i++) {
        var result = hits[i]._source;
        result._id = hits[i]._id;
        results.push(result);
      }
      res.status(200).type("application/json").send(JSON.stringify(results));
    }, function (error) {
      console.log(error.message);
      res.status(500).done();
    });
  }
);

router.post(
  '/recentChangesVisible',
  AuthHelper.ensureAuthenticated,
  function(req,res) {
    console.log("RECENT CHANGES VISIBLE");
    res.status(200).type("application/json").send("\"asdf\"");
  });

module.exports = router;
