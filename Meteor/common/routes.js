Router.configure({
  before: function() {
    var routeName = this.route.name;
     // no need to check at these URLs
    if (_.include(['join', 'passwordReset' /*, etc */], routeName))
      return;

    var user = Meteor.user();
    if (! user) {
      this.render(Meteor.loggingIn() ? this.loadingTemplate : 'login');
      return this.stop();
    }
  }
});

Router.map(function() {
  this.route('home', {
    path: '/',
    template: 'page',
    layoutTemplate: 'layout'
  });
  this.route('about');
});
