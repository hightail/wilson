# Wilson

Wilson is a framework for building large-scale SPA's with angularjs. It provides features like component abstraction, code-splitting,
dependency resolution, advanced routing, logging and more.

[Full Wilson Documentation](https://github.com/hightail/wilson-api)

# Basic Setup

## Example node server/app.js
```js
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

// Register wilson helpers to handlebars
wilson.registerHandlebarsHelpers(hbs);

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

## Example template/index.hbs
```html
<html id="ng-app" ng-app="myApp">
  <head>
    <script type="stylesheet" src="/client/appearence/{{wilsonConfig.tags.brand}}/my.css"></script>
  </head>
  <body>
    
    {{#wilsonScripts}}
      <!-- Any other JS libraries for your app go here :) -->
    {{/wilsonScripts}}
    
    <div ng-view></div>
  </body>
</html>
```

## Example angular client/app.js
```js
angular.module('myApp', ['wilson']).
  run(['$rootScope', function($rootScope) {
    
    // This angular app can now inject any services declared onto wilson
    
  }]
);
```
