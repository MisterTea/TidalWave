var app = require('./app').app;
var $ = require('jquery');
require('./pagestateservice').pageStateService;

app.controller('LoginController', ['$scope', '$http', '$timeout', '$location', 'pageStateService', function($scope, $http, $timeout, $location, pageStateService) {
  if (window.location.hash) {
    $("#login-form").attr("action", "/login?redirect=" + encodeURIComponent("/view/"+window.location.hash));
  } else {
    $("#login-form").attr("action", "/login?redirect=" + encodeURIComponent("/view/"));
  }
}]);
