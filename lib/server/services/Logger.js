/**
 * Logger
 * 
 * Custom logger based on winston.
 *
 * User: dan.nguyen
 * Date: 10/10/13
 */

var winston = require('winston');

module.exports = function(wilsonConfig) {
  var transports = [];

  if (wilsonConfig.server.deploy.mode === 'development') {
    transports.push(new winston.transports.Console({
      level: wilsonConfig.server.deploy.logLevel,
      colorize: true,
      timestamp: true
    }));
  } else {
    transports.push(new winston.transports.File({
      filename: wilsonConfig.server.deploy.path + '/logs/wilson.log',
      handleExceptions: true,
      level: wilsonConfig.server.deploy.logLevel,
      json: true,
      timestamp: true
    }));
  }

  //if (!logger) {
    var logger = new (winston.Logger)({
      exitOnError: false,
      transports: transports
    });
  //}

  //console.log('logger(1)', logger);

  return logger;
}

