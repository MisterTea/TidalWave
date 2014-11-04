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
      res.status(200).type("application/json").send(JSON.stringify(pages));
    });
});

module.exports = router;
