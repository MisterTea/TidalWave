var express = require('express');
var router = express.Router();

var Hierarchy = require('../server/hierarchy');

var model = require('../server/model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;
var Group = model.Group;
var Image = model.Image;

var AuthHelper = require('../server/auth-helper');
var LiveSync = require('../server/livesync');

var toc = require('marked-toc');

var _ = require('lodash');

var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'warning'
});

var queryPermissionWrapper = AuthHelper.queryPermissionWrapper;

var userCanAccessPage = function(user,page,callback) {
  if (page.isPublic) {
    callback(true);
    return;
  }

  if (
    !(_.contains(page.userPermissions,user._id.toString())) &&
      !(_.intersection(page.groupPermissions,user.groups).length>0) &&
      !(_.contains(page.derivedUserPermissions,user._id.toString())) &&
      !(_.intersection(page.derivedGroupPermissions,user.groups).length>0)
  ) {
    callback(false);
    return;
  }
  if (page.parentId) {
    Page.findOne({_id:page.parentId},function(err, parentPage) {
      if (err) {
        // handle error
        //console.log(JSON.stringify(user) + " CANNOT FIND PARENT " + JSON.stringify(page));
        callback(false);
        return;
      }
      userCanAccessPage(user,parentPage,callback);
    });
  } else {
    //console.log(JSON.stringify(user) + " CAN ACCESS " + JSON.stringify(page));
    callback(true);
  }
};

var saveAllDocuments = function(documents, callback) {
  var onDocument = 0;
  var iterate = function(err, product, numberAffected) {
    onDocument++;
    if (documents.length>onDocument) {
      documents[onDocument].save(iterate);
    } else {
      callback();
    }
  };
  documents[onDocument].save(iterate);
};

var getAncestry = function(page, callback) {
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

var updateDerivedPermissions = function(page,callback) {
  // Store off the derived permission to propagate
  var baseUserPermissions = page.userPermissions;
  var baseGroupPermissions = page.groupPermissions;

  // Find all children pages
  Page.find({parentId:page._id}, function(err, pages) {
    if (pages.length==0) {
      // No children to update, return
      callback();
    } else {
      // Update all children's derived permissions
      for (var i=0;i<pages.length;i++) {
        pages[i].derivedUserPermissions = baseUserPermissions;
        pages[i].derviedGroupPermissions = baseGroupPermissions;
      }

      // Save all children
      saveAllDocuments(pages,function() {

        // Recursively update derived permissions for grandchildren.
        var onUpdate=0;
        var iterate = function() {
          onUpdate++;
          if (onUpdate>=pages.length) {
            // We are done
            callback();
          } else {
            updateDerivedPermissions(pages[onUpdate],iterate);
          }
        };
        updateDerivedPermissions(pages[onUpdate],iterate);
      });
    }
  });
};

router.post(
  '/me',
  AuthHelper.ensureAuthenticated,
  function(req, res) {
    res.status(200).type('application/json').send(req.user);
  }
);

router.post(
  '/updateMe',
  AuthHelper.ensureAuthenticated,
  function(req, res) {
    var newUser = req.body;
    if (newUser._id != req.user._id) {
      res.status(403).done();
      return;
    }
    User.findByIdAndUpdate(
      newUser._id,
      newUser,
      function(err, dummyUser) {
        if (err) {
          console.log("ERROR: " + JSON.stringify(err));
          res.status(500).done();
        }
        res.status(200).done();
      });
  }
);

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
            console.log("TRIED TO UPDATE PAGE WITHOUT ACCESS");
            // Tried to update a page without access
            res.status(403).end();
            return;
          }
          userCanAccessPage(req.user,page,function(success) {
            if (success) {
              console.log("UPDATING PAGE");
              console.log(page);
              var updatePage = function(page) {
                Page.findByIdAndUpdate(
                  page._id,
                  {$set: 
                   {name:page.name,
                    parentId:page.parentId,
                    userPermissions:page.userPermissions,
                    groupPermissions:page.groupPermissions,
                    derivedUserPermissions:page.derivedUserPermissions,
                    derivedGroupPermissions:page.derivedGroupPermissions,
                    isPublic:page.isPublic
                   }},function(err, page) {
                     if (err) {
                       console.log("Error updating page");
                       console.log(err);
                       res.status(500).end();
                       return;
                     }
                     console.log("Updated successfully");
                     console.log(page);
                     updateDerivedPermissions(page,function() {
                       res.status(200).end();
                     });
                   });
              };

              if (page.parentId) {
                // We need to fetch the parent in case the derived
                // permissions have changed.
                Page.findById(page.parentId, function(err, parentPage) {
                  if (err) {
                    res.status(500).end();
                    return;
                  }
                  page.derivedUserPermissions = parentPage.userPermissions;
                  page.derivedGroupPermissions = parentPage.groupPermissions;
                  updatePage(page);
                });
              } else {
                page.derivedUserPermissions = [];
                page.derivedGroupPermissions = [];
                updatePage(page);
              }
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
          getAncestry(page, function(ancestry) {
            var pageDetails = {
              page:page,
              ancestry:ancestry,
              version:null,
              content:page.content,
              userPermissions:[],
              groupPermissions:[]
            };
            // Get all users on the permissions list
            User.find(
              {'_id': { $in: page.userPermissions }},
              function(err,users) {
                if (err) {
                  console.log(err);
                  res.status(500).end();
                  return;
                }
                for (var i=0;i<users.length;i++) {
                  pageDetails.userPermissions.push(users[i]);
                }

                // Get all groups on the permissions list
                Group.find(
                  {'_id': { $in: page.groupPermissions }},
                  function(err, groups) {
                    if (err) {
                      console.log(err);
                      res.status(500).end();
                      return;
                    }
                    for (var j=0;j<groups.length;j++) {
                      pageDetails.groupPermissions.push(groups[j]);
                    }
                    res.status(200).type("application/json").send(JSON.stringify(pageDetails));
                  });
              });
          });
        } else {
          res.status(404).end();
        }
      });
  }
);

router.post(
  '/pageHistory/:pageId',
  AuthHelper.ensureAuthenticated,
  function(req, res) {
    console.log("Getting history");
    var pageId = req.param('pageId');

    queryPermissionWrapper(
      Page.findById(pageId), req.user).exec(function(err, page) {
        if (err) {
          res.status(500).end();
          return;
        }
        if (!page) {
          res.status(403).end();
          return;
        }
        PageVersion.find({pageId:page._id}, function(err, pageVersions) {
          if (err) {
            res.status(500).end();
            return;
          }
          pageVersions.reverse();
          res.status(200).type("application/json").send(JSON.stringify(pageVersions));
        });
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
          var innerPage = new Page({name:pageName,content:'',userPermissions:[req.user._id]});
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
    console.log("SAVING DYNAMIC CONTENT");
    var pageName = req.param('pageName');
    LiveSync.sync(pageName, function() {
      console.log("PAGE SAVED.  RETURNING 200");
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
                    userPermissions: [req.user._id]
                  }
                },
                {
                  terms: {
                    groupPermissions: req.user.groups
                  }
                },
                {
                  terms: {
                    derivedUserPermissions: [req.user._id]
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
      res.status(500).end();
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

var chance = new require('chance')();

router.post(
  '/saveImage',
  AuthHelper.ensureAuthenticated,
  function(req,res) {
    console.log("SAVING IMAGE");
    var imageData = req.body;

    var uniqueName =
          imageData.pageName + "_" +
          chance.string({length: 8, pool:"1234567890abcdef"}) + "_" +
          imageData.name;

    var image = new Image({
      base64:imageData.base64,
      data:new Buffer(imageData.base64, 'base64'),
      mime:imageData.mime,
      name:uniqueName});

    image.save(function (err) {
      if (err) {
        res.status(500).end();
      }
      res.status(200).type("text/plain").send(uniqueName);
    });
  });

router.get(
  '/getImage/:name',
  AuthHelper.ensureAuthenticated,
  function(req,res) {
    var name = req.param('name');
    console.log("Getting image with name " + name);

    Image.find({name:name}, function(err,results) {
      if (results.length>1) {
        res.status(500).end();
      } else if(results.length==0) {
        res.status(404).end();
      }
      var image = results[0];
      res.status(200).type(image.mime).send(image.data);
    });
  });

module.exports = router;
