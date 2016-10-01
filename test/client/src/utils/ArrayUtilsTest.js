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


    runTest('ArrayUtils-1000-02', 'spliceArray  - Should behave as normal Array.prototype.splice with only 3 args.', function() {

      var originalArray = ['a','b','c'];
      var removedItems  = wilson.utils.spliceArray(originalArray, 1, 1);

      expect(removedItems.length).toBe(1);
      expect(removedItems[0]).toBe('b');

      expect(originalArray.length).toBe(2);
      expect(originalArray[0]).toBe('a');
      expect(originalArray[1]).toBe('c');

      originalArray = ['a','b','c'];
      removedItems  = wilson.utils.spliceArray(originalArray, 0);

      expect(removedItems.length).toBe(3);
      expect(removedItems[0]).toBe('a');
      expect(removedItems[1]).toBe('b');
      expect(removedItems[2]).toBe('c');

      expect(originalArray.length).toBe(0);

    });


    runTest('ArrayUtils-1000-03', 'spliceArray  - Should apply array arguments to splice if included as a 4th argument.', function() {

      var originalArray = ['a','b','c'];
      var removedItems  = wilson.utils.spliceArray(originalArray, 1, 1, ['d','e']);

      expect(removedItems.length).toBe(1);
      expect(removedItems[0]).toBe('b');

      expect(originalArray.length).toBe(4);
      expect(originalArray[0]).toBe('a');
      expect(originalArray[1]).toBe('d');
      expect(originalArray[2]).toBe('e');
      expect(originalArray[3]).toBe('c');


      originalArray = ['a','b','c'];
      removedItems  = wilson.utils.spliceArray(originalArray, 0, 0, ['d','e']);

      expect(removedItems.length).toBe(0);
      expect(originalArray.length).toBe(5);
      expect(originalArray[0]).toBe('d');
      expect(originalArray[1]).toBe('e');
      expect(originalArray[2]).toBe('a');
      expect(originalArray[3]).toBe('b');
      expect(originalArray[4]).toBe('c');

    });


    runTest('ArrayUtils-1000-04', 'replaceArray - Should should properly replace the contents of an array and maintain the same reference.', function() {

      var originalArray   = ['a','b','c'];
      var siblingArray    = ['d','e','f'];
      var savedReference  = originalArray;

      wilson.utils.replaceArray(originalArray, siblingArray)

      expect(originalArray.length).toBe(3);
      expect(originalArray[0]).toBe('d');
      expect(originalArray[1]).toBe('e');
      expect(originalArray[2]).toBe('f');

      // Ensure that this reference is exactly the same
      expect(originalArray).not.toBe(siblingArray);
      expect(originalArray).toBe(savedReference);

    });


    runTest('ArrayUtils-1000-05', 'replaceArray - Should not alter the contents of the source array.', function() {

      var destinationArray  = ['a','b','c'];
      var sourceArray       = ['d','e','f'];

      wilson.utils.replaceArray(destinationArray, sourceArray)

      expect(sourceArray.length).toBe(3);
      expect(sourceArray[0]).toBe('d');
      expect(sourceArray[1]).toBe('e');
      expect(sourceArray[2]).toBe('f');

    });


    runTest('ArrayUtils-1000-06', 'clearArray   - Should should properly clear the contents of an array and maintain the same reference.', function() {

      var originalArray   = ['a','b','c'];
      var savedReference  = originalArray;

      wilson.utils.clearArray(originalArray)

      expect(originalArray.length).toBe(0);

      // Ensure that this reference is exactly the same
      expect(originalArray).toBe(savedReference);

    });

    // endregion

  });

});