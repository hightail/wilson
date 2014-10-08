/**
 * CacheService
 *
 * Author: justin.fiedler
 * Date: 9/30/13
 */
var fs    = require("fs"),
    path  = require("path");

module.exports = function(wilsonConfig) {
  // Cache Folder; has to be relative to this script so it'll work in all env
  //var cacheFolder = path.join(__dirname, '../..', wilsonConfig.server.caching.folder);
  var cacheFolder = path.join(wilsonConfig.server.projectPaths.root, wilsonConfig.server.caching.folder);

  //create cache folder if it doesnt exist
  if (!fs.existsSync(cacheFolder)) {
    fs.mkdirSync(cacheFolder);
  }

  var componentCache = {};

  /**
   * Writes out the @jsonData to the cache
   *
   * @param relativeFilePath  The relative path (from cacheFolder) to save the @jsonData
   * @param jsonData
   */
  var writeJsonToCache = function (relativeFilePath, jsonData) {
    //Save the JSON file, formatted all nice and pretty
    fs.writeFileSync(path.join(cacheFolder, relativeFilePath), JSON.stringify(jsonData, undefined, 2));

    //Also put the JSON in the memory cache
    componentCache[relativeFilePath] = jsonData;
  };

  /**
   * Returns a JSON object from the cache (if its available)
   *
   * @param relativeFilePath
   * @returns {null}
   */
  var getJsonFromCache = function (relativeFilePath) {
    var cachedJson = null;

    if (componentCache[relativeFilePath]) {
      //get from meory cache
      cachedJson = componentCache[relativeFilePath];
    } else {
      //look at file cache
      var cachedJsonPath = path.join(cacheFolder, relativeFilePath);
      if (fs.existsSync(cachedJsonPath)) {
        cachedJson = JSON.parse(fs.readFileSync(cachedJsonPath));
      }
    }

    return cachedJson;
  };

  /**
   * Return true if the cache for a given filePath exists.
   *
   * @param relativeFilePath
   * @returns {*}
   */
  var isCacheAvailable = function (relativeFilePath) {
    return componentCache[relativeFilePath] || fs.existsSync(path.join(cacheFolder, relativeFilePath));
  };


  /**
   * Expose exports
   */
  return {
    writeJsonToCache: writeJsonToCache,
    getJsonFromCache: getJsonFromCache,
    isCacheAvailable: isCacheAvailable
  };
}

module.exports.$inject = ['wilson.config'];