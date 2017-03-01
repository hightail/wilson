/**
 * Created by hunter.novak on 2/7/17.
 */
'use strict';

(function(wilson) {

  // Base url to post message from
  var baseUrl   = window.location.protocol + '://' + window.location.host + (window.location.port ? (':' + window.location.port) : '');
  var debugCode = 'dXEJzIHqT/AqGDIn50KRRT4/t5tJP8V0YHw8il0IzS8';

  function infoConsole(message, data, trace)   { console.info(message, data, trace);  }
  function logConsole(message, data, trace)    { console.log(message, data, trace);   }
  function warnConsole(message, data, trace)   { console.warn(message, data, trace);  }
  function errorConsole(message, data, trace)  { console.error(message, data, trace); }

  function infoPostMsg(message, data, trace)   { window.postMessage({ type: 'log-message', level: 'info',   message: message, data: data, trace: trace }, baseUrl);  }
  function logPostMsg(message, data, trace)    { window.postMessage({ type: 'log-message', level: 'log',    message: message, data: data, trace: trace }, baseUrl);  }
  function warnPostMsg(message, data, trace)   { window.postMessage({ type: 'log-message', level: 'warn',   message: message, data: data, trace: trace }, baseUrl);  }
  function errorPostMsg(message, data, trace)  { window.postMessage({ type: 'log-message', level: 'error',  message: message, data: data, trace: trace }, baseUrl);  }

  // Setup Logger
  function WilsonLogger() {
    if (!(this instanceof WilsonLogger)) { return new WilsonLogger(); }

    this.info     = infoConsole;
    this.log      = logConsole;
    this.warn     = warnConsole;
    this.error    = errorConsole;

    this.enableDebugLogging = function enableDebugLogging(accessCode) {
      if (wilson.utils.sha256B64(accessCode) === debugCode) {
        this.info   = infoPostMsg;
        this.log    = logPostMsg;
        this.warn   = warnPostMsg;
        this.error  = errorPostMsg;
      }
    };

    this.disableDebugLogging = function disableDebugLogging() {
      this.info   = infoConsole;
      this.log    = logConsole;
      this.warn   = warnConsole;
      this.error  = errorConsole;
    };

  }

  wilson.logger = new WilsonLogger();

})(angular.wilson);