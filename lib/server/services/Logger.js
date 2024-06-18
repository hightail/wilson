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

  try {
    var transports = [];

    if (wilsonConfig.server.deploy.mode === 'development') {
      transports.push(new winston.transports.Console());
    } else {
      transports.push(new winston.transports.File({
        filename: wilsonConfig.server.deploy.path + '/logs/wilson.log',
        format: winston.format.combine(winston.format.timestamp(), winston.format.json())
      }));
    }

    var logger = winston.createLogger({
      level: wilsonConfig.server.deploy.logLevel,
      format: winston.format.json(),
      exitOnError: false,
      transports: transports
    });
  } catch (e) {
    console.log('Error initialization winston', e);
  }


  //console.log('logger(1)', logger);

  return logger;
}