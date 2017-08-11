/**
 * ComponentLoader Service
 *
 * @class ComponentLoaderService
 * @module wilson
 *
 * @author justin.fiedler
 * @author hunter.novak
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

wilson.service('ComponentLoaderService', ['ResourceLoaderService', '$q', '$http',
  function(ResourceLoaderService, $q, $http) {

    var _config           = angular.wilson.config;
    var _cdnConfig        = _config.cdn;
    var _appMountPath     = _config.app.mountpath;
    var _appVersion       = _config.app.version || 'none';
    var _appHostUrl       = '';
    var _updateMillis     = _config.app.updateIntervalMillis || 1800000;
    var _componentCache   = {};
    var _lastUpdate       = Date.now();


    // Set the CDN host for loading components
    if (_cdnConfig && _cdnConfig.host && _cdnConfig.host !== 'false') {
      _appHostUrl = _cdnConfig.protocol + '://' + _cdnConfig.host;
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
     * @return HttpPromise
     */
    function getCurrentAppVersion() {
      return $http.get((_appMountPath + '/version'));
    }


    /**
     * Build a wilson component request url given a name and connectionFilters hash.
     * @param name
     * @param connectionFilters
     *
     * @returns String
     */
    function buildComponentUrl(name, connectionFilters) {
      return angular.wilson.utils.path.join(_appHostUrl, _appMountPath, _appVersion, 'component', name, (connectionFilters || ''));
    }


    /**
     * Fetches component dependency data from the server
     *
     * @param componentName
     * @return promise
     */
    function fetchComponentData(componentName) {
      // Build Component Request Url
      var componentUrl = buildComponentUrl(componentName, _config.app.connectionFilters);

      // Fetch component data from server
      return $http.get(componentUrl).then(function(response) {
        _lastUpdate = Date.now();
        return response.data;
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
      var cachedComponent  = _componentCache[componentName];

      // If component is not cached then fetch it and store its promise
      if (!cachedComponent) {
        cachedComponent = _componentCache[componentName] = {};

        return (cachedComponent.promise = fetchComponentData(componentName).then(function(compData) {
          // If version matches, load resources
          if (_appVersion === compData.version) {
            return ResourceLoaderService.loadResourceBundle(compData).then(function() { return compData; }, $q.reject);
          }

          return compData;
        }).then(function(compData) {
          // Cache and return the component data
          return (cachedComponent.data = compData);
        }).catch(function(e) {
          _componentCache[componentName] = null;
          return $q.reject(e);
        }));
      }

      // If the component is cached, but there is no data, return the promise
      if (!cachedComponent.data) { return cachedComponent.promise; }

      // If its time for an update check, get check the server version to see if we are out-of-date
      if ((Date.now() - _lastUpdate) > _updateMillis) {
        // We haven't checked the server version in a while, make sure we are up to date
        return getCurrentAppVersion().then(function(versionInfo) {
          // If the server application is a different version than we do resolve as out-of-date
          if (versionInfo.version !== _appVersion) { return $q.when({ version: 'out-of-date' }); }

          // Update the last check time and return our cachedComponent data
          _lastUpdate = Date.now();

          return cachedComponent.data;
        }, $q.reject);
      }

      // Otherwise, resolve the cache component data
      return $q.when(cachedComponent.data);
    }

    // endregion


    /************************************/
    /******** SERVICE INTERFACE *********/
    /************************************/
    var service = { load: loadComponent };

    return service;
  }
]);
