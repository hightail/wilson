var _ = require('lodash');

module.exports = function(wilsonConfig, ComponentService, ConnectionFilterUtil, logger) {
  /**
   * This sets cache control headers for the given response object
   *
   * @param res
   */
  var setResponseCacheHeaders = function(res, maxAgeMs) {
    //Max age is in seconds (divide by 1000)
    res.setHeader('Cache-Control', 'public, max-age=' + (maxAgeMs / 1000));
    //Expires uses MS
    res.setHeader("Expires", new Date(Date.now() + maxAgeMs).toUTCString());
  };

  /**
   * Renders component JSON
   */
  return function(req, res) {
    var appVersion = wilsonConfig.client.app.version;
    var componentName = req.params.name;
    var requestVersion = req.params.version;
    var tags = req.wilson.tags;

    //get connection filters
    var filters = ConnectionFilterUtil.getConnectionFilterArray(tags);
    //console.log('filters', filters);

    var cacheMaxAgeMs = wilsonConfig.server.caching.maxAge.components;
    var data;

    if (!requestVersion) {
      //If no version is set then redirect to the current version
      var currentComponentUrl = req.originalUrl.replace('/component', '/' + appVersion + '/component');

      logger.error('Version param [' + req.params.version + '] was undefined or invalid. Redirecting from [' + req.url + '] to [' + currentComponentUrl + ']');

      res.redirect(currentComponentUrl);
    } else {
      //Get the component data
      data = ComponentService.getServableComponent(componentName, filters);

      //verify that we have some data
      if (!data) {
        res.status(500).set('Content-Type', 'application/json').send({
          error: 'Sorry, an error has occurred.'
        });
      } else {
        //Set cache headers
        setResponseCacheHeaders(res, cacheMaxAgeMs);

        //send response
        res.status(200).set('Content-Type', 'application/json').send(data);
      }
    }
  }
};
