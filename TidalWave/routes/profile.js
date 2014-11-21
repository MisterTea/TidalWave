var express = require('express');
var router = express.Router();

var pageHierarchy = require('../server/hierarchy').pageHierarchy;

router.get(
  '/:profile',
  require('../server/auth-helper').ensureAuthenticated,
  function(req, res) {
    console.log("PROFILE ID: " + req.param('profile'));
    res.render('profile', {
      profileId:req.param('profile'),
      userId:"JasonGauci",
      pageHierarchy:pageHierarchy,
      navbarData:{
        projectName:"Tidal Wave",
        userName:"Jason Gauci",
        onPage:false,
        editMode:false
      }
    });
  }
);

module.exports = router;
