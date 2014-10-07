/**
 * IRouteService
 *
 * @class IRouteService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @author justin.fiedler
 * @since 0.0.1
 *
 * @copyright (c) 2014 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('IRouteService',
  ['$window', '$location', 'localStorageService', function($window, $location, localStorageService) {
    //var translate = i18nextService.getTranslateForNamespace('route-titles');

    var handleRouteChange = function(currentRoute, routeOptions, routeInfo) {

      return true;
    };

    /**
     * Handles set up related to language
     */
//    var setLanguage = function() {
//      var configLng = angular.wilson.config.i18n.momentLng;
//      var currentLng = moment.lang();
//
//      if (currentLng !== configLng) {
//        currentLng = moment.lang(configLng);
//      }
//    };

    var translateTitle = function(routeTitle) {
      // Update page title
//      if (routeTitle) {
//        return translate(routeTitle, {
//          company: angular.wilson.config.client.companyInfo.defaultLabel,
//          product: angular.wilson.config.appOptions.productName
//        });
//      }
//
//      return false;
      return routeTitle;
    };

    // Service Object
    var service = {
      handleRouteChange: handleRouteChange,
      translateTitle: translateTitle
    };

    return service;
  }]
);
