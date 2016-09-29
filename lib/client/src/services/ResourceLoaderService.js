/**
 * This service is used to dynamically load new scripts into the DOM and new templates into angular. Loaded scripts and
 * templates are cached and will not be subsequently loaded if they are already in the cache.
 *
 * @class ResourceLoaderService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @author hunter.novak
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('ResourceLoaderService', ['$q', '$templateCache', function($q, $templateCache) {
    var _scriptCache    = {};
    var _templateCache  = {};
    var _appHostUrl     = '';

    // We are handling our own caching so set jQuery cache to true
    // Note: This is very important because otherwise ALL requests will re-hit the server
    $.ajaxSetup({ cache: true });


    /**
     * Set a URL to use as the base URL to load resources from
     * @param host
     */
    function setResourceHost(host) { _appHostUrl = host; }


    /**
     *
     * Loads a script for the given source url and calls the passed callback upon completion.
     *
     * @param src
     * @param callback
     *
     * @return promise
     */
    function loadScript(src) {
      var scriptUrl =angular.wilson.utils.path.join(_appHostUrl, src);

      // Immediately resolve if we have this script cached
      if (_scriptCache[src]) { return $q.when(); }

      // Create a new promise and attempt script load
      var deferred  = $q.defer();

      $.getScript(scriptUrl).done(function(script, textStatus) {
        // console.log('SUCCESS: ' + src + ' LOADED (' + textStatus + ')');
        _scriptCache[src] = true;  // Mark entry in cache for this script src
        deferred.resolve();
      }).fail(function(jqxhr, settings, exception) {
        console.log('ERROR: ' + src + ' FAILED TO LOAD');
        deferred.reject();
      });

      return deferred.promise;
    }

    /**
     *
     * Loads a template given an @id and @data content. Loading is synchronous because there the content
     * does not need to be loaded via http request. Returns true if the template was loaded, false if the template
     * already exists in the cache.
     *
     * @param id
     * @param data
     *
     */
    function loadTemplate(id, data) {
      // If the template is not cached, then register it into the Angular template cache
      if (!$templateCache[id]) {
        $templateCache.put(id, data);
        _templateCache[id] = { id: id };
      }
    }


    /**
     *
     * Loads a resource bundle of scripts and templates. Once all files have been loaded the given @callback
     * is fired. Template files are first loaded synchronously and sourced scripts are then loaded asynchronously. If
     * no new scripts or templates are found (i.e. if all scripts and templates already exist in the cache), then the
     * promise is immediately resolved.

     * @param resources
     *
     * @return promise
     */
    function loadResourceBundle(resources) {
      // Determine the delta between scripts in the cache and new scripts in the given resource bundle
      var newScripts    = _.difference(resources.scripts, _.keys(_scriptCache));
      var newTemplates  = _.differenceBy(resources.templates, _.values(_templateCache), 'id');

      // Load any and all new templates
      _.each(newTemplates, function(template) { loadTemplate(template.id, template.data); });

      // Load all of the new scripts in parallel
      var scriptPromises = [];
      _.each(newScripts, function(script) { scriptPromises.push(loadScript(script)); });

      return $q.all(scriptPromises);
    }


    /************************************/
    /******** SERVICE INTERFACE *********/
    /************************************/
    var service = {
      setResourceHost:    setResourceHost,
      loadResourceBundle: loadResourceBundle
    };

    return service;
  }]
);
