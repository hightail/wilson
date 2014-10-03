/**
 * Middleware to parse req.params.tagHash into req.wilson.tags object
 *
 * @param wilsonConfig
 * @param ConnectionFilterUtil
 * @param _
 * @returns {tagMiddleware}
 */
var _ = require('lodash');
module.exports = function(wilsonConfig, ConnectionFilterUtil) {

  function tagMiddleware(req, res, next) {
    var tagHash = req.params.tagHash;

    if (tagHash) {
      var filters = ConnectionFilterUtil.getFiltersFromHash(tagHash);

      _.each(filters, function(filter) {
        req.wilson.tags[filter.name] = filter.value;
      });
    }

    //logger.warn('tags', req.wilson.tags);

    next();
  }

  return tagMiddleware;
};