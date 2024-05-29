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
      level: wilsonConfig.server.deploy.logLevel
    }));
  } else {
    transports.push(new winston.transports.File({
      filename: wilsonConfig.server.deploy.path + '/logs/wilson.log',
      level: wilsonConfig.server.deploy.logLevel
    }));
  }

  var logger = winston.createLogger({
    exitOnError: false,
    transports: transports
  });

  return logger;
}

