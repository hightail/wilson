var _ = require('lodash');

module.exports = function(wilsonConfig) {
  return {
    getConfig: function(type) {
      return _.merge({}, wilsonConfig.shared, wilsonConfig[type]);
    }
  };
};