/// <reference path='../../typings/node/node.d.ts' />

var express = require('express');

import AuthHelper = require('../auth-helper');
import options = require('../options-handler');
import log = require('../logger');

var router = express.Router();

import model = require('../model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;
var Group = model.Group;
var Image = model.Image;

router.get(
  '/',
  function(req, res) {
    res.render('index', {
      server:{
        projectName:options.serverName
      }
    });
  }
);

export = router;
