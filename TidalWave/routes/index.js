var express = require('express');
var Hierarchy = require('../server/hierarchy');
var AuthHelper = require('../server/auth-helper');
var options = require('../server/options-handler').options;

var router = express.Router();

var model = require('../server/model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;
var Group = model.Group;
var Image = model.Image;

router.get(
  '/',
  function(req, res) {
    res.render('page', {
      server:{
        projectName:options.serverName,
        user:req.user
      }
    });
  }
);

router.get(
  '/:page',
  function(req, res) {
    var pageName = req.param('page');

    Page.findOne({name:pageName})
      .exec(function(err, page) {
        var pageIsPublic = (page && page.isPublic);
        console.log("FETCHING PAGE");
        console.log(page);
        console.log(err);
    
        if (!req.isAuthenticated() && !pageIsPublic) { 
          res.redirect('/login?redirect='+req.baseUrl + req.url);
          return;
        }
    
        res.render('page', {
          server:{
            projectName:options.serverName,
            user:req.user
          }
        });
      });
  }
);

module.exports = router;
