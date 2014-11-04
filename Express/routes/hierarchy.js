var express = require('express');
var router = express.Router();

var Hierarchy = require('../hierarchy');

var model = require('../model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;

router.get('/hierarchy/:uid', function(req, res) {

  res.type('application/json').status(200).send(JSON.stringify(Hierarchy.pageHierarchy));
/*
'[ { "label": "Animal", "children": [ { "label": "Dog", "data": { "description": "man\'s best friend" } }, { "label": "Cat", "data": { "description": "Felis catus" } }, { "label": "Hippopotamus", "data": { "description": "hungry, hungry" } }, { "label": "Chicken", "children": ["White Leghorn", "Rhode Island Red", "Jersey Giant"] } ] }, { "label": "Vegetable", "data": { "definition": "A plant or part of a plant used as food, typically as accompaniment to meat or fish, such as a cabbage, potato, carrot, or bean.", "data_can_contain_anything": true }, "children": [ { "label": "Oranges" }, { "label": "Apples", "children": [ { "label": "Granny Smith" }, { "label": "Red Delicous" }, { "label": "Fuji" } ] } ] }, { "label": "Mineral", "children": [ { "label": "Rock", "children": ["Igneous", "Sedimentary", "Metamorphic"] }, { "label": "Metal", "children": ["Aluminum", "Steel", "Copper"] }, { "label": "Plastic", "children": [ { "label": "Thermoplastic", "children": ["polyethylene", "polypropylene", "polystyrene", " polyvinyl chloride"] }, { "label": "Thermosetting Polymer", "children": ["polyester", "polyurethane", "vulcanized rubber", "bakelite", "urea-formaldehyde"] } ] } ] } ]');
*/
  });

router.get('/hierarchyStartsWith/:query', function(req, res) {
  Hierarchy.fetch({name: new RegExp("^"+req.param('query'), "i")}, function(result) {
  res
    .type('application/json')
    .status(200)
    .send(JSON.stringify(result));
  });
});

module.exports = router;
