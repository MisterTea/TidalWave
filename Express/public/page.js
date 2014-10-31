var categoryData = {
  children:[
    {
      name:"test",
      expand:false,
      id:"asdf",
      children:[
        {
          name:"test2",
          id:"asdf",
          expand:false,
          children:[
            {
              name:"test3",
              expand:false,
              children:[
                {
                  name:"test4",
                  id:"asdf",
                }
              ]
            }
          ],
        }
      ]
    },
    {
      name:"test5",
      id:"asdf",
      expand:false,
      children:[
        {
          name:"test6",
          id:"asdf",
        }
      ]
    }
  ]
};

var searchResults = {
  query:"meat",
  activePage:1,
  numPages:2,
  searchResults:[
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test6",
      title:"Test Document 6",
      text:marked("This document has more __results__ in it")
    }]
};

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

var profile = {
  id:"lsdjflfjsdlkfjsdljfslk",
  username:"JasonGauci",
  groups:[{name:"Administrators"},{name:"Users"}],
  creationTime:1397667108,
  linkedAccounts:{
    facebook:{
      id:12345,
      token:"asdfasdf"
    }
  }
};

var profilePageData = {
  profile:profile,
  changes:recentChanges,
  selectedGroup:{
    name:"Users",
    users:[
      {
        id:"asdfasdf",
        name:"Jason Gauci",
        role:"Manager",
        type:"User",
      },
      {
        id:"asdfasdf",
        name:"Jason Gauci",
        role:"Member",
        type:"Group",
      }]
  },
  onSection:"manageGroups"
};

var homePageData = {
  changes:recentChanges
};

var pageData = {
  id:"test5",
  title:"Test Document 5",
  version:10,
  content:'<style scoped>\nh1 { color: FireBrick;   }\np  { color: SaddleBrown; }\n</style>\n\nI am using __markdown__.\n# TEST\n-----\n## HEADING\n-----',
  contentHtml:marked('<style scoped>\nh1 { color: FireBrick;   }\np  { color: SaddleBrown; }\n</style>I am using __markdown__.\n# TEST\n-----\n## HEADING\n-----'),
  ancestors:[
    {name:"root"},{name:"parent"}
  ],
  parent:"parent",
  users:[
    {id:"asdads",name:"jason",type:"User",role:"Owner"},
    {id:"asdjkada",name:"jason",type:"User",role:"Manager"}
  ],
};

var editPageData = {
  editMode:true,
  pageData:pageData,
  isOlderVersion:true,
};

var pageSettingsData = {
  pageData:pageData,
  newTitleIsValid:true,
  newParentIsValid:true,
};

var pageChangeData = {
  id:"test5",
  title:"Test Document 5",
  previousContent:'OLDI am using __markdown__.\n# TEST\n-----\n## HEADING\n-----',
  currentContent:'NEWI am using __markdown__.\n# TEST\n-----\n## HEADING\n-----\nMORE DATA\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_',
  ancestors:[
    {name:"root"},{name:"parent"}
  ]
};

var navbarData = {
  projectName:"Tidal Wave",
  userName:"Jason Gauci",
  onPage:true,
  editMode:true
};

var pageHistoryData = {
  comparing:false,
  history:[
    {
      version:"LIVE",
      createTime:1397859322,
      editors:["Jason","JoBob"]
    },
    {
      version:"15",
      createTime:1397859322,
      editors:["Jason","JoBob"]
    },
    {
      version:"15",
      createTime:1397859322,
      editors:["Jason","JoBob"]
    },
  ]
};

// compile and register the partial templates
Handlebars.compile($("#category-template").html());
Handlebars.registerPartial("categoryPartial", $("#category-template").html());

Handlebars.compile($("#recent-changes-partial-template").html());
Handlebars.registerPartial("recentChangesPartial", $("#recent-changes-partial-template").html());

// each with index... relies on Object.create or polyfill
Handlebars.registerHelper('eachIndex', function(context, options) {
  var fn = options.fn, inverse = options.inverse, ctx;
  var ret = "";
  
  if(context && context.length > 0) {
    for(var i=0, j=context.length; i<j; i++) {
      ctx = Object.create(context[i]);
      ctx.index = (i+1);
      ret = ret + fn(ctx);
    }
  } else {
    ret = inverse(this);
  }
  return ret;
});

// Each page for pagination
Handlebars.registerHelper('eachPage', function(context, activePage, options) {
  var ret = "";
  console.log("CONTEXT");
  console.log(context);

  for(var i=0, j=Math.ceil(context.length/15); i<j; i++) {
    ret = ret + options.fn({page:(i+1), activePage:activePage==(i+1)});
  }

  return ret;
});

