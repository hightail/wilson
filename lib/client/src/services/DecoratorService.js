/**
 * This service decorates custom methods onto commonly shared libraries
 *
 * @class DecoratorService
 * @module Hightail
 * @submodule Hightail.Services
 *
 * @author michael.chen
 * @since 1.0.1
 *
 * @copyright (c) 2013 Hightail Inc. All Rights Reserved
 */
'use strict';

angular.module('wilson.decorators', []).config(['$provide', function($provide) {

    // Decorate $q with allSettled
    $provide.decorator('$q', ['$delegate', function ($delegate) {
        var $q = $delegate;

        $q.allSettled = $q.allSettled || function allSettled(promises) {
                // Implementation of allSettled function from Kris Kowal's Q:
                // https://github.com/kriskowal/q/wiki/API-Reference#promiseallsettled

                var wrapped = angular.isArray(promises) ? [] : {};

                angular.forEach(promises, function(promise, key) {
                    if (!wrapped.hasOwnProperty(key)) {
                        wrapped[key] = wrap(promise);
                    }
                });

                return $q.all(wrapped);

                function wrap(promise) {
                    return $q.when(promise)
                        .then(function (value) {
                            return { state: 'fulfilled', value: value };
                        }, function (reason) {
                            return { state: 'rejected', reason: reason };
                        });
                }
            };

        return $q;
    }]);
}]);
