var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/:pagename', function(req, res) {
  console.log("GOT REQUEST FOR PAGE NAME: " + req.param('pagename'));
  res.render('page', { pagename: req.param('pagename') });
});

module.exports = router;
