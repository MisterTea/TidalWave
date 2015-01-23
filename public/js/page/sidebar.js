app.controller('SideBarController', ['$scope', '$http', '$timeout', '$rootScope', 'pageStateService', function($scope, $http, $timeout, $rootScope, pageStateService) {
    $scope.query = "";
    var tree;
    $scope.my_tree_handler = function(branch) {
      console.log("CLICKED ON");
      console.dir(branch);
      changePage($http,branch.fqn,pageStateService,null);
    };
    $scope.my_data = [];
    $scope.my_tree = tree = {};
    $scope.queryPageExists = false;

    $scope.showMenu = true;

    $scope.submit = function() {
      if ($scope.query.length==0) {
        return;
      }

      if ($scope.queryPageExists) {
        window.location = "/view/"+$scope.query;
      } else {
      var user = pageStateService.get('user');
      if (user) {
        var pageDetails = pageStateService.get('pageDetails');
        var newParentId = null;
        if (pageDetails) {
          newParentId = pageDetails.page._id;
        }
        //console.log("Creating page");
        $http.post('/service/createPage',
                   {name:$scope.query, parentId:newParentId})
          .success(function(data, status, headers, config) {
            //TODO: Say success
            console.log("Created page");
            var newPageFQN = data;
            $scope.query = '';
            changePage($http,newPageFQN,pageStateService, function() {
              pageStateService.set('settingsActive', true);
              pageStateService.set('editMode',true);
            });
          })
          .error(function(data, status, headers, config) {
            //TODO: Alert with an error
          });
      } else {
        window.location = "/login";
      }
      }
    };

    $scope.$on('pageStateServiceUpdate', function(event, response) {
      console.log("GOT PAGE STATE UPDATE");
      console.dir(response);
      console.log(response.key);
      
      if (response.key == 'editMode' || response.key == 'pageMode') {
        // editmode/pagemode changed.  Maybe remove the query or hide
        // the whole menu.
        var newShowMenuValue = true;
        console.log("DEFAULT SHOWMENU TO TRUE");
        var editMode = pageStateService.get('editMode');
        var pageMode = pageStateService.get('pageMode');
        if (editMode || pageMode=='diff') {
          console.log("NOT SHOWING MENU: " + editMode + " " + pageMode);
          newShowMenuValue = false;
        }

        console.log("SETTING SHOWMENU FROM " + $scope.showMenu + " TO " + newShowMenuValue);
        $scope.showMenu = newShowMenuValue;
        
        var query = pageStateService.get('query');
        if (editMode && query) {
          query = null;
          pageStateService.set('query',null);
        }
      }

      if (response.key == 'query') {
        // query changed, refresh sidebar menu
        var query = pageStateService.get('query');
        if ($scope.query != query) {
          $scope.query = query;
          $scope.updateSidebarMenu($scope.query);
        }
      }

      if (response.key == 'user') {
        console.log("USER CHANGED");
        // User changed, refresh sidebar menu
        $scope.updateSidebarMenu($scope.query);
      }

      if (response.key == 'pageDetails') {
        var pageDetails = pageStateService.get('pageDetails');
        if (pageDetails) {
          console.log("Selecting branch " + pageDetails.page.name);
          $scope.my_tree.select_branch_by_name(pageDetails.page.name);
        }
      }
    });

    $scope.$watch('query',function(newValue,oldValue) {
      console.log(oldValue + " TO " + newValue);
      $scope.updateSidebarMenu(newValue);
    });

    $scope.updateSidebarMenu = function(newValue) {
      if (newValue && newValue.length>0) {
        pageStateService.set('query',newValue);
        $http.post('/service/findPageContent/'+newValue)
          .success(function(data, status, headers, config) {
            pageStateService.set('searchContentResults',data);
            console.log("PAGE CONTENT DATA");
            console.log(JSON.stringify($scope.searchContentResults));
          })
          .error(function(data, status, headers, config) {
            //TODO: Alert with an error
          });

        $http.post('/service/pageStartsWith/'+newValue)
          .success(function(data, status, headers, config) {
            var nextData = [];
            $scope.queryPageExists = false;
            for (var i=0;i<data.length;i++) {
              if (data[i].name == newValue) {
                // Page already exists with the query, change the
                // create behavior to goto.
                $scope.queryPageExists = true;
              }
              nextData.push({id:data[i]._id, label:data[i].name, fqn:data[i].fullyQualifiedName, children:[]});
            }
            console.log("COMPARING DATA");
            console.dir($scope.lastData);
            console.dir(nextData);
            if (!_.isEqual($scope.lastData,nextData)) {
              console.log("Menu has changed");
              $scope.lastData = _.cloneDeep(nextData);
              $scope.my_data = nextData;
              $timeout(function() {
                $scope.my_tree.expand_all();
                var pageDetails = pageStateService.get('pageDetails');
                if (pageDetails) {
                  console.log("Selecting branch " + pageDetails.page.name);
                  $scope.my_tree.select_branch_by_name(pageDetails.page.name);
                }
              });
            } else {
              console.log("menu hasn't changed");
            }
          })
          .error(function(data, status, headers, config) {
            //TODO: Alert with an error
          });
      } else {
        pageStateService.set('searchContentResults',null);
        pageStateService.set('query',null);
        console.log("UPDATING HIERARCHY");
        $http.post('/service/hierarchy')
          .success(function(data, status, headers, config) {
            var nextData = [];
            for (var i=0;i<data.length;i++) {
              nextData.push(convertToNav(data[i]));
            }
            console.log("COMPARING DATA");
            console.dir($scope.lastData);
            console.dir(nextData);
            if (!_.isEqual($scope.lastData,nextData)) {
              console.log("Menu has changed");
              $scope.lastData = _.cloneDeep(nextData);
              $scope.my_data = nextData;
              $timeout(function() {
                $scope.my_tree.expand_all();
                var pageDetails = pageStateService.get('pageDetails');
                if (pageDetails) {
                  console.log("Selecting branch " + pageDetails.page.name);
                  $scope.my_tree.select_branch_by_name(pageDetails.page.name);
                }
              });
            } else {
              console.log("menu hasn't changed");
            }
          })
          .error(function(data, status, headers, config) {
            //TODO: Alert with an error
          });
      }
    };

    $scope.updateSidebarMenu($scope.query);
}]);
