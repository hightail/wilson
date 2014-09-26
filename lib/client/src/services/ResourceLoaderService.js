/**
 * This service is used to dynamically load new scripts into the DOM and fire a callback on completion. Scripts
 * may be loaded either one at a time or by batch using the loadBundle() method. Loaded scripts are cached and will
 * not be subsequently loaded if they are already in the cache. The cache entry for a given script is provisioned with
 * a value of false while the script is a loading and is then transitioned to a value of true once the script is fully
 * loaded.
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

angular.wilson.service('ResourceLoaderService',
  ['$templateCache', function($templateCache) {
    var scripts = {};
    var templates = {};
    var hostUrl = '';

    // We are handling our own caching so set jQuery cache to true
    // Note: This is very important because otherwise ALL requests
    // will re-hit the server
    $.ajaxSetup({
      cache: true
    });

    /**
     * Set a URL to use as the base URL to load resources from
     * @param host
     */
    var setResourceHost = function(host) {
      hostUrl = host;
    };

    /**
     *
     * Loads a script for the given source url and calls the passed callback upon completion.
     *
     * @public
     * @method loadScript
     * @param src
     * @param callback
     *
     * @async
     */
    var loadScript = function(src, callback) {
      callback = callback || $.noop;

      var scriptUrl = angular.wilson.utils.path.join(hostUrl, src);
      if (!scripts[src]) {
        scripts[src] = false;

        //console.log('resource', scriptUrl);
        $.getScript(scriptUrl)
          .done(function( script, textStatus ) {
            scripts[src] = true;
            //console.log(_.str.sprintf('SUCCESS: %s LOADED (%s)', src, textStatus));
            callback();
          })
          .fail(function( jqxhr, settings, exception ) {
            console.log(_.str.sprintf('ERROR: %s FAILED TO LOAD', src));
            callback(false);
          });
      } else {
        callback();
      }
    };

    /**
     *
     * Loads a template given an @id, @type, and @data content. Loading is synchronous because there the content
     * does not need to be loaded via http request. Returns true if the template was loaded, false if the template
     * already exists in the cache.
     *
     * @public
     * @method loadTemplate
     *
     * @param id
     * @param type
     * @param data
     *
     * @returns boolean - true if template was added, false if it is already cached.
     */
    var loadTemplate = function(id, type, data) {
      // If the template is not cached, then load it
      if (!templates[id]) {
        templates[id] = true;

        // Register this template id into Angular template cache
        $templateCache.put(id, data);

        return true;
      }

      return false;
    };

    /**
     *
     * Loads a resource bundle of scripts and templates. Once all files have been loaded the given @callback
     * is fired. Template files are first loaded synchronously and sourced scripts are then loaded asynchronously. If
     * no new scripts or templates are found (i.e. if all scripts and templates already exist in the cache), then the
     * callback is immediately fired.
     *
     * @public
     * @method loadBundle
     * @param resources
     * @param callback
     *
     * @async
     */
    var loadBundle = function(resources, bundleCompleteCallback, bundleErrorCallback) {
      bundleCompleteCallback = bundleCompleteCallback || $.noop;

      // Determine the delta between scripts in the cache and new scripts in the given resource bundle
      var newScripts    = _.difference(resources.scripts, _.keys(scripts));
      var newTemplates  = _.difference(_.pluck(resources.templates, 'id'), _.keys(templates));

      // Create bit string  -- TODO: add version checksum aggregation here
//      var missingScripts = [];
//      var anyLoaded = false;
//      _.each(resources.scripts, function(value, key) {
//        if (!scripts[value]) {
//          missingScripts.push(key);
//        } else {
//          anyLoaded = true;
//        }
//      });
//
//      if (anyLoaded) {
//        console.log(missingScripts.join(','));
//      } else {
//        console.log('ALL SCRIPTS NEEDED');
//      }

      // Load any and all new templates
      _.each(newTemplates, function(templateId) {
        var template = _.findWhere(resources.templates, { id: templateId });
        loadTemplate(template.id, template.type, template.data);
      });

      // Load all of the new scripts in parallel
      async.each(newScripts, function(script, callback) {
        loadScript(script, callback);
      }, function(err) {
        if (err) {
          bundleErrorCallback();
        } else {
          //This is the callback when all scripts have loaded
          bundleCompleteCallback();
        }
      });
    };

    // Service Object
    var service = {
      setResourceHost: setResourceHost,

      loadScript: loadScript,

      loadTemplate: loadTemplate,

      loadBundle: loadBundle
    };

    return service;
  }]
);
