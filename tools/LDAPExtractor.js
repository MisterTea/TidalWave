exports.LDAPEntryToUser = function(entry) {
  throw new Error("You must implement the functions in LDAPExtractor.js!");
};

// Set this to only fetch certain user attributes
exports.LDAPUserAttributes = [];

// Set this to only fetch certain group attributes
exports.LDAPGroupAttributes = [];

exports.LDAPEntryToGroup = function(entry) {
  throw new Error("You must implement the functions in LDAPExtractor.js!");
};
