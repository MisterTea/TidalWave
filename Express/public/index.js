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

Handlebars.compile($("#recent-changes-partial-template").html());
Handlebars.registerPartial("recentChangesPartial", $("#recent-changes-partial-template").html());

var homePageTemplate = Handlebars.compile($("#home-page-template").html());

$(document).ready(function() {
  $("#sidebar-placeholder").html(categoriesTemplate(pageHierarchy));

  $("#navbar-placeholder").html(navbarTemplate(navbarData));
  
  $("span.tree-toggler").click(treeClickHandler);

  // Home Page
  $("#content-placeholder").html(homePageTemplate(homePageData));
});
