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

var pageHistoryTemplate = Handlebars.compile($("#page-history-template").html());

$(document).ready(function() {
  $("#sidebar-placeholder").html(categoriesTemplate(pageHierarchy));
  $("#navbar-placeholder").html(navbarTemplate(navbarData));
  
  $("span.tree-toggler").click(treeClickHandler);

  // Page History
  $("#content-placeholder").html(pageHistoryTemplate(pageHistoryData));

  // Page Settings
  //$("#content-placeholder").html(pageSettingsTemplate(pageSettingsData));

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
          $("#content-markdown").empty();
          var markdownText = marked(editor.getSession().getDocument().getValue());
          $("#content-markdown").append($.parseHTML(markdownText));
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
