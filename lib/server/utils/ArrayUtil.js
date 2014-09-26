var _ = require('lodash');

var concatNonNull = function() {
  var newArray = [];

  _.each(arguments, function(arr) {
    if (!_.isNull(arr) && !_.isUndefined(arr)) {
      newArray = newArray.concat(arr);
    }
  });

  return newArray;
};

module.exports = {
  concatNonNull: concatNonNull
};