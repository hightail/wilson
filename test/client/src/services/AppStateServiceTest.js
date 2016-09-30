/**
 * ComponentFactoryServiceTest
 *
 * Test Suite for the ComponentFactoryService
 *
 * @author hunter.novak
 * @since 2.0.0
 */

describe('Services', function() {

  describe('AppStateService', function () {
    var AppStateService  = null;

    // Establish Test Setup
    beforeEach(module('testWilson'));
    beforeEach(inject(function($injector) {
      AppStateService = $injector.get('AppStateService');
    }));


    //   _____         _     ____        _ _
    //  |_   _|__  ___| |_  / ___| _   _(_) |_ ___
    //    | |/ _ \/ __| __| \___ \| | | | | __/ _ \
    //    | |  __/\__ \ |_   ___) | |_| | | ||  __/
    //    |_|\___||___/\__| |____/ \__,_|_|\__\___|
    //
    // region test suite

    runTest('AppStateService-1000-01', 'Should have proper service interface.', function() {

      expect(AppStateService.getPersistentValue).toBeDefined();
      expect(typeof AppStateService.getPersistentValue).toBe('function');

      expect(AppStateService.setPersistentValue).toBeDefined();
      expect(typeof AppStateService.setPersistentValue).toBe('function');

      expect(AppStateService.setPersistentValues).toBeDefined();
      expect(typeof AppStateService.setPersistentValues).toBe('function');

    });


    runTest('AppStateService-1000-02', 'Should properly store persisted values for retrieval.', function() {

      // Persist a value to a namespace
      AppStateService.setPersistentValue('testing', 'dummy-property', '12345');

      // We should now be able to get that values back out
      var storedVal = AppStateService.getPersistentValue('testing', 'dummy-property');
      expect(storedVal).toBe('12345');
    });


    runTest('AppStateService-1000-03', 'Should be able to access values after app refresh.', function() {

      // Attempt to pull the same property from the last test. It should be there.
      var storedVal = AppStateService.getPersistentValue('testing', 'dummy-property');
      expect(storedVal).toBe('12345');
    });


    runTest('AppStateService-1000-03', 'Should properly persist multiple values given a key value pair set.', function() {

      // Attempt to pull the same property from the last test. It should be there.
      var testData  = { 'test-a': 'Hello', 'test-b': 'World' };

      AppStateService.setPersistentValues('testing', testData);

      _.each(testData, function(val, key) {
        var storedVal = AppStateService.getPersistentValue('testing', key);

        expect(storedVal).toBeDefined();
        expect(storedVal).toBe(val);
      });

    });

    // endregion

  });

});