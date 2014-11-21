var express = require('express');
var router = express.Router();

var pageHierarchy = require('../server/hierarchy').pageHierarchy;

router.get(
  '/:pagename',
  require('../server/auth-helper').ensureAuthenticated,
  function(req, res) {
    res.render('history', {
      pagename: req.param('pagename'),
      pageHierarchy:pageHierarchy,
      navbarData:{
        projectName:"Tidal Wave",
        userName:req.user.fullName,
        onPage:false,
        editMode:false
      }
    });
  }
);

module.exports = router;
