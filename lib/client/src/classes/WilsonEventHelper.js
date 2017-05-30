/**
 * Created by hunter.novak on 5/27/17.
 */
'use strict';

wilson.service('WilsonEventHelper', ['$timeout', function($timeout) {

  //    ____                _                   _
  //   / ___|___  _ __  ___| |_ _ __ _   _  ___| |_ ___  _ __
  //  | |   / _ \| '_ \/ __| __| '__| | | |/ __| __/ _ \| '__|
  //  | |__| (_) | | | \__ \ |_| |  | |_| | (__| || (_) | |
  //   \____\___/|_| |_|___/\__|_|   \__,_|\___|\__\___/|_|
  //
  //

  function WilsonEventHelper(scope) {
    this.scope = scope;
  }


  //    ____ _                 __  __      _   _               _
  //   / ___| | __ _ ___ ___  |  \/  | ___| |_| |__   ___   __| |___
  //  | |   | |/ _` / __/ __| | |\/| |/ _ \ __| '_ \ / _ \ / _` / __|
  //  | |___| | (_| \__ \__ \ | |  | |  __/ |_| | | | (_) | (_| \__ \
  //   \____|_|\__,_|___/___/ |_|  |_|\___|\__|_| |_|\___/ \__,_|___/
  //
  //region class methods

  /**
   * Adds to @handler $on @eventName and automatically
   * removes when the Component is destroyed
   *
   * @param signal
   * @param handler
   */
  WilsonEventHelper.prototype.event = function event(eventName, handler) {
    var removeOnHandler = this.scope.$on(eventName, handler);

    var removeDestroy = this.scope.$on('$destroy', function() {
      removeOnHandler();
      removeDestroy();
    });
  };


  /**
   * Adds to @handler on @signal and automatically
   * removes when the Component is destroyed
   *
   * @param signal
   * @param handler
   */
  WilsonEventHelper.prototype.signal = function signal(signal, handler) {
    signal.add(handler);

    var removeDestroy = this.scope.$on('$destroy', function() {
      if (signal.has(handler)) {
        signal.remove(handler);
      }
      removeDestroy();
    });
  };


  /**
   * Sets a $watch that will automatically be removed when the $scope is $destroy'ed
   * @param key
   * @param watchHandler
   */
  WilsonEventHelper.prototype.watch = function watch(key, watchHandler) {
    //Add watch to key value
    var removeWatch = this.scope.$watch(key, watchHandler);

    var removeDestroy = this.scope.$on('$destroy', function() {
      removeWatch();
      removeDestroy();
    });
  };


  /**
   * Adds a handler to be called after any completed angular digest cycle.
   *
   * @param handle
   */
  WilsonEventHelper.prototype.digest = function digest(handle) {
    var _cancelDigestUpdate = null;
    var me                  = this;

    // Function that will run after the digest
    function afterDigest(callback) {
      if (me.scope.$$destroyed) { return; }

      // Setup a watch to run once
      _cancelDigestUpdate = me.scope.$watch(function() {
        _cancelDigestUpdate();
        $timeout(function() {
          callback();
          afterDigest(callback);
        }, 0, false);
      });
    }

    afterDigest(handle);
  };

  // endregion


  return WilsonEventHelper;

}]);