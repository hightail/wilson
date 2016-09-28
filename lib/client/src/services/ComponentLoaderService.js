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
    var _config           = angular.wilson.config;
    var _cdnConfig        = _config.cdn;
    var _appMountPath     = _.trim(config.app.mountpath, '/');
    var _appVersion       = _config.app.version || 'none';
    var _appHostUrl       = '';
    var _updateMillis     = _config.app.updateInterval || 1800000;
    var _componentCache   = {};
    var _lastUpdate       = Date.now();


    // Set the CDN host for loading components
    if (_cdnConfig && _cdnConfig.host && _cdnConfig.host !== 'false') {
      _appHostUrl = _.trim(_cdnConfig.protocol + '://' + _cdnConfig.host, '/');
      ResourceLoaderService.setResourceHost(_appHostUrl);
    }


    //   ____       _            _         __  __      _   _               _
    //  |  _ \ _ __(_)_   ____ _| |_ ___  |  \/  | ___| |_| |__   ___   __| |___
    //  | |_) | '__| \ \ / / _` | __/ _ \ | |\/| |/ _ \ __| '_ \ / _ \ / _` / __|
    //  |  __/| |  | |\ V / (_| | ||  __/ | |  | |  __/ |_| | | | (_) | (_| \__ \
    //  |_|   |_|  |_| \_/ \__,_|\__\___| |_|  |_|\___|\__|_| |_|\___/ \__,_|___/
    //
    // region private methods


    /**
     * Attempts to get the app version from the server
     *
     * @return promise
     */
    function getCurrentAppVersion() {
      return $http.get((_appMountPath + '/version'));
    }


    function buildComponentUrl(name, connectionFilters) {
      return _.trim([_appHostUrl, _appMountPath, _appVersion, 'component', name, (connectionFilters || '')].join('/'), '/');
    }


    /**
     * Fetches component dependency data from the server
     *
     * @param componentName
     * @return promise
     */
    function fetchComponentData(componentName) {
      // Build Component Request Url
      var componentUrl = buildComponentUrl(componentName, config.app.connectionFilters);

      // Fetch component data from server
      return $http.get(componentUrl).then(function(componentData) {
        _lastUpdate = Date.now();
        return componentData;
      }, $q.reject);
    }

    // endregion


    //   ____        _     _ _        __  __      _   _               _
    //  |  _ \ _   _| |__ | (_) ___  |  \/  | ___| |_| |__   ___   __| |___
    //  | |_) | | | | '_ \| | |/ __| | |\/| |/ _ \ __| '_ \ / _ \ / _` / __|
    //  |  __/| |_| | |_) | | | (__  | |  | |  __/ |_| | | | (_) | (_| \__ \
    //  |_|    \__,_|_.__/|_|_|\___| |_|  |_|\___|\__|_| |_|\___/ \__,_|___/
    //
    // region public methods

    /**
     * Loads a component into the view.
     *
     * @param componentName
     */
    function loadComponent(componentName) {
      var cachedData  = _componentCache[componentName];

      // If component is not cached then fetch it 
      if (!cachedData) {

        return fetchComponentData(componentName).then(function(compData) {
          // If version matches, load resources
          if (_appVersion === compData.version) {
            return ResourceLoaderService.loadResourceBundle(compData).then(function() { return compData; }, $q.reject);
          }

          return $q.when(compData);
        }, $q.reject).then(function(compData) {
          // Cache and return the component data
          return (_componentCache[componentName] = compData);
        }, $q.reject);

      }
      
      // If its time for an update check, get check the server version to see if we are out-of-date
      if ((Date.now() - _lastUpdate) > _updateMillis) {
        // We haven't checked the server version in a while, make sure we are up to date
        return getCurrentAppVersion().then(function(versionInfo) {
          // If the server application is a different version than we do resolve as out-of-date
          if (versionInfo.version !== _appVersion) { return $q.when({ version: 'out-of-date' }); }

          // Update the last check time and return our cachedData
          _lastUpdate = Date.now();

          return cachedData;
        }, $q.reject);
      }

      // Otherwise, resolve the cache component data
      return $q.when(cachedData);
    }

    // endregion


    /************************************/
    /******** SERVICE INTERFACE *********/
    /************************************/
    var service = { load: loadComponent };

    return service;
  }]
);
