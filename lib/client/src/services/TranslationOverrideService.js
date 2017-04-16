/**
 * TranslationOverride Service
 *
 * @class TranslationOverrideService
 * @module wilson
 *
 * @author justin.fiedler
 * @since 0.0.1
 *
 * @copyright (c) 2014 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('TranslationOverrideService', function() {

  // Global Dictionary of override translations for fast lookup
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
  function addOverride(nsToOverride, overridingNs, textKey) {
    var nsOverrides = translationOverrides[nsToOverride];

    // Create a dictionary for 'nsToOverride' if there are overrides
    if (!nsOverrides) { nsOverrides = translationOverrides[nsToOverride] = {}; }

    // Create an entry for the 'textKey' in 'nsToOverride' if it exists
    var textKeyEntry = nsOverrides[textKey];
    if (!textKeyEntry) { textKeyEntry = nsOverrides[textKey] = {}; }

    // Mark the textKey as having an override for 'overridingNs' if there is an override
    var overridingNsEntry = textKeyEntry[overridingNs];
    if (!overridingNsEntry) { textKeyEntry[overridingNs] = true; }
  }

  /**
   * Returns true if namespace @ns has ANY overrides for @textKey
   *
   * @param ns
   * @param textKey
   * @returns {boolean}
   */
  function hasOverride(ns, textKey) {
    return (translationOverrides[ns] && translationOverrides[ns][textKey]);
  }

  /**
   * Returns true if namespace @ns has an override for @textKey in @overridingNs
   *
   * @param ns
   * @param textKey
   * @param overridingNs
   * @returns {boolean}
   */
  function hasOverrideForNamespace(ns, textKey, overridingNs) {
    return (translationOverrides[ns] &&
            translationOverrides[ns][textKey] &&
            translationOverrides[ns][textKey][overridingNs]);
  }

  
  /************************************/
  /******** SERVICE INTERFACE *********/
  /************************************/
  var service = {
    addOverride:              addOverride,
    hasOverride:              hasOverride,
    hasOverrideForNamespace:  hasOverrideForNamespace
  };

  return service;
});
