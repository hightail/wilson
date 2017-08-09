var path  = require('path'),
    fs    = require('fs'),
    hbs   = require('hbs');

module.exports = function(wilsonConfig, ComponentService, ConnectionFilterUtil, logger) {

  //Load index page
  var templatesHbsPath  = path.join(__dirname, '../templates/wilson-templates.hbs');
  var templatesHbs      = fs.readFileSync(templatesHbsPath, 'utf8');
  var template          = hbs.compile(templatesHbs);


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
    var appVersion      = wilsonConfig.client.app.version;
    var requestVersion  = req.params.version;
    var tags            = req.wilson.tags;

    // Get connection filters from the tags
    var filters         = ConnectionFilterUtil.getConnectionFilterArray(tags, true);
    var ignoreCache     = !wilsonConfig.server.caching.useServerCache;
    var cacheMaxAgeMs   = wilsonConfig.server.caching.maxAge.components;

    if (!requestVersion) {
      //If no version is set then redirect to the current version
      var currentTemplatesUrl = req.originalUrl.replace('/templates', '/' + appVersion + '/templates');

      logger.error('Version param [' + req.params.version + '] was undefined or invalid. Redirecting from [' + req.url + '] to [' + currentTemplatesUrl + ']');

      res.redirect(currentTemplatesUrl);
    } else {

      // No component name was specified, return the core bundle
      var templateData  = ComponentService.generateCoreTemplates(filters);
      var data          = template(templateData);

      //verify that we have some data
      if (!data) {
        logger.error('Unable to load core includes');
        res.status(200).set('Content-Type', 'application/javascript').send('console.error("FAILED TO LOAD CORE TEMPLATE PACKAGE!");');
      } else {
        //Set cache headers
        setResponseCacheHeaders(res, cacheMaxAgeMs);

        //send response
        res.status(200).set('Content-Type', 'application/javascript').send(data);
      }

    }
  }
};
