var express = require('express');
var Hierarchy = require('../server/hierarchy');
var AuthHelper = require('../server/auth-helper');
var options = require('../server/options-handler').options;
var log = require('../server/logger').log;

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
    if (req.isAuthenticated()) {
      res.render('page', {
        server:{
          projectName:options.serverName,
          user:req.user
        }
      });
    } else {
      res.redirect('/login');
    }
  }
);

router.get(
  '/:page',
  function(req, res) {
    var pageName = req.param('page');

    Page.findOne({name:pageName})
      .exec(function(err, page) {
        var pageIsPublic = (page && page.isPublic);
    
        if (!req.isAuthenticated() && !pageIsPublic) { 
          var totalUrl = req.baseUrl + req.url;
          log.warn({invalidAuthentication:true,user:req.user,url:totalUrl});
          res.redirect('/login?redirect='+totalUrl);
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
