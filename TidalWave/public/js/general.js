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
