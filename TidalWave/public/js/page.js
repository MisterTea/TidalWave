var socket = null;
var connection = null;
var doc = null;
var editor = null;

// Helper function to resize the ace editor as the window size changes.
function resizeAce() {
  if($('#editor').is(":visible")) {
    $('#editor').height($(window).height() - 130);
    $('#content').height($(window).height() - 130);
    $('#content').css("overflow-y","scroll");
    editor.resize(true);
  } else {
    $('#content').css("height", "auto");
    $('#content').css("overflow-y","visible");
  }
};
//listen for changes
$(window).resize(resizeAce);

var enableEditMode = function(pageStateService, $http, $timeout) {
  console.log("Enabling edit mode");
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
      //alert(file.name + ' ' + file.type + ' (' + file.size + ') bytes');
      var fr = new FileReader();

      // For some reason onload is being called 2x.
      var called=false;
      fr.onload = function(e) {
        if (called) return;
        called = true;
        var pageDetails = pageStateService.get('pageDetails');
        var mime = e.target.result.split(',')[0].substring(5);
        var data = e.target.result.split(',')[1];
        if(file.type.match(/image.*/)){
          $http.post('/service/saveImage', {mime:mime,base64:data,pageId:pageDetails.page._id,name:file.name})
            .success(function(filename, status, headers, config) {
              console.log("INJECTING IMAGE");
              editor.insert("<img src=\"/service/getImage/"+filename+"\"></img>");
              //TODO: Say success
            })
            .error(function(data, status, headers, config) {
              //TODO: Alert with an error
            });
        } else {
          // Regular attachment
          $http.post('/service/saveFile', {mime:mime,base64:data,pageId:pageDetails.page._id,name:file.name})
            .success(function(filename, status, headers, config) {
              console.log("INJECTING FILE");
              editor.insert("<a href=\"/service/getFile/"+filename+"\" target=\"_blank\">Download "+file.name+"</a>");
              //TODO: Say success
            })
            .error(function(data, status, headers, config) {
              //TODO: Alert with an error
            });
        }
      };
      fr.readAsDataURL(file.nativeFile);
    });
  });
  editor = ace.edit("editor");
  $timeout(function() {
    resizeAce();
  },1);
  editor.setReadOnly(true);
  editor.setValue("Loading...");
  editor.getSession().setUseWrapMode(true); // lines should wrap
  //editor.setTheme("ace/theme/monokai");
  editor.getSession().setMode("ace/mode/markdown");

  socket = new BCSocket(null, {reconnect: true});
  connection = new window.sharejs.Connection(socket);

  var pageDetails = pageStateService.get('pageDetails');
  console.log("SUBSCRIBING TO " + pageDetails.page._id);
  doc = connection.get('users', pageDetails.page._id);
  doc.subscribe();

  doc.whenReady(function () {
    console.log("SHAREJS IS READY");
    editor.setReadOnly(false);
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

var disableEditMode = function($timeout) {
  editor = null;
  $("#editor").hide();
  $timeout(function() {
    resizeAce();
  },1);
  $("#PageMenuController").show();
  if (doc) {
    doc.destroy();
    connection.disconnect();
    doc = socket = connection = null;
  }
};

var preprocessDiff = function(allDiffs) {
  var sourceLines = [{text:'',style:'equal'}];
  var destLines = [{text:'',style:'equal'}];

  for (var i=0;i<allDiffs.length;i++) {
    var diff = allDiffs[i];

    if (diff[0] == 0) {
      // Add to both
      var tokens = diff[1].split("\n");

      var styleToSet = 'equal';
      if (sourceLines[sourceLines.length-1].style!='equal') {
        styleToSet = 'difference';
      }

      sourceLines[sourceLines.length-1] = {
        text:sourceLines[sourceLines.length-1].text.concat(tokens[0]),
        style:styleToSet
      };
      destLines[destLines.length-1] = {
        text:destLines[destLines.length-1].text.concat(tokens[0]),
        style:styleToSet
      };

      for (var j=1;j<tokens.length;j++) {
        sourceLines.push({
          text:tokens[j],
          style:'equal'});
        destLines.push({
          text:tokens[j],
          style:'equal'});
      }
    } else {
      var bufferWithAdds = null;
      var otherBuffer = null;

      if (diff[0]==-1) {
        bufferWithAdds = sourceLines;
        otherBuffer = destLines;
      } else {
        bufferWithAdds = destLines;
        otherBuffer = sourceLines;
      }

      // add to source
      var tokens = diff[1].split("\n");

      // Inline change, this is a difference
      if (tokens[0].length>0) {
        bufferWithAdds[bufferWithAdds.length-1] = {
          text:bufferWithAdds[bufferWithAdds.length-1].text
            .concat("<span style=\"color:red;\">"+tokens[0]+"</span>"),
          style:'difference'};
        otherBuffer[otherBuffer.length-1].style = 'difference';
      }

      if (tokens.length>1) {
        // The remaining lines should be added as new lines
        for (var j=1;j<tokens.length;j++) {
          var t = tokens[j];
          if (t.length==0) {
            t = '&nbsp;';
          }
          bufferWithAdds.push({
            text:"<span style=\"color:red;\">"+t+"</span>",
            style:'difference'});
          otherBuffer.push({
            text:'',
            style:'difference'});
        }
      }
    }
  }

  // Cleanup: set add/remove and put spaces
  for (var i=0;i<sourceLines.length;i++) {
    if (sourceLines[i].text.length==0 && destLines[i].text.length>0) {
      sourceLines[i].style = 'remove';
      destLines[i].style = 'add';
    }
    if (sourceLines[i].text.length>0 && destLines[i].text.length==0) {
      sourceLines[i].style = 'add';
      destLines[i].style = 'remove';
    }
    if (sourceLines[i].text.length==0) {
      sourceLines[i].text = ' ';
    }
    if (destLines[i].text.length==0) {
      destLines[i].text = ' ';
    }
  }

  // Add line numbers
  for (var i=0;i<sourceLines.length;i++) {
    sourceLines[i].lineNumber = i+1;
  }
  for (var i=0;i<destLines.length;i++) {
    destLines[i].lineNumber = i+1;
  }

  return [sourceLines,destLines];
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

app = angular.module('TidalWavePage', ['angularBootstrapNavTree', 'ngErrorShipper', 'ui.bootstrap'])
  .factory('$exceptionHandler', function($log) {
    return function(exception, cause) {
      console.log("GOT EXCEPTION");
      $log.error(exception);

      var output = {};
      if (cause) {
        output.cause = cause;
      } else {
        output.cause = null;
      }
      output.message = exception.message;
      output.stack = exception.stack;
      output.location = window.location;
      output.performance = window.performance;

      $.ajax({
        type: 'POST',
        url: "/service/angularerror",
        data:JSON.stringify(output),
        contentType: "application/json; charset=utf-8",
        success:function(data, textStatus, jqXHR) {
          console.log("Error has been reported successfully");
        },
        error:function(jqXHR, textStatus, errorThrown) {
          console.log("Error reporting error: " + errorThrown);
        }});
    };
  })
  .service('pageStateService', ['$rootScope', '$http', function($rootScope, $http) {
    var state = {
      settingsActive:false,
      editMode:false,
      pageDetails:null,
      searchContentResults:null,
      query:null,
      user:null,
      history:null,
      diff:null,
      pageMode:null
    };
    var get = function(key){
      return state[key];
    };
    var set = function(key,value) {
      //console.log("SETTING " + key + " " + JSON.stringify(value));
      state[key] = value;
      $rootScope.$broadcast('pageStateServiceUpdate', {key:key,value:value});
    };
    var push = function(key) {
      if (key == 'user') {
        // Push the new user
        $http.post('/service/updateMe', state[key])
          .success(function(data, status, headers, config) {
            //TODO: Say success
          })
          .error(function(data, status, headers, config) {
            //TODO: Alert with an error
          });
      }
    };
    var setAndPush = function(key,value) {
      set(key,value);
      push(key);
    };
    return {
      get:get,
      set:set,
      push:push,
      setAndPush:setAndPush
    };
  }])
  .controller('PageMenuController', ['$scope', '$http', '$timeout', 'pageStateService', function($scope, $http, $timeout, pageStateService) {
    $scope.query = "";
    var tree;
    $scope.my_tree_handler = function(branch) {
      console.log("CLICKED ON");
      console.log(branch);
      changePage($http,branch.label,pageStateService,null);
    };
    $scope.my_data = [];
    $scope.my_tree = tree = {};
    $scope.doing_async = true;
    $scope.queryPageExists = false;

    $scope.showMenu = true;

    $scope.submit = function() {
      if ($scope.queryPageExists) {
        window.location = "/view/"+$scope.query;
      } else {
      var user = pageStateService.get('user');
      if (user) {
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
      } else {
        window.location = "/login";
      }
      }
    };

    $scope.$on('pageStateServiceUpdate', function(response) {
      console.log("GOT PAGE STATE UPDATE");

      $scope.showMenu = true;
      var editMode = pageStateService.get('editMode');
      var pageMode = pageStateService.get('pageMode');
      if (editMode || pageMode=='diff') {
        $scope.showMenu = false;
      }
      var query = pageStateService.get('query');
      if (editMode && query) {
        query = null;
        pageStateService.set('query',null);
      }
      if ($scope.query != query) {
        $scope.query = query;
      }

        $http.post('/service/hierarchy')
          .success(function(data, status, headers, config) {
            $scope.my_data = [];
            for (var i=0;i<data.length;i++) {
              $scope.my_data.push(convertToNav(data[i]));
            }
            $scope.doing_async = false;
            $timeout(function() {
              $scope.my_tree.expand_all();
              var pageDetails = pageStateService.get('pageDetails');
              if (pageDetails && pageDetails.page) {
                console.log("Selecting branch: " + pageDetails.page.name);
                console.log($scope.my_tree);
                $timeout(function() {
                  console.log("Selecting branch by name");
                  $scope.my_tree.select_branch_by_name(pageDetails.page.name);
                  $scope.my_tree.expand_all();
                });
              }
            });
          })
          .error(function(data, status, headers, config) {
            //TODO: Alert with an error
          });
    });

    $scope.$watch('query',function(newValue,oldValue) {
      $scope.doing_async = true;
      console.log(oldValue + " TO " + newValue);
      if (newValue && newValue.length>0) {
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
            $scope.queryPageExists = false;
            for (var i=0;i<data.length;i++) {
              if (data[i].name == newValue) {
                // Page already exists with the query, change the
                // create behavior to goto.
                $scope.queryPageExists = true;
              }
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
        var user = pageStateService.get('user');
        if (user) {
          console.log("UPDATING HIERARCHY");
          $http.post('/service/hierarchy')
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
        } else {
          console.log("NO USER");
        }
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
  .controller('NavbarController', ['$scope', '$http', '$modal', 'pageStateService', function($scope, $http, $modal, pageStateService) {
    $scope.username = "";
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
  }])
  .controller('DeletePageModalInstanceCtrl', function ($scope, $modalInstance, pagename) {
    $scope.pagename = pagename;

    $scope.ok = function () {
      $modalInstance.close();
    };

    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
  })
  .controller('PageContentController', ['$scope', '$http', '$timeout', '$sce', 'pageStateService', function($scope, $http, $timeout, $sce, pageStateService) {
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
    
    var updateState = function() {
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
        
      if (!pageDetails) {
        $scope.pageMode = 'recentChanges';
      } else if($scope.diffSourceLines) {
        $scope.pageMode = 'diff';
      } else if(history) {
        $scope.pageMode = 'history';
      } else if($scope.searchContentResults) {
        $scope.pageMode = 'searchResults';
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
        $scope.editMode = pageStateService.get('editMode');
        console.log("LEAVING EDIT MODE");
        $http.post('/service/savePageDynamicContent/'+$scope.page._id)
          .success(function(data, status, headers, config) {
            console.log("SAVED PAGE");
            $http.post('/service/pageDetailsByName/'+$scope.page.name)
              .success(function(data, status, headers, config) {
                //TODO: Say success
                console.log("GOT PAGE DETAILS FROM HTTP");
                console.log(data);
                pageStateService.set('pageDetails',data);
                disableEditMode($timeout);
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
        enableEditMode(pageStateService,$http,$timeout);
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
              markdownText = marked("<div class=\"well well-lg\" style=\"display: inline-block;\"><h4>Table of Contents</h4>\n" + data.replace('#','##') + "\n</div><br />\n" + pageDetails.page.content);
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

      pageCopy.isPublic = $scope.isPublic;

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
          // Close the settings menu
          pageStateService.set('settingsActive', false);

          if (nameChanged) {
            console.log("Name changed, redirecting");
            changePage($http,$scope.newName,pageStateService,null);
          } else {
            // Update page details
            $http.post('/service/pageDetailsByName/'+$scope.newName)
              .success(function(data, status, headers, config) {
                //TODO: Say success
                pageStateService.set('pageDetails',data);
                pageStateService.set('settingsActive',false);
              })
              .error(function(data, status, headers, config) {
                //TODO: Alert with an error
              });
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

