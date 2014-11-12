var express = require('express');
var router = express.Router();

var Hierarchy = require('../hierarchy');

var model = require('../model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;

var AuthHelper = require('../auth-helper');
var LiveSync = require('../livesync');

var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'warning'
});

router.post(
  '/updatePage/:page',
  AuthHelper.ensureAuthenticated,
  function(req, res) {
    var page = new Page(JSON.parse(req.param('page')));
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
  }
);

router.post(
  '/pageStartsWith/:query',
  AuthHelper.ensureAuthenticated,
  function(req, res) {
    var query = req.param('query');

    Page
      .find({name:new RegExp("^"+query, "i")})
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
    Page.findOne({name:req.param('name')}, function(err, page) {
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
  });


router.post(
  '/setPageParent/:pageId/:parentId',
  AuthHelper.ensureAuthenticated,
  function(req, res) {
    var newParent = req.param('parentId');
    if (newParent == '___null___') {
      newParent = null;
    }
    Page.findOne({_id:req.param('pageId')}, function(err, page) {
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
    Page.findOne({name:pageName}, function(err, page){
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
              term: {
                loggedIn: "true"
              }
            },
            query: {
              match_phrase_prefix: {        
                fullName: {
                  query:'"'+fullName+'"',
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
              max_expansions : 100000
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
                  }},
                {
                  terms: {
                    groupPermissions: req.user.groups
                  }}]
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
