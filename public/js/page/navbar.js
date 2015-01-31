app.controller('NavbarController', ['$scope', '$http', '$modal', 'pageStateService', function($scope, $http, $modal, pageStateService) {
    $scope.username = "";
    $scope.editMode = pageStateService.get('editMode');
    $scope.projectName = "Tidal Wave";
    $scope.settingsActive = pageStateService.get('settingsActive');
    $scope.page = {};
    $scope.$on('pageStateServiceUpdate', function(event, response) {
      console.log("Updating settings");
      $scope.settingsActive = pageStateService.get('settingsActive');
      $scope.editMode = pageStateService.get('editMode');
      var pageDetails = pageStateService.get('pageDetails');
      if (pageDetails) {
        $scope.page = pageDetails.page;
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
        $http.post('/service/pageHistory/'+pageStateService.get('pageDetails').page._id)
          .success(function(data, status, headers, config) {
            // TODO: Implement this url
            console.log("GOT HISTORY");
            console.log(data);
            pageStateService.set('history',data);
          })
          .error(function(data, status, headers, config) {
            //TODO: Alert with an error
            console.log("ERROR");
            console.log(data);
          });

      }
    };
    $scope.toggleSettings = function() {
      console.log("Toggling setting");
      pageStateService.set(
        'settingsActive',
        !pageStateService.get('settingsActive'));
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
      pageStateService.set(
        'editMode',
        !pageStateService.get('editMode'));
    };

    $scope.saveHTML = function() {
      var pageDetails = pageStateService.get('pageDetails');
      $http.get('/all.css')
        .success(function(data, status, headers, config) {
          var css = data;
          var htmlPage = "<html><head><style>"+css+"</style></head><body>"+marked(pageDetails.page.content)+"</body></html>";
          var blob = new Blob([htmlPage], {type: "text/plain;charset=utf-8"});
          saveAs(blob, pageDetails.page.name + ".html");
        })
        .error(function(data, status, headers, config) {
        });
    };

    $scope.savePDF = function() {
      var pageDetails = pageStateService.get('pageDetails');
      var doc = new jsPDF();
      doc.fromHTML(
        marked(pageDetails.page.content),
        15,
        15,
        {
          'width': 100
        });

      doc.save(pageDetails.page.name + ".pdf");
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
        $http.post('/service/deletePage/'+pageDetails.page._id)
          .success(function(data, status, headers, config) {
            window.location='/view/';
          })
          .error(function(data, status, headers, config) {
            //TODO: Alert with an error
            console.log("ERROR");
            console.log(data);
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
