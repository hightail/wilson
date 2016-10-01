/**
 * ObjectUtilsTest
 *
 * Test Suite for ArrayUtils
 *
 * @author hunter.novak
 * @since 2.0.0
 */

describe('Utilities', function() {

  describe('ObjectUtils', function () {

    // Establish Test Setup
    beforeEach(module('testWilson'));


    //   _____         _     ____        _ _
    //  |_   _|__  ___| |_  / ___| _   _(_) |_ ___
    //    | |/ _ \/ __| __| \___ \| | | | | __/ _ \
    //    | |  __/\__ \ |_   ___) | |_| | | ||  __/
    //    |_|\___||___/\__| |____/ \__,_|_|\__\___|
    //
    // region test suite

    runTest('ObjectUtils-1000-01', 'Should have expected object utility functions.', function() {

      // clearObject
      expect(wilson.utils.clearObject).toBeDefined();
      expect(typeof wilson.utils.clearObject).toBe('function');
      expect(wilson.utils.clearObject.length).toBe(1);

      // replaceObject
      expect(wilson.utils.replaceObject).toBeDefined();
      expect(typeof wilson.utils.replaceObject).toBe('function');
      expect(wilson.utils.replaceObject.length).toBe(2);

      // getPropFromPath
      expect(wilson.utils.getPropFromPath).toBeDefined();
      expect(typeof wilson.utils.getPropFromPath).toBe('function');
      expect(wilson.utils.getPropFromPath.length).toBe(2);

      // setPropFromPath
      expect(wilson.utils.setPropFromPath).toBeDefined();
      expect(typeof wilson.utils.setPropFromPath).toBe('function');
      expect(wilson.utils.setPropFromPath.length).toBe(3);
    });


    runTest('ObjectUtils-1000-02', 'clearObject     - Should properly clear all properties of an object.', function() {

      var originalObject = { foo: 'foo', bar: 'bar'};
      var savedReference = originalObject;

      wilson.utils.clearObject(originalObject);

      expect(originalObject.foo).toBeUndefined();
      expect(originalObject.bar).toBeUndefined();
      expect(_.isEmpty(originalObject)).toBe(true);

      expect(originalObject).toBe(savedReference);
    });


    runTest('ObjectUtils-1000-03', 'replaceObject   - Should properly replace the source object with the destination object while maintaining the same reference.', function() {

      var destinationObject   = { foo: 'foo', bar: 'bar' };
      var sourceObject        = { fizz: 'fizz', buzz: 'buzz', bar: 'hello' };
      var savedReference      = destinationObject;
      
      wilson.utils.replaceObject(destinationObject, sourceObject);
      
      expect(destinationObject.foo).toBeUndefined();
      expect(destinationObject.fizz).toBe('fizz');
      expect(destinationObject.buzz).toBe('buzz');
      expect(destinationObject.bar).toBe('hello');
      
      expect(destinationObject).toBe(savedReference);
    });


    runTest('ObjectUtils-1000-04', 'replaceObject   - Should not alter the contents of the source object.', function() {

      var destinationObject   = { foo: 'foo', bar: 'bar' };
      var sourceObject        = { fizz: 'fizz', buzz: 'buzz', bar: 'hello' };
      var sourceReference     = sourceObject;

      wilson.utils.replaceObject(destinationObject, sourceObject);

      expect(sourceObject.fizz).toBe('fizz');
      expect(sourceObject.buzz).toBe('buzz');
      expect(sourceObject.bar).toBe('hello');

      expect(sourceObject).toBe(sourceReference);
    });


    runTest('ObjectUtils-1000-05', 'setPropFromPath - Should properly set direct and nested properties onto an object.', function() {

      var targetObject = {};

      wilson.utils.setPropFromPath(targetObject, 'foo', 'bar');

      expect(targetObject.foo).toBeDefined();
      expect(targetObject.foo).toBe('bar');

      wilson.utils.setPropFromPath(targetObject, 'test.a.long.path', 'success');

      expect(targetObject.test).toBeDefined();
      expect(typeof targetObject.test).toBe('object');

      expect(targetObject.test.a).toBeDefined();
      expect(typeof targetObject.test.a).toBe('object');

      expect(targetObject.test.a.long).toBeDefined();
      expect(typeof targetObject.test.a.long).toBe('object');

      expect(targetObject.test.a.long.path).toBeDefined();
      expect(typeof targetObject.test.a.long.path).toBe('string');
      expect(targetObject.test.a.long.path).toBe('success');

    });


    runTest('ObjectUtils-1000-06', 'setPropFromPath - Should properly override direct and nested properties onto an object.', function() {

      var targetObject = { test: { a: { long: { path: 'HELLO' } } } };

      wilson.utils.setPropFromPath(targetObject, 'test.a.long.path', 'success');

      expect(targetObject.test.a.long.path).toBe('success');

      wilson.utils.setPropFromPath(targetObject, 'test', 'NO MORE PATH');

      expect(typeof targetObject.test).toBe('string');
      expect(targetObject.test).toBe('NO MORE PATH');

    });


    runTest('ObjectUtils-1000-07', 'getPropFromPath - Should properly retrieve and return direct and nested properties from an object.', function() {

      var targetObject = { foo: 'bar', test: { a: { long: { path: 'HELLO' } } } };

      var long = wilson.utils.getPropFromPath(targetObject, 'test.a.long');

      expect(long).toBeDefined();
      expect(typeof long).toBe('object');
      expect(long.path).toBeDefined();
      expect(long.path).toBe('HELLO');

      var foo = wilson.utils.getPropFromPath(targetObject, 'foo');

      expect(foo).toBeDefined();
      expect(typeof foo).toBe('string');
      expect(foo).toBe('bar');

    });


    // endregion

  });

});