var _ = require('lodash'),
  path = require('path'),
  qfs = require('q-io/fs'),
  Q = require('q'),
  asyncUtil = require('async'),
  UrlUtil = require('./UrlUtil');

_.str = require('underscore.string');

module.exports = function(wilsonConfig) {

  //var localPathPrefix = path.join(__dirname, ('..' + path.sep + '..'));
  var localPathPrefix = wilsonConfig.server.projectPaths.root;

  /**
   * Given a revved (or unrevved) filename returns the unrevved filename
   *
   * e.g. "32bj32j323.UserService.js" => "UserService"
   * e.g. "UserService.js" => "UserService"
   *
   * @param revedFileName
   * @returns {*}
   */
  var getFilenameWithoutRevision = function (revedFileName) {
    var filename;

    var parts = revedFileName.split('.');
    if (parts.length > 2) {
      filename = parts[1];
    } else {
      filename = parts[0];
    }

    return filename;
  };

  /**
   * Files reved filename for @filNameList in @directoryPath
   * @param directoryPath
   * @param fileNameList
   * @returns {*}
   */
  var findRevisionedFiles = function (directoryPath, fileNameList) {
    var deferred = Q.defer();

    //directoryPath = path.normalize(directoryPath);
    var revedFileList = [];

    qfs.list(path.join(localPathPrefix, directoryPath)).then(function (directoryContents) {
      _.each(directoryContents, function (revedFileName) {
        // TODO: skipping .swp files in vim, if there are more, we need to put them in a config
        if (!revedFileName.match(/\.swp$/i)) {
          var derevedFilename = getFilenameWithoutRevision(revedFileName);

          _.each(fileNameList, function (fileName) {
            if (derevedFilename === fileName) {
              revedFileList.push(revedFileName);
            }
          });
        }
      });

      if (revedFileList.length === fileNameList.length) {
        deferred.resolve(revedFileList);
      } else {
        deferred.reject(_.str.sprintf('Some revisioned files were not found (Found %d of %d)', revedFileList.length, fileNameList.length));
      }
    }).fail(function (error) {
      deferred.reject(error);
    });

    return deferred.promise;
  };

  /**
   * Given a @directoryDictionary in form:
   *
   * {  'path/to/dir': ['Filename1', 'Filename2'],
 *    'another/path/': ['File']
 * }
   *
   * Resolves promise with revedFilenames array
   *
   * @param directoryDictionary
   * @returns {*}
   */
  var findRevisionedFilesFromDictionary = function (directoryDictionary) {
    var deferred = Q.defer();

    var revedDictionary = {};

    var directoryPaths = _.keys(directoryDictionary);
    //console.log(directoryPaths);

    asyncUtil.eachLimit(directoryPaths, 10, function (directoryPath, callback) {
      //console.log('directoryPath', directoryPath);
      findRevisionedFiles(directoryPath, directoryDictionary[directoryPath])
        .then(function (revedFileNames) {
          revedDictionary[directoryPath] = revedFileNames;
          callback();
        })
        .fail(function (error) {
          console.log('directoryPath', directoryPath);
          callback(error);
        });
    }, function (err) {
      // This is a callback for when all fileUris have completed
      if (err) {
        deferred.reject(err);
      } else {
        deferred.resolve(revedDictionary);
      }
    });

    return deferred.promise;
  };

  /**
   * Given a @directoryDictionary in form:
   *
   * {  'path/to/dir': ['Filename1', 'Filename2'],
 *    'another/path/': ['File']
 * }
   *
   * returns:
   * ['path/to/dir/Filename1', 'path/to/dir/Filename2', 'another/path/File']
   *
   *
   * @param directoryDictionary
   * @returns {Array}
   */
  var flattenDictionaryToPaths = function (directoryDictionary) {
    var flattenedPaths = [];

    _.each(_.keys(directoryDictionary), function (directoryPath) {
      _.each(directoryDictionary[directoryPath], function (resourceName) {
        var url = path.join(directoryPath, resourceName);
        url = UrlUtil.pathToUrl(url);
        flattenedPaths.push(url);
      });
    });

    return flattenedPaths;
  };


  return {
    findRevisionedFiles: findRevisionedFiles,
    findRevisionedFilesFromDictionary: findRevisionedFilesFromDictionary,
    flattenDictionaryToPaths: flattenDictionaryToPaths
  };
}
