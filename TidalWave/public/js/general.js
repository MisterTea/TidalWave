var pageData = {
  id:"test5",
  title:"Test Document 5",
  version:10,
  ancestors:null,
  parent:"parent",
  staticContent:"This is static content",
  users:[
    {id:"asdads",name:"jason",type:"User",role:"Owner"},
    {id:"asdjkada",name:"jason",type:"User",role:"Manager"}
  ]
};

var editPageData = {
  pageData:pageData,
  isOlderVersion:false
};

var users = [
  {
    id:"jason",
    name:"jason"
  }
];

var groups = [
  {
    id:"admins",
    name:"admins",
    members:["jason"]
  }
];

// compile and register the partial templates
if ($("#category-template").length>0) {
  Handlebars.compile($("#category-template").html());
  Handlebars.registerPartial("categoryPartial", $("#category-template").html());
}

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

Handlebars.registerHelper("lastAncestorName", function() {
  if (pageDetails.ancestry.length==0) {
    return null;
  }
  return pageDetails.ancestry[pageDetails.ancestry.length-1].name;
});

Handlebars.registerHelper("shouldExpand", function(expand, pageId, options) {
  console.log("Checking expand");
  console.log(expand);
  console.log(pageId);
  if (expand) {
    return options.fn(this);;
  }
  for (var i=0;i<pageDetails.ancestry.length;i++) {
    if (pageDetails.ancestry[i].id == pageId) {
      return options.fn(this);;
    }
  }
  return options.inverse(this);
});

var categoriesTemplate = null;
if ($("#root-categories-template").length>0) {
  categoriesTemplate = Handlebars.compile($("#root-categories-template").html());
}

var treeClickHandler = function() {
  var name = $(this).parent().attr('id');
  console.log(name);
  var treeObject = findObjectDeep(pageHierarchy, 'name', name);
  treeObject.expand = !(treeObject.expand);
  $("#sidebar-placeholder").html(categoriesTemplate(pageHierarchy));
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

var populateMemberSelectArray = function() {

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
    _.each(users,function(user) {
      memberSelect.addOption({id:user.id, title:user.name, optgroup:'users'});
    });
    memberSelect.addOptionGroup('groups', {label:'Groups'});
    _.each(groups,function(group) {
      memberSelect.addOption({id:group.id, title:group.name, optgroup:'groups'});
    });
    memberSelect.refreshOptions(false);
  }
};
