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
    var ComponentFactoryService  = null;
    var rootScope                = null;
    var scope                    = null;
    var controller               = null;
    var element                  = null;
    var attrs                    = null;

    // Establish Test Setup
    beforeEach(module('testWilson'));
    beforeEach(inject(function($injector) {
      ComponentFactoryService = $injector.get('ComponentFactoryService');
      rootScope               = $injector.get('$rootScope');

      scope                   = rootScope.$new(true);
      element                 = angular.element('<div></div>');
      attrs                   = {};
      controller              = {};
    }));


    //   _____         _     ____        _ _
    //  |_   _|__  ___| |_  / ___| _   _(_) |_ ___
    //    | |/ _ \/ __| __| \___ \| | | | | __/ _ \
    //    | |  __/\__ \ |_   ___) | |_| | | ||  __/
    //    |_|\___||___/\__| |____/ \__,_|_|\__\___|
    //
    // region test suite

    runTest('ComponentFactoryService-1000-01', 'Should have proper service interface.', function() {
      expect(typeof ComponentFactoryService.init).toBe('function');
    });


    runTest('ComponentFactoryService-1000-02', 'Should decorate proper componentCName onto the scope and controller.', function() {

      // Initialize component
      ComponentFactoryService.init('test-component', scope, element, attrs, controller);

      expect(scope.componentCName).toBe('test-component');
      expect(controller.componentCName).toBe('test-component');
    });


    runTest('ComponentFactoryService-1000-03', 'Should set parentComponent to null if no component parent exists.', function() {

      // Initialize component
      ComponentFactoryService.init('test-component', scope, element, attrs, controller);

      expect(scope.parentComponent).toBeNull();

    });


    runTest('ComponentFactoryService-1000-04', 'Should decorate the parentComponent scope if a parent wilson component exists.', function() {

      // Create a fake parent scope
      var parentScope = rootScope.$new(true);
      parentScope.componentCName = 'my-parent';

      // Initialize component with a new isolate scope of our fake parent
      var componentScope = parentScope.$new(true);
      ComponentFactoryService.init('test-component', componentScope, element, attrs, controller);

      expect(componentScope.parentComponent).toBeDefined();
      expect(componentScope.parentComponent).toBe(parentScope);
      expect(componentScope.parentComponent.componentCName).toBe('my-parent');

    });


    runTest('ComponentFactoryService-1000-05', 'Should decorate proper controller methods.', function() {

      // Initialize component
      ComponentFactoryService.init('test-component', scope, element, attrs, controller);

      // Test for appropriate decorations
      expect(controller.setState).toBeDefined();
      expect(typeof controller.setState).toBe('function');

      expect(controller.getPersistentValue).toBeDefined();
      expect(typeof controller.getPersistentValue).toBe('function');

      expect(controller.setPersistentValue).toBeDefined();
      expect(typeof controller.setPersistentValue).toBe('function');

      expect(controller.setPersistentValues).toBeDefined();
      expect(typeof controller.setPersistentValues).toBe('function');

      expect(controller.watchAndPersist).toBeDefined();
      expect(typeof controller.watchAndPersist).toBe('function');


      expect(controller.auto).toBeDefined();
      expect(typeof controller.auto).toBe('object');

      expect(controller.auto.on).toBeDefined();
      expect(typeof controller.auto.on).toBe('function');

      expect(controller.auto.add).toBeDefined();
      expect(typeof controller.auto.add).toBe('function');

      expect(controller.auto.watch).toBeDefined();
      expect(typeof controller.auto.watch).toBe('function');

      expect(controller.auto.afterDigest).toBeDefined();
      expect(typeof controller.auto.afterDigest).toBe('function');
    });


    runTest('ComponentFactoryService-1000-06', 'Should decorate proper scope methods.', function() {

      // Initialize component
      ComponentFactoryService.init('test-component', scope, element, attrs, controller);

      // Test for appropriate decorations
      expect(scope.componentCName).toBe('test-component');
      expect(scope.parentComponent).toBeNull();

      expect(scope.stateMachine).toBeDefined();
      expect(typeof scope.stateMachine).toBe('object');


      expect(scope.translate).toBeDefined();
      expect(typeof scope.translate).toBe('function');

      expect(scope.overrideText).toBeDefined();
      expect(typeof scope.overrideText).toBe('function');

      expect(scope.defaultValue).toBeDefined();
      expect(typeof scope.defaultValue).toBe('function');

      expect(scope.triggerDigest).toBeDefined();
      expect(typeof scope.triggerDigest).toBe('function');

      expect(scope.bindToDigest).toBeDefined();
      expect(typeof scope.bindToDigest).toBe('function');

    });


    runTest('ComponentFactoryService-1000-07', 'Should initialize with proper current state.', function() {

      // Initialize component
      ComponentFactoryService.init('test-component', scope, element, attrs, controller);

      expect(scope.stateMachine).toBeDefined();
      expect(typeof scope.stateMachine).toBe('object');

      expect(scope.stateMachine.current).toBeDefined();
      expect(scope.stateMachine.current).toBe('NoStateMachine');

    });


    runTest('ComponentFactoryService-1000-08', 'Should not expose scope on parent by default.', function() {

      // Create a fake parent scope
      var parentScope = rootScope.$new(true);
      parentScope.componentCName = 'my-parent';

      // Initialize component
      var componentScope = parentScope.$new(true);
      ComponentFactoryService.init('test-component', componentScope, element, attrs, controller);

      _.each(parentScope, function(val, key) {
        if (!_.startsWith(key, '$')) {
          expect(val).not.toBe(componentScope);
        }
      });

    });


    runTest('ComponentFactoryService-1000-09', 'Should expose scope on parent if attribute specified.', function() {

      // Create a fake parent scope
      var parentScope = rootScope.$new(true);
      parentScope.componentCName = 'my-parent';

      // Initialize component
      var componentScope = parentScope.$new(true);
      ComponentFactoryService.init('test-component', componentScope, element, { expose: 'testComponent' }, controller);

      expect(parentScope.testComponent).toBeDefined();
      expect(parentScope.testComponent).toBe(componentScope);

    });

    // endregion

  });

});