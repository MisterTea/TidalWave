app.directive('validateemail', function() {
  return {
    require: 'ngModel',
    link: function(scope, elm, attrs, ctrl) {
      ctrl.$validators.validateemail = function(modelValue, viewValue) {
        if (ctrl.$isEmpty(modelValue)) {
          // consider empty models to be valid
          return true;
        }

        return validator.isEmail(modelValue);
      };
    }
  };
});

app.directive('registeremail', function($q, $http) {
  return {
    require: 'ngModel',
    link: function(scope, elm, attrs, ctrl) {
      ctrl.$asyncValidators.registeremail = function(modelValue, viewValue) {

        if (ctrl.$isEmpty(modelValue)) {
          // consider empty model valid
          return $q.when();
        }

        var def = $q.defer();

        $http.post('/service/getUserByEmail/'+modelValue)
          .success(function(data, status, headers, config) {
            if (data) {
              def.reject();
            } else {
              // The email is available
              def.resolve();
            }
          })
          .error(function(data, status, headers, config) {
            // TODO: Better error message here.
            def.reject();
          });

        return def.promise;
      };
    }
  };
});

app.controller('RegisterController', ['$scope', '$http', '$timeout', 'pageStateService', function($scope, $http, $timeout, pageStateService) {
  $scope.user = {
    email:"",
    fullName:"",
    password:""
  };

  $scope.getEmailFormClass = function(name) {
    if ($scope.form.email.$pending && $scope.form.email.$pending.registeremail) {
      return 'form-group has-warning';
    } else {
      return $scope.getFormClass(name);
    }
  };

  $scope.getFormClass = function(name) {
    if ($scope.form[name].$dirty && $scope.form[name].$viewValue && $scope.form[name].$viewValue.length>0) {
      return ($scope.form[name].$invalid)?'form-group has-error':'form-group has-success';
    } else {
      return 'form-group';
    }
  };

  $scope.register = function() {
    $http.post('/register', $scope.user)
      .success(function(data, status, headers, config) {
        window.location.href = "/view/Welcome?tour=yes";
      })
      .error(function(data, status, headers, config) {
      });
  };
}]);
