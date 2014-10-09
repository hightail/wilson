#wilson

##Example node server/app.js
```
var express = require('express'),
    Wilson = require('wilson'),
    path = require('path'),
    fs = require('fs'),
    hbs = require('hbs'),
    http = require('http');


//Create the express app
var app = express();
app.set('port', '3000');

//Set up static assets
app.use('/client', express.static(path.join(__dirname, '../client')));

//Load wilson and initialize it
var wilsonConfigJson = require('./config/wilson-config.json');
var wilson = Wilson(app, wilsonConfigJson);

//attach the wilson routes under mountpath '/wilson'
app.use(wilson.config.client.app.mountpath, wilson.router);

//Load index page
var indexHbsPath = path.join(wilson.config.server.projectPaths.root, '/server/templates/index.hbs');
var indexHbs = fs.readFileSync(indexHbsPath, 'utf8');
var indexTemplate = hbs.compile(indexHbs);

// CATCH ALL ROUTE
app.get('*', wilson.middleware, function(req, res) {
  //console.log('render template');

  //Render the index page
  var result = indexTemplate(res.locals);

  res.send(result);
});

// Start the server
http.createServer(app).listen(app.get('port'), function() {
  console.log('Wilson app server listening on http port ' + app.get('port'));
});
```

##Example template/index.hbs
```
<html id="ng-app" ng-app="myApp">
  <head>
    <script type="stylesheet" src="/client/appearence/{{wilsonConfig.tags.brand}}/my.css"></script>

    <!-- Wilson -->
    <script type="text/javascript" src="/client/bower_components/jquery/dist/jquery.js"></script>
    <script type="text/javascript" src="/client/bower_components/lodash/dist/lodash.js"></script>
    <script type="text/javascript" src="/client/bower_components/underscore.string/lib/underscore.string.js"></script>
    <script type="text/javascript" src="/client/bower_components/moment/moment.js"></script>
    <script type="text/javascript" src="/client/bower_components/async/lib/async.js"></script>
    <script type="text/javascript" src="/client/bower_components/angular/angular.js"></script>
    <script type="text/javascript" src="/client/bower_components/angular-route/angular-route.js"></script>
    <script type="text/javascript" src="/client/bower_components/angular-local-storage/dist/angular-local-storage.js"></script>
    <script type="text/javascript" src="/client/bower_components/i18next/i18next.js"></script>
    <script type="text/javascript" src="/client/bower_components/javascript-state-machine/state-machine.min.js"></script>

    <script type="text/javascript" src="{{wilsonConfig.client.app.mountpath}}/config/{{wilsonConfig.client.app.connectionFilters}}"></script>
    <script type="text/javascript" src="{{wilsonConfig.client.app.mountpath}}/client.wilson.js"></script>
    <script type="text/javascript" src="{{wilsonConfig.client.app.mountpath}}/{{wilsonConfig.client.app.version}}/bundle"></script>
    <script type="text/javascript" src="{{wilsonConfig.server.projectPaths.IRouteService}}"></script>
    <!-- END Wilson -->

    <!--<script type="text/javascript" src="/client/src/behaviors/event-bus/event-bus.js"></script>-->

    <!-- My App -->
    <script type="text/javascript" src="/client/app.js"></script>
  </head>
  <body>
    <span>{{__ "Translate Me"}}</span>
    <div ng-view></div>
  </body>
</html>
```

##Example angular client/app.js
```
angular.module('myApp', ['wilson']).
  config(['MyService', function('WilsonService') {
    //This is loaded for me
    WilsonService.doSomething();
  }).
  run(['$rootScope', 'AppService', function($rootScope, AppService) {
      AppService.log('Loaded');
    }
  ]);
```
