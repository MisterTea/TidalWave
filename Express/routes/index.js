var express = require('express');
var router = express.Router();

var Hierarchy = require('../hierarchy');

router.get(
  '/',
  require('../auth-helper').ensureAuthenticated,
  function(req, res) {
    res.render('page', {
      pageDetails:null,
      editMode:false,
      pageHierarchy:Hierarchy.pageHierarchy,
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
