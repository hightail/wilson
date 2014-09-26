/**
 * TranslationOverride Service
 *
 * @class TranslationOverrideService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @author justin.fiedler
 * @since 0.0.1
 *
 * @copyright (c) 2014 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('TranslationOverrideService', function() {

  //Global Dictionary of override translations for fast lookup
  var translationOverrides = {
    // 'overriddenNS': {
    //   'textKey': {
    //      'overridingNs1': true
    //      ...
    //    },
    //    ...
    // },
    //  ...
  };

  /**
   * Adds an overide entry for the given params
   *
   * @param nsToOverride    The namespace you want to be overriden
   * @param overridingNs    The namespace you want to override with
   * @param textKey         The textKey to override
   */
  var addOverride = function(nsToOverride, overridingNs, textKey) {
    var nsOverrides = translationOverrides[nsToOverride];

    if (!nsOverrides) {
      //create a dictionary for 'nsToOverride'
      nsOverrides = translationOverrides[nsToOverride] = {};
    }

    var textKeyEntry = nsOverrides[textKey];
    if (!textKeyEntry) {
      //create and entry for the 'textKey' in 'nsToOverride'
      textKeyEntry = nsOverrides[textKey] = {};
    }

    var overridingNsEntry = textKeyEntry[overridingNs];
    if (!overridingNsEntry) {
      //mark the textKey as having an override for 'overridingNs'
      textKeyEntry[overridingNs] = true;
    }

    //console.log('translationOverrides', translationOverrides);
  };

  /**
   * Returns true if namespace @ns has ANY overrides for @textKey
   *
   * @param ns
   * @param textKey
   * @returns {boolean}
   */
  var hasOverride = function(ns, textKey) {
    return (translationOverrides[ns] && translationOverrides[ns][textKey]);
  };

  /**
   * Returns true if namespace @ns has an override for @textKey in @overridingNs
   *
   * @param ns
   * @param textKey
   * @param overridingNs
   * @returns {boolean}
   */
  var hasOverrideForNamespace = function(ns, textKey, overridingNs) {
    return (translationOverrides[ns] &&
            translationOverrides[ns][textKey] &&
            translationOverrides[ns][textKey][overridingNs]);
  };

  // Service Object
  var service = {
    addOverride: addOverride,
    hasOverride: hasOverride,
    hasOverrideForNamespace: hasOverrideForNamespace
  };

  return service;
});
