/**
 * This service is used to dynamically load new scripts into the DOM and new templates into angular. Loaded scripts and
 * templates are cached and will not be subsequently loaded if they are already in the cache.
 *
 * @class ResourceLoaderService
 * @module wilson
 *
 * @author hunter.novak
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

wilson.service('ResourceLoaderService', ['$q', '$templateCache', function($q, $templateCache) {
    var _scriptCache    = {};
    var _templateCache  = {};
    var _styleCache     = {};
    var _styleElem      = $('<div id="wilson-style-chunks"></div>').appendTo('body');
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
     *
     * @return Promise
     */
    function loadScript(src) {
      var scriptUrl = angular.wilson.utils.path.join(_appHostUrl, src);

      // Immediately resolve if we have this script cached
      if (_scriptCache[src]) { return $q.when(); }

      // Create a new promise and attempt script load
      var deferred  = $q.defer();

      $.getScript(scriptUrl).done(function(script, textStatus) {
//        wilson.log.debug('SUCCESS: ' + src + ' LOADED (' + textStatus + ')');
        _scriptCache[src] = true;  // Mark entry in cache for this script src
        deferred.resolve();
      }).fail(function(jqxhr, settings, exception) {
        wilson.log.error('ERROR: ' + src + ' FAILED TO LOAD');
        deferred.reject();
      });

      return deferred.promise;
    }


    /**
     *
     * Loads a the styles for a given id and styleContent. Loading is synchronous because the content is simple
     * put into the document in a style block.
     *
     * @param id
     * @param styleContent
     */
    function loadStyles(id, styleContent) {
      if (!_styleCache[id]) {
        _styleElem.append('<style type="text/css" data-style-id="' + id + '">' + styleContent + '</style>');
        _styleCache[id] = true;  // Mark entry in cache for this script src
      }
    }


    /**
     *
     * Loads a template given an @id and @data content. Loading is synchronous because there the content
     * does not need to be loaded via http request.
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
     * Load a set of scripts asynchronously into the document. Returns a promise that is resolved
     * when all scripts have successfully loaded.
     *
     * @param scripts
     * @return Promise
     */
    function loadResourceScripts(scripts) {
      // Load all of the new scripts in parallel
      var scriptPromises = [];
      _.each(scripts, function(script) { scriptPromises.push(loadScript(script)); });

      return $q.all(scriptPromises);
    }


    /**
     *
     * Loads a resource bundle of scripts and templates. Once all files have been loaded the given @callback
     * is fired. Template files are first loaded synchronously and sourced scripts are then loaded asynchronously. If
     * no new scripts or templates are found (i.e. if all scripts and templates already exist in the cache), then the
     * promise is immediately resolved.

     * @param resources
     *
     * @return Promise
     */
    function loadResourceBundle(resources) {
      // Load any and all new templates
      _.each(resources.templates, function(template) { loadTemplate(template.id, template.data); });

      // Load all new styles
      _.each(resources.styles, function(style) { loadStyles(style.id, style.data); });

      // Load any and all scripts
      return loadResourceScripts(resources.scripts);
    }


    /************************************/
    /******** SERVICE INTERFACE *********/
    /************************************/
    var service = {
      setResourceHost:      setResourceHost,
      loadResourceScripts:  loadResourceScripts,
      loadResourceBundle:   loadResourceBundle
    };

    return service;
  }]
);
