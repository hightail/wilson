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

      scope                   = rootScope.$new();
      element                 = angular.element('<div></div>');
      attrs                   = {};
      controller              = {};
    }));


    runTest('ComponentFactoryService-1000-01', 'Should have proper service interface.', function() {
      expect(typeof ComponentFactoryService.init).toBe('function');
    });


    runTest('ComponentFactoryService-1000-02', 'Should decorate proper componentCName onto the scope and controller.', function() {

      // Initialize component
      ComponentFactoryService.init('test-component', scope, element, attrs, controller);

      expect(scope.componentCName).toBe('test-component');
      expect(controller.componentCName).toBe('test-component');
    });


    runTest('ComponentFactoryService-1000-03', 'Should decorate a null parentComponent if a parent wilson component does not exists.', function() {

      // Initialize component
      ComponentFactoryService.init('test-component', scope, element, attrs, controller);

      expect(scope.parentComponent).toBeNull();

    });


    runTest('ComponentFactoryService-1000-04', 'Should decorate proper controller methods.', function() {

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


      // Test for appropriate prerender decorations
      expect(controller.registerDataDependency).toBeDefined();
      expect(typeof controller.registerDataDependency).toBe('function');

      expect(controller.checkViewDependencies).toBeDefined();
      expect(typeof controller.checkViewDependencies).toBe('function');

      expect(controller.resolveViewDependency).toBeDefined();
      expect(typeof controller.resolveViewDependency).toBe('function');

      expect(controller.deferredResolveViewDependency).toBeDefined();
      expect(typeof controller.deferredResolveViewDependency).toBe('function');
    });


    runTest('ComponentFactoryService-1000-05', 'Should decorate proper scope methods.', function() {

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


      // Test for appropriate prerender decorations
      expect(scope.registerDataDependency).toBeDefined();
      expect(typeof scope.registerDataDependency).toBe('function');

      expect(scope.checkViewDependencies).toBeDefined();
      expect(typeof scope.checkViewDependencies).toBe('function');

      expect(scope.resolveViewDependency).toBeDefined();
      expect(typeof scope.resolveViewDependency).toBe('function');

      expect(scope.deferredResolveViewDependency).toBeDefined();
      expect(typeof scope.deferredResolveViewDependency).toBe('function');
    });


    runTest('ComponentFactoryService-1000-06', 'Should initialize with proper current state.', function() {

      // Initialize component
      ComponentFactoryService.init('test-component', scope, element, attrs, controller);

      expect(scope.stateMachine).toBeDefined();
      expect(typeof scope.stateMachine).toBe('object');

      expect(scope.stateMachine.current).toBeDefined();
      expect(scope.stateMachine.current).toBe('NoStateMachine');

    });


    runTest('ComponentFactoryService-1000-07', 'Should not expose scope on parent by default.', function() {

      // Initialize component
      ComponentFactoryService.init('test-component', scope, element, attrs, controller);

      expect(rootScope.testComponent).not.toBeDefined();

    });


    runTest('ComponentFactoryService-1000-08', 'Should expose scope on parent if attribute specified.', function() {

      // Initialize component
      ComponentFactoryService.init('test-component', scope, element, { expose: 'testComponent' }, controller);

      // TODO ... Create a component that has a true component parent in the scopeChain

    });

  });

});