var app = require('./app').app;
var $ = require('jquery');
require('./pagestateservice').pageStateService;

app.controller('LoginController', ['$scope', '$http', '$timeout', '$location', 'pageStateService', function($scope, $http, $timeout, $location, pageStateService) {
  var baseUrl = window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/"));
  if (window.location.hash) {
    $("#login-form").attr("action", "login?redirect=" + encodeURIComponent(baseUrl + "/view"+window.location.hash));
  } else {
    $("#login-form").attr("action", "login?redirect=" + encodeURIComponent(baseUrl + "/view"));
  }
}]);
