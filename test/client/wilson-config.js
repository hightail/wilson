/**
 * Test Wilson Config.
 *
 * This file represents a set config for testing a Wilson application module
 * without using the /config endpoints.  In a nutshell, this configures angular.wilson.config
 * to have a proper config object for running any unit tests.
 *
 * @author hunter.novak
 * @since 1.0.2
 */
'use strict';

angular.module('wilson.config', []).config(function () {

  // Set the application config
  angular.wilson.setAppConfig({
    "app": {
      "version": "1.0.0",
      "updateInterval": "1 hours",
      "mountpath": "/wilson",
      "autoLocalizeRoutes": true,
      "name": "Wilson Test",
      "selectors": {
        "component": "ht",
        "behavior": "ht",
        "guide": "guide"
      },
      "connectionFilters": "EYJwhgdgJgvAzgBzAYwKZwD6gPYHc6ogzIAWI2AtqhlKgG4CWaMFKGANpAOYCuYXqGKggYEnAC4AzbCAoxacANbjsCIA"
    },
    "i18n": {
      "lng": "en",
      "fallbackLng": "en",
      "defaultLng": "en",
      "supportedLngs": [
        "en"
      ],
      "namespaces": [],
      "sendMissing": true,
      "useLocalStorage": false,
      "localStorageExpirationTime": 604800000,
      "clientSafeNamespaces": "all",
      "resStore": {
        "en": {}
      }
    },
    "cdn": {},
    "prerender": {
      "enableLogs": false
    },
    "tags": {
      "brand": "spaces",
      "browser": "chrome",
      "device": "mac",
      "language": "en",
      "platform": "desktop"
    },
    "routes": []
  });

});
