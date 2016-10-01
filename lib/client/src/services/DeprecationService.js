/**
 * Service to help with function deprecation
 *
 * @class DeprecationService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @example
 *
 * @author justin.fiedler
 * @author hunter.novak
 * @since 0.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.wilson.service('DeprecationService', function() {
  
  /**
   * Class to handle function deprecation
   *
   * @param func                  The deprecated function
   * @param funcContext           The context object (thisArg) for the deprecated function
   * @param deprecatedFuncName    The human readable function name of the deprecated function (object.myDeprecatedFunction())
   * @param newFuncName           The human readable function name of the new function (object.myNewFunction())
   */
  function deprecateFunction(func, funcContext, deprecatedFuncName, newFuncName) {
    return function() {
      console.log('Warning: ' + deprecatedFuncName + '() is deprecated. Use ' + newFuncName + '() instead');
      return func.apply(funcContext, _.toArray(arguments))
    };
  }


  /************************************/
  /******** SERVICE INTERFACE *********/
  /************************************/
  var service = { deprecateFunction: deprecateFunction };

  return service;
});
