/**
 * Returns middleware to add wilsonConfig.client.app.connectionFilters from req.wilson.tags
 *
 * @param wilsonConfig
 * @param ConnectionFilterUtil
 * @returns {tagMiddleware}
 */

module.exports = function(wilsonConfig, ConnectionFilterUtil) {
  /**
   * Middleware to add wilsonConfig.client.app.connectionFilters from req.wilson.tags
   */
  function filterMiddleware(req, res, next) {
    var filters = ConnectionFilterUtil.getConnectionFilterArray(req.wilson.tags);
    var hash = ConnectionFilterUtil.getFilterHash(filters);

    wilsonConfig.client.app.connectionFilters = hash;

    next();
  }

  return filterMiddleware;
};