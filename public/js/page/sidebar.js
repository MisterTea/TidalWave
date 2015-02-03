app.controller('SideBarController', ['$scope', '$location', '$timeout', '$rootScope', '$log', 'pageStateService', 'retryHttp', function($scope, $location, $timeout, $rootScope, $log, pageStateService, retryHttp) {
  $scope.query = "";
  $scope.selectedPageInTree = function(branch) {
    $log.debug("CLICKED ON");
    $log.debug(branch);
    changePage(retryHttp,$location,branch.fqn,pageStateService,null);
  };
  $scope.my_data = [];
  $scope.my_tree = {};
  $scope.queryPageExists = false;
  $scope.showMenu = true;

  // The user has pressed enter on a query.  Go to the page or create
  // a new page if it does not exist.
  $scope.submit = function() {
    if ($scope.query.length==0) {
      return;
    }

    // TODO: queryPageExists is updated too late, make a new check for
    // this when we switch to ajax page changes.
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
        $log.debug("Creating page");
        retryHttp.post(
          '/service/createPage',
          {name:$scope.query, parentId:newParentId},
          function(data, status, headers, config) {
            $log.debug("Created page");
            var newPageFQN = data;
            $scope.query = '';
            changePage(retryHttp,$location,newPageFQN,pageStateService, function() {
              pageStateService.set('settingsActive', true);
              pageStateService.set('editMode',true);
            });
          });
      } else {
        window.location = "/login";
      }
    }
  };

  $scope.$on('pageStateServiceUpdate', function(event, response) {
    var key = response.key;
    var value = response.value;

    if (key == 'editMode' || key == 'pageMode') {
      // editmode/pagemode changed.  Maybe remove the query or hide
      // the whole menu.
      var editMode = pageStateService.get('editMode');
      var pageMode = pageStateService.get('pageMode');
      if (editMode || pageMode=='diff') {
        $log.debug("NOT SHOWING MENU: " + editMode + " " + pageMode);
        $scope.showMenu = false;
      } else {
        $scope.showMenu = true;
      }

      if (editMode && pageStateService.get('query')) {
        query = null;
        pageStateService.set('query',null);
      }
      if (editMode && pageStateService.get('searchContentResults')) {
        pageStateService.set('searchContentResults',null);
      }
    }

    else if (key == 'query' || key == 'user' || key == 'pageDetails') {
      if (key == 'pageDetails') {
        var pageDetails = value;
        $log.debug("Selecting branch " + pageDetails.page.name);
        $scope.my_tree.select_branch_by_name(pageDetails.page.name);
      }

      var query = pageStateService.get('query');
      if (query != $scope.query) {
        $scope.query = query;
      }
      if (query) {
        retryHttp.post(
          '/service/findPageContent/'+query,
          null,
          function(data, status, headers, config) {
            pageStateService.set('searchContentResults',data);
            $log.debug("PAGE CONTENT DATA");
            $log.debug(JSON.stringify($scope.searchContentResults));
          });

        retryHttp.post(
          '/service/pageStartsWith/'+query,
          null,
          function(data, status, headers, config) {
            var nextData = [];
            $scope.queryPageExists = false;
            for (var i=0;i<data.length;i++) {
              if (data[i].name == query) {
                // Page already exists with the query, change the
                // create behavior to goto.
                $scope.queryPageExists = true;
              }
              nextData.push({id:data[i]._id, label:data[i].name, fqn:data[i].fullyQualifiedName, children:[]});
            }
            $log.debug("COMPARING DATA");
            $log.debug($scope.lastData);
            $log.debug(nextData);
            if (!_.isEqual($scope.lastData,nextData)) {
              $log.debug("Menu has changed");
              $scope.lastData = _.cloneDeep(nextData);
              $scope.my_data = nextData;
              $timeout(function() {
                $scope.my_tree.expand_all();
                var pageDetails = pageStateService.get('pageDetails');
                if (pageDetails) {
                  $log.debug("Selecting branch " + pageDetails.page.name);
                  $scope.my_tree.select_branch_by_name(pageDetails.page.name);
                }
              });
            } else {
              $log.debug("menu hasn't changed");
            }
          });
      } else {
        $scope.queryPageExists = false;
        if (pageStateService.get('searchContentResults')) {
          pageStateService.set('searchContentResults',null);
        }
        $log.debug("UPDATING HIERARCHY");
        retryHttp.post(
          '/service/hierarchy',
          null,
          function(data, status, headers, config) {
            var nextData = [];
            for (var i=0;i<data.length;i++) {
              var convertToNav = function(hierarchy) {
                var retval = {"label":hierarchy.name,"id":hierarchy.id,"children":[],"fqn":hierarchy.fqn};
                for (var i=0;i<hierarchy.children.length;i++) {
                  retval.children.push(convertToNav(hierarchy.children[i]));
                }
                return retval;
              };
              nextData.push(convertToNav(data[i]));
            }
            $log.debug("COMPARING DATA");
            $log.debug($scope.lastData);
            $log.debug(nextData);
            if (!_.isEqual($scope.lastData,nextData)) {
              $log.debug("Menu has changed");
              $scope.lastData = _.cloneDeep(nextData);
              $scope.my_data = nextData;
              $timeout(function() {
                $log.debug("Selecting branch " + $location.path());
                $scope.my_tree.select_branch_by_field('fqn', $location.path());
              });
            } else {
              $log.debug("menu hasn't changed");
            }
          });
      }
    }
  });

  $scope.$watch('query',function(newValue,oldValue) {
    $log.debug(oldValue + " TO " + newValue);
    if (newValue && newValue.length>0) {
      pageStateService.set('query',newValue);
    } else {
      pageStateService.set('query',null);
    }
  });

}]);
