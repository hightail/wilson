angular.module('myApp', ['wilson']).
  config(function() {
  }).
  run(['$rootScope', '$location',
    function($rootScope, $location) {
      console.log('app.run()');
    }
  ]);
