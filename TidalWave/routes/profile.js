var express = require('express');
var router = express.Router();

var pageHierarchy = require('../server/hierarchy').pageHierarchy;

router.get(
  '/:profile',
  require('../server/auth-helper').ensureAuthenticated,
  function(req, res) {
    res.render('profile', {
      server: {
        user:req.user
      }
    });
  }
);

module.exports = router;
