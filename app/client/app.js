angular.module('myApp', ['wilson']).
  config(function() {
  }).
  run(['$rootScope', '$location', 'AppService',
    function($rootScope, $location, AppService) {
      console.log('app.run()');
      AppService.log('Testing');
    }
  ]);
