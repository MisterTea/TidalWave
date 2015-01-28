app.controller('DeletePageModalInstanceCtrl', function ($scope, $modalInstance, pagename) {
  $scope.pagename = pagename;

  $scope.ok = function () {
    $modalInstance.close();
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
});

app.controller('PageContentController', ['$scope', '$http', '$timeout', '$sce', '$anchorScroll', '$location', 'pageStateService', function($scope, $http, $timeout, $sce, $anchorScroll, $location, pageStateService) {

  // When angular scrolls, ensure that the header does not block the
  // top content.
  $anchorScroll.yOffset = 100;

  if (getParameterByName('tour')) {
    $timeout(function(){
      // Define the tour!
      var tour = {
        id: "hello-hopscotch",
        steps: [
          {
            title: "Welcome to TidalWave!",
            content: "To view a page, select it in the list.  To create a new page, type the name in this box and click the pencil.",
            target: "page-query",
            placement: "bottom"
          },
          {
            title: "Editing a page",
            content: "To edit a page or change the settings (name, visibility), click here.  Multiple people can edit the same page simultaneously.",
            target: "edit-list-item",
            placement: "bottom"
          },
          {
            title: "Thank you!",
            content: "That\'s it!  Thanks for trying Tidal Wave, please send feedback to jgmath2000@gmail.com",
            target: "ancestry",
            placement: "bottom"
          }
        ]
      };

      // Start the tour!
      hopscotch.startTour(tour);
    }, 1000);
  }

  $scope.query = null;
  $http.post('/service/recentChangesVisible')
    .success(function(data, status, headers, config) {
      // TODO: Implement this url
      $scope.recentChanges = [
      ];
    })
    .error(function(data, status, headers, config) {
      //TODO: Alert with an error
      console.log("ERROR");
      console.log(data);
    });

  $scope.prettyDate = function(date) {
    var utcTime = new Date(date).getTime()/1000;
    return moment.unix(utcTime).format("dddd, MMMM Do YYYY, h:mm:ss a");
  };

  parentList = $('#select-parent').selectize({
    valueField: '_id',
    labelField: 'name',
    searchField: 'name',
    allowEmptyOption:true,
    create:false,
    persist: false,
    load: function(query, callback) {
      console.log("LOADING");
      if (!query.length) {
        callback();
        return;
      }
      $.ajax({
        url: '/service/pageStartsWith/' + encodeURIComponent(query),
        type: 'POST',
        error: function() {
          callback();
        },
        success: function(res) {
          for (var i=0;i<res.length;i++) {
            if (res[i]._id == pageStateService.get('pageDetails').page._id) {
              res.splice(i,1);
              break;
            }
          }
          callback(res);
        }
      });
    }
  })[0].selectize;

  userPermissionList = $('#userPermissionList').selectize({
    delimiter: ',',
    allowEmptyOption:true,
    create:false,
    valueField: '_id',
    labelField: 'fullName',
    searchField: 'fullName',
    load: function(query, callback) {
      console.log("LOADING");
      if (!query.length) {
        callback();
        return;
      }
      $.ajax({
        url: '/service/findUserFullName/' + encodeURIComponent(query),
        type: 'POST',
        error: function() {
          callback();
        },
        success: function(res) {
          console.log(res);
          callback(res);
        }
      });
    }
  })[0].selectize;

  groupPermissionList = $('#groupPermissionList').selectize({
    delimiter: ',',
    allowEmptyOption:true,
    create:false,
    valueField: '_id',
    labelField: 'name',
    searchField: 'name',
    load: function(query, callback) {
      console.log("LOADING");
      if (!query.length) {
        callback();
        return;
      }
      $.ajax({
        url: '/service/findGroupName/' + encodeURIComponent(query),
        type: 'POST',
        error: function() {
          callback();
        },
        success: function(res) {
          console.log(res);
          callback(res);
        }
      });
    }
  })[0].selectize;

  $http.post('/service/me')
    .success(function(data, status, headers, config) {
      if (data) {
        //TODO: Say success
        pageStateService.set('user',data);
      } else {
        console.log("NO USER FOUND.  ASSUMING ANONYMOUS");
      }
    })
    .error(function(data, status, headers, config) {
      //TODO: Alert with an error
    });

  var pageName = getPageFQN();
  console.log("PAGE NAME: " + pageName);
  if (pageName && pageName != 'view') {
    $http.post('/service/pageDetailsByFQN/'+pageName)
      .success(function(data, status, headers, config) {
        //TODO: Say success
        pageStateService.set('pageDetails',data);
      })
      .error(function(data, status, headers, config) {
        //TODO: Alert with an error
      });
  } else {
    console.log("ON HOME PAGE");
  }
  console.log("IN PAGE CONTENT CONTROLLER");
  $scope.editMode = false;

  $scope.pageMode = null;

  $scope.restorePageVersion = function(version) {
    var pageDetails = pageStateService.get('pageDetails');
    $http.post('/service/restorePageVersion', {
      _id:pageDetails.page._id,
      version:version
    })
      .success(function(data, status, headers, config) {
        //TODO: Say success
      })
      .error(function(data, status, headers, config) {
        //TODO: Alert with an error
        //NOTE: Can error if someone is editing the page you are trying to restore.
      });
  };

  $scope.viewDiff = function(version) {
    var history = pageStateService.get('history');
    for (var i=0;i<history.length-1;i++) {
      var pageVersion = history[i];
      if (pageVersion.version == version) {
        var prevPageVersion = history[i+1];
        var dmp = new diff_match_patch();
        console.log(dmp);
        var diff = dmp.diff_main(prevPageVersion.content, pageVersion.content);
        dmp.diff_cleanupSemantic(diff);
        console.log(diff);
        var processedDiff = preprocessDiff(diff);
        console.log(processedDiff);
        pageStateService.set('diff',processedDiff);
      }
    }
  };
  
  $scope.updateSettings = function() {
    var pageDetails = pageStateService.get('pageDetails');
    var pageCopy = JSON.parse(JSON.stringify(pageDetails.page));

    console.log("NEW NAME: " + $scope.newName);
    var nameChanged = (pageCopy.name != $scope.newName);
    pageCopy.name = $scope.newName;

    var newParent = parentList.getValue();
    if (!newParent || newParent.length==0) {
      newParent = null;
    }
    console.log("NEW Parent: " + newParent);
    pageCopy.parentId = newParent;

    pageCopy.isPublic = $scope.isPublic;

    console.log(userPermissionList.getValue());
    console.log(groupPermissionList.getValue());

    console.log("PERMISSIONS");
    console.log(userPermissionList.getValue());
    if (userPermissionList.getValue().length>0) {
      pageCopy.userPermissions = userPermissionList.getValue().split(',');
    } else {
      pageCopy.userPermissions = [];
    }
    console.log(groupPermissionList.getValue());
    if (groupPermissionList.getValue().length>0) {
      pageCopy.groupPermissions = groupPermissionList.getValue().split(',');
    } else {
      pageCopy.groupPermissions = [];
    }

    console.log(pageCopy);
    $http.post('/service/updatePage',pageCopy)
      .success(function(data, status, headers, config) {
        console.log("UPDATE PAGE RETURN VALUE");
        console.dir(data);
        if (data.page.fullyQualifiedName != pageDetails.page.fullyQualifiedName) {
          console.log("Name/parent changed, redirecting");
          changePage($http,data.page.fullyQualifiedName,pageStateService,null);
        } else {
          // Update page details
          pageStateService.set('pageDetails',data);
          // Close the settings menu
          pageStateService.set('settingsActive',false);
        }
      })
      .error(function(data, status, headers, config) {
        //TODO: Alert with an error
      });
  };

  $scope.changePage = function(newPageFQN) {
    changePage($http, newPageFQN, pageStateService,null);
  };

  $scope.$on('pageStateServiceUpdate', function(event, response) {
    var key = response.key;
    var value = response.value;
    
    if (pageStateService.get('editMode') && pageStateService.get('searchContentResults')) {
      pageStateService.set('searchContentResults',null);
    }
    $scope.query = pageStateService.get('query');

    $scope.searchContentResults = pageStateService.get('searchContentResults');
    var pageDetails = pageStateService.get('pageDetails');
    var history = pageStateService.get('history');
    $scope.history = history;

    var diff = pageStateService.get('diff');
    if (diff) {
      $scope.diffSourceLines = [];
      $scope.diffDestLines = [];
      for (var a=0;a<diff[0].length;a++) {
        $scope.diffSourceLines.push({
          lineNumber:diff[0][a].lineNumber,
          style:diff[0][a].style,
          text:$sce.trustAsHtml(diff[0][a].text)});
      }
      for (var a=0;a<diff[1].length;a++) {
        $scope.diffDestLines.push({
          lineNumber:diff[1][a].lineNumber,
          style:diff[1][a].style,
          text:$sce.trustAsHtml(diff[1][a].text)});
      }
    } else {
      $scope.diffSourceLines = null;
      $scope.diffDestLines = null;
    }
    
    if($scope.searchContentResults) {
      $scope.pageMode = 'searchResults';
    } else if (!pageDetails) {
      $scope.pageMode = 'recentChanges';
    } else if($scope.diffSourceLines) {
      $scope.pageMode = 'diff';
    } else if(history) {
      $scope.pageMode = 'history';
    } else {
      $scope.pageMode = 'content';
    }
    if ($scope.pageMode != pageStateService.get('pageMode')) {
      pageStateService.set('pageMode',$scope.pageMode);
    }
    
    if (pageDetails) {
      $scope.page = pageDetails?pageDetails.page:null;
      $scope.newName = pageDetails.page.name;
      $scope.derivedUserPermissions = [];
      for (var a=0;a<pageDetails.derivedUserPermissions.length;a++) {
        $scope.derivedUserPermissions.push(pageDetails.derivedUserPermissions[a].fullName);
      }
      $scope.derivedGroupPermissions = [];
      for (var a=0;a<pageDetails.derivedGroupPermissions.length;a++) {
        $scope.derivedGroupPermissions.push(pageDetails.derivedGroupPermissions[a].name);
      }
      $scope.version = pageDetails?pageDetails.version:null;
      $scope.lastAncestorName = '';
      var ancestry = $scope.ancestry = pageDetails.ancestry.slice();

      if ($scope.page) {
        $scope.isPublic = $scope.page.isPublic;
      }

      // Remove the page itself from the ancestry
      ancestry.pop();

      console.log(ancestry);
      if (ancestry && ancestry.length>0) {
        var parent = ancestry[ancestry.length-1];
        parentList.clearOptions();
        parentList.addOption({_id:parent._id, name:parent.name});
        parentList.setValue(parent._id);
      } else {
        console.log("CLEARING PARENT");
        parentList.clearOptions();
        parentList.setValue(null);
      }

      userPermissionList.clear();
      for (var i=0;i<pageDetails.userPermissions.length;i++) {
        var user = pageDetails.userPermissions[i];
        console.log("ADDING USER PERMISSION ");
        console.log(user);
        userPermissionList.addOption({_id:user._id, fullName:user.fullName});
        userPermissionList.addItem(user._id);
      }
      userPermissionList.refreshItems();

      groupPermissionList.clear();
      for (var i=0;i<pageDetails.groupPermissions.length;i++) {
        var group = pageDetails.groupPermissions[i];
        console.log("ADDING GROUP PERMISSION ");
        console.log(group);
        groupPermissionList.addOption({_id:group._id, name:group.name});
        groupPermissionList.addItem(group._id);
      }
      groupPermissionList.refreshItems();
    } else {
      if (pageStateService.get('editMode')) {
        pageStateService.set('editMode',false);
      }
    }

    if ($scope.editMode && !pageStateService.get('editMode')) {
      // Leave edit mode
      console.log("LEAVING EDIT MODE");
      $http.post('/service/savePageDynamicContent/'+$scope.page._id)
        .success(function(data, status, headers, config) {
          console.log("SAVED PAGE");
          $http.post('/service/pageDetailsByFQN/'+$scope.page.fullyQualifiedName)
            .success(function(data, status, headers, config) {
              //TODO: Say success
              console.log("GOT PAGE DETAILS FROM HTTP");
              console.log(data);
              pageStateService.set('pageDetails',data);
              editor = null;
              //$("#editor").hide();
              $timeout(function() {
                resizeAce();
              },1);
              //$("#PageMenuController").show();
              if (doc) {
                doc.destroy();
                connection.disconnect();
                doc = socket = connection = null;
              }
              pageStateService.set('settingsActive',false);
              $scope.editMode = pageStateService.get('editMode');
            })
            .error(function(data, status, headers, config) {
              //TODO: Alert with an error
              console.log("ERROR");
              console.log(data);
            });
        })
        .error(function(data, status, headers, config) {
          //TODO: Alert with an error
          console.log("ERROR");
          console.log(data);
        });
    }
    if (!$scope.editMode && pageStateService.get('editMode')) {
      // Enter edit mode
      $scope.editMode = pageStateService.get('editMode');
      console.log("ENTERING EDIT MODE");
      enableEditMode(pageStateService,$http,$timeout);
    }

    $scope.settingsActive = pageStateService.get('settingsActive');
    console.log("UPDATING MARKDOWN");
    console.log(pageDetails);
    console.log(key);
    if ((key == 'editMode' || key == 'pageDetails') && pageDetails && typeof pageDetails.page.content != undefined) {
      $http.post('/service/getTOC/'+pageDetails.page._id)
        .success(function(data, status, headers, config) {
          $("#content-markdown").empty();
          var markdownText = null;
          if (data.length>0) {
            markdownText = marked("<div class=\"well well-lg\" style=\"display: inline-block;\"><h4>Table of Contents</h4>\n" + data.replace(/#/g,'#/#') + "\n</div><br />\n" + pageDetails.page.content);
          } else {
            markdownText = marked(pageDetails.page.content);
          }
          $("#content-markdown").append($.parseHTML(markdownText));
          $timeout(function(){
            $anchorScroll();
          }, 100);
        });
    }
  });
}]);
