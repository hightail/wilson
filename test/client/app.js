/**
 * Test Wilson Module
 *
 * This is a test app.js for unit testing
 *
 * @author hunter.novak
 * @since 2.0.0
 *
 * @copyright (c) 2016 Hightail Inc. All Rights Reserved
 */
'use strict';

// Append our app module to the html
$('html').attr('ng-app', 'testWilson');

// Add base href to document
document.head.appendChild($('<base href="/">')[0]);

// Declare the test app module
angular.module('testWilson', ['wilson']);

