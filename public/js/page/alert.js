app.service('alertService', ['$rootScope', '$timeout', function($rootScope, $timeout) {
  var alerts = [];
  var getAlerts = function() {
    return alerts;
  };
  var pushAlert = function(level, message, timeout) {
    var newAlert = {level:level,message:message};
    alerts.push(newAlert);
    $rootScope.$broadcast('alertServiceUpdate', alerts);
    
    if (timeout) {
      $timeout(function() {
        removeAlert(newAlert);
      }, timeout);
    }
    return newAlert;
  };
  var removeAlert = function(alert) {
    for (var i=0;i<alerts.length;i++) {
      if (alerts[i] === alert) {
        alerts.splice(i,1);
        $rootScope.$broadcast('alertServiceUpdate', alerts);
        break;
      }
    }
  };
  var broadcast = function() {
    $rootScope.$broadcast('alertServiceUpdate', alerts);
  };
  return {
    getAlerts:getAlerts,
    pushAlert:pushAlert,
    removeAlert:removeAlert,
    broadcast:broadcast
  };
}]);

app.controller('AlertController', ['$scope', '$sce', 'alertService', function($scope, $sce, alertService) {
  $scope.alerts = [];

  $scope.$on('alertServiceUpdate', function(event, alerts) {
    $scope.alerts = [];
    var alertLevelsSeen = {};
    for (var a=0;a<alerts.length;a++) {
      if (alerts[a].level in alertLevelsSeen) {
        continue;
      }
      alertLevelsSeen[alerts[a].level] = true;
      var newAlert = _.cloneDeep(alerts[a]);
      newAlert.message = $sce.trustAsHtml(newAlert.message);
      $scope.alerts.push(newAlert);
    }
  });
}]);
