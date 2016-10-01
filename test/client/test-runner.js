/**
 * Created by hunter.novak on 4/6/16.
 */

(function(window) {

  window.runTest = function(name, description, callback) {
    // Asynchronous if there is an argument on our callback
    var isAsync = callback.length;
    var setup   = isAsync ? setupAsyncTest : setupTest;

    it(description, setup(name, callback));
  };

  var setupAsyncTest = function(name, callback) {
    return (function(done) { callback.bind({ testName: name }).apply(callback, [done]); });
  };

  var setupTest = function (name, callback) {
    return (function() { callback.bind({ testName: name }).apply(callback, []); });
  };

})(window);