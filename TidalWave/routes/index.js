var express = require('express');
var Hierarchy = require('../server/hierarchy');
var AuthHelper = require('../server/auth-helper');
var options = require('../server/options-handler').options;

var router = express.Router();

router.get(
  '/',
  AuthHelper.ensureAuthenticated,
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
  AuthHelper.ensureAuthenticated,
  function(req, res) {
    res.render('page', {
      server:{
        projectName:options.serverName,
        user:req.user
      }
    });
  }
);

module.exports = router;
