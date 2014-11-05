var express = require('express');
var router = express.Router();

var Hierarchy = require('../hierarchy');

var model = require('../model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;

router.get('/renamePage/:oldName/:newName', function(req, res) {
  var oldName = req.param('oldName');
  var newName = req.param('newName');

  Page.findOne({name:oldName}, function(err, page) {
    page.name = newName;
    page.save(function(err, innerPage) {
      res.status(200).end();
    });
  });
});

router.get('/pageStartsWith/:query', function(req, res) {
  var query = req.param('query');

  Page
    .find({name:new RegExp("^"+query, "i")})
    .limit(10)
    .exec(function(err, pages) {
      console.log("Result for " + query + ": " + JSON.stringify(pages));
      res.status(200).type("application/json").send(JSON.stringify(pages));
    });
});

router.get('/pageDetailsByName/:name', function(req, res) {
  console.log("Getting page details with name: " + req.param('name'));
  Page.findOne({name:req.param('name')}, function(err, page) {
    console.log("Got page");
    console.log(page);
    if (page) {
      PageVersion
        .find({pageId:page._id})
        .sort({version:-1})
        .limit(1)
        .exec(function(err, pageVersionList){
          if(err) {
            console.log(err);
          } else {
            var pageVersion = pageVersionList[0];
            if (pageVersion) {
              var pageDetails = {
                page:page,
                ancestry:Hierarchy.pageAncestry[page._id],
                version:null,
                content:pageVersion.content
              };
              res.status(200).type("application/json").send(JSON.stringify(pageDetails));
            } else {
              res.status(404).end();
            }
          }
        });
    } else {
      res.status(404).end();
    }
  });
});


router.get('/setPageParent/:pageId/:parentId', function(req, res) {
  Page.findOne({_id:req.param('pageId')}, function(err, page) {
    page.parentId = req.param('parentId');
    page.save(function(err, innerPage) {
      res.status(200).end();
    });
  });
});

module.exports = router;