// Each page for pagination
Handlebars.registerHelper('prettyDate', function(inputTimeUtc) {
  return moment.unix(inputTimeUtc).format("dddd, MMMM Do YYYY, h:mm:ss a");
});

// If with greater than inequality check
Handlebars.registerHelper('ifGreaterThan', function(op1, op2, options) {
  if (op1 > op2) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

Handlebars.registerHelper('ifEqual', function (op1, op2, options) {
  if (op1 === op2) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

Handlebars.registerHelper("lastAncestorName", function(ancestors) {
  return ancestors[ancestors.length-1].name;
});

var categoriesTemplate = Handlebars.compile($("#root-categories-template").html());
var searchTemplate = Handlebars.compile($("#search-template").html());
var profileTemplate = Handlebars.compile($("#profile-template").html());
var homePageTemplate = Handlebars.compile($("#home-page-template").html());
var pageTemplate = Handlebars.compile($("#page-template").html());
var pageChangeTemplate = Handlebars.compile($("#page-change-template").html());
var pageHistoryTemplate = Handlebars.compile($("#page-history-template").html());
var pageSettingsTemplate = Handlebars.compile($("#page-settings-template").html());
var navbarTemplate = Handlebars.compile($("#navbar-template").html());

var treeClickHandler = function() {
  var name = $(this).parent().attr('id');
  console.log(name);
  var treeObject = findObjectDeep(categoryData, 'name', name);
  treeObject.expand = !(treeObject.expand);
  $("#sidebar-placeholder").html(categoriesTemplate(categoryData));
  $("span.tree-toggler").click(treeClickHandler);
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
          bufferWithAdds.push({
            text:"<span style=\"color:red;\">"+tokens[j]+"</span>",
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

  return [sourceLines,destLines];
};

$(document).ready(function() {
  $("#sidebar-placeholder").html(categoriesTemplate(categoryData));
  $("#navbar-placeholder").html(navbarTemplate(navbarData));
  
  $("span.tree-toggler").click(treeClickHandler);

  // View / Edit
  $("#content-placeholder").html(pageTemplate(editPageData));

  // Page History
  //$("#content-placeholder").html(pageHistoryTemplate(pageHistoryData));

  // Page Settings
  //$("#content-placeholder").html(pageSettingsTemplate(pageSettingsData));

  // View Changes
  var dmp = new diff_match_patch();
  console.log(dmp);
  var diff = dmp.diff_main(pageChangeData.previousContent, pageChangeData.currentContent);
  dmp.diff_cleanupSemantic(diff);
  console.log(diff);
  var processedDiff = preprocessDiff(diff);
  pageChangeData.previousContent = processedDiff[0];
  pageChangeData.currentContent = processedDiff[1];
  console.log(pageChangeData.previousContent);
  //$("#content-placeholder").html(pageChangeTemplate(pageChangeData));

  // Search
  //$("#content-placeholder").html(searchTemplate(searchResults));

  // Home Page
  //$("#content-placeholder").html(homePageTemplate(homePageData));

  // Profile
  //$("#content-placeholder").html(profileTemplate(profilePageData));
  if ($('.groupselectpicker').length>0) {
    $('.groupselectpicker').selectpicker();
    $('.groupselectpicker').selectpicker('val', profilePageData.selectedGroup.name);
  }

  // Edit
  if ($("#editor").length > 0) {
    console.log($("#editor"));
    console.log($("#editor")[0]);
    console.log("ATTACHING EDITOR: " + $("#editor").attr('document'));
    var pageName = $("#editor").attr('document');
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
    editor.setTheme("ace/theme/monokai");
    editor.getSession().setMode("ace/mode/markdown");

    var s = new BCSocket(null, {reconnect: true});
    var sjs = new window.sharejs.Connection(s);

    var doc = sjs.get('users', pageName);
    doc.subscribe();

    doc.whenReady(function () {
      console.log(doc);
      if (!doc.type) doc.create('text');
      if (doc.type && doc.type.name === 'text')
        doc.attachAce(editor, false, function(change) {
          console.log("new markdown");
          console.log(marked(editor.getSession().getDocument().getValue()));
        });
    });
  }

  // selection box for adding users/groups to group
  var memberSelectArray = $('#select-member').selectize({
    sortField: 'text',
    valueField: 'id',
    labelField: 'title',
    searchField: 'title',
    options: [],
    create: false
  });
  if (memberSelectArray.length>0) {
    var memberSelect = memberSelectArray[0].selectize;
    memberSelect.addOptionGroup('users', {label:'Users'});
    memberSelect.addOption({id:'user1', title:'user1', optgroup:'users'});
    memberSelect.addOptionGroup('groups', {label:'Groups'});
    memberSelect.addOption({id:'group1', title:'group1', optgroup:'groups'});
    memberSelect.refreshOptions(false);
  }
});
