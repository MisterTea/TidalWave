var express = require('express');
var router = express.Router();

var Hierarchy = require('../hierarchy');

var model = require('../model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;

router.post(
  '/hierarchy/:uid',
  require('../auth-helper').ensureAuthenticated,
  function(req, res) {
    res.type('application/json').status(200).send(JSON.stringify(Hierarchy.pageHierarchy));
  }
);

router.post(
  '/hierarchyStartsWith/:query',
  require('../auth-helper').ensureAuthenticated,
  function(req, res) {
    Hierarchy.fetch({name: new RegExp("^"+req.param('query'), "i")}, function(result) {
      res
        .type('application/json')
        .status(200)
        .send(JSON.stringify(result));
    });
  }
);

module.exports = router;
