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
  changes:[
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
  ],
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
  onSection:"editProfile"
};

Handlebars.compile($("#recent-changes-partial-template").html());
Handlebars.registerPartial("recentChangesPartial", $("#recent-changes-partial-template").html());

var profileTemplate = Handlebars.compile($("#profile-template").html());

$(document).ready(function() {
  $("#navbar-placeholder").html(navbarTemplate(navbarData));
  
  $("span.tree-toggler").click(treeClickHandler);

  // Profile
  $("#content-placeholder").html(profileTemplate(profilePageData));
  if ($('.groupselectpicker').length>0) {
    $('.groupselectpicker').selectpicker();
    $('.groupselectpicker').selectpicker('val', profilePageData.selectedGroup.name);
  }

  populateMemberSelectArray();
});
