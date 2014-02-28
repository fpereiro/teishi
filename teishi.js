/*
teishi - v1.0.0

Written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.

Please refer to README.md to see what this is about.
*/

(function () {

   // We check for dale.
   if (typeof exports !== 'undefined') {
      var dale = require ('dale');
   }
   else {
      var dale = window.dale;
   }

   if (dale === undefined) {
      console.log ('dale is required.');
      return false;
   }

   // This code allows us to export the lith in the browser and in the server.
   // Taken from http://backbonejs.org/docs/backbone.html
   var root = this;
   var teishi;
   if (typeof exports !== 'undefined') {
      teishi = exports;
   }
   else {
      teishi = root.teishi = {};
   }

   // Taken from http://javascript.crockford.com/remedial.html and modified to add detection of regexes.
   teishi.type = function (value) {
      var type = typeof value;
      if (type === 'object') {
         if (value) {
            if (Object.prototype.toString.call (value) == '[object Array]') {
               type = 'array';
            }
            if (value instanceof RegExp) {
               type = 'regex';
            }
         } else {
            type = 'null';
         }
      }
      return type;
   }

   teishi.is_integer = function (value) {
      return teishi.type (value) === 'number' && (value % 1 === 0);
   }

   // Stringifies inner arguments that are either an array or object. Removes the first and last double quote.
   teishi.stringify = function (error) {
      if (teishi.type (error) !== 'array') {
         console.log ('Input to teishi.stringify must be either string or array, but instead is', error, 'with type', teishi.type (error));
         return false;
      }
      else {
         return dale.do (error, function (v) {
            if (teishi.type (v) === 'array') {
               return '[' + v.join (', ') + ']'
            }
            if (teishi.type (v) === 'object') {
               return '{' + dale.do (v, function (v, k) {
                  return k + ': ' + v;
               }).join (', ') + '}';
            }
            else return v;
         }).join (' ');
      }
   }

   teishi.e = function (error) {
      // If console exists, we pass the arguments to teishi.stringify and print them to the console after surrounding them by two lines made of dashes.
      if (console) {
         if (teishi.type (error) !== 'array' && teishi.type (error) !== 'string') {
            console.log ('Input to teishi.e must be either string or array, but instead is', error, 'with type', teishi.type (error));
            return false;
         }
         var block_delimiter = '\n----\n';
         console.log (block_delimiter, teishi.type (error) === 'string' ? error : teishi.stringify (error), block_delimiter);
      }
      // We always return false.
      return false;
   }

   teishi.constants = {};

   teishi.constants.teishi_step_keys = ['compare', 'to', 'test', 'multi', 'label', 'label_to'];
   teishi.constants.teishi_step_multi_keys = [undefined, 'each', 'one_of', 'each_of'];

   // This object contains the test functions bundled with teishi.
   teishi.test = {};

   teishi.test.equal = function (compare, to, label, label_to, label_of) {
      if (compare === to) return true;
      // Notice the pattern "label_of ? label_of : to". It means that when label_of is defined, we're working with a multi object which has "one_of" or "each_of" as multi value. This means that the particular "to" value is not consequential; instead, we want to print the whole list of possible values TO WHICH the "compare" field may match.
      else return [
         label ? label : 'Input',
         'must be equal to',
         label_of ? 'one of' : '',
         label_of ? label_of : to,
         label_to ? '(' + label_to + ')' : '',
         'but instead is',
         compare
      ];
   }

   teishi.test.not_equal = function (compare, to, label, label_to, label_of) {
      if (compare !== to) return true;
      else return [
         label ? label : 'Input',
         'must not be equal to',
         label_of ? 'one of' : '',
         label_of ? label_of : to,
         label_to ? '(' + label_to + ')' : '',
         'but instead is',
         compare
      ];
   }

   teishi.test.type = function (compare, to, label, label_to, label_of) {
      if (teishi.type (compare) === to) return true;
      else return [
         label ? label : 'Input',
         'must be of type',
         label_of ? 'one of' : '',
         label_of ? label_of : to,
         label_to ? '(' + label_to + ')' : '',
         'but instead is',
         compare,
         'with type',
         teishi.type (compare)
      ];
   }

   teishi.test.match = function (compare, to, label, label_to, label_of) {
      // If input is invalid, we send the error message straight to teishi.e and return null.
      if (teishi.type (compare) !== 'string') return ['Invalid "compare" field passed to teishi.test.match: "compare" field must be of type string but instead is', compare, 'which has type', teishi.type (compare)];
      if (teishi.type (to) !== 'regex') return ['Invalid "to" field passed to teishi.test.match: "to" field must be of type regex but instead is', to, 'which has type', teishi.type (to)];
      if (compare.match (to) !== null) return true;
      else return [
         label ? label : 'Input',
         'must match',
         to,
         'but instead is',
         compare
      ];
   }

   teishi.test.is_integer = function (compare, to, label, label_to, label_of) {
      if (teishi.is_integer (compare)) return true;
      else return [
         label ? label : 'Input',
         'must be an integer but instead is',
         compare,
         'with type',
         teishi.type (compare)
      ];
   }

   teishi.validate = function (teishi_steps) {
      // It would be lovely to use teishi here to validate the teishi_step, but we can't, because here we are actually *creating* teishi.
      if (teishi.type (teishi_steps) !== 'object' && teishi.type (teishi_steps) !== 'array') {
         return teishi.e (['Input to teishi must be either a teishi_step or an array of teishi_steps but instead is', teishi_steps]);
      }
      // If teishi_steps is a single object, we wrap it in an array, so that we can process it with the same code that processes an array of objects.
      if (teishi.type (teishi_steps) === 'object') teishi_steps = [teishi_steps];

      // If we passed the object to the call to dale.stop_on below, dale would iterate on the keys of the object, instead of on the object itself, as intended when we're processing an array of objects. That's why we wrote the line above.
      if (dale.stop_on (teishi_steps, false, function (v, k) {
         if (teishi.type (v) !== 'object') return teishi.e (['teishi was expecting an array of teishi_steps but instead, element #', element, 'is', v, 'and has type', teishi.type (v)]);
         // For each key in the object...
         if (dale.stop_on (v, false, function (v2, k2) {
            // ... we check that each of them matches a valid teishi_step_key.
            if (dale.stop_on (teishi.constants.teishi_step_keys, true, function (v3) {
               return k2 === v3;
            }) !== true) return teishi.e (['Every key in a teishi_step must match one of', teishi.constants.teishi_step_keys, 'but object', v, 'has invalid key', k2]);
         }) === false) return false;
         // We check that the multi key of the object is a valid one.
         if (dale.stop_on (teishi.constants.teishi_step_multi_keys, true, function (v2) {
            return v.multi === v2;
         }) !== true) return teishi.e (['The multi key of a teishi_step must match one of', teishi.constants.teishi_step_multi_keys, 'but object', v, 'has invalid key', v.multi]);
      // Since the test was not passed but teishi.e was already called, we return false to exit teishi.stop.
      }) === false) return false;
      // If we reach this point of the function, the input is valid.
      return true;
   }

   teishi.stop = function (teishi_steps, return_error_message) {
      // Since teishi_validate reports validation errors, we just return true (remember, true means that an error was found!).
      if (teishi.validate (teishi_steps) === false) return true;
      // If teishi_step is a single object, we wrap it in an array, so that we can process it with the same code that processes an array of objects.
      if (teishi.type (teishi_steps) === 'object') teishi_steps = [teishi_steps];

      /*
         teishi.stop stops at the first validation error found. Hence, we only need to set a single variable for holding this error.

         You may now ask: why hold the error in a variable instead of returning it from the functions that perform the checks?

         dale.stop_on, used below in a nested fashion to iterate over teishi_steps and then over multi operators (if present) becomes unwieldy if I want to return an error message as indication of an error, instead of false.

         If I wrote a function called dale.stop_on_not, which stops when a value is not that, I could invoke "dale.stop_on (object, true, function...)", but I figured that it was not worth it. I'd rather set the error variable when an error is found and then cascade a false value up the chain of nested checks, to make it stop at once.
      */

      var error;

      dale.stop_on (teishi_steps, false, function (v) {
         // We set the default test (teishi.test.equal) is none is present
         if (v.test === undefined) v.test = teishi.test.equal;

         // The simplest case: v.multi === undefined
         if (v.multi === undefined) {
            var result = v.test (v.compare, v.to, v.label, v.label_to);
            if (result === true) return true;
            else {
               error = result;
               return false;
            }
         }
         // v.multi === 'each'. Hence, we iterate over v.compare
         else if (v.multi === 'each') {
            // If this is true, we have nothing to compare, so we return true.
            if (v.compare === {} || v.compare === [] || v.compare === undefined) return true;
            // We perform the test.
            return dale.stop_on (v.compare, false, function (v2) {
               var result = v.test (v2, v.to, v.label, v.label_to);
               if (result === true) return true;
               else {
                  error = result;
                  return false;
               }
            });
         }
         // v.multi === 'one_of'. Hence, we iterate over v.to. Notice how we stop at the first true value, since this renders compare as valid.
         else if (v.multi === 'one_of') {
            // If this is true, we cannot possible find a match. We return false.
            if (v.to === {} || v.to === [] || v.to === undefined) {
               error = ['To field of v is', v.to, 'but multi attribute', v.multi, 'requires it to be non-empty, at teishi step', v];
               return false;
            }
            // We perform the test.
            var of_result = dale.stop_on (v.to, true, function (v2) {
               var result = v.test (v.compare, v2, v.label, v.label_to, v.to);
               if (result === true) return true;
               else {
                  return result;
               }
            });
            if (of_result === true) return true;
            else {
               error = of_result;
               return false;
            }
         }
         // The most complex case: v.multi === 'each_of'. Notice how it is a combination of both 'each' and 'one_of'.
         else {
            if (v.compare === {} || v.compare === [] || v.compare === undefined) return true;
            if (v.to === {} || v.to === [] || v.to === undefined) {
               error = ['To field of v is', v.to, 'but multi attribute', v.multi, 'requires it to be non-empty, at teishi step', v];
               return false;
            }
            return dale.stop_on (v.compare, false, function (v2) {
               var of_result = dale.stop_on (v.to, true, function (v3) {
                  var result = v.test (v2, v3, v.label, v.label_to, v.to);
                  if (result === true) return true;
                  else {
                     return result;
                  }
               });
               if (of_result === true) return true;
               else {
                  error = of_result;
                  return false;
               }
            });
         }
      });
      // If the error was set to something, it means that there was a validation mistake. Hence, teishi.stop should return TRUE (because we have to stop, that's what true means).
      if (error !== undefined) {
         // If the return_error_message flag is set, we return an array with two elements, the first being the result and the second one the error.
         if (return_error_message) return [true, teishi.stringify (error)]
         else {
            // We report the error and return true.
            teishi.e (error);
            return true;
         }
      }
      else {
         // The sole difference between these is that false is returned either as the first element of an array or just as itself.
         if (return_error_message) return [false];
         else return false;
      }
   }

   // The inverse of teishi.stop
   teishi.go = function () {
      var result = teishi.stop.apply (teishi.stop, arguments);
      if (teishi.type (result) === 'boolean') result = ! result;
      else {result [0] = ! result [0]}
      return result;
   }

}).call (this);
