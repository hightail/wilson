/**
 * BundleService
 *
 * Author: hunter.novak
 * Date: 03/12/2014
 */
var fs    = require("fs"),
    path  = require("path"),
    _     = require('lodash');

module.exports = function(wilsonConfig, logger) {
  //console.log('logger(BundleService)', logger);

  // Cache Folder; has to be relative to this script so it'll work in all env
  //var cacheFolder = path.join(__dirname, '../..', wilsonConfig.server.caching.folder);
  var cacheFolder = path.join(wilsonConfig.server.projectPaths.root, wilsonConfig.server.caching.folder);

  var createBundle = function (scripts, bundleName) {
    var bundleFile = path.join(cacheFolder, bundleName);
    var success = false;

    try {
      // Clear or create this file
      fs.writeFileSync(bundleFile, '');

      _.each(scripts, function (scriptToConcat) {
        var content = fs.readFileSync(scriptToConcat);
        fs.appendFileSync(bundleFile, content);
        content = null;
      });

      success = true;

    } catch (e) {
      logger.error(e);
    }

    if (!success) {
      // Delete the file
      fs.unlink(bundleFile);
    }

    return success;
  };

  var bundleExists = function (bundleName, callback) {
    var bundleFile = path.join(cacheFolder, bundleName);
    fs.exists(bundleFile, callback);
  };

  var getBundlePath = function (bundleName) {
    return path.join(cacheFolder, bundleName);
  };

  /**
   * Expose exports
   */
  return {
    createBundle: createBundle,
    bundleExists: bundleExists,
    getBundlePath: getBundlePath
  }
}