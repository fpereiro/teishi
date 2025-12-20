/*
teishi/builders - v1.0.0

Written by Parya Rastegar (rastegar.parya3@gmail.com) and released into the public domain.

Human-readable rule builders for teishi. Please refer to readme.md for documentation.
*/

(function () {

   // *** SETUP ***

   var isNode = typeof exports === 'object';

   var teishi = isNode ? require ('./teishi.js') : window.teishi;

   if (isNode) var builders = exports;
   else        var builders = teishi;

   // *** TYPE BUILDERS ***

   builders.isType = function (name, value, type) {
      return [name, value, type];
   };

   builders.isString = function (name, value) {
      return [name, value, 'string'];
   };

   builders.isInteger = function (name, value) {
      return [name, value, 'integer'];
   };

   builders.isFloat = function (name, value) {
      return [name, value, 'float'];
   };

   builders.isArray = function (name, value) {
      return [name, value, 'array'];
   };

   builders.isObject = function (name, value) {
      return [name, value, 'object'];
   };

   builders.isFunction = function (name, value) {
      return [name, value, 'function'];
   };

   builders.isBoolean = function (name, value) {
      return [name, value, 'boolean'];
   };

   builders.isUndefined = function (name, value) {
      return [name, value, 'undefined'];
   };

   builders.isNull = function (name, value) {
      return [name, value, 'null'];
   };

   builders.isRegex = function (name, value) {
      return [name, value, 'regex'];
   };

   builders.isDate = function (name, value) {
      return [name, value, 'date'];
   };

   // *** MULTI BUILDERS ***

   builders.isOneOf = function (name, value, options) {
      return [name, value, options, 'oneOf'];
   };

   builders.isEach = function (name, value, type) {
      return [name, value, type, 'each'];
   };

   builders.isEachOf = function (name, value, types) {
      return [name, value, types, 'eachOf'];
   };

   // *** TEST BUILDERS ***

   builders.equals = function (name, value, expected) {
      return [name, value, expected, teishi.test.equal];
   };

   builders.notEquals = function (name, value, expected) {
      return [name, value, expected, teishi.test.notEqual];
   };

   builders.isInRange = function (name, value, range) {
      return [name, value, range, teishi.test.range];
   };

   builders.matches = function (name, value, regex) {
      return [name, value, regex, teishi.test.match];
   };

   // *** CONDITIONAL BUILDERS ***

   builders.optional = function (name, value, rule) {
      return [teishi.type (value) !== 'undefined', [rule]];
   };

}) ();
