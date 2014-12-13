/**
 * Service to help with function deprecation
 *
 * @class DeprecatedFunctionService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @example
 *
 * @author justin.fiedler
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('DeprecatedFunctionService', [function() {
    /**
     * Class to handle function deprecation
     *
     * @param func                  The deprecated function
     * @param funcContext           The context object (thisArg) for the deprecated function
     * @param deprecatedFuncName    The human readable function name of the deprecated function (object.myDeprecatedFunction())
     * @param newFuncName           The human readable function name of the new function (object.myNewFunction())
     * @constructor
     */
    function DeprecatedFunction(func, funcContext, deprecatedFuncName, newFuncName) {
      var _self = this;

      var depFunction = function() {
        console.log(_.str.sprintf('Warning: %s() is deprecated. Use %s() instead', deprecatedFuncName, newFuncName));
        return func.apply(funcContext, _.toArray(arguments))
      };

      /**
       * Returns the prepared deprecated function
       *
       * @returns {Function}
       */
      this.getFunction = function() {
        //return func;
        return depFunction;
      };
    }


    // Service Object Definition
    var service = {
      DeprecatedFunction: DeprecatedFunction
    };

    return service;
  }]
);
