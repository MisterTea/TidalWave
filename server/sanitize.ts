/// <reference path='../typings/node/node.d.ts' />
/// <reference path='../typings/mongodb/mongodb.d.ts' />
/// <reference path='../typings/express/express.d.ts' />

var async = require('async');

import model = require('./model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;
var updateFullyQualifiedName = model.updateFullyQualifiedName;

import ShareJSHandler = require('./sharejs-handler');
import LiveSync = require('./livesync');
import log = require('./logger');

// Sanitize the database.
export var sanitize = function() {
  Page.find({}, function(err, pages) {
    if (err) {
      log.error(err);
      return;
    }
    // Make sure the page corresponds to a livedb document
    async.map(pages, function(page, callback) {
      LiveSync.fetch(page._id.toString(), function(err, liveDocument) {
        if (err) {
          callback(err);
          return;
        }
        if (!liveDocument.type) {
          LiveSync.createDocument(page._id.toString(), page.content, function(err) {
            if (err) {
              callback(err);
              return;
            }
            log.warn("Created missing livedb document for page: " + page._id);
            callback(null, null);
          });
        } else {
          log.debug("Found livedb document for " + page._id);
          callback(null, null);
        }
      });
    }, function(err, result) {
      if (err) {
        log.error(err);
      }
    });
  });

  var AuthHelper = require('./auth-helper');
  Page.find({}, function(err, pages) {
    var onPage = 0;
    var iterate = function() {
      onPage++;
      if (onPage == pages.length) {
        return;
      }
      if (pages[onPage].parentId) {
        // Updating permissions is recursive: only call for root pages.
        iterate();
        return;
      } else {
        updateFullyQualifiedName(pages[onPage], function() {
          AuthHelper.updateDerivedPermissions(pages[onPage], iterate);
        });
      }
    };

    if (onPage == pages.length) {
      return;
    }
    updateFullyQualifiedName(pages[onPage], function() {
      AuthHelper.updateDerivedPermissions(pages[onPage], iterate);
    });
  });
};
