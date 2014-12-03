/*!
 * connect-jugglingdb
 * Copyright 2013 Jérémy Lal <kapouer@melix.org>
 * MIT Licensed, see LICENSE file
 */

/**
 * Default options
 */

var defaults = {
	table: 'sessions',
	maxAge: 1000 * 60 * 60 * 24 * 14 // even session cookies should be destroyed, eventually
};

function noop() {}

module.exports = function(connect) {
	"use strict";
	var Store = connect.session.Store;

	/**
	 * Initialize JugglingStore with the given `options`.
	 * 
	 * @param {JugglingDB.Schema} schema
	 * @param {Object} options
	 * @api public
	 */

	function JugglingStore(schema, options) {
		options = options || {};
		Store.call(this, options);
		this.maxAge = options.maxAge || defaults.maxAge;
		var coll = this.collection = schema.define('Session', {
			sid: {
				type: String,
				index: true
			},
			expires: {
				type: Date,
				index: true
			},
			session: {
        type: String
      }
		}, {
			table: options.table || defaults.table
		});
		
		coll.validatesUniquenessOf('sid');
		
		// destroy all expired sessions after each create/update
		coll.afterSave = function(next) {
			coll.iterate({where: {
				expires: {lte: new Date()}
			}}, function(obj, nexti, i) {
				obj.destroy(nexti);
			}, next);
		};
	}

	/**
	 * Inherit from `Store`.
	 */

	require('util').inherits(JugglingStore, Store);

	/**
	 * Attempt to fetch session by the given `sid`.
	 *
	 * @param {String} sid
	 * @param {Function} callback
	 * @api public
	 */
	
	JugglingStore.prototype.get = function(sid, callback) {
		var self = this;
		callback = callback || noop;
		this.collection.findOne({where: {sid: sid}}, function(err, session) {
			if (err) return callback(err);
			if (!session) {
        return callback();
      }
			if (!session.expires || new Date() < session.expires) {
				callback(null, JSON.parse(session.session));
			} else {
				self.destroy(sid, callback);
			}
		});
	};

	/**
	 * Commit the given `session` object associated with the given `sid`.
	 *
	 * @param {String} sid
	 * @param {Session} session
	 * @param {Function} callback
	 * @api public
	 */

	JugglingStore.prototype.set = function(sid, session, callback) {
		callback = callback || noop;
		var s = {
			session: JSON.stringify(session)
		};
		if (session && session.cookie && session.cookie._expires) {
			s.expires = new Date(session.cookie._expires);
		} else {
			s.expires = new Date(Date.now() + this.maxAge);
		}
		var coll = this.collection;
		coll.findOne({where: {sid: sid}}, function(err, session) {
			if (err) return callback(err);
			if (session) {
				session.updateAttributes(s, function(err, newSession) {
					callback(err);
				});
			} else {
				s.sid = sid;
				coll.create(s, function(err) {
					callback(err);
				});
			}
		});
	};

	/**
	 * Destroy the session associated with the given `sid`.
	 *
	 * @param {String} sid
	 * @param {Function} callback
	 * @api public
	 */

	JugglingStore.prototype.destroy = function(sid, callback) {
		callback = callback || noop;
		var coll = this.collection;
		coll.findOne({where: {sid: sid}}, function(err, session) {
			if (err) return callback(err);
			if (!session) return callback();
			session.destroy(callback);
		});
	};

	/**
	 * Fetch number of sessions.
	 *
	 * @param {Function} callback
	 * @api public
	 */

	JugglingStore.prototype.length = function(callback) {
		this.collection.count(callback);
	};

	/**
	 * Clear all sessions.
	 *
	 * @param {Function} callback
	 * @api public
	 */

	JugglingStore.prototype.clear = function(callback) {
		this.collection.destroyAll(callback);
	};
	
	return JugglingStore;
};
