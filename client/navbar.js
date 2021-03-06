var app = require('./app').app;
var _ = require('lodash');
var saveAs = require('./thirdparty/FileSaver.js').saveAs;
var Blob = window.Blob;

app.controller('NavbarController', ['$scope', '$rootScope', 'retryHttp', '$modal', '$timeout', 'pageStateService', function($scope, $rootScope, retryHttp, $modal, $timeout, pageStateService) {
  $scope.username = "";
  $scope.editMode = pageStateService.get('editMode');
  $scope.projectName = "TidalWave";
  $scope.settingsActive = pageStateService.get('settingsActive');
  $scope.editable = false;
  $scope.page = {};
  $scope.$on('pageStateServiceUpdate', function(event, response) {
    console.log("Updating settings: " + pageStateService.get('settingsActive'));
    $scope.settingsActive = pageStateService.get('settingsActive');
    $scope.editMode = pageStateService.get('editMode');
    var pageDetails = pageStateService.get('pageDetails');
    if (pageDetails) {
      $scope.page = pageDetails.page;
      $scope.editable = pageDetails.editable;
    } else {
      $scope.page = null;
    }
    var user = pageStateService.get('user');
    if (user) {
      $scope.username = user.fullName;
    }
    if (user && $scope.page) {
      $scope.isWatchingPage = _.contains(user.watchedPageIds, $scope.page._id);
    } else {
      $scope.isWatchingPage = false;
    }

    var pageMode = pageStateService.get('pageMode');
    $scope.history = pageMode=='history' || pageMode=='diff';
  });
  $scope.toggleHistory = function() {
    console.log("Toggling history");
    var history = pageStateService.get('history');
    if (history) {
      console.log("Clearing history");
      pageStateService.set('history',null);
      pageStateService.set('diff',null);
      pageStateService.set('pageMode','content');
    } else {
      console.log("Fetching history");
      retryHttp.post(
        'service/pageHistory/'+pageStateService.get('pageDetails').page._id,
        null,
        function(data, status, headers, config) {
          console.log("GOT HISTORY");
          console.log(data);
          pageStateService.set('history',data);
        });
    }
  };
  $scope.toggleSettings = function() {
    console.log("Toggling setting");
    pageStateService.set(
      'settingsActive',
      !pageStateService.get('settingsActive'));
    var editor = require('./content').editor;
    editor.focus(); //To focus the ace editor (this also fixes the settings highlight)
  };
  $scope.toggleWatch = function() {
    console.log("TOGGLING WATCH");
    var user = pageStateService.get('user');
    if ($scope.isWatchingPage) {
      // Stop watching
      user.watchedPageIds = _.without(user.watchedPageIds,$scope.page._id);
    } else {
      // Start watching
      user.watchedPageIds.push($scope.page._id);
    }
    console.log("USER CHANGED");
    pageStateService.setAndPush('user',user);
  };
  $scope.toggleEditMode = function() {
    console.log("Toggling setting");
    if (pageStateService.get('editMode')) {
      $rootScope.$broadcast('finishedEditMode', {});
    } else {
      pageStateService.set('editMode',true);
    }
  };

  $scope.saveHTML = function() {
    var pageDetails = pageStateService.get('pageDetails');
    retryHttp.get(
      '/all.css',
      function(data, status, headers, config) {
        var css = data;
        var marked = require('./content').marked;
        var htmlPage = "<html><head><style>"+css+"</style></head><body>"+marked(pageDetails.page.content)+"</body></html>";
        var blob = new Blob([htmlPage], {type: "text/plain;charset=utf-8"});
        saveAs(blob, pageDetails.page.name + ".html");
      });
  };

  $scope.savePDF = function() {
    // TODO: Use phantomJS to render this server-side and present a PDF
  };

  $scope.deletePage = function() {
    var pageDetails = pageStateService.get('pageDetails');
    var modalInstance = $modal.open({
      templateUrl: 'deletePageModalContent.html',
      controller: 'DeletePageModalInstanceCtrl',
      resolve: {
        pagename: function() {
          return pageDetails.page.name;
        }
      }
    });

    modalInstance.result.then(function () {
      retryHttp.post(
        'service/deletePage/'+pageDetails.page._id,
        null,
        function(data, status, headers, config) {
          window.location='view/';
        });
    }, function () {
      console.log('Modal dismissed at: ' + new Date());
    });
  };
}]);

app.controller('DeletePageModalInstanceCtrl', function ($scope, $modalInstance, pagename) {
  $scope.pagename = pagename;

  $scope.ok = function () {
    $modalInstance.close();
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
});
