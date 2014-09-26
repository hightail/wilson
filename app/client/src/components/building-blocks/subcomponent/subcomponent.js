/**
 * subcomponent Component
 *
 * @class SubcomponentComponent
 * @module Hightail
 * @submodule Hightail.Components
 *
 * @example
 *    <ht-subcomponent></ht-subcomponent>
 *
 * @author justin.fiedler
 * @since 0.0.0
 *
 * @copyright (c) 2014 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.component('subcomponent', {
  
  controller: ['ComponentFactoryService', '$scope', '$attrs', '$location', function(ComponentFactoryService, $scope, $attrs, $location) {
    var controller = this;
    ComponentFactoryService.init('subcomponent', controller, $scope, $attrs);

//  controller.setState({
//    initial: '',
//    events: [
//      { name: '',  from: '',  to: '' }
//    ],
//    timeouts: [],
//    callbacks: {}
//  });

    $scope.location = $location.path();
  }],
  
  link: function($scope, $element, $attrs, controller) {
  }
  
});
