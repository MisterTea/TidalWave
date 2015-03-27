app.controller('LoginController', ['$scope', '$http', '$timeout', '$location', 'pageStateService', function($scope, $http, $timeout, $location, pageStateService) {
  if (location.hash) {
    $("#login-form").attr("action", "/login?redirect=" + encodeURIComponent("/view/"+location.hash));
  } else {
    $("#login-form").attr("action", "/login?redirect=" + encodeURIComponent("/view/"));
  }
}]);
