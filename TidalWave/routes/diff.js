var express = require('express');
var router = express.Router();

var pageHierarchy = require('../server/hierarchy').pageHierarchy;

/* GET users listing. */
router.get(
  '/:pagename',
  require('../server/auth-helper').ensureAuthenticated,
  function(req, res) {
    res.render('diff', {
      pagename: req.param('pagename'),
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
