/*
teishi - v3.0.4

Written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.

Please refer to readme.md to read the annotated source.
*/

(function () {

   // *** SETUP ***

   var isNode = typeof exports === 'object';

   var dale   = isNode ? require ('dale') : window.dale;

   if (isNode) var teishi = exports;
   else        var teishi = window.teishi = {};

   // *** HELPER FUNCTIONS ***

   teishi.t = function (value) {
      var type = typeof value;
      if (type !== 'object' && type !== 'number') return type;
      if (type === 'number') {
         if      (isNaN (value))      return 'nan';
         else if (! isFinite (value)) return 'infinity';
         else if (value % 1 === 0)    return 'integer';
         else                         return 'float';
      }
      if (value === null) return 'null';
      type = Object.prototype.toString.call (value);
      if (type === '[object Object]') return 'object';
      if (type === '[object Array]')  return 'array';
      if (type === '[object RegExp]') return 'regex';
      if (type === '[object Date]')   return 'date';
   }

   teishi.s = function () {
      try {return JSON.stringify.apply (JSON.stringify, arguments)}
      catch (error) {return false}
   }

   teishi.p = function () {
      try {return JSON.parse.apply (JSON.parse, arguments)}
      catch (error) {return false}
   }

   teishi.simple = function (input) {
      var type = teishi.t (input);
      return type !== 'array' && type !== 'object';
   }

   teishi.complex = function (input) {
      return ! teishi.simple (input);
   }

   teishi.c = function (input, seen) {

      if (teishi.simple (input)) return input;

      seen = dale.do (seen, function (v) {return v});

      var output = teishi.t (input) === 'array' ? [] : {};

      dale.do (input, function (v, k) {

         if (teishi.complex (v)) {
            if (dale.stopOn (seen, true, function (v2) {return v === v2})) {
               v = '[Circular Reference]';
            }
            else seen.push (v);
         }
         output [k] = teishi.c (v, seen);
      });

      return output;
   }

   teishi.time = function () {return Date.now ()}

   var ms = teishi.time ();

   teishi.l = function () {
      var label;
      var lastColor;
      var ansi = {
         end:   isNode ? '\033[0m'  : '',
         bold:  isNode ? '\033[1m'  : '',
         white: isNode ? '\033[37m' : '',
         color: function (reverse) {
            if (! isNode) return '';
            var color = lastColor;
            while (lastColor === color) color = Math.round (Math.random () * 5 + 1);
            lastColor = color;
            return '\033[' + (reverse ? '4' : '3') + color + 'm';
         }
      }

      function inner (value, recursive) {

         return dale.do (value, function (v, k) {
            var type = teishi.t (v);

            if (! recursive && k === 0 && (type === 'string' || type === 'integer') && value.length > 1) {
               label = v;
               return '';
            }

            if (type === 'string' && recursive) v = "'" + v + "'";

            if (teishi.complex (v)) v = inner (v, true);

            v = ansi.color () + v + ansi.white;

            if (type === 'array')  v = ansi.white + '[' + v + ansi.white + ']';
            if (type === 'object') v = ansi.white + '{' + v + ansi.white + '}';
            if (teishi.t (value) === 'object') v = ansi.color () + (k.match (/^[0-9a-zA-Z_]+$/) ? k : "'" + k + "'") + ': ' + v;

            return v;
         }).join (recursive ? ', ' : ' ');
      }

      var output = inner (teishi.c ([].slice.call (arguments)));

      console.log ('(' + (teishi.time () - ms) + 'ms)', ansi.bold + (label ? ansi.color (true) + label + ':' + ansi.end : '') + ansi.bold + output + ansi.end);
      return false;
   }

   teishi.lno = function () {isNode = false; teishi.l.apply (teishi.l, arguments)}

   // *** TEST FUNCTIONS ***

   teishi.makeTest = function (fun, clauses) {

      if (teishi.t (fun) !== 'function') {
         return teishi.l ('teishi.makeTest', 'fun passed to teishi.makeTest should be a function but instead is', fun, 'with type', teishi.t (fun));
      }
      if (teishi.t (clauses) === 'string') clauses = [clauses];
      if (teishi.t (clauses) !== 'array') {
         return teishi.l ('teishi.makeTest', 'clauses argument passed to teishi.makeTest should be an array but instead is', clauses, 'with type', teishi.t (clauses));
      }
      if (teishi.t (clauses [0]) !== 'string') {
         return teishi.l ('teishi.makeTest', 'shouldClause passed to teishi.makeTest should be a string but instead is', clauses [0], 'with type', teishi.t (clauses [0]));
      }

      if (clauses [1] !== undefined) {
         if (teishi.t (clauses [1]) !== 'array') clauses [1] = [clauses [1]];

         var clausesResult = dale.stopOnNot (clauses [1], true, function (v) {
            if (teishi.t (v) === 'string' || teishi.t (v) === 'function') return true;
            return teishi.l ('teishi.makeTest', 'Each finalClause passed to teishi.makeTest should be a string or a function but instead is', v, 'with type', teishi.t (v));
         });
         if (clausesResult !== true) return;
      }

      return function (functionName, names, compare, to, eachValue, ofValue) {
         var result = fun.apply (fun, [compare, to]);
         if (result === true) return true;
         if (teishi.t (result) === 'array') return result;
         var error = [];

         if (eachValue !== undefined)  error.push ('each of the');
         if (names [0])                error.push (names [0]);
         if (functionName)             error = error.concat (['passed to', functionName]);
                                       error.push (clauses [0]);
         if (ofValue !== undefined)    error.push ('one of');
             ofValue !== undefined ?   error.push (ofValue) :      error.push (to);
         if (names [1])                error.push ('(' + names [1] + ')');
             eachValue !== undefined ? error.push ('but one of') : error.push ('but instead');
         if (eachValue !== undefined)  error.push (eachValue);
                                       error = error.concat (['is', compare]);

         error = error.concat (dale.do (clauses [1], function (v) {
            if (teishi.t (v) !== 'function') return v;
            else return v.apply (v, [compare, to]);
         }));
         return error;
      }
   }

   teishi.test = {

      type:     teishi.makeTest (
         function (a, b) {return teishi.t (a) === b},
         ['should have as type', ['with type', teishi.t]]
      ),

      equal:    teishi.makeTest (function (a, b) {
         return (function inner (a, b) {
            if (teishi.simple (a) && teishi.simple (b)) return a === b;
            if (teishi.t (a) !== teishi.t (b)) return false;
            return dale.stopOn (a, false, function (v, k) {
               return inner (v, b [k]);
            });
         } (a, b))
      }, 'should be equal to'),

      notEqual: teishi.makeTest (function (a, b) {
         return ! (function inner (a, b) {
            if (teishi.simple (a) && teishi.simple (b)) return a === b;
            if (teishi.t (a) !== teishi.t (b)) return false;
            return dale.stopOn (a, false, function (v, k) {
               return inner (v, b [k]);
            });
         } (a, b))
      }, 'should not be equal to'),

      range:    teishi.makeTest (function (a, b) {
         if (teishi.t (b) !== 'object') {
            return ['Range options object must be an object but instead is', b, 'with type', teishi.t (b)];
         }
         if (teishi.s (b) === '{}') return true;
         return dale.stopOnNot (b, true, function (v, k) {
            if (k !== 'min' && k !== 'max' && k !== 'less' && k !== 'more') {
               return ['Range options must be one of "min", "max", "less" and "more", but instead is', k]
            }
            if (k === 'min')  return a >= v;
            if (k === 'max')  return a <= v;
            if (k === 'less') return a < v;
            if (k === 'more') return a > v;
         });
      }, 'should be in range'),

      match:    teishi.makeTest (function (a, b) {
         if (teishi.t (a) !== 'string') {
            return ['Invalid comparison string passed to teishi.test.match. Comparison string must be of type string but instead is', a, 'with type', teishi.t (a)];
         }
         if (teishi.t (b) !== 'regex') {
            return ['Invalid regex passed to teishi.test.match. Regex must be of type regex but instead is', b, 'with type', teishi.t (b)];
         }
         return a.match (b) !== null;
      }, 'should match')
   }

   // *** VALIDATION ***

   teishi.validateRule = function (rule) {

      var ruleType = teishi.t (rule);
      if (ruleType === 'function' || ruleType === 'boolean') return true;
      if (ruleType !== 'array') {
         return ['each teishi rule must be an array or boolean or function but instead is', rule, 'with type', ruleType];
      }

      if (! (teishi.t (rule [0]) === 'string' || (teishi.t (rule [0]) === 'array' && rule [0].length === 2 && teishi.t (rule [0] [0]) === 'string' && teishi.t (rule [0] [1]) === 'string'))) return true;

      if (rule.length < 3 || rule.length > 5) {
         return ['Each teishi simple rule must be an array of length between 3 and 5, but instead is', rule, 'and has length', rule.length];
      }

      if (rule.length === 3) return true;

      var test, multi;

      var result = dale.stopOnNot (rule.slice (3, 5), true, function (v, k) {
         var type = teishi.t (v);
         if (type === 'string') {
            if (v !== 'oneOf' && v !== 'each' && v !== 'eachOf') return ['Invalid multi parameter', v, '. Valid multi parameters are', ['oneOf', 'each', 'eachOf']];
            if (multi) return ['You can pass only one multi parameter to a teishi simple rule but instead you passed two:', rule [3], 'and', rule [4]];
            multi = v;
         }
         else if (type === 'function') {
            if (test) return ['You can pass only one test function to a teishi simple rule but instead you passed two:', rule [3], 'and', rule [4]];
            test = v;
         }
         else return ['Elements #4 and #5 of a teishi simple rule must be either a string or a function, but element', '#' + (k + 4), 'is', v, 'and has type', type];
         return true;
      });

      return result;
   }

   // *** THE MAIN FUNCTIONS ***

   teishi.v = function () {

      var functionName = teishi.t (arguments [0]) === 'string' ? arguments [0] : '';
      var rule         = teishi.t (arguments [0]) === 'string' ? arguments [1] : arguments [0];
      var apres        = teishi.t (arguments [0]) === 'string' ? arguments [2] : arguments [1];

      var reply = function (error) {
         if      (apres === true)                  return error.join (' ');
         else if (teishi.t (apres) === 'function') apres (error.join (' '));
         else                                      teishi.l.apply (teishi.l, ['teishi.v'].concat (error));
         return false;
      }

      var validation = teishi.validateRule (rule);
      if (validation !== true) return reply (validation);

      if (teishi.t (rule) === 'boolean')  return rule;
      if (teishi.t (rule) === 'function') return teishi.v (functionName, rule.call (rule), apres);

      if (rule.length === 0) return true;

      if (teishi.t (rule [0]) === 'boolean' && rule.length === 2 && teishi.t (rule [1]) === 'array') {
         if (rule [0] === false) return true;
         else return teishi.v (functionName, rule [1], apres);
      }

      if (! (teishi.t (rule [0]) === 'string' || (teishi.t (rule [0]) === 'array' && rule [0].length === 2 && teishi.t (rule [0] [0]) === 'string' && teishi.t (rule [0] [1]) === 'string'))) {
         return dale.stopOnNot (rule, true, function (rule) {
            return teishi.v (functionName, rule, apres);
         });
      }

      var test = teishi.test.type;
      var multi;

      dale.do (rule.splice (3, 5), function (v) {
         var type = teishi.t (v);
         if (type === 'string')   multi = v;
         if (type === 'function') test  = v;
      });

      var result;
      var names = teishi.t (rule [0]) === 'array' ? rule [0] : [rule [0]];

      if ((multi === 'each' || multi === 'eachOf') && ((teishi.t (rule [1]) === 'array' && rule [1].length === 0) || (teishi.t (rule [1]) === 'object' && Object.keys (rule [1]).length === 0) || rule [1] === undefined)) {
         return true;
      }

      if ((multi === 'oneOf' || multi === 'eachOf') && ((teishi.t (rule [2]) === 'array' && rule [2].length === 0) || (teishi.t (rule [2]) === 'object' && Object.keys (rule [2]).length === 0) || rule [2] === undefined)) {
         result = ['To field of teishi rule is', rule.to, 'but multi attribute', multi, 'requires it to be non-empty, at teishi step', rule];
      }

      else if (multi === undefined) {
         result = test.apply (test, [functionName, names, rule [1], rule [2]]);
      }

      else if (multi === 'each') {
         result = dale.stopOnNot (rule [1], true, function (v) {
            return test.apply (test, [functionName, names, v, rule [2], rule [1]]);
         });
      }

      else if (multi === 'oneOf') {
         result = dale.stopOn (rule [2], true, function (v) {
            return test.apply (test, [functionName, names, rule [1], v, undefined, rule [2]]);
         });
      }

      else {
         result = dale.stopOnNot (rule [1], true, function (v) {
            return dale.stopOn (rule [2], true, function (v2) {
               return test.apply (test, [functionName, names, v, v2, rule [1], rule [2]]);
            });
         });
      }

      if (result === true) return true;
      else return reply (result);
   }

   teishi.stop = function () {
      return teishi.v.apply (teishi.v, arguments) === true ? false : true;
   }

}) ();
