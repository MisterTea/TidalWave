var express = require('express');
var router = express.Router();

var Hierarchy = require('../server/hierarchy');

router.get(
  '/',
  require('../server/auth-helper').ensureAuthenticated,
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
  require('../server/auth-helper').ensureAuthenticated,
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
