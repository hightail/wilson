/**
 * ObjectUtilsTest
 *
 * Test Suite for ArrayUtils
 *
 * @author hunter.novak
 * @since 2.0.0
 */

describe('Utilities', function() {

  describe('UrlUtils', function () {

    // Establish Test Setup
    beforeEach(module('testWilson'));


    //   _____         _     ____        _ _
    //  |_   _|__  ___| |_  / ___| _   _(_) |_ ___
    //    | |/ _ \/ __| __| \___ \| | | | | __/ _ \
    //    | |  __/\__ \ |_   ___) | |_| | | ||  __/
    //    |_|\___||___/\__| |____/ \__,_|_|\__\___|
    //
    // region test suite

    runTest('UrlUtils-1000-01', 'Should have expected url utility functions.', function() {

      // path.join
      expect(wilson.utils.path.join).toBeDefined();
      expect(typeof wilson.utils.path.join).toBe('function');
      expect(wilson.utils.path.join.length).toBe(0);

    });


    runTest('UrlUtils-1000-02', 'path.join - Should should properly join arguments into a combined path.', function() {

      var path = wilson.utils.path.join('test', 'a', 'simple', 'path');

      expect(path).toBeDefined();
      expect(typeof path).toBe('string');
      expect(path).toBe('test/a/simple/path');

    });


    runTest('UrlUtils-1000-03', 'path.join - Should not append path separators if only one segment is specified.', function() {

      var path = wilson.utils.path.join('test');

      expect(path).toBeDefined();
      expect(typeof path).toBe('string');
      expect(path).toBe('test');

    });


    runTest('UrlUtils-1000-03', 'path.join - Should not alter or duplicate existing path separators include in the arguments.', function() {

      var pathA = wilson.utils.path.join('/test/', 'a', '/path');
      var pathB = wilson.utils.path.join('test', '/a/', '/path/');

      expect(pathA).toBeDefined();
      expect(typeof pathA).toBe('string');
      expect(pathA).toBe('/test/a/path');

      expect(pathB).toBeDefined();
      expect(typeof pathB).toBe('string');
      expect(pathB).toBe('test/a/path/');

    });


    // endregion

  });

});