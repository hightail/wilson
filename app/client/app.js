angular.module('myApp', ['wilson']).
  config(function() {
    console.log('app.config()');
  }).
  run(['$rootScope', '$location',
    function($rootScope, $location) {
      console.log('app.run()');
      //wilson.log();
    }
  ]);
