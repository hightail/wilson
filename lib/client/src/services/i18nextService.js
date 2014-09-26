/**
 * This service provides i18n translation of dynamic client side strings.
 *
 * @class i18nextService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @author dan.nguyen
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.module('wilson.i18n', []).provider('i18nextService', function() {
  var options = {};

  /**
   * Initialize the i18nextServiceProvider with a set of options.
   *
   * @public
   * @method init
   * @param o
   */
  this.init = function(o) {
    options = _.extend(options, o);

    window.i18n.init(options);
  };

  var getTranslateForNamespace = function(namespace) {
    //Return a function that has a default namespace
    return function(text, options) {
      //create a default callback if needed
      options = options || {};

      // default namespace is component name
      if (typeof options.ns !== 'string' || options.ns === '') {
        options.ns = namespace;
      }

      //use the i18n provider to translate the text
      return window.i18n.t(text, options);
    };
  };

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

  function traverse(object, handler) {
    //set default handler to an identity function
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

  var getTranslateJsonForNamespace = function(namespace) {
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
  };

  /**
   * Returns the translate method of the i18nextService
   *
   * @public
   * @method $get
   */

  this.$get = ['$window', function($window) {
    return {
      translate: $window.i18n.t,

      getTranslateForNamespace: getTranslateForNamespace,

      getTranslatorForNamespace: function(namespace) {
        var translator = {
          translate: getTranslateForNamespace(namespace),
          translateJson: getTranslateJsonForNamespace(namespace)
        };

        return translator;
      },

      getSupportedLanguages: function() {
        return options.languageData ? options.languageData : [];
      },

      getActiveLanguage: function() {
        return options.lng ? options.lng : options.fallbackLng;
      }
    };
  }];

});
