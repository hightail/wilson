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

    // Establish Test Setup
    beforeEach(module('hightail'));
    beforeEach(inject(function($injector) {
      ComponentFactoryService = $injector.get('ComponentFactoryService');
    }));

    runTest('ComponentFactoryService-1000-01', 'Should properly create a Space and model it', function(done) {

    }); 


  });

});