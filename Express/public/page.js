var recentChanges = {
  recentChanges:[
    {
      id:"test5",
      title:"Test Document 5",
      editors:[{id:"jason",name:"jason"},{id:"asdf",name:"asdf"}],
      time:"Yesterday"
    },
    {
      id:"test5",
      title:"Test Document 5",
      editors:[{id:"jason",name:"jason"},{id:"asdf",name:"asdf"}],
      time:"Yesterday"
    }
  ]
};

var homePageData = {
  changes:recentChanges
};

var pageTemplate = Handlebars.compile($("#page-template").html());

Handlebars.compile($("#recent-changes-partial-template").html());
Handlebars.registerPartial("recentChangesPartial", $("#recent-changes-partial-template").html());
var homePageTemplate = Handlebars.compile($("#home-page-template").html());

var socket = null;
var connection = null;
var doc = null;

var enableEditMode = function(pageName) {
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

$(document).ready(function() {
  //$("#sidebar-placeholder").html(categoriesTemplate(pageHierarchy));
  //$("#navbar-placeholder").html(navbarTemplate(navbarData));
  
  $("span.tree-toggler").click(treeClickHandler);
});

var convertToNav = function(hierarchy, callback) {
  var retval = {"label":hierarchy.name,"id":hierarchy.id,"children":[]};
  for (var i=0;i<hierarchy.children.length;i++) {
    retval.children.push(convertToNav(hierarchy.children[i]));
  }
  return retval;
};

var changePage = function($http,pageName,pageStateService) {
  window.location.hash = pageName;
  $http.get('/service/pageDetailsByName/'+pageName)
    .success(function(data, status, headers, config) {
      //TODO: Say success
      console.log("GOT PAGE DETAILS FROM HTTP");
      console.log(data);
      pageStateService.set('pageDetails',data);
    })
    .error(function(data, status, headers, config) {
      //TODO: Alert with an error
    });
};

angular.module('TidalWavePage', ['angularBootstrapNavTree'])
  .service('pageStateService', ['$rootScope', function($rootScope) {
    var state = {
      settingsActive:false,
      editMode:false,
      pageDetails:null
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
      changePage($http,branch.label,pageStateService);
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
      $http.get('/service/createPage/'+$scope.query)
        .success(function(data, status, headers, config) {
          //TODO: Say success
          changePage($http,$scope.query,pageStateService);
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
        });
      }
    });

    $scope.$watch('query',function(newValue,oldValue) {
      $scope.doing_async = true;
      console.log(oldValue + " TO " + newValue);
      if (newValue.length>0) {
        $http.get('/service/pageStartsWith/'+newValue)
          .success(function(data, status, headers, config) {
            $scope.my_data = [];
            for (var i=0;i<data.length;i++) {
              $scope.my_data.push({id:data[i]._id, label:data[i].name});
            }
            console.log("MY DATA");
            console.log(JSON.stringify($scope.my_data));
            $scope.doing_async = false;
          })
          .error(function(data, status, headers, config) {
            //TODO: Alert with an error
          });
      } else {
        $http.get('/service/hierarchy/jgauci')
          .success(function(data, status, headers, config) {
            $scope.my_data = [];
            for (var i=0;i<data.length;i++) {
              $scope.my_data.push(convertToNav(data[i]));
            }
            console.log("MY DATA");
            console.log(JSON.stringify($scope.my_data));
            $scope.doing_async = false;
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
  }])
  .controller('PageContentController', ['$scope', '$http', 'pageStateService', function($scope, $http, pageStateService) {

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
          type: 'GET',
          error: function() {
            callback();
          },
          success: function(res) {
            console.log(JSON.stringify(res));
            callback(res);
          }
        });
      }
    })[0].selectize;

    var pageName = window.location.hash.substring(1);
    console.log("PAGE NAME: " + pageName);
    if (pageName) {
      $http.get('/service/pageDetailsByName/'+pageName)
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
      console.log("UPDATING PAGE STATE");
      var pageDetails = pageStateService.get('pageDetails');
      console.log(pageDetails);
      if (pageDetails) {
        $scope.page = pageDetails?pageDetails.page:null;
        $scope.ancestry = pageDetails?pageDetails.ancestry:null;
        $scope.newName = pageDetails.page.name;
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
      } else {
        if (pageStateService.get('editMode')) {
          pageStateService.set('editMode',false);
        }
      }

      if ($scope.editMode && !pageStateService.get('editMode')) {
        // Leave edit mode
        $scope.editMode = pageStateService.get('editMode');
        console.log("LEAVING EDIT MODE");
        disableEditMode();
        pageStateService.set('settingsActive',false);
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
        $("#content-markdown").empty();
        var markdownText = marked(pageDetails.page.content);
        $("#content-markdown").append($.parseHTML(markdownText));
      }
    };

    $scope.updateName = function() {
      var pageDetails = pageStateService.get('pageDetails');
      console.log("NEW NAME: " + $scope.newName);
      $http.get('/service/renamePage/'+pageDetails.page.name+'/'+$scope.newName)
        .success(function(data, status, headers, config) {
          console.log("Name changed, redirecting");
          changePage($http,$scope.newName,pageStateService);
        })
        .error(function(data, status, headers, config) {
          //TODO: Alert with an error
        });
    };

    $scope.updateParent = function() {
      var pageDetails = pageStateService.get('pageDetails');
      console.log("NEW Parent: " + parentList.getValue());
      $http.get('/service/setPageParent/'+pageDetails.page._id+'/'+parentList.getValue())
        .success(function(data, status, headers, config) {
          //TODO: Say success
        })
        .error(function(data, status, headers, config) {
          //TODO: Alert with an error
        });
    };

    $scope.changePage = function(newPage) {
      changePage($http, newPage, pageStateService);
    };

    $scope.$on('pageStateServiceUpdate', function(response) {
      updateState();
    });
  }]);

