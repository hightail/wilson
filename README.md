#wilson


##Example index.hbs
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
    <span>{{__ 'Hola'}}</span>
    <div ng-view></div>
  </body>
</html>
```