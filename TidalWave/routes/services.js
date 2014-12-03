var express = require('express');
var Hierarchy = require('../server/hierarchy');
var AuthHelper = require('../server/auth-helper');
var LiveSync = require('../server/livesync');
var toc = require('marked-toc');
var _ = require('lodash');
var SearchHandler = require('../server/search-handler');
var log = require('../server/logger').log;

var model = require('../server/model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;
var Group = model.Group;
var Image = model.Image;

var queryPermissionWrapper = AuthHelper.queryPermissionWrapper;
var userCanAccessPage = AuthHelper.userCanAccessPage;

var router = express.Router();

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
      model.saveAllDocuments(pages,function() {

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

var userPermissionFilter = function(user) {
  if (user) {
    return {
      or: [
        {
          terms: {
            userPermissions: [user._id]
          }
        },
        {
          terms: {
            groupPermissions: user.groups
          }
        },
        {
          terms: {
            derivedUserPermissions: [user._id]
          }
        },
        {
          terms: {
            derivedGroupPermissions: user.groups
          }
        },
        {
          term: {
            isPublic: true
          }
        }
      ]
    };
  } else {
    return {
      term: {
        isPublic: true
      }
    };
  }
};

router.post(
  '/me',
  function(req, res) {
    if (req.isAuthenticated()) {
      res.status(200).type('application/json').send(req.user);
    } else {
      res.status(200).type('application/json').send(null);
    }
  }
);

router.post(
  '/updateMe',
  function(req, res) {
    if (!req.isAuthenticated()) {
      log.warn("Tried to update user but not authenticated");
      res.status(403).end();
      return;
    }

    var newUser = req.body;
    if (newUser._id != req.user._id.toString()) {
      log.warn({message:"Tried to update user but wrong user id",requestedUser:newUser,actualId:req.user._id});
      res.status(403).end();
      return;
    }
    User.findByIdAndUpdate(
      newUser._id,
      newUser,
      function(err, dummyUser) {
        if (err) {
          log.error({error:err});
          res.status(500).end();
        }
        res.status(200).end();
      });
  }
);

router.post(
  '/updatePage',
  function(req, res) {
    if (!req.isAuthenticated()) {
      res.status(403).end();
      return;
    }

    var page = new Page(req.body);
    log.debug({text:"UPDATING PAGE:", page:page});
    
    Page.findById(
      page._id,
      function(err, outerPage) {
        userCanAccessPage(req.user,outerPage,function(outerSuccess) {
          if (!outerSuccess) {
            log.info("TRIED TO UPDATE PAGE WITHOUT ACCESS: " + req.user.email + " " + page.name);
            // Tried to update a page without access
            res.status(403).end();
            return;
          }
          userCanAccessPage(req.user,page,function(success) {
            if (success) {
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
                       log.error({error:err});
                       res.status(500).end();
                       return;
                     }
                     log.debug("Updated successfully");
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
              log.info("UPDATE WOULD BAN USER FROM HIS OWN PAGE");
              // Tried to change permissions in a way that would ban the user doing the update.
              res.status(400).end();
            }
          });
        });
      });
  }
);

router.post(
  '/getTOC/:pageId',
  function(req, res) {
    var pageId = req.param('pageId');

    queryPermissionWrapper(Page.findById(pageId), req.user)
      .exec(function(err, page) {
        if (err) {
          log.error({error:err});
          res.status(500).end();
        } else if (!page) {
          log.info("Tried to get table of contents for non-existant page: " + page._id);
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
  function(req, res) {
    var query = req.param('query');

    queryPermissionWrapper(
      Page.find({name:new RegExp("^"+query, "i")}), req.user)
      .limit(10)
      .exec(function(err, pages) {
        log.debug("Result for " + query + ": " + JSON.stringify(pages));
        res.status(200).type("application/json").send(JSON.stringify(pages));
      });
  }
);

router.post(
  '/pageDetailsByName/:name',
  function(req, res) {
    log.debug("Getting page details with name: " + req.param('name'));
    queryPermissionWrapper(
      Page.findOne({name:req.param('name')}), req.user)
      .exec(function(err, page) {
        log.debug("Got page: " + JSON.stringify(page));
        if (page) {
          Hierarchy.getAncestry(page, function(ancestry) {
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
                  log.error({error:err});
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
  function(req, res) {
    log.debug("Getting history");
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
  function(req, res) {
    var newParent = req.param('parentId');
    if (newParent == '___null___') {
      newParent = null;
    }
    queryPermissionWrapper(
      Page.findOne({_id:req.param('pageId')}), req.user)
      .exec(function(err, page) {
        if (page) {
          page.parentId = newParent;
          page.save(function(err, innerPage) {
            res.status(200).end();
          });
        } else {
          res.status(403).end();
        }
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
    log.debug("SAVING DYNAMIC CONTENT");
    var pageName = req.param('pageName');
    LiveSync.sync(pageName, function() {
      log.debug("PAGE SAVED.  RETURNING 200");
      res.status(200).end();
    });
  }
);

router.post(
  '/findUserFullName/:fullName',
  function(req, res) {
    var fullName = req.param('fullName');
    User
      .find({fullName:new RegExp("^"+fullName, "i")})
      .where('lastLoginTime').ne(null)
      .limit(5)
      .sort('-fullName')
      .exec(function(err, users) {
        if (err) {
          log.error(err);
          res.status(500).end();
          return;
        }

        log.debug({results:users});
        res.status(200).type("application/json").send(JSON.stringify(users));
      });
  }
);

router.post(
  '/findGroupName/:name',
  function(req, res) {
    var name = req.param('name');
    Group
      .find({fullName:new RegExp("^"+name, "i")})
      .limit(5)
      .sort('-name')
      .exec(function(err, groups) {
        if (err) {
          log.error(err);
          res.status(500).end();
          return;
        }

        log.debug({results:groups});
        res.status(200).type("application/json").send(JSON.stringify(groups));
      });
  }
);

router.post(
  '/findPageContent/:content',
  function(req, res) {
    var content = req.param('content');
    var client = SearchHandler.client;
    if (client) {
      log.info("Searching with elasticsearch");
      client.search({
        index: 'tidalwave.pages',
        body: {
          from:0,
          size:10,
          query: {
            filtered: {
              filter: userPermissionFilter(req.user),
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
        log.error(error);
        res.status(500).end();
      });
    } else {
      log.info("Searching with mongoose");
      queryPermissionWrapper(Page
        .find({content:new RegExp(content, "i")}), req.user)
        .limit(10)
        .sort('-name')
        .exec(function(err, pages) {
          if (err) {
            log.error(err);
            res.status(500).end();
            return;
          }

          log.debug({results:pages});
          res.status(200).type("application/json").send(JSON.stringify(pages));
        });
    }
  }
);

router.post(
  '/recentChangesVisible',
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
          imageData.pageId + "_" +
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
  function(req,res) {
    var name = req.param('name');
    console.log("Getting image with name " + name);

    var pageId = name.split('_')[0];
    queryPermissionWrapper(
      Page.findById(pageId), req.user)
      .exec(function(err, page) {
        if (err) {
          res.status(500).end();
          return;
        }
        if (!page) {
          res.status(403).end();
        }

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
  });

module.exports = router;
