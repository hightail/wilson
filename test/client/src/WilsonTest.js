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
      createTestComponent('wls-viii-test-component', '<div class="ht-wls-viii-test-component"><h1>[[data.test]]</h1></div>');

      var element = compile('<ht-wls-viii-test-component></ht-wls-viii-test-component>')(rootScope.$new(true));

      setTimeout(function() {

        var componentScope = element.find(':first-child').scope();

        // Ensure that this is indeed our test-component
        expect(componentScope).toBeDefined();
        expect(componentScope.componentCName).toBe('wls-viii-test-component');

        expect(componentScope.data).toBeDefined();
        expect(typeof componentScope.data).toBe('object');
        expect(componentScope.data.test).toBe('SUCCESS');

        // Verify all necessary scope decorations
        expect(componentScope.parentComponent).toBeNull();

        expect(componentScope.stateMachine).toBeDefined();
        expect(typeof componentScope.stateMachine).toBe('object');


        expect(componentScope.translate).toBeDefined();
        expect(typeof componentScope.translate).toBe('function');

        expect(componentScope.overrideText).toBeDefined();
        expect(typeof componentScope.overrideText).toBe('function');

        expect(componentScope.defaultValue).toBeDefined();
        expect(typeof componentScope.defaultValue).toBe('function');

        expect(componentScope.triggerDigest).toBeDefined();
        expect(typeof componentScope.triggerDigest).toBe('function');

        expect(componentScope.bindToDigest).toBeDefined();
        expect(typeof componentScope.bindToDigest).toBe('function');


        // Test for appropriate prerender decorations
        expect(componentScope.registerDataDependency).toBeDefined();
        expect(typeof componentScope.registerDataDependency).toBe('function');

        expect(componentScope.checkViewDependencies).toBeDefined();
        expect(typeof componentScope.checkViewDependencies).toBe('function');

        expect(componentScope.resolveViewDependency).toBeDefined();
        expect(typeof componentScope.resolveViewDependency).toBe('function');

        expect(componentScope.deferredResolveViewDependency).toBeDefined();
        expect(typeof componentScope.deferredResolveViewDependency).toBe('function');

        done();
      }, 10);


      rootScope.$apply();
    });


    runTest('Wilson-1000-09', 'Should properly support nested components.', function(done) {

      // Create parent component
      createTestComponent('wls-ix-test-outer-parent',
        '<div class="ht-wls-ix-test-outer-parent">' +
          '<h1>I am the parent</h1>' +
          '<ht-wls-ix-test-inner-child expose="innerChild"></ht-wls-ix-test-inner-child>' +
        '</div>'
      );

      // Create child component
      createTestComponent('wls-ix-test-inner-child',
        '<div class="ht-wls-ix-test-inner-child">' +
          '<h1>I am the child</h1>' +
        '</div>'
      );


      var element = compile('<ht-wls-ix-test-outer-parent></ht-wls-ix-test-outer-parent>')(rootScope.$new(true));

      setTimeout(function() {

        var componentScope = element.find(':first-child').scope();

        // Ensure that this is indeed our outer parent scope
        expect(componentScope).toBeDefined();
        expect(componentScope.componentCName).toBe('wls-ix-test-outer-parent');

        // Ensure that the inner component has compiled and is present
        var childElem = element.find('.ht-wls-ix-test-inner-child');
        expect(childElem.length).toBeGreaterThan(0);

        // Ensure that the child has the proper inner scope
        var childScope = childElem.find(':first-child').scope();
        expect(childScope).toBeDefined();
        expect(childScope.componentCName).toBe('wls-ix-test-inner-child');

        // Ensure that the parent is decorated appropriately
        expect(childScope.parentComponent).toBeDefined();
        expect(childScope.parentComponent).toBe(componentScope);
        expect(childScope.parentComponent.componentCName).toBe('wls-ix-test-outer-parent');

        // Now ensure that our scope has been properly exposed onto the parent
        expect(componentScope.innerChild).toBeDefined();
        expect(componentScope.innerChild).toBe(childScope);
        expect(componentScope.innerChild.componentCName).toBe('wls-ix-test-inner-child');

        done();
      }, 10);


      rootScope.$apply();

    });


    runTest('Wilson-1000-10', 'Should properly validate filter definitions.', function(done) {
      var invalidDefinitions = [[], 'Hello World', {}, null, undefined];

      // Should throw error on non array or function definition
      _.each(invalidDefinitions, function(def) {
        try {
          wilson.filter('testMe', def);
          fail('Validation failed to identify bad filter definition.');
        } catch(e) {}
      });


      // Should fail on function input if adding after module config
      try {
        wilson.filter('makeOne', ['$rootScope', function($rootScope) {
          return function(value) { return 1; }
        }]);
      } catch(e) {
        fail('Validation failed for a good "Array" filter definitions');
      }

      try {
        wilson.filter('makeTwo', function(value) { return 2; });
      } catch(e) {
        fail('Validation failed for a good "function" filter definitions');
      }


      setTimeout(function() {

        // Now lets expect that we can get this filter out of angular
        var makeOne = injector.get('makeOneFilter');
        expect(makeOne).toBeDefined();
        expect(typeof makeOne).toBe('function');
        expect(makeOne.length).toBe(1);   // expect 1 argument

        // Now lets call the function and make sure it works
        var original  = 'random string';
        var result    = makeOne(original);
        expect(result).toBe(1);

        var makeTwo = injector.get('makeTwoFilter');
        expect(makeTwo).toBeDefined();
        expect(typeof makeTwo).toBe('function');
        expect(makeTwo.length).toBe(1);   // expect 1 argument

        result    = makeTwo(original);
        expect(result).toBe(2);

        done();
      }, 10);

      rootScope.$apply();

    });


    runTest('Wilson-1000-11', 'Should properly create filters on angular.', function(done) {

      // Declare a filter on wilson
      wilson.filter('wordReplace', function(value, target, replacement) {
        return value.replace(new RegExp(target, 'ig'), replacement);
      });


      setTimeout(function() {

        // Now lets expect that we can get this filter out of angular
        var wordReplace = injector.get('wordReplaceFilter');
        expect(wordReplace).toBeDefined();
        expect(typeof wordReplace).toBe('function');
        expect(wordReplace.length).toBe(3);   // expect 3 arguments

        // Now lets call the function and make sure it works
        var original  = 'Save the kittens. Find all of the kittens and save the kittens as fast as you can.';
        var result    = wordReplace(original, 'kittens', 'dolla bills');
        var replaced  = 'Save the dolla bills. Find all of the dolla bills and save the dolla bills as fast as you can.';

        expect(result).toBe(replaced);

        done();
      }, 10);

      rootScope.$apply();

    });

    // endregion

  });


});