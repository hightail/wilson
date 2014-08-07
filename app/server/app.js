var express = require('express'),
    wilson = require('../../lib/wilson.js'),
    http = require('http');

var app = express();

var wilsonConfig = require('./config/wilson-config.json');

app.use('/wilson', wilson(wilsonConfig));

app.set('port', '3000');

//app.get('*', wilson.index, function(req, res) {
//   hbs.render('index.hbs', {
//     brand: app.get('wilson-config').brand
//   });
//
//});

http.createServer(app).listen(app.get('port'), function() {
  console.log('Express server listening on http port ' + app.get('port'));
});

