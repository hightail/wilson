/**
 * ComponentLoader Service
 *
 * @class ComponentLoaderService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @author justin.fiedler
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('ComponentLoaderService',
  ['ResourceLoaderService', '$q', '$http', '$compile', '$rootScope', function(ResourceLoaderService, $q, $http, $compile, $rootScope) {
    var config = angular.wilson.config;

    var componentVersion = config.app.version || 'none';
    //console.log('app.version', angular.wilson.config.app.version);
    //console.log('componentVersion', componentVersion);
    var connectionFilters = config.app.connectionFilters || [];

    var tmp = config.app.updateInterval.split(' ');
    var updateInterval = {
      count: tmp[0],
      unit: tmp[1]
    };

    var hostUrl = '';

    //Set the CDN host for loading components
    var cdnConfig = config.cdn;
    if (cdnConfig && cdnConfig.host && cdnConfig.host !== 'false') {
      hostUrl = cdnConfig.protocol + '://' + cdnConfig.host;
      ResourceLoaderService.setResourceHost(hostUrl);
    }

    /**
     * Object cache for components that have already been loaded.
     *
     * @property loadedComponents
     * @type Object
     */
    var loadedComponents = {};

    var lastUpdateCheck = moment();

    /**
     * Attempts to get the app version from the server
     *
     * @param componentName
     * @returns { version: '1.X.X' }
     */
    var getCurrentAppVersion = function() {
      var deferred = $q.defer();

      var versionPath = config.client.app.mountpath + '/version';

      $http.get(versionPath).success(deferred.resolve).error(deferred.reject);

      return deferred.promise;
    };

    /**
     * Attempts to get the @componentName component from the server
     *
     * @param componentName
     * @returns {dependencyInfo}
     */
    var getComponent = function(componentName) {
      var deferred = $q.defer();

      var componentPath = _.str.sprintf('%s/%s/component/%s', config.app.mountpath, componentVersion, componentName);
      componentPath = angular.wilson.utils.path.join(hostUrl, componentPath);

      //append connection filters
      if (connectionFilters) {
        componentPath += _.str.sprintf('/%s', connectionFilters);
      }

      // IR debug info
      //console.log('IR.componentPath', componentPath);

      $http.get(componentPath).success(function(response) {
        // IR debug info
        //console.log('IR.componentPath.response', response);

        //update last check time
        lastUpdateCheck = moment();

        deferred.resolve(response);
      }).error(deferred.reject);

      return deferred.promise;
    };

    /**
     * Loads a component into the view.
     *
     * @private
     * @method loadComponent
     * @param componentName
     */
    var loadComponent = function(componentName) {
      var deferred = $q.defer();

      var cachedData = loadedComponents[componentName];

      // IR debug info
      //console.log('IR.loadComponent.componentName', componentName);
      //console.log('IR.loadComponent.cachedData', cachedData);

      if (!cachedData) {
        getComponent(componentName).then(
          function(dependencyData) {
            // IR debug info
            //console.log('IR.loadBundle.dependencyData', dependencyData);
            if (componentVersion === dependencyData.version) {
              // Load Component Resources
              ResourceLoaderService.loadBundle(dependencyData,
                function() {
                  //cache the component data
                  loadedComponents[componentName] = dependencyData;
                  deferred.resolve(dependencyData);
                },
                function() {
                  deferred.reject({
                    message: 'Failed to load resources for ' + componentName
                  });
                });
            } else {
              deferred.resolve(dependencyData);
            }
          },
          deferred.reject
        );
      } else {
        //component is already loaded
        if (moment().diff(lastUpdateCheck, updateInterval.unit) > updateInterval.count) {
          //console.log('updateInterval has expired! interval', updateInterval);
          //We havent checked the server version in a while, make sure we are up to date
          getCurrentAppVersion().then(
            function(versionInfo) {
              if (versionInfo.version !== componentVersion) {
                // IR debug info
//                console.log('IR.componentVersion', componentVersion);
//                console.log('IR.componentVersion typeof', typeof componentVersion);
//                console.log('IR.versionInfo.version', versionInfo.version);
//                console.log('IR.versionInfo.version typeof', typeof versionInfo.version);

                //The server application is a different version than the client
                //mark as out-of-date
                deferred.resolve({
                  version: 'out-of-date'
                });
              } else {
                //Client is still the same version as the server
                //update last check time
                lastUpdateCheck = moment();
                //return cached component
                deferred.resolve(cachedData);
              }
            },
            deferred.reject
          );
        } else {
          //return cached component
          deferred.resolve(cachedData);
        }
      }

      return deferred.promise;
    };

    // Service Object
    var service = {
      load: loadComponent
    };

    return service;
  }]
);
