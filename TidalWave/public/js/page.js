var socket = null;
var connection = null;
var doc = null;

var enableEditMode = function(pageName) {
  console.log("Enabling edit mode for page " + pageName);
  $("#editor").show();
  $("#PageMenuController").hide();
  console.log($("#editor")[0]);
  // Tell FileDrop we can deal with iframe uploads using this URL:
  var options = {input:false};

  // Attach FileDrop to an area
  var zone = new FileDrop('editor', options);

  // Do something when a user chooses or drops a file:
  zone.event('send', function (files) {
    // Depending on browser support files (FileList) might contain multiple items.
    files.each(function (file) {
      console.log(file);
      // React on successful AJAX upload:
      file.event('done', function (xhr) {
        // 'this' here points to fd.File instance that has triggered the event.
        alert('Done uploading ' + this.name + ', response:\n\n' + xhr.responseText);
      });

      // Send the file:
      file.sendTo('upload.php');
    });
  });
  var editor = ace.edit("editor");
  //editor.setTheme("ace/theme/monokai");
  editor.getSession().setMode("ace/mode/markdown");

  socket = new BCSocket(null, {reconnect: true});
  connection = new window.sharejs.Connection(socket);

  doc = connection.get('users', pageName);
  doc.subscribe();

  doc.whenReady(function () {
    console.log(doc);
    if (!doc.type) doc.create('text');
    if (doc.type && doc.type.name === 'text') {
      doc.attachAce(editor, false, function(change) {
        $("#content-markdown").empty();
        var markdownText = marked(editor.getSession().getDocument().getValue());
        $("#content-markdown").append($.parseHTML(markdownText));
      });
      editor.focus();
    }
  });
};

var disableEditMode = function() {
  $("#editor").hide();
  $("#PageMenuController").show();
  if (doc) {
    doc.destroy();
    connection.disconnect();
    doc = socket = connection = null;
  }
};

var parentList = null;
var userPermissionList = null;
var groupPermissionList = null;

var convertToNav = function(hierarchy, callback) {
  var retval = {"label":hierarchy.name,"id":hierarchy.id,"children":[]};
  for (var i=0;i<hierarchy.children.length;i++) {
    retval.children.push(convertToNav(hierarchy.children[i]));
  }
  return retval;
};

var getPageName = function() {
  if (window.location.pathname=='view') {
    return null;
  }
  return decodeURI(window.location.pathname.split('/').pop());
};

var changePage = function($http,pageName,pageStateService,callback) {
  if (pageName == getPageName()) {
    return;
  }
  window.location = '/view/'+pageName;
};

