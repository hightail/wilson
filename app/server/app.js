var express = require('express'),
    Wilson = require('../../lib/server/wilson.js'),
    path = require('path'),
    fs = require('fs'),
    hbs = require('hbs'),
    _ = require('lodash'),
    http = require('http');


//Create the express app
var app = express();
app.set('port', '3000');

//Set up static assets
app.use('/client', express.static(path.join(__dirname, '../client')));

//Load wilson, and set up routes
var wilsonConfigJson = require('./config/wilson-config.json');
var wilson = Wilson(app, wilsonConfigJson);

//attach the wilson routes under '/wilson'
app.use('/wilson', wilson.router);



//Load index page
var indexHbsPath = path.join(wilson.config.server.projectPaths.root, '/server/templates/index.hbs');
var indexHbs = fs.readFileSync(indexHbsPath, 'utf8');


app.get('*', wilson.middleware, function(req, res) {
//  console.log('render template');
  var template = hbs.compile(indexHbs);
  var result = template({
    wilsonConfig: _.merge({}, req.wilson, wilson.config)
  });

  res.send(result);
});

http.createServer(app).listen(app.get('port'), function() {
  console.log('Express server listening on http port ' + app.get('port'));
});

