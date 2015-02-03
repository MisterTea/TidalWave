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
    res.render('page', {
      server:{
        projectName:options.serverName,
        user:req.user
      }
    });
  }
);

module.exports = router;
