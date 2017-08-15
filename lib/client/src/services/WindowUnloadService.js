/**
 * WindowUnload Service
 *
 * @class WindowUnloadService
 * @module wilson
 *
 * @author hunter.novak
 * @since 4.0.0
 *
 * @copyright (c) 2017 Hightail Inc. All Rights Reserved
 */
'use strict';

wilson.service('WindowUnloadService', ['$window', '$document', '$rootScope', function($window, $document, $rootScope) {

  var _disableUnloadHandling  = false;
  var _hasCompletedPrompt     = false;


  //   ____       _            _         __  __      _   _               _
  //  |  _ \ _ __(_)_   ____ _| |_ ___  |  \/  | ___| |_| |__   ___   __| |___
  //  | |_) | '__| \ \ / / _` | __/ _ \ | |\/| |/ _ \ __| '_ \ / _ \ / _` / __|
  //  |  __/| |  | |\ V / (_| | ||  __/ | |  | |  __/ |_| | | | (_) | (_| \__ \
  //  |_|   |_|  |_| \_/ \__,_|\__\___| |_|  |_|\___|\__|_| |_|\___/ \__,_|___/
  //
  // region private methods

  /**
   * Create a specialized window onbeforeunload handler that provides a controlled execution based on if unload handling
   * should be disabled.
   *
   * @param handler {Function} - The original handler to be wrapped.
   * @returns {Function}       - The new controlled handler definition
   */
  function createControlledHandler(handler) {
    return function() {
      if (!_disableUnloadHandling) {
        var prompt = handler();
        if (prompt) { return prompt; }
      }
    }
  }

  // endregion



  //   ____        _     _ _        __  __      _   _               _
  //  |  _ \ _   _| |__ | (_) ___  |  \/  | ___| |_| |__   ___   __| |___
  //  | |_) | | | | '_ \| | |/ __| | |\/| |/ _ \ __| '_ \ / _ \ / _` / __|
  //  |  __/| |_| | |_) | | | (__  | |  | |  __/ |_| | | | (_) | (_| \__ \
  //  |_|    \__,_|_.__/|_|_|\___| |_|  |_|\___|\__|_| |_|\___/ \__,_|___/
  //
  // region public methods


  /**
   * Registers a handler on the window.onbeforeunload event.  If the handler returns a string a confirmation message
   * is displayed to the user prior to unloading the window. If the includeLocalNavigation flag is set to true, then a
   * handler will also be placed on local navigation in the $locationChangeStart event.
   *
   * @param unloadHandler {Function}          - The handler function to run when the window starts unloading
   * @param includeLocalNavigation {boolean}  - True if the handler should also cover local navigation events
   *
   * @returns {Function}                      - Function that will destroy the attached handler
   */
  function registerHandler(unloadHandler, includeLocalNavigation) {
    var uniqueHandler = createControlledHandler(unloadHandler || function() {});
    var localCleanup  = null;

    // Set window handler
    $(window).on('beforeunload', uniqueHandler);

    // If local navigation is included, set a local handler
    if (includeLocalNavigation) {
      localCleanup = $rootScope.$on('$locationChangeStart', function locationChange(event) {
        if (!_hasCompletedPrompt) {
          var prompt = unloadHandler();
          if (prompt) {
            if (!$window.confirm(prompt)) { event.preventDefault();  }
            _hasCompletedPrompt = true;
          }
        }
      });
    }

    return function() {
      $(window).off('beforeunload', uniqueHandler);
      if (localCleanup) { localCleanup(); };
    };
  }

  // endregion



  //  ___       _ _   _       _ _
  // |_ _|_ __ (_) |_(_) __ _| (_)_______
  //  | || '_ \| | __| |/ _` | | |_  / _ \
  //  | || | | | | |_| | (_| | | |/ /  __/
  // |___|_| |_|_|\__|_|\__,_|_|_/___\___|
  //
  // region initialize

  // Initialize local nav handler
  $rootScope.$on('$locationChangeStart', function() { _hasCompletedPrompt = false; });

  // Handle Special Navigation Ignore cases
  $($document).on('click', 'a[href^=mailto]', function() {
    _disableUnloadHandling = true;

    var disabledHandler = function() {
      _disableUnloadHandling = false;
      $(window).off('beforeunload', disabledHandler);
    };

    $(window).on('beforeunload', disabledHandler)
  });

  // endregion


  /************************************/
  /******** SERVICE INTERFACE *********/
  /************************************/
  var service = {
    registerHandler:  registerHandler
  };

  return service;
}]);
