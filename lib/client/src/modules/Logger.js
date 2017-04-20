/**
 * Module that provides logging functions.
 *
 * The module is declared with an accompanying service that provides logging functionality.
 *
 * @module wilson
 * @submodule wilson.logger
 *
 * @author hunter.novak
 * @since 3.0.0
 *
 * @copyright (c) 2017 Hightail Inc. All Rights Reserved
 */
'use strict';


angular.module('wilson.logger', []).provider('WilsonLogger', function() {

  var LOG_LEVELS = [
    Object.freeze({ name: 'FATAL', console: fatalConsole }),
    Object.freeze({ name: 'ERROR', console: errorConsole }),
    Object.freeze({ name: 'WARN',  console: warnConsole  }),
    Object.freeze({ name: 'INFO',  console: infoConsole  }),
    Object.freeze({ name: 'DEBUG', console: debugConsole }),
    Object.freeze({ name: 'TRACE', console: traceConsole })
  ];

  var _logMethods     = {};
  var _noop           = function() {};

  function traceConsole()  { console.trace.apply(this, arguments);   }
  function debugConsole()  { console.debug.apply(this, arguments);   }
  function infoConsole()   { console.info.apply(this, arguments);    }
  function warnConsole()   { console.warn.apply(this, arguments);    }
  function errorConsole()  { console.error.apply(this, arguments);   }
  function fatalConsole()  { console.error.apply(this, arguments);   }

  function setLevel(logLevel) {
    // Clear existing log methods to no operation functions
    _.forIn(LOG_LEVELS, function(level) { _logMethods[level.name.toLowerCase()] = _noop; });

    // Try to find our logLevel
    var levelIndex = logLevel === 'ALL' ? (LOG_LEVELS.length - 1) : _.findIndex(LOG_LEVELS, { name: logLevel });

    // If no log level of this name found, then exit here (effectively turning off logging)
    if (!levelIndex) { return; }

    // Now assign each relevant logging up to this level
    for (var i = 0; i <= levelIndex; i++) { _logMethods[LOG_LEVELS[i].name.toLowerCase()] = LOG_LEVELS[i].console; }
  }

  // Initialize to OFF
  setLevel();

  // WilsonLogger Definition
  this.$get = [function() {
    return Object.freeze({
      setLevel:  setLevel,

      trace: function() { _logMethods.trace.apply(this, arguments);  },
      debug: function() { _logMethods.debug.apply(this, arguments);  },
      info:  function() { _logMethods.info.apply(this, arguments);   },
      warn:  function() { _logMethods.warn.apply(this, arguments);   },
      error: function() { _logMethods.error.apply(this, arguments);  },
      fatal: function() { _logMethods.fatal.apply(this, arguments);  }
    });
  }];

});