var hopscotch = require('hopscotch');

exports.createFirstViewTour = function() {
  // Define the tour!
  var tour = {
    id: "hello-tidalwave",
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
};
