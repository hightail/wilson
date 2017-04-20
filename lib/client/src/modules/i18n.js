/**
 * Module that provides i18n support.
 *
 * The module is declared with an accompanying service for facilitating
 * i18n functionality.
 *
 * @module wilson
 * @submodule wilson.i18n
 *
 * @author dan.nguyen
 * @author hunter.novak (updates)
 * @since 0.0.1
 *
 * @copyright (c) 2017 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.module('wilson.i18n', []).provider('i18nextService', function() {
  var _options = {};

  /**
   * Initialize the i18nextServiceProvider with a set of options.
   *
   * @public
   * @method init
   * @param o
   */
  this.init = function(o) {
    _options = _.extend(_options, o);

    window.i18next.init(_options);
  };


  /**
   * Returns a translate function for the given namespaces.
   *
   * @param namespace
   * @returns {Function}
   */
  function getTranslateForNamespace(namespace) {
    // Return a function that has a default namespace
    return function(text, options) {
      // Create a default callback if needed
      options = options || {};

      // Default namespace is component name
      if (typeof options.ns !== 'string' || options.ns === '') { options.ns = namespace; }

      //use the i18n provider to translate the text
      return window.i18next.t(text, options);
    };
  }

  /**
   * Recurse through a key value set and call the handler on all primitive type values.
   */
  function traverseRecursive(value, key, list, handler) {
    if (_.isObject(value) || _.isArray(value)) {
      _.each(value, function(v, k, l) {
        l[k] = traverseRecursive(v, k, l, handler);
      });
      return list[key];
    } else {
      // jsonOb is a number or string
      return handler(value, key, list);
    }
  }


  /**
   * Traverse through an object calling the handler for all primitive type values.
   */
  function traverse(object, handler) {
    // set default handler to an identity function
    handler = handler || _.identity;

    if (_.isObject(object) || _.isArray(object)) {
      _.each(object, function(value, key, list) {
        list[key] = traverseRecursive(value, key, list, handler);
      });
      return object;
    } else {
      // jsonOb is a number or string
      return handler(object);
    }
  }

  /**
   * Get translation function that uses a given namespace to translate keys of the given jsonObject.
   * @param namespace
   * @returns {Function}
   */
  function getTranslateJsonForNamespace(namespace) {
    var translate = getTranslateForNamespace(namespace);

    //Return a function that has a default namespace
    return function(jsonObj, options) {
      options = options || {};
      options.ignoreKeys = options.ignoreKeys || [];

      return traverse(jsonObj, function(value, key, list) {
        var newValue = value;
        if (_.isString(value) && !_.contains(options.ignoreKeys, key)) {
          newValue = translate(value, options);
        }
        return newValue;
      });
    };
  }


  //   ____                  _            ____        __ _       _ _   _
  //  / ___|  ___ _ ____   _(_) ___ ___  |  _ \  ___ / _(_)_ __ (_) |_(_) ___  _ __
  //  \___ \ / _ \ '__\ \ / / |/ __/ _ \ | | | |/ _ \ |_| | '_ \| | __| |/ _ \| '_ \
  //   ___) |  __/ |   \ V /| | (_|  __/ | |_| |  __/  _| | | | | | |_| | (_) | | | |
  //  |____/ \___|_|    \_/ |_|\___\___| |____/ \___|_| |_|_| |_|_|\__|_|\___/|_| |_|
  //
  // region service definition

  this.$get = ['$window', function($window) {
    return {
      translate: $window.i18next.t,

      getTranslateForNamespace: getTranslateForNamespace,

      getTranslatorForNamespace: function(namespace) {
        var translator = {
          translate: getTranslateForNamespace(namespace),
          translateJson: getTranslateJsonForNamespace(namespace)
        };

        return translator;
      },

      getSupportedLanguages:  function() { return _options.languageData ? _options.languageData : []; },
      getActiveLanguage:      function() { return _options.lng ? _options.lng : _options.fallbackLng; }
    };
  }];

  // endregion

});
