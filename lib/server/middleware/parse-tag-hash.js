/**
 * Middleware to parse req.params.tagHash into req.wilson.tags object
 *
 * @param wilsonConfig
 * @param ConnectionFilterUtil
 * @param _
 * @returns {tagMiddleware}
 */
var _ = require('lodash');
module.exports = function(wilsonConfig, ConnectionFilterUtil, logger) {

  function tagMiddleware(req, res, next) {
    var tagHash = req.params.tagHash;

    if (tagHash) {
      req.wilson.tags = ConnectionFilterUtil.getTagsFromHash(tagHash);
    }

    //logger.warn('tags', req.wilson.tags);

    next();
  }

  return tagMiddleware;
};