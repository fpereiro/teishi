/*
teishi - v2.0.0

Written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.

Please refer to readme.md to read the annotated source.
*/

(function () {

   // *** SETUP ***

   var isNode = typeof exports === 'object';

   var dale   = isNode ? require ('dale') : window.dale;

   if (isNode) var teishi = exports;
   else        var teishi = window.teishi = {};

   // *** FIVE HELPER FUNCTIONS ***

   teishi.t = function (value) {
      var type = typeof value;
      if (type === 'number') {
         if      (isNaN (value))      type = 'nan';
         else if (! isFinite (value)) type = 'infinity';
         else if (value % 1 === 0)    type = 'integer';
         else                         type = 'float';
      }
      if (type === 'object') {
         if (value === null)                                               type = 'null';
         if (Object.prototype.toString.call (value) === '[object Array]')  type = 'array';
         if (Object.prototype.toString.call (value) === '[object RegExp]') type = 'regex';
      }
      return type;
   }

   teishi.s = function () {
      try {return JSON.stringify.apply (JSON.stringify, arguments)}
      catch (error) {return false}
   }

   teishi.p = function () {
      try {return JSON.parse.apply (JSON.parse, arguments)}
      catch (error) {return false}
   }

   teishi.c = function (input, seen) {
      var type = teishi.t (input);
      if (type !== 'array' && type !== 'object') return input;

      if (seen === undefined) seen = [];

      if (dale.stopOn (seen, true, function (v) {
         return input === v;
      })) return '[Circular Reference]';

      seen.push (input);

      var output = type === 'array' ? [] : {};

      dale.do (input, function (v, k) {
         output [k] = teishi.c (v, seen);
      });

      return output;
   }

   var ms = new Date ().getTime ();

   teishi.l = function (label, message, lastColor, recursive) {

      var ansi = {
         bold: '\033[1m',
         end: '\033[0m',
         white: '\033[37m',
         color:  function () {return '\033[3' + Math.round (Math.random () * 5 + 1) + 'm'},
         rcolor: function () {return '\033[4' + Math.round (Math.random () * 5 + 1) + 'm'}
      }

      var type = teishi.t (message);

      if (recursive === undefined) message = teishi.c (message);

      if (message === undefined) message = [message];

      var textArray = type === 'array' && !recursive;

      var output = dale.do (message, function (v, k) {

         if (teishi.t (v) === 'string' && !textArray) v = '"' + v + '"';

         if (teishi.t (v) === 'array' || teishi.t (v) === 'object') v = teishi.l (label, v, lastColor, true);

         if (type === 'object') v = (k.match (/^[0-9a-zA-Z_]+$/) ? k : "'" + k + "'") + ': ' + v;

         if (isNode) {
            var color = lastColor;
            while (color === lastColor) color = ansi.color ();
            v = color + v;
         }

         return v;

      }).join (textArray ? ' ' : ', ');

      if (! isNode) ansi.white = ansi.end = ansi.bold = '';

      if (type === 'array' && !textArray) output = ansi.white + '[' + output + ansi.white + ']';
      if (type === 'object')              output = ansi.white + '{' + output + ansi.white + '}';

      if (recursive) return output;
      console.log ('(' + (new Date ().getTime () - ms) + 'ms) ' + (isNode ? ansi.rcolor () : '') + label + ':' + ansi.end + ansi.bold + ' ' + output + ansi.end + '.');
   }

   // *** TEST FUNCTIONS ***

   teishi.makeTest = function (fun, clauses) {

      if (teishi.t (fun) !== 'function') {
         return teishi.l ('teishi.makeTest', ['fun passed to teishi.makeTest should be a function but instead is', fun, 'with type', teishi.t (fun)]);
      }
      if (teishi.t (clauses) === 'string') clauses = [clauses];
      if (teishi.t (clauses) !== 'array') {
         return teishi.l ('teishi.makeTest', ['clauses argument passed to teishi.makeTest should be an array but instead is', clauses, 'with type', teishi.t (clauses)]);
      }
      if (teishi.t (clauses [0]) !== 'string') {
         return teishi.l ('teishi.makeTest', ['shouldClause passed to teishi.makeTest should be a string but instead is', clauses [0], 'with type', teishi.t (clauses [0])]);
      }

      if (clauses [1] !== undefined) {
         if (teishi.t (clauses [1]) !== 'array') clauses [1] = [clauses [1]];

         var clausesResult = dale.stopOnNot (clauses [1], true, function (v) {
            if (teishi.t (v) === 'string' || teishi.t (v) === 'function') return true;
            return teishi.l ('teishi.makeTest', ['Each finalClause passed to teishi.makeTest should be a string or a function but instead is', v, 'with type', teishi.t (v)]);
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
         if (functionName)             error.push ('passed to ' + functionName);
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
         function simple (i) {return teishi.t (i) !== 'array' && teishi.t (i) !== 'object'}
         return (function inner (a, b) {
            if (simple (a) && simple (b))      return a === b;
            if (teishi.t (a) !== teishi.t (b)) return false;
            return dale.stopOn (a, false, function (v, k) {
               return inner (v, b [k]);
            });
         } (a, b))
      }, 'should be equal to'),

      notEqual: teishi.makeTest (function (a, b) {
         function simple (i) {return teishi.t (i) !== 'array' && teishi.t (i) !== 'object'}
         return ! (function inner (a, b) {
            if (simple (a) && simple (b))      return a === b;
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
         // If there are no conditions, we return true.
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

   // *** CONSTANTS ***

   teishi.k = {
      options: ['multi', 'test'],
      multi:   [undefined, 'each', 'oneOf', 'eachOf']
   }

   // *** VALIDATION ***

   teishi.validateRule = function (rule) {

      var ruleType = teishi.t (rule);
      if (ruleType === 'function' || ruleType === 'boolean') return true;
      if (ruleType !== 'array') {
         return ['each teishi rule must be an array or boolean or function but instead is', rule, 'with type', ruleType];
      }

      if (! (teishi.t (rule [0]) === 'string' || (teishi.t (rule [0]) === 'array' && rule [0].length === 2 && teishi.t (rule [0] [0]) === 'string' && teishi.t (rule [0] [1]) === 'string'))) return true;

      if (rule.length < 3 || rule.length > 4) {
         return ['Each teishi proper rule must be an array of length between 3 and 4, but instead is', rule, 'and has length', rule.length];
      }

      if (rule [3] !== undefined) {

         if (teishi.t (rule [3]) !== 'object') {
            return ['teishi rule options must be undefined or an object but instead is', rule [3], 'with type', teishi.t (rule [3])];
         }

         var result = dale.stopOnNot (rule [3], true, function (v, k) {
            if (dale.stopOn (teishi.k.options, true, function (v2) {
               return k === v2;
            }) === false) {
               return ['Every key in a teishi rule option object must match one of', teishi.k.options, 'but', rule, 'has invalid key', k];
            }
            return true;
         });

         if (result !== true) return result;

         if (dale.stopOn (teishi.k.multi, true, function (v) {
            return v === rule [3].multi;
         }) !== true) {
            return ['The "multi" key of a teishi rule option must match one of', teishi.k.multi, 'but option', rule, 'has invalid key', rule [3].multi];
         }

         if (rule [3].test !== undefined && teishi.t (rule [3].test) !== 'function') {
            return ['The "test" value passed to a teishi rule option must be undefined or a function but instead is', rule [3].test, 'in rule', rule];
         }
      }

      return true;
   }

   // *** THE MAIN FUNCTIONS ***

   teishi.v = function () {

      var functionName = teishi.t (arguments [0]) === 'string' ? arguments [0] : '';
      var rule         = teishi.t (arguments [0]) === 'string' ? arguments [1] : arguments [0];
      var mute         = teishi.t (arguments [0]) === 'string' ? arguments [2] : arguments [1];

      if (teishi.t (mute) !== 'boolean' && mute !== undefined) {
         teishi.l ('teishi.v', ['mute argument passed to teishi must be boolean or undefined but instead is', mute, 'with type', teishi.t (mute)]);
         return false;
      }

      var validation = teishi.validateRule (rule);
      if (validation !== true) {
         teishi.l ('teishi.v', validation);
         return false;
      }

      if (teishi.t (rule) === 'boolean')  return rule;
      if (teishi.t (rule) === 'function') return teishi.v (functionName, rule.call (rule), mute);

      if (rule.length === 0) return true;

      if (teishi.t (rule [0]) === 'boolean' && rule.length === 2 && teishi.t (rule [1]) === 'array') {
         if (rule [0] === false) return true;
         else return teishi.v (functionName, rule [1], mute);
      }

      if (! (teishi.t (rule [0]) === 'string' || (teishi.t (rule [0]) === 'array' && rule [0].length === 2 && teishi.t (rule [0] [0]) === 'string' && teishi.t (rule [0] [1]) === 'string'))) {
         return dale.stopOnNot (rule, true, function (rule) {
            return teishi.v (functionName, rule, mute);
         });
      }

      var multi;
      var test = teishi.test.type;
      if (rule [3]) {
         multi = rule [3].multi;
         if (rule [3].test) test = rule [3].test;
      }

      var result;
      var names = teishi.t (rule [0]) === 'array' ? rule [0] : [rule [0]];

      if ((multi === 'each' || multi === 'eachOf') && ((teishi.t (rule [1]) === 'array' && rule [1].length === 0) || (teishi.t (rule [1]) === 'object' && teishi.s (rule [1]) === "{}") || rule [1] === undefined)) {
         return true;
      }

      if ((multi === 'oneOf' || multi === 'eachOf') && ((teishi.t (rule [2]) === 'array' && rule [2].length === 0) || (teishi.t (rule [2]) === 'object' && teishi.s (rule [2]) === "{}") || rule [2] === undefined)) {
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
      if (mute) return result;
      else {
         teishi.l ('teishi.v', result);
         return false;
      }
   }

   teishi.stop = function () {
      var result = teishi.v.apply (teishi.v, arguments);
      if (result === true) return false;
      else return true;
   }

}) ();