angular.module('TidalWavePage', ['angularBootstrapNavTree'])
  .service('pageStateService', ['$rootScope', function($rootScope) {
    var state = {
      settingsActive:false,
      editMode:false,
      pageDetails:null,
      searchContentResults:null,
      query:null
    };
    var get = function(key){
      return state[key];
    };
    var set = function(key,value) {
      state[key] = value;
      $rootScope.$broadcast('pageStateServiceUpdate', {key:key,value:value});
    };
    return {
      get:get,
      set:set
    };
  }])
  .controller('PageMenuController', ['$scope', '$http', '$timeout', 'pageStateService', function($scope, $http, $timeout, pageStateService) {
    $scope.query = "";
    var apple_selected, tree;
    $scope.my_tree_handler = function(branch) {
      console.log("CLICKED ON");
      console.log(branch);
      changePage($http,branch.label,pageStateService,null);
    };
    apple_selected = function(branch) {
      console.log("SELECTED APPLE");
      return $scope.output = "APPLE! : " + branch.label;
    };
    $scope.my_data = [];
    $scope.my_tree = tree = {};
    $scope.doing_async = true;

    $scope.createPage = function() {
      //console.log("Creating page");
      $http.post('/service/createPage/'+$scope.query)
        .success(function(data, status, headers, config) {
          //TODO: Say success
          console.log("Created page");
          var newPage = $scope.query;
          $scope.query = '';
          changePage($http,newPage,pageStateService, function() {
            pageStateService.set('settingsActive', true);
            pageStateService.set('editMode',true);
          });
        })
        .error(function(data, status, headers, config) {
          //TODO: Alert with an error
        });
    };

    $scope.$on('pageStateServiceUpdate', function(response) {
      var pageDetails = pageStateService.get('pageDetails');
      if (pageDetails) {
        console.log("Selecting branch: " + pageDetails.page.name);
        console.log($scope.my_tree);
        $timeout(function() {
          $scope.my_tree.select_branch_by_name(pageDetails.page.name);
          $scope.my_tree.expand_all();
        });
      }
    });

    $scope.$watch('query',function(newValue,oldValue) {
      $scope.doing_async = true;
      console.log(oldValue + " TO " + newValue);
      if (newValue.length>0) {
        $http.post('/service/findPageContent/'+newValue)
          .success(function(data, status, headers, config) {
            pageStateService.set('searchContentResults',data);
            pageStateService.set('query',newValue);
            console.log("PAGE CONTENT DATA");
            console.log(JSON.stringify($scope.searchContentResults));
          })
          .error(function(data, status, headers, config) {
            //TODO: Alert with an error
          });

        $http.post('/service/pageStartsWith/'+newValue)
          .success(function(data, status, headers, config) {
            $scope.my_data = [];
            for (var i=0;i<data.length;i++) {
              $scope.my_data.push({id:data[i]._id, label:data[i].name});
            }
            $scope.doing_async = false;
            $timeout(function() {
              $scope.my_tree.expand_all();
            });
          })
          .error(function(data, status, headers, config) {
            //TODO: Alert with an error
          });
      } else {
        pageStateService.set('searchContentResults',null);
        pageStateService.set('query',null);
        $http.post('/service/hierarchy/jgauci')
          .success(function(data, status, headers, config) {
            $scope.my_data = [];
            for (var i=0;i<data.length;i++) {
              $scope.my_data.push(convertToNav(data[i]));
            }
            $scope.doing_async = false;
            $timeout(function() {
              $scope.my_tree.expand_all();
            });
          })
          .error(function(data, status, headers, config) {
            //TODO: Alert with an error
          });
      }
      $timeout(function() {
        var pageDetails = pageStateService.get('pageDetails');
        if (pageDetails) {
          $scope.my_tree.select_branch_by_name(pageDetails.page.name);
        }
      }, 10);
    });
    
    $scope.try_async_load = function() {
      return $timeout(function() {
        $scope.doing_async = false;
        return tree.expand_all();
      }, 1000);
    };
    return $scope.try_adding_a_branch = function() {
      var b;
      b = tree.get_selected_branch();
      return tree.add_branch(b, {
        label: 'New Branch',
        data: {
          something: 42,
          "else": 43
        }
      });
    };
  }])
  .controller('NavbarController', ['$scope', '$http', 'pageStateService', function($scope, $http, pageStateService) {
    $scope.username = "Jason Gauci";
    $scope.editMode = pageStateService.get('editMode');
    $scope.projectName = "Tidal Wave";
    $scope.settingsActive = pageStateService.get('settingsActive');
    $scope.page = {};
    $scope.$on('pageStateServiceUpdate', function(response) {
      console.log("Updating settings");
      $scope.settingsActive = pageStateService.get('settingsActive');
      $scope.editMode = pageStateService.get('editMode');
      var pageDetails = pageStateService.get('pageDetails');
      if (pageDetails) {
        $scope.page = pageDetails.page;
      }
    });
    $scope.toggleSettings = function() {
      console.log("Toggling setting");
      pageStateService.set(
        'settingsActive',
        !pageStateService.get('settingsActive'));
    };
    $scope.toggleEditMode = function() {
      console.log("Toggling setting");
      pageStateService.set(
        'editMode',
        !pageStateService.get('editMode'));
    };

    $scope.saveHTML = function() {
      var pageDetails = pageStateService.get('pageDetails');
      var blob = new Blob([marked(pageDetails.page.content)], {type: "text/plain;charset=utf-8"});
      saveAs(blob, pageDetails.page.name + ".html");
    };

    $scope.savePDF = function() {
      var pageDetails = pageStateService.get('pageDetails');
      var doc = new jsPDF();          
      doc.fromHTML(
        marked(pageDetails.page.content),
        15,
        15,
        {
          'width': 800
        });

      doc.save(pageDetails.page.name + ".pdf");
    };
  }])
  .controller('PageContentController', ['$scope', '$http', '$timeout', 'pageStateService', function($scope, $http, $timeout, pageStateService) {
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
      valueField: 'name',
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

    var pageName = getPageName();
    console.log("PAGE NAME: " + pageName);
    if (pageName && pageName != 'view') {
      $http.post('/service/pageDetailsByName/'+pageName)
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

    var updateState = function() {
      $scope.searchContentResults = pageStateService.get('searchContentResults');
      $scope.query = pageStateService.get('query');
      var pageDetails = pageStateService.get('pageDetails');
      if (pageDetails) {
        $scope.page = pageDetails?pageDetails.page:null;
        $scope.ancestry = pageDetails?pageDetails.ancestry:null;
        $scope.newName = pageDetails.page.name;
        $scope.derivedUserPermissions = pageDetails.page.derivedUserPermissions;
        $scope.derivedGroupPermissions = pageDetails.page.derivedGroupPermissions;
        $scope.version = pageDetails?pageDetails.version:null;
        $scope.lastAncestorName = '';
        var ancestry = pageDetails.ancestry;
        console.log(ancestry);
        if (ancestry.length>0) {
          var parent = ancestry[ancestry.length-1];
          parentList.clearOptions();
          parentList.addOption({_id:parent.id, name:parent.name});
          parentList.setValue(parent.id);
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
          userPermissionList.addOption({_id:user.username, fullName:user.fullName});
          userPermissionList.addItem(user.username);
        }
        userPermissionList.refreshItems();

        groupPermissionList.clear();
        for (var i=0;i<pageDetails.page.groupPermissions.length;i++) {
          var group = pageDetails.page.groupPermissions[i];
          console.log("ADDING GROUP PERMISSION ");
          console.log(group);
          groupPermissionList.addOption({name:group});
          groupPermissionList.addItem(group);
        }
        groupPermissionList.refreshItems();
      } else {
        if (pageStateService.get('editMode')) {
          pageStateService.set('editMode',false);
        }
      }

      if ($scope.editMode && !pageStateService.get('editMode')) {
        // Leave edit mode
        $scope.editMode = pageStateService.get('editMode');
        console.log("LEAVING EDIT MODE");
        $http.post('/service/savePageDynamicContent/'+$scope.page.name)
          .success(function(data, status, headers, config) {
            console.log("SAVED PAGE");
            $http.post('/service/pageDetailsByName/'+$scope.page.name)
              .success(function(data, status, headers, config) {
                //TODO: Say success
                console.log("GOT PAGE DETAILS FROM HTTP");
                console.log(data);
                pageStateService.set('pageDetails',data);
                disableEditMode();
                pageStateService.set('settingsActive',false);
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
        enableEditMode($scope.page.name);
      }

      $scope.settingsActive = pageStateService.get('settingsActive');
      console.log("UPDATING MARKDOWN");
      console.log(pageDetails);
      if (pageDetails && typeof pageDetails.page.content != undefined) {
        $http.post('/service/getTOC/'+pageDetails.page._id)
          .success(function(data, status, headers, config) {
            $("#content-markdown").empty();
            var markdownText = null;
            if (data.length>0) {
              markdownText = marked("<div class=\"well well-lg\" style=\"display: inline-block;\"><h4>Table of Contents</h4>" + data.replace('#','##') + "</div><br />\n" + pageDetails.page.content);
            } else {
              markdownText = marked(pageDetails.page.content);
            }
            $("#content-markdown").append($.parseHTML(markdownText));
          });
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

      console.log(userPermissionList.getValue());
      console.log(groupPermissionList.getValue());

      if (userPermissionList.getValue().length==0
          && groupPermissionList.getValue().length==0) {
        // TODO: Alert with error, someone needs to own this page
        return;
      }

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
          if (nameChanged) {
            console.log("Name changed, redirecting");
            changePage($http,$scope.newName,pageStateService,null);
          }
        })
        .error(function(data, status, headers, config) {
          //TODO: Alert with an error
        });
    };

    $scope.changePage = function(newPage) {
      changePage($http, newPage, pageStateService,null);
    };

    $scope.$on('pageStateServiceUpdate', function(response) {
      updateState();
    });
  }]);

