/**
 * ObjectUtilsTest
 *
 * Test Suite for ArrayUtils
 *
 * @author hunter.novak
 * @since 2.0.0
 */

describe('Utilities', function() {

  describe('DataUtils', function () {

    // Establish Test Setup
    beforeEach(module('testWilson'));


    //   _____         _     ____        _ _
    //  |_   _|__  ___| |_  / ___| _   _(_) |_ ___
    //    | |/ _ \/ __| __| \___ \| | | | | __/ _ \
    //    | |  __/\__ \ |_   ___) | |_| | | ||  __/
    //    |_|\___||___/\__| |____/ \__,_|_|\__\___|
    //
    // region test suite

    runTest('DataUtils-1000-01', 'Should have expected data utility functions.', function() {

      // bytesToReadable
      expect(wilson.utils.bytesToReadable).toBeDefined();
      expect(typeof wilson.utils.bytesToReadable).toBe('function');
      expect(wilson.utils.bytesToReadable.length).toBe(2);

      // bytesToReadable
      expect(wilson.utils.generateUUID).toBeDefined();
      expect(typeof wilson.utils.generateUUID).toBe('function');
      expect(wilson.utils.generateUUID.length).toBe(0);

    });


    runTest('DataUtils-1000-02', 'bytesToReadable - Should properly convert byte int value to readable string.', function() {

      expect(wilson.utils.bytesToReadable(1073741824)).toBe('1 GB');
      expect(wilson.utils.bytesToReadable(1048576)).toBe('1 MB');
      expect(wilson.utils.bytesToReadable(1024)).toBe('1 KB');
      expect(wilson.utils.bytesToReadable(5)).toBe('5 Bytes');

    });


    runTest('DataUtils-1000-02', 'bytesToReadable - Should default to 1 decimal precision.', function() {

      expect(wilson.utils.bytesToReadable(1523461)).toBe('1.5 MB');

    });


    runTest('DataUtils-1000-03', 'bytesToReadable - Should allow decimal precision to be changed using the 2nd argument.', function() {

      expect(wilson.utils.bytesToReadable(1523461, 0)).toBe('1 MB');
      expect(wilson.utils.bytesToReadable(1523461, 1)).toBe('1.5 MB');
      expect(wilson.utils.bytesToReadable(1523461, 2)).toBe('1.45 MB');
      expect(wilson.utils.bytesToReadable(1523461, 4)).toBe('1.4529 MB');
      expect(wilson.utils.bytesToReadable(1523461, 8)).toBe('1.45288563 MB');

    });


    runTest('DataUtils-1000-04', 'generateUUID    - Should generate a RFC4122 v4 compliant UUID string.', function() {
      var legalChars = '0123456789abcdef';
      var uuid = wilson.utils.generateUUID();

      expect(uuid).toBeDefined();
      expect(typeof uuid).toBe('string');
      expect(uuid.length).toBe(36);

      // Verify formatting
      for (var i = 0; i < uuid.length; i++) {
        if      (_.includes([8, 13, 18, 23], i))  { expect(uuid[i]).toBe('-'); }
        else if (i === 14)                        { expect(uuid[i]).toBe('4'); }
        else                                      { expect(legalChars.indexOf(uuid[i])).not.toBe(-1); }
      }

    });

    // endregion

  });

});