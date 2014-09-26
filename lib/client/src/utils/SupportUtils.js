/**
 * Support Utils constants
 * @class SupportUtils
 *
 * Author: hunter.novak
 * Date: 9/16/13
 */
'use strict';

(function(wilson, _) {

  var BrowserSupport = {

    detectBrowser: function() {
      var browser = { };

      var detectVersion = function(dataString, versionString) {
        var index = dataString.indexOf(versionString);

        if (index === -1) {
          return;
        }

        return parseFloat(dataString.substring(index + versionString.length + 1));
      };

      // Go through each Browser and check if we are a match, if we are, then determine the version
      var browserFound = false;
      _.each(this.dataBrowser, function(data) {
        // Find Browser
        if (!browserFound) {
          var found = (data.string && data.string.indexOf(data.subString) !== -1) || (data.prop && data.prop.indexOf(data.subString) !== -1);

          if (found) {
              browser[data.identity.toLowerCase()] = true;
              browserFound = true;
              browser.version = detectVersion(navigator.userAgent, data.versionSearch || data.identity) || detectVersion(navigator.appVersion, data.versionSearch || data.identity);
          } else {
            browser[data.identity.toLowerCase()] = false;
          }
        } else {
          browser[data.identity.toLowerCase()] = false;
        }
      });

      return browser;
    },
    dataBrowser: [
      { string: navigator.userAgent,  subString: 'Chrome',  identity: 'Chrome' },
      { string: navigator.userAgent,  subString: 'OmniWeb', identity: 'OmniWeb',    versionSearch: 'OmniWeb/'  },
      { string: navigator.vendor,     subString: 'Apple',   identity: 'Safari',     versionSearch: 'Version' },
      { prop:   window.opera,                               identity: 'Opera',      versionSearch: 'Version' },
      { string: navigator.vendor,     subString: 'iCab',    identity: 'iCab' },
      { string: navigator.vendor,     subString: 'KDE',     identity: 'Konqueror' },
      { string: navigator.userAgent,  subString: 'Firefox', identity: 'Firefox' },
      { string: navigator.vendor,     subString: 'Camino',  identity: 'Camino' },
      { string: navigator.userAgent, subString: 'Netscape', identity: 'Netscape' },
      { string: navigator.userAgent, subString: 'MSIE',     identity: 'MSIE',       versionSearch: 'MSIE' },
      { string: navigator.userAgent, subString: 'Gecko',    identity: 'Mozilla',    versionSearch: 'rv' },
      { string: navigator.userAgent, subString: 'Mozilla',  identity: 'Netscape',   versionSearch: 'Mozilla' }
    ],
    dataOS: [
      { string: navigator.platform,   subString: 'Win',     identity: 'Windows' },
      { string: navigator.platform,   subString: 'Mac',     identity: 'Mac' },
      { string: navigator.userAgent,  subString: 'iPhone',  identity: 'iPhone/iPod' },
      { string: navigator.platform,   subString: 'Linux',   identity: 'Linux' }
    ]

  };

  wilson.utils.browser = BrowserSupport.detectBrowser();

})(angular.wilson, _);