/*
teishi - v3.13.0

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

   teishi.t = function (value, objectType) {
      var type = typeof value;
      if (type !== 'object' && type !== 'number') return type;
      if (value instanceof Array) return 'array';
      if (type === 'number') {
         if      (isNaN (value))      return 'nan';
         else if (! isFinite (value)) return 'infinity';
         else if (value % 1 === 0)    return 'integer';
         else                         return 'float';
      }
      type = Object.prototype.toString.call (value).replace ('[object ', '').replace (']', '').toLowerCase ();
      if (type === 'array' || type === 'date' || type === 'null') return type;
      if (type === 'regexp') return 'regex';
      if (objectType) return type;
      return 'object';
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

   teishi.c = function (input, path, seen) {

      if (teishi.simple (input)) return input;

      path = path || ['$root'];
      seen = seen || [path, input];

      var inputType = teishi.t (input, true);
      var output    = inputType === 'array' || inputType === 'arguments' ? [] : {};

      dale.do (input, function (v, k) {
         if (teishi.simple (v)) return output [k] = v;
         var circular = dale.stopNot (seen, undefined, function (v2, k2) {
            if (k2 % 2 !== 0 && v === v2) return seen [k2 - 1];
         });
         if (! circular) {
            seen.push (path.concat ([k])) && seen.push (v);
            return output [k] = teishi.c (v, path.concat ([k]), seen.concat ());
         }
         output [k] = 'CIRCULAR REFERENCE: ' + circular.join ('.');
      });

      return output;
   }

   teishi.eq = function (a, b) {
      if (teishi.simple (a) && teishi.simple (b)) return a === b;
      if (teishi.t (a, true) !== teishi.t (b, true)) return false;
      if (teishi.s (dale.keys (a).sort ()) !== teishi.s (dale.keys (b).sort ())) return false;
      return dale.stop (a, false, function (v, k) {
         return teishi.eq (v, b [k]);
      }) === false ? false : true;
   }

   teishi.time = function () {return new Date ().getTime ()}

   var lastColor, ansi = {
      end:   function () {return isNode ? '\033[0m'  : ''},
      bold:  function () {return isNode ? '\033[1m'  : ''},
      white: function () {return isNode ? '\033[37m' : ''},
      color: function (reverse) {
         if (! isNode) return '';
         var color = lastColor;
         while (lastColor === color) color = Math.round (Math.random () * 5 + 1);
         lastColor = color;
         return '\033[' + (reverse ? '4' : '3') + color + 'm';
      }
   }

   teishi.l = function () {

      var output = ansi.bold ();

      (function inner (input, depth) {

         var inputType = teishi.t (input), depth = depth || 0, first = true;

         if (inputType === 'object' && Object.prototype.toString.call (input) === '[object Arguments]') inputType = 'array';

         var indent = depth < 2 ? '' : '\n' + dale.do (dale.times (depth - 1), function (v) {return '   '}).join ('');

         if (depth > 0) {
            if (inputType === 'array')  output += ansi.white () + '[';
            else                        output += ansi.white () + '{';
         }

         dale.do (input, function (v, k) {

            var typeV = teishi.t (v);

            if (depth === 0 && k === 0 && (typeV === 'string' || typeV === 'integer')) {
               first = false;
               return output += ansi.color (true) + v + ':' + ansi.end () + ansi.bold ();
            }

            if (! first) output += ansi.white () + (depth === 0 ? ' ' : ', ');
            first = false;

            if (typeV === 'string' && depth > 0) v = "'" + v + "'";
            if (typeV === 'function') {
               v = v + '';
               var baseIndent = v.match (/\s+(?=}$)/);
               if (baseIndent !== null) v = v.replace (new RegExp (baseIndent [0], 'g'), '\n');
               if (v.length > 150) v = v.slice (0, 150) + '...\n';
               if (depth > 1) v = v.replace (/\n/g, inputType === 'array' ? indent : ('\n' + (k + ': ').replace (/./g, ' ') + indent.slice (1)));
            }

            output += ansi.color ();
            if (inputType === 'object') output += indent + (k.match (/^[0-9a-zA-Z_]+$/) ? k : "'" + k + "'") + ': ';

            if (typeV === 'array' || typeV === 'object') inner (v, depth + 1);
            else output += inputType === 'object' ? v : indent + v;
         });

         if (depth > 0) {
            if (inputType === 'array')  output += (depth > 1 ? '\n' : '') + indent.slice (4) + ansi.white () + ']';
            if (inputType === 'object') output += (depth > 1 ? '\n' : '') + indent.slice (4) + ansi.white () + '}';
         }

      }) (teishi.c (arguments));

      console.log ('(' + new Date ().toISOString () + ')', output + ansi.end ());
      return false;
   }

   teishi.lno = function () {isNode = false}

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

         var clausesResult = dale.stopNot (clauses [1], true, function (v) {
            var type = teishi.t (v);
            if (type === 'string' || type === 'function') return true;
            return teishi.l ('teishi.makeTest', 'Each finalClause passed to teishi.makeTest should be a string or a function but instead is', v, 'with type', type);
         });
         if (clausesResult !== true) return;
      }

      return function (functionName, names, compare, to, eachValue, ofValue) {
         var result = fun (compare, to);
         if (result === true) return true;
         if (teishi.t (result) === 'array') return result;

         var error = [], index = 0;
         if (eachValue !== undefined)  error [index++] = 'each of the';
         if (names [0])                error [index++] = names [0];
         if (functionName)             error [index++] = 'passed to', error [index++] = functionName;
                                       error [index++] = clauses [0];
         if (ofValue !== undefined)    error [index++] = 'one of';
                                       error [index++] = ofValue !== undefined ? ofValue : to;
         if (names [1])                error [index++] = '(' + names [1] + ')';
                                       error [index++] = eachValue !== undefined ? 'but one of' : 'but instead';
         if (eachValue !== undefined)  error [index++] = eachValue;
                                       error [index++] = 'is';
                                       error [index++] = compare;

         dale.do (clauses [1], function (v) {
            error [index++] = typeof v !== 'function' ? v : v (compare, to);
         });
         return error;
      }
   }

   teishi.test = {

      type:     teishi.makeTest (
         function (a, b) {return teishi.t (a) === b},
         ['should have as type', ['with type', teishi.t]]
      ),

      equal:    teishi.makeTest (teishi.eq, 'should be equal to'),

      notEqual: teishi.makeTest (function (a, b) {
         return ! teishi.eq (a, b);
      }, 'should not be equal to'),

      range:    teishi.makeTest (function (a, b) {
         if (teishi.t (b, true) !== 'object') {
            return ['Range options object must be an object but instead is', b, 'with type', teishi.t (b, true)];
         }
         if (teishi.s (b) === '{}') return true;
         return dale.stopNot (b, true, function (v, k) {
            if (k !== 'min' && k !== 'max' && k !== 'less' && k !== 'more') {
               return ['Range options must be one of "min", "max", "less" and "more", but instead is', k]
            }
            if (k === 'min')  return a >= v;
            if (k === 'max')  return a <= v;
            if (k === 'less') return a < v;
                              return a > v;
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

      var typeFirst = teishi.t (rule [0]);

      if (! (typeFirst === 'string' || (typeFirst === 'array' && rule [0].length === 2 && teishi.t (rule [0] [0]) === 'string' && teishi.t (rule [0] [1]) === 'string'))) return true;

      if (rule.length === 3) return true;

      if (rule.length < 3 || rule.length > 5) {
         return ['Each teishi simple rule must be an array of length between 3 and 5, but instead is', rule, 'and has length', rule.length];
      }

      var test, multi;

      var result = dale.stopNot (rule, true, function (v, k) {
         if (k < 3) return true;
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
         else return ['Elements #4 and #5 of a teishi simple rule must be either a string or a function, but element', '#' + (k + 1), 'is', v, 'and has type', type];
         return true;
      });

      return result;
   }

   // *** THE MAIN FUNCTIONS ***

   var reply = function (error, apres) {
      if (apres === undefined) return teishi.l.apply (teishi.l, ['teishi.v'].concat (error));
      error = dale.do (error, function (v) {
         return teishi.complex (v) ? teishi.s (v) : v + '';
      }).join (' ');
      if (apres === true) return error;
      apres (error);
      return false;
   }

   teishi.v = function (first, second, third) {

      if (teishi.t (first) === 'string') var functionName = first, rule = second, apres = third;
      else                               var functionName = '',    rule = first,  apres = second;

      if (apres !== undefined && apres !== true && teishi.t (apres) !== 'function') return teishi.l ('teishi.v', 'Invalid apres argument. Must be either undefined, true, or a function.');

      var validation = teishi.validateRule (rule);
      if (validation !== true) return reply (validation, apres);

      var ruleType = teishi.t (rule);
      if (ruleType === 'boolean')  return rule;
      if (ruleType === 'function') return teishi.v (functionName, rule (), apres);

      if (rule.length === 0) return true;

      var ruleFirstType = teishi.t (rule [0]);
      if (ruleFirstType === 'boolean' && rule.length === 2 && teishi.t (rule [1]) === 'array') {
         if (rule [0] === false) return true;
         else return teishi.v (functionName, rule [1], apres);
      }

      if (! (ruleFirstType === 'string' || (ruleFirstType === 'array' && rule [0].length === 2 && teishi.t (rule [0] [0]) === 'string' && teishi.t (rule [0] [1]) === 'string'))) {
         return dale.stopNot (rule, true, function (rule) {
            return teishi.v (functionName, rule, apres);
         });
      }

      var typeFourth = teishi.t (rule [3]), typeFifth = teishi.t (rule [4]);
      var test  = typeFourth === 'function' ? rule [3] : (typeFifth === 'function' ? rule [4] : teishi.test.type);
      var multi = typeFourth === 'string'   ? rule [3] : (typeFifth === 'string'   ? rule [4] : undefined);

      var result;
      var names = ruleFirstType === 'array' ? rule [0] : [rule [0]];

      var typeCompare = teishi.t (rule [1], true), typeTo = teishi.t (rule [2], true);

      if ((multi === 'each' || multi === 'eachOf') && ((typeCompare === 'array' && rule [1].length === 0) || (typeCompare === 'object' && Object.keys (rule [1]).length === 0) || rule [1] === undefined)) {
         return true;
      }

      if ((multi === 'oneOf' || multi === 'eachOf') && ((typeTo === 'array' && rule [2].length === 0) || (typeTo === 'object' && Object.keys (rule [2]).length === 0) || rule [2] === undefined)) {
         result = ['To field of teishi rule is', rule.to, 'but multi attribute', multi, 'requires it to be non-empty, at teishi step', rule];
      }

      else if (multi === undefined) {
         result = test (functionName, names, rule [1], rule [2]);
      }

      else if (multi === 'each') {
         result = dale.stopNot (rule [1], true, function (v) {
            return test (functionName, names, v, rule [2], rule [1]);
         });
      }

      else if (multi === 'oneOf') {
         result = dale.stop (rule [2], true, function (v) {
            return test (functionName, names, rule [1], v, undefined, rule [2]);
         });
      }

      else {
         result = dale.stopNot (rule [1], true, function (v) {
            return dale.stop (rule [2], true, function (v2) {
               return test (functionName, names, v, v2, rule [1], rule [2]);
            });
         });
      }

      if (result === true) return true;
      else return reply (result, apres);

   }

   teishi.stop = function () {
      return teishi.v.apply (teishi.v, arguments) === true ? false : true;
   }

}) ();
