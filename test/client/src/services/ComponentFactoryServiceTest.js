/**
 * ComponentFactoryServiceTest
 *
 * Test Suite for the ComponentFactoryService
 *
 * @author hunter.novak
 * @since 2.0.0
 */

describe('Services', function() {

  describe('ComponentFactoryService', function () {
    var ComponentFactoryService   = null;
    var rootScope                 = null;
    var scope                     = null;
    var controller                = null;
    var element                   = null;
    var attrs                     = null;
    var WilsonEventHelper         = null;
    var WilsonStorageHelper       = null;

    // Establish Test Setup
    beforeEach(module('testWilson'));
    beforeEach(inject(function($injector) {
      ComponentFactoryService = $injector.get('ComponentFactoryService');
      WilsonEventHelper       = $injector.get('WilsonEventHelper');
      WilsonStorageHelper     = $injector.get('WilsonStorageHelper');
      rootScope               = $injector.get('$rootScope');

      scope                   = rootScope.$new(true);
      element                 = angular.element('<div></div>');
      attrs                   = {};
      controller              = [function(){}];
    }));


    //   _____         _     ____        _ _
    //  |_   _|__  ___| |_  / ___| _   _(_) |_ ___
    //    | |/ _ \/ __| __| \___ \| | | | | __/ _ \
    //    | |  __/\__ \ |_   ___) | |_| | | ||  __/
    //    |_|\___||___/\__| |____/ \__,_|_|\__\___|
    //
    // region test suite

    runTest('ComponentFactoryService-1000-01', 'Should have proper service interface.', function() {
      expect(typeof ComponentFactoryService.create).toBe('function');
    });


    runTest('ComponentFactoryService-1000-02', 'Should decorate proper component information onto the scope.', function() {

      // Initialize component
      ComponentFactoryService.create('12345', 'test-component', controller,  this, null, scope, element, attrs, {});

      expect(scope.component).toBeDefined();
      expect(typeof scope.component).toBe('object');
      expect(scope.component.id).toBe('12345');
      expect(scope.component.name).toBe('test-component');
    });


    runTest('ComponentFactoryService-1000-03', 'Should decorate proper component methods onto the scope.', function() {

      // Initialize component
      ComponentFactoryService.create('12345', 'test-component', controller,  this, null, scope, element, attrs, {});

      // Test for appropriate decorations
      expect(scope.translate).toBeDefined();
      expect(typeof scope.translate).toBe('function');

      expect(scope.stateMachine).toBeDefined();
      expect(typeof scope.stateMachine).toBe('function');

      expect(scope.defaultValue).toBeDefined();
      expect(typeof scope.defaultValue).toBe('function');

      expect(scope.triggerDigest).toBeDefined();
      expect(typeof scope.triggerDigest).toBe('function');

      expect(scope.bindToDigest).toBeDefined();
      expect(typeof scope.bindToDigest).toBe('function');


      // Test for appropriate storage interface
      expect(scope.storage).toBeDefined();
      expect(typeof scope.storage).toBe('object');
      expect(scope.storage instanceof WilsonStorageHelper).toBe(true);


      // Test for appropriate event handler interface
      expect(scope.on).toBeDefined();
      expect(typeof scope.on).toBe('object');
      expect(scope.on instanceof WilsonEventHelper).toBe(true);

    });


    runTest('ComponentFactoryService-1000-04', 'Should initialize with proper initial state.', function() {

      // Initialize component
      ComponentFactoryService.create('12345', 'test-component', controller,  this, null, scope, element, attrs, {});

      expect(scope.state).toBeDefined();
      expect(typeof scope.state).toBe('object');

      expect(scope.state.current).toBeDefined();
      expect(scope.state.current).toBe(null);

    });


    runTest('ComponentFactoryService-1000-05', 'Should not expose scope on parent by default.', function() {

      // Create a fake parent scope
      var parentScope = rootScope.$new(true);

      // Initialize component
      var componentScope = parentScope.$new(true);
      ComponentFactoryService.create('12345', 'test-component', controller,  this, parentScope, componentScope, element, attrs, {});

      _.each(parentScope, function(val, key) {
        if (!_.startsWith(key, '$')) {
          expect(val).not.toBe(componentScope);
        }
      });

    });


    runTest('ComponentFactoryService-1000-06', 'Should expose scope on parent if "expose" attribute is specified (Deprecated legacy support).', function() {

      // Create a fake parent scope
      var parentScope = rootScope.$new(true);

      // Initialize component
      var componentScope = parentScope.$new(true);
      ComponentFactoryService.create('12345', 'test-component', controller,  this, parentScope, componentScope, element, { expose: 'testComponent' }, {});

      expect(parentScope.testComponent).toBeDefined();
      expect(parentScope.testComponent).toBe(componentScope);

    });


    runTest('ComponentFactoryService-1000-07', 'Should expose specific scope methods on parent if the "exports" attribute is specified.', function() {

      // Create a fake parent scope
      var parentScope = rootScope.$new(true);

      // Initialize component
      var componentScope = parentScope.$new(true);

      componentScope.foo = function foo() { };
      componentScope.bar = function bar() { };

      ComponentFactoryService.create('12345', 'test-component', controller,  this, parentScope, componentScope, element, { expose: 'testComponent'}, {
        exports: { foo: 'foo' }
      });

      expect(parentScope.testComponent).toBeDefined();
      expect(typeof parentScope.testComponent).toBe('object');
      expect(parentScope.testComponent.foo).toBeDefined();
      expect(typeof parentScope.testComponent.foo).toBe('function');
      expect(parentScope.testComponent.bar).toBeUndefined();
    });

    // endregion

  });

});