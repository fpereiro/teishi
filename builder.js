/*
teishi/builder - v1.0.0

Written by Parya Rastegar (rastegar.parya3@gmail.com) and released into the public domain.

Human-readable rule builder for teishi. Please refer to readme.md for documentation.
*/

(function () {

   // *** SETUP ***

   var isNode = typeof exports === 'object';

   var teishi = isNode ? require ('./teishi.js') : window.teishi;

   if (isNode) var builder = exports;
   else        var builder = teishi;

   // *** TYPE BUILDER ***

   builder.isType = function (name, value, type) {
      return [name, value, type];
   };

   builder.isString = function (name, value) {
      return [name, value, 'string'];
   };

   builder.isInteger = function (name, value) {
      return [name, value, 'integer'];
   };

   builder.isFloat = function (name, value) {
      return [name, value, 'float'];
   };

   builder.isArray = function (name, value) {
      return [name, value, 'array'];
   };

   builder.isObject = function (name, value) {
      return [name, value, 'object'];
   };

   builder.isFunction = function (name, value) {
      return [name, value, 'function'];
   };

   builder.isBoolean = function (name, value) {
      return [name, value, 'boolean'];
   };

   builder.isUndefined = function (name, value) {
      return [name, value, 'undefined'];
   };

   builder.isNull = function (name, value) {
      return [name, value, 'null'];
   };

   builder.isRegex = function (name, value) {
      return [name, value, 'regex'];
   };

   builder.isDate = function (name, value) {
      return [name, value, 'date'];
   };

   // *** MULTI BUILDER ***

   builder.isOneOf = function (name, value, options, test) {
      return [name, value, options, test || teishi.test.type, 'oneOf'];
   };

   builder.isEach = function (name, value, type, test) {
      return [name, value, type, test || teishi.test.type, 'each'];
   };

   builder.isEachOf = function (name, value, types) {
      return [name, value, types, test || teishi.test.type, 'eachOf'];
   };

   // *** TEST BUILDER ***

   builder.equal = function (name, value, expected) {
      return [name, value, expected, teishi.test.equal];
   };

   builder.notEqual = function (name, value, expected) {
      return [name, value, expected, teishi.test.notEqual];
   };

   builder.isInRange = function (name, value, range) {
      return [name, value, range, teishi.test.range];
   };

   builder.match = function (name, value, regex) {
      return [name, value, regex, teishi.test.match];
   };

   // *** CONDITIONAL BUILDER ***

   builder.optional = function (name, value, rule) {
      return [teishi.type (value) !== 'undefined', [rule]];
   };

}) ();
