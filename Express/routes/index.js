var express = require('express');
var router = express.Router();

var Hierarchy = require('../hierarchy');

router.get(
  '/',
  require('../auth-helper').ensureAuthenticated,
  function(req, res) {
    res.render('page', {
      server:{
        projectName:"Tidal Wave",
        user:req.user
      }
    });
  }
);

router.get(
  '/:page',
  require('../auth-helper').ensureAuthenticated,
  function(req, res) {
    res.render('page', {
      server:{
        projectName:"Tidal Wave",
        user:req.user
      }
    });
  }
);

module.exports = router;
