var fs = require("fs");

module.exports = function(wilsonConfig, BundleService, ComponentService) {
  return function(req, res) {
    var appVersion      = wilsonConfig.client.app.version;
    var requestVersion  = req.params.version;
    var componentName   = req.params.name;

    var ignoreCache = !wilsonConfig.server.caching.useServerCache;
    var cacheMaxAgeMs = wilsonConfig.server.caching.maxAge.bundles;

    var served = false;

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

    if (!requestVersion) {
      //If no version is set then redirect to the current version
      var currentComponentUrl = req.originalUrl.replace('/bundle', '/' + appVersion + '/bundle');
      res.redirect(currentComponentUrl);
    } else if (componentName) {
      //A specific component was requested
      var bundleFile      = BundleService.getBundlePath(('script.bundle.' + componentName + '.js'));

      if (requestVersion !== appVersion) {
        served = true;
        res.status(404).send({ error: 'Bundle for version [' + requestVersion + '] is out-of-date or invalid.' });
      } else {
        // Ok we are all good, check if the bundle exists
        if (fs.existsSync(bundleFile) && !ignoreCache) {
          served = true;
          setResponseCacheHeaders(res, cacheMaxAgeMs);
          res.status(200).set('Content-Type', 'application/javascript').send(fs.readFileSync(bundleFile));
        } else {
          // We gotta build it
          if (ComponentService.generateComponentBundle(componentName)) {
            served = true;
            setResponseCacheHeaders(res, cacheMaxAgeMs);
            res.status(200).set('Content-Type', 'application/javascript').send(fs.readFileSync(bundleFile));
          }
        }
      }

      //verify that we have some data
      if (!served) {
        res.status(500).send({ error: 'Sorry, an error has occurred.' });
      }

      res.end();
    } else {
      if (requestVersion !== appVersion) {
        //we need to load the core bundle, or else we cant do anything. So redirect to the latest core
        var currentCoreBundleUrl = req.url.replace('/' + requestVersion + '/bundle', '/' + appVersion + '/bundle');
        res.redirect(currentCoreBundleUrl);
      } else {
        //No component name was specified, return the core bundle
        ComponentService.generateCoreBundle(ignoreCache).then(
          function(bundleFile) {
            setResponseCacheHeaders(res, cacheMaxAgeMs);
            res.status(200).set('Content-Type', 'application/javascript').send(fs.readFileSync(bundleFile));
          },
          function(err) {
            logger.error('Unable to load core includes');
            res.status(200).set('Content-Type', 'application/javascript').send('console.error("FAILED TO LOAD CORE SCRIPT BUNDLE!");');
          }
        );
      }
    }
  }
}