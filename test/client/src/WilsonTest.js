/**
 * ComponentFactoryServiceTest
 *
 * Test Suite for the ComponentFactoryService
 *
 * @author hunter.novak
 * @since 2.0.0
 */

describe('Core', function() {

  describe('Wilson', function () {
    var rootScope     = null;
    var injector      = null;
    var compile       = null;
    var templateCache = null;

    // Establish Test Setup
    beforeEach(module('testWilson'));
    beforeEach(inject(function($injector) {
      injector      = $injector;
      rootScope     = $injector.get('$rootScope');
      compile       = $injector.get('$compile');
      templateCache = $injector.get('$templateCache');
    }));


    //   _____         _     _   _ _   _ _
    //  |_   _|__  ___| |_  | | | | |_(_) |___
    //    | |/ _ \/ __| __| | | | | __| | / __|
    //    | |  __/\__ \ |_  | |_| | |_| | \__ \
    //    |_|\___||___/\__|  \___/ \__|_|_|___/
    //
    // region test utils

    function createTestComponent(name, templateContent) {

      // Declare component on angular
      wilson.component(name, {
        controller: ['$scope', '$element', '$attrs', function($scope, $element, $attrs) {
          $scope.data = { test: 'SUCCESS' };
        }],

        link: function($scope, $element, $attrs, controller) {}
      });

      // Inject the template into the templateCache (simulating the external template file for testing purposes)
      templateCache.put(name, templateContent);

    }

    // endregion


    //   _____         _     ____        _ _
    //  |_   _|__  ___| |_  / ___| _   _(_) |_ ___
    //    | |/ _ \/ __| __| \___ \| | | | | __/ _ \
    //    | |  __/\__ \ |_   ___) | |_| | | ||  __/
    //    |_|\___||___/\__| |____/ \__,_|_|\__\___|
    //
    // region test suite

    runTest('Wilson-1000-01', 'Should have properly decorated the Wilson instance onto window and angular.', function() {

      // Check wilson is declared globally on the window
      expect(wilson).toBeDefined();

      // Ensure that wilson is a true Wilson functional class instance
      expect(wilson.constructor).toBeDefined();
      expect(typeof wilson.constructor).toBe('function');
      expect(wilson.constructor.name).toBe('Wilson');

      // Check that wilson is also declared onto angular
      expect(angular.wilson).toBeDefined();

      // Ensure that angular.wilson is a true Wilson functional class instance
      expect(angular.wilson.constructor).toBeDefined();
      expect(typeof angular.wilson.constructor).toBe('function');
      expect(angular.wilson.constructor.name).toBe('Wilson');

      // Make sure the reference is the same wilson on angular as on the window
      expect(angular.wilson).toBe(wilson);

    });


    runTest('Wilson-1000-02', 'Should not provide access to the Wilson function from the window.', function() {

      expect(window.Wilson).toBeUndefined();
      expect(window.angular.Wilson).toBeUndefined();

    });


    runTest('Wilson-1000-03', 'Should have proper interface methods.', function() {

      // utils
      expect(wilson.utils).toBeDefined();
      expect(typeof wilson.utils).toBe('object');

      // config
      expect(wilson.config).toBeDefined();
      expect(typeof wilson.config).toBe('object');

      // Methods
      expect(wilson.setAppConfig).toBeDefined();
      expect(typeof wilson.setAppConfig).toBe('function');

      expect(wilson.filter).toBeDefined();
      expect(typeof wilson.filter).toBe('function');

      expect(wilson.component).toBeDefined();
      expect(typeof wilson.component).toBe('function');

      expect(wilson.behavior).toBeDefined();
      expect(typeof wilson.behavior).toBe('function');

      expect(wilson.service).toBeDefined();
      expect(typeof wilson.service).toBe('function');

      // Alias Methods
      expect(wilson.class).toBeDefined();
      expect(typeof wilson.class).toBe('function');
      expect(wilson.class).toBe(wilson.service);

      expect(wilson.resource).toBeDefined();
      expect(typeof wilson.resource).toBe('function');
      expect(wilson.resource).toBe(wilson.service);

      expect(wilson.factory).toBeDefined();
      expect(typeof wilson.factory).toBe('function');
      expect(wilson.factory).toBe(wilson.service);

      expect(wilson.utility).toBeDefined();
      expect(typeof wilson.utility).toBe('function');
      expect(wilson.utility).toBe(wilson.service);

    });


    runTest('Wilson-1000-04', 'Should have proper $rootScope decorations.', function() {

      // page
      expect(rootScope.page).toBeDefined();
      expect(typeof rootScope.page).toBe('object');

      expect(rootScope.page.title).toBeDefined();
      expect(typeof rootScope.page.title).toBe('string');

      // triggerDigest method
      expect(rootScope.triggerDigest).toBeDefined();
      expect(typeof rootScope.triggerDigest).toBe('function');

      // ensure that triggerDigest returns a promise
      var promise = rootScope.triggerDigest();
      expect(promise).toBeDefined();
      expect(promise.then).toBeDefined();
      expect(typeof promise.then).toBe('function');


      // bindToDigest method
      expect(rootScope.bindToDigest).toBeDefined();
      expect(typeof rootScope.bindToDigest).toBe('function');

    });


    runTest('Wilson-1000-05', 'Should properly validate service definitions.', function() {
      var validDefinitions   = [function() {}, [function() {}]];
      var invalidDefinitions = [[], 'Hello World', {}, null, undefined];

      // Should throw error on non array or function definition
      _.each(invalidDefinitions, function(def) {
        try {
          wilson.service('test-service', def);
          fail('Validation failed to identify bad service definition.');
        } catch(e) {}
      });

      // Should not throw error on proper definition
      var suffix      = 'a';
      var serviceName = 'test-service';

      _.each(validDefinitions, function(def) {
        try {
          serviceName += '-' + suffix;
          wilson.service(serviceName, def);
        } catch(e) {
          fail('Valiation failed for good service definition.');
        }
      });


    });


    runTest('Wilson-1000-06', 'Should properly create services on angular.', function() {

      // Declare dummy service on angular
      wilson.service('TestService', function() {
        return { test: 'TEST_WORKED' }
      });

      var TestService = injector.get('TestService');

      expect(TestService).toBeDefined();
      expect(typeof TestService).toBe('object');
      expect(TestService.test).toBeDefined();
      expect(TestService.test).toBe('TEST_WORKED');


      // Declare dummy service on angular
      wilson.service('TestDepsService', ['$rootScope', function($rootScope) {
        return { rootScopeRef: $rootScope }
      }]);

      var TestDepsService = injector.get('TestDepsService');

      expect(TestDepsService).toBeDefined();
      expect(typeof TestDepsService).toBe('object');
      expect(TestDepsService.rootScopeRef).toBeDefined();
      expect(TestDepsService.rootScopeRef).toBe(rootScope);

    });


    runTest('Wilson-1000-07', 'Should properly validate component definitions.', function() {
      var invalidDefinitions = [[], 'Hello World', null, undefined];

      // Should throw error on non array or function definition
      _.each(invalidDefinitions, function(def) {
        try {
          wilson.component('test-component', def);
          fail('Validation failed to identify bad component definition.');
        } catch(e) {}
      });

      // Should not throw error on proper definition
      try {
        wilson.component('test-component', { controller: [function() {}] });
      } catch(e) {
        fail('Validation failed for good component definition.');
      }

    });


    runTest('Wilson-1000-08', 'Should properly create component element directive on angular.', function(done) {

      // Create test component
      createTestComponent('test-component-viii', '<div class="ht-test-component-viii"><h1>[[data.test]]</h1></div>');

      var element = compile('<ht-test-component-viii></ht-test-component-viii>')(rootScope.$new(true));

      setTimeout(function() {

        var componentScope = element.find(':first-child').scope();

        // Ensure that this is indeed our test-component
        expect(componentScope).toBeDefined();
        expect(componentScope.componentCName).toBe('test-component-viii');

        expect(componentScope.data).toBeDefined();
        expect(typeof componentScope.data).toBe('object');
        expect(componentScope.data.test).toBe('SUCCESS');

        // Verify all necessary scope decorations

        done();
      }, 10);


      rootScope.$apply();
    });


    // endregion

  });

});