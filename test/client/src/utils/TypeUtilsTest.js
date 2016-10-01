/**
 * ObjectUtilsTest
 *
 * Test Suite for ArrayUtils
 *
 * @author hunter.novak
 * @since 2.0.0
 */

describe('Utilities', function() {

  describe('TypeUtils', function () {

    // Establish Test Setup
    beforeEach(module('testWilson'));


    //   _____         _     ____        _ _
    //  |_   _|__  ___| |_  / ___| _   _(_) |_ ___
    //    | |/ _ \/ __| __| \___ \| | | | | __/ _ \
    //    | |  __/\__ \ |_   ___) | |_| | | ||  __/
    //    |_|\___||___/\__| |____/ \__,_|_|\__\___|
    //
    // region test suite

    runTest('TypeUtils-1000-01', 'Should have expected type utility functions.', function() {

      // parseBoolean
      expect(wilson.utils.parseBoolean).toBeDefined();
      expect(typeof wilson.utils.parseBoolean).toBe('function');
      expect(wilson.utils.parseBoolean.length).toBe(1);

    });


    runTest('TypeUtils-1000-02', 'parseBoolean - Should properly parse falsey values as false.', function() {

      expect(wilson.utils.parseBoolean(0)).toBe(false);
      expect(wilson.utils.parseBoolean(null)).toBe(false);
      expect(wilson.utils.parseBoolean([])).toBe(false);
      expect(wilson.utils.parseBoolean(NaN)).toBe(false);
      expect(wilson.utils.parseBoolean(undefined)).toBe(false);

    });


    runTest('TypeUtils-1000-03', 'parseBoolean - Should properly parse string literals that represent falsey values as false.', function() {

      expect(wilson.utils.parseBoolean('0')).toBe(false);
      expect(wilson.utils.parseBoolean('null')).toBe(false);
      expect(wilson.utils.parseBoolean('NaN')).toBe(false);
      expect(wilson.utils.parseBoolean('undefined')).toBe(false);

      expect(wilson.utils.parseBoolean('[]')).toBe(true);
    });


    // endregion

  });

});