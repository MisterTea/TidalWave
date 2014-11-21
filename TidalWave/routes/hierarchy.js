var express = require('express');
var router = express.Router();

var Hierarchy = require('../server/hierarchy');

var model = require('../server/model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;

router.post(
  '/hierarchy/:uid',
  require('../server/auth-helper').ensureAuthenticated,
  function(req, res) {
    Hierarchy.fetch(req.user,{},function(hierarchy) {
      res.type('application/json').status(200).send(JSON.stringify(hierarchy));
    });
  }
);

router.post(
  '/hierarchyStartsWith/:query',
  require('../server/auth-helper').ensureAuthenticated,
  function(req, res) {
    Hierarchy.fetch(req.user,{name: new RegExp("^"+req.param('query'), "i")}, function(result) {
      res
        .type('application/json')
        .status(200)
        .send(JSON.stringify(result));
    });
  }
);

module.exports = router;
