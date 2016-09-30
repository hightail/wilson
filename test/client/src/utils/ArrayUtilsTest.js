/**
 * ArrayUtilsTest
 *
 * Test Suite for ArrayUtils
 *
 * @author hunter.novak
 * @since 2.0.0
 */

describe('Utilities', function() {

  describe('ArrayUtils', function () {

    // Establish Test Setup
    beforeEach(module('testWilson'));


    //   _____         _     ____        _ _
    //  |_   _|__  ___| |_  / ___| _   _(_) |_ ___
    //    | |/ _ \/ __| __| \___ \| | | | | __/ _ \
    //    | |  __/\__ \ |_   ___) | |_| | | ||  __/
    //    |_|\___||___/\__| |____/ \__,_|_|\__\___|
    //
    // region test suite

    runTest('ArrayUtils-1000-01', 'Should have expected array utility functions.', function() {

      // spliceArray
      expect(wilson.utils.spliceArray).toBeDefined();
      expect(typeof wilson.utils.spliceArray).toBe('function');
      expect(wilson.utils.spliceArray.length).toBe(4);

      // replaceArray
      expect(wilson.utils.replaceArray).toBeDefined();
      expect(typeof wilson.utils.replaceArray).toBe('function');
      expect(wilson.utils.replaceArray.length).toBe(2);

      // clearArray
      expect(wilson.utils.clearArray).toBeDefined();
      expect(typeof wilson.utils.clearArray).toBe('function');
      expect(wilson.utils.clearArray.length).toBe(1);

    });


    runTest('ArrayUtils-1000-02', 'spliceArray - Should behave as normal Array.prototype.splice with only 3 args.', function() {

      var originalArray = ['a','b','c'];
      var removedItems  = wilson.utils.spliceArray(originalArray, 1, 1);

      expect(removedItems.length).toBe(1);
      expect(removedItems[0]).toBe('b');

      expect(originalArray.length).toBe(2);
      expect(originalArray[0]).toBe('a');
      expect(originalArray[1]).toBe('c');

    });

    // endregion

  });

});