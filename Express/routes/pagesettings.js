var express = require('express');
var router = express.Router();

var Hierarchy = require('../hierarchy');

var model = require('../model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;

router.get('/:pagename', function(req, res) {
  Page.findOne({name:req.param('pagename')}, function(err, page) {
    if (err) {
      console.log(err);
    }
    if (page) {
      res.render('pagesettings', {
        pageDetails:{
          page:page,
          ancestry:Hierarchy.pageAncestry[page._id]
        },
        pageHierarchy:Hierarchy.pageHierarchy,
        navbarData:{
          projectName:"Tidal Wave",
          userName:"Jason Gauci",
          onPage:true,
          editMode:false
        }
      });
    } else {
      res.status(404).send("Document " + req.param('pagename') + " not found.");
    }
  });
});

module.exports = router;
