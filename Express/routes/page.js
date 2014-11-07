var express = require('express');
var router = express.Router();

var Hierarchy = require('../hierarchy');

var model = require('../model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;

router.get(
  '/:pagename/edit',
  require('../auth-helper').ensureAuthenticated,
  function(req, res) {
    console.log("GOT REQUEST FOR PAGE NAME: " + req.param('pagename'));

    var renderFn = function(page) {
      res.render('page', {
        pageDetails:{
          page:page,
          ancestry:Hierarchy.pageAncestry[page._id],
          version:null,
          content:null
        },
        pageHierarchy:Hierarchy.pageHierarchy,
        editMode:true,
        navbarData:{
          projectName:"Tidal Wave",
          userName:"Jason Gauci",
          editMode:true,
          onPage:true
        }
      });
    };

    Page.findOne({name:req.param('pagename')}, function(err, page){
      if (page == null) {
        // Page does not exist yet, create
        var innerPage = new Page({name:req.param('pagename')});
        innerPage.save(function(err, innerInnerPage) {
          if (err) {
            console.log(err);
          } else {
            var pageVersion = new PageVersion({
              pageId:innerInnerPage._id,
              version:0,
              content:'',
              editorIds:[]});
            pageVersion.save(function(err, product, match) {
              if (err) {
                console.log(err);
              } else {
                renderFn(innerInnerPage);
              }
            });
          }
        });
      } else {
        renderFn(page);
      }
    });
  }
);

router.get(
  '/:pagename',
  require('../auth-helper').ensureAuthenticated,
  function(req, res) {
    console.log("GOT REQUEST FOR PAGE NAME: " + req.param('pagename'));
    Page.findOne({name:req.param('pagename')}, function(err, page) {
      if (err) {
        console.log(err);
      }
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
                res.render('page', {
                  pageDetails:{
                    page:page,
                    ancestry:Hierarchy.pageAncestry[page._id],
                    version:null,
                    content:pageVersion.content
                  },
                  pageHierarchy:Hierarchy.pageHierarchy,
                  editMode:false,
                  navbarData:{
                    projectName:"Tidal Wave",
                    userName:"Jason Gauci",
                    editMode:false,
                    onPage:true
                  }
                });
              } else {
                res.status(500).send("Document " + req.param('pagename') + " has no versions.");
              }
            }
          });
      } else {
        res.status(404).send("Document " + req.param('pagename') + " not found.");
      }
    });
  });

module.exports = router;
