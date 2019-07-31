/*
teishi - v4.0.0

Written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.

To run the tests:
   - node.js: enter `node test` at the command prompt.
   - browser: copy the following three lines into a new file and open it with your browser.

// Start copying here

<script src="node_modules/dale/dale.js"></script>
<script src="teishi.js"></script>
<script src="test.js"></script>

// End copying here

*/

(function () {

   var startTime = new Date ().getTime ();

   var isNode = typeof exports === 'object';

   var dale   = isNode ? require ('dale')        : window.dale;
   var teishi = isNode ? require ('./teishi.js') : window.teishi;

   var printError = function (error) {
      if (isNode) dale.clog (error);
      else        alert     (error);
      throw new Error (error);
   }

   var tester = function (fun, inputs) {
      var funame    = (fun + '').replace (/^function\s+([a-zA-Z0-9_]+)\s*(\([^\)]*\))(.|[\r\n])+$/, '$1');
      var arglength = (fun + '').replace (/^function\s+([a-zA-Z0-9_]+)\s*(\([^\)]*\))(.|[\r\n])+$/, '$2').split (',').length;
      dale.stop (inputs, false, function (v, k) {
         var result = arglength < 2 ? fun.call (fun, v) : fun.apply (fun, v);
         var mismatch = (k.match (/^valid/) && result === false) || (k.match (/^invalid/) && result === true);
         teishi.l (funame + ':' + k, result);
         dale.clog ('');
         if (mismatch) {
            teishi.l ('Mismatch!', 'Aborting test now');
            teishi.perf = false;
            printError ('A test failed!');
         }
      });
   }

   function myFunctionOld (input) {
      if (teishi.t (input) !== 'array' && teishi.t (input) !== 'undefined') {
         return teishi.l ('Input to myFunction must be either an array or undefined, but instead is', input);
      }

      if (teishi.t (input) === 'array') {
         if (input.length !== 3) {
            return teishi.l ('Input to myFunction must be an array of length 3, but instead has length', input.length, 'and is', JSON.stringify (input));
         }
         return dale.stopNot (input, true, function (v) {
            if (teishi.t (v) === 'string') return true;
            return teishi.l ('Each item of the input to myFunction must be a string, but instead is', v, 'with type', teishi.t (v));
         });
      }

      return true;
   }

   function myFunction (input) {
      if (teishi.stop ('myFunction', [
         ['input', input, ['array', 'undefined'], 'oneOf'],
         [teishi.t (input) === 'array', [
            function () {
               return ['input.length', input.length, 3, teishi.test.equal]
            },
            ['items of input', input, 'string', 'each']
         ]]
      ])) return false;

      return true;
   }

   var myFunctionInput = {
      invalid1: 'aaa',
      invalid2: 333,
      invalid3: ['a', 'b'],
      invalid4: [1, 2, 3],
      valid: ['a', 'b', 'c']
   }

   tester (myFunctionOld, myFunctionInput);
   tester (myFunction,    myFunctionInput);

   function example1 (a, b) {
      if (teishi.stop ('example1', [
         ['counter', a, 'integer'],
         ['callback', b, ['function', 'undefined'], 'oneOf']
      ])) return false;

      return true;
   }

   tester (example1, {
      invalid1: [3.14, function () {}],
      invalid2: [333, 'just a string'],
      valid1: [14],
      valid2: [27, function () {}]
   });

   function example2 (action, limit) {
      if (teishi.stop ('example2', [
         ['action', action, ['create', 'read', 'update', 'delete'], 'oneOf', teishi.test.equal],
         ['limit', limit, 'integer'],
         [['limit', 'page size'], limit, {min: 0, max: 100}, teishi.test.range]
      ])) return false;

      return true;
   }

   tester (example2, {
      invalid1: ['creat', 200],
      invalid2: ['create', 200],
      invalid3: ['update', 10.5],
      valid: ['read', 10]
   });

   function example3 (input) {
      if (teishi.stop ('example3', [
         ['input', input, 'object'],
         ['keys of input', dale.keys (input), ['action', 'limit'], 'eachOf', teishi.test.equal],
         function () {return [
            ['input.action', input.action, ['create', 'read', 'update', 'delete'], 'oneOf', teishi.test.equal],
            ['input.limit', input.limit, 'integer'],
            [['input.limit', 'page size'], input.limit, {min: 0, max: 100}, teishi.test.range]
         ]}
      ])) return false;

      return true;
   }

   tester (example3, {
      invalid1: ['creat', 200],
      invalid2: {
         action: 'creat',
         limit: 200
      },
      invalid3: {
         actionn: 'create',
         limit: 10.5
      },
      valid: {
         action: 'read',
         limit: 10
      }
   });

   function example4 (input) {
      return teishi.v (['input', input, [1, 2, 3], teishi.test.equal]);
   }

   tester (example4, {
      invalid: [1, 2, '3'],
      valid: [1, 2, 3]
   });

   function example5 (input) {
      return teishi.v (['input', input, [1, 2, 3], teishi.test.notEqual]);
   }

   tester (example5, {
      invalid: [1, 2, 3],
      valid: [1, 2, '3']
   })

   function example6 (limit) {
      return teishi.v ([['limit', 'page size'], limit, {more: 0, less: 100}, teishi.test.range]);
   }

   tester (example6, {
      invalid1: 0,
      invalid2: 100,
      valid: 0.1
   });

   function example7 (limit) {
      return teishi.v ([['limit', 'page size'], limit, {min: 0, less: 100}, teishi.test.range]);
   }

   tester (example7, {
      invalid1: -0.0001,
      invalid2: 100,
      valid: 0.1
   });

   function example8 (identifier) {
      return teishi.v ([['identifier', 'alphanumeric string'], identifier, /^[0-9a-zA-Z]+$/, teishi.test.match]);
   }

   tester (example8, {
      invalid1: 444,
      invalid2: 'my-variable',
      valid: 'hax0r'
   });

   function example9 (input) {
      return teishi.v (['length of input', input.length, [1, 2, 3], 'oneOf', teishi.test.equal]);
   }

   tester (example9, {
      invalid1: [],
      invalid2: [1, 1, 1, 1],
      valid: ['a']
   });

   function example10 (input) {
      return teishi.v (['length of input', input.length, {cant: 1, touch: 2, 'this': 3}, 'oneOf', teishi.test.equal]);
   }

   tester (example10, {
      invalid1: [],
      invalid2: [1, 1, 1, 1],
      valid: ['a']
   });

   function example11 (input) {
      return teishi.v (['input', input, 'integer', 'each']);
   }

   tester (example11, {
      invalid1: 'a',
      invalid2: ['a'],
      valid1: 1,
      valid2: [1],
      valid3: {a: 1}
   });

   function example12 (input) {
      return teishi.v (['input', input, 'integer', 'oneOf']);
   }

   tester (example12, {
      invalid: 'a',
      valid: 1
   });

   function example13 (input) {
      return teishi.v (['input', input, ['integer'], 'oneOf']);
   }

   tester (example13, {
      invalid: 'a',
      valid: 1
   });

   function example14 (input) {
      return teishi.v (['input', input, 'integer', 'each']);
   }

   tester (example14, {
      invalid: /b/,
      valid1: undefined,
      valid2: [],
      valid3: {},
      valid4: 1987
   });

   function example15 (input) {
      return teishi.v (['input', input, undefined, 'oneOf']);
   }

   function example16 (input) {
      return teishi.v (['input', input, [], 'oneOf']);
   }

   function example17 (input) {
      return teishi.v (['input', input, {}, 'oneOf']);
   }

   tester (example15, {
      invalid1: 'a',
      invalid2: 2,
      invalid3: []
   });

   tester (example16, {
      invalid1: 'a',
      invalid2: 2,
      invalid3: []
   });

   tester (example17, {
      invalid1: 'a',
      invalid2: 2,
      invalid3: []
   });

   function example18Exception (array) {
      var result;
      try {
         result = teishi.v ([
            ['array', array, 'array'],
            ['array length', array.length, 3, teishi.test.equal]
         ]);
      }
      catch (err) {result = 'This function crashed! Please put a function guard.'}
      return result;
   }

   tester (example18Exception, {
      invalid1: 'a',
      invalid2: ['a'],
      valid: [1, 2, 3]
   });

   function example18 (array) {
      return teishi.v ([
         ['array', array, 'array'],
         function () {return ['array length', array.length, 3, teishi.test.equal]}
      ]);
   }

   tester (example18, {
      invalid1: 'a',
      invalid2: ['a'],
      valid: [1, 2, 3]
   });

   function example19 (input) {
      return teishi.v ([
         [teishi.t (input) === 'array', [
            function () {
               return ['input.length', input.length, 3, teishi.test.equal]
            },
            ['items of input', input, 'string', 'each']
         ]]
      ]);
   }

   tester (example19, {
      invalid: ['a'],
      valid1: /aaaa/,
      valid2: function () {},
      valid3: ['a', 'b', 'c']
   });

   function example20 (options) {
      return teishi.v ([
         ['options', options, 'object'],
         function () {
            return [
               options.port !== undefined, [
                  ['options.port', options.port, 'integer'],
                  ['options.port', options.port, {min: 1, max: 65536}, teishi.test.range]
               ]
            ]
         }
      ]);
   }

   tester (example20, {
      invalid1: 'a',
      invalid2: /aaaa/,
      invalid3: {port: '80000'},
      invalid4: {port: 80000},
      valid1: {},
      valid2: {port: 8000}
   });

   function validateWidget21 (widget) {
      return teishi.v (['widget', widget, 'valid widget', teishi.test.equal]);
   }

   function example21Capture (widget, sprocket) {
      return teishi.v ([
         validateWidget21 (widget),
         ['sprocket', sprocket, 'object']
      ]);
   }

   tester (example21Capture, {
      valid_should_be_invalid1: ['almost a valid widget', 'definitely not a sprocket'],
      invalid2: ['valid widget', 'definitely not a sprocket'],
      valid1: ['valid widget', {}],
      valid2: ['valid widget', {hi: 'handsome'}]
   });

   function example21 (widget, sprocket) {
      return teishi.v ([
         validateWidget21 (widget),
         function () {return ['sprocket', sprocket, 'object']}
      ]);
   }

   tester (example21, {
      invalid1: ['almost a valid widget', 'definitely not a sprocket'],
      invalid2: ['valid widget', 'definitely not a sprocket'],
      valid1: ['valid widget', {}],
      valid2: ['valid widget', {hi: 'handsome'}]
   });

   function validateTeishiRule (rule) {
      var metarule = [
         ['teishi rule', rule, ['function', 'boolean', 'array'], 'oneOf'],
         [teishi.t (rule) === 'array', [
            function () {
               return [(teishi.t (rule [0]) === 'string' || (teishi.t (rule [0]) === 'array' && rule [0].length === 2 && teishi.t (rule [0] [0]) === 'string' && teishi.t (rule [0] [1]) === 'string')), [
                  ['teishi simple rule', rule, 'array'],
                  ['length of teishi simple rule', rule.length, {min: 3, max: 5}, teishi.test.range],
                  ['rule name', rule [0], ['string', 'array'], 'oneOf'],
                  [teishi.t (rule [0]) === 'array', [
                     function () {return ['rule name', rule [0].length, 2, teishi.test.equal]},
                     ['rule name', rule [0], 'string', 'each'],
                  ]],
                  ['rule options', rule [3], ['string', 'function', 'undefined'], 'oneOf'],
                  ['rule options', rule [4], ['string', 'function', 'undefined'], 'oneOf'],
                  [teishi.t (rule [3]) === 'string', ['multi operator', rule [3], ['each', 'oneOf', 'eachOf'], 'oneOf', teishi.test.equal]],
                  [teishi.t (rule [4]) === 'string', ['multi operator', rule [4], ['each', 'oneOf', 'eachOf'], 'oneOf', teishi.test.equal]],
                  [rule [3] !== undefined && rule [4] !== undefined, [
                     [['type of multi operator', 'type of test function'], teishi.t (rule [3]), teishi.t (rule [4]), teishi.test.notEqual],
                  ]]
               ]]
            }
         ]]
      ];

      if (teishi.v (metarule)) {
         if (teishi.t (rule) === 'array' && ! (teishi.t (rule [0]) === 'string' || (teishi.t (rule [0]) === 'array' && rule [0].length === 2 && teishi.t (rule [0] [0]) === 'string' && teishi.t (rule [0] [1]) === 'string'))) {
            // If the rule is an array and it is not a simple rule, we assume it is a nested rule!
            return dale.stop (rule, false, function (v) {
               return validateTeishiRule (v);
            });
         }
         else return true;
      }
      else return false;
   }

   tester (validateTeishiRule, {
      invalid1: /a/,
      invalid2: [1, 2, 3, 4],
      valid1: ['array', null, 'array']
   });

   function validateWidget (widget) {
      return teishi.v (['widget', widget, 'object']);
   }

   tester (validateWidget, {
      invalid1: 'aaa',
      invalid2: /aaa/,
      valid: {a: 'aa'}
   });

   function validateWidget2 (widget) {
      return teishi.v ('validateWidget', ['widget', widget, 'object']);
   }

   tester (validateWidget2, {
      invalid1: 'aaa',
      invalid2: /aaa/,
      valid: {a: 'aa'}
   });

   function example22 (input) {
      return teishi.v (['input', input, [], teishi.test.equal]);
   }

   tester (example22, {
      invalid1: ['a'],
      invalid2: {foo: 'a'},
      invalid3: {},
      valid: []
   });

   function example23 (input) {
      return teishi.v (['input', input, [1, 2, 3, 4], teishi.test.equal]);
   }

   tester (example23, {invalid1: [1, 2, 3], valid: [1, 2, 3, 4]});

   function example24 (input) {
      return teishi.v (['input', input, [1, 2, 3, 4], teishi.test.notEqual]);
   }

   tester (example24, {invalid1: [1, 2, 3, 4], valid1: [1, 2, 3], valid2: [1, 2, 4]});

   function example25 (input) {
      return teishi.v (['not a stooge', input, ['moe', 'larry', 'curly'], 'oneOf', teishi.test.notEqual]);
   }

   tester (example25, {valid1: 'moe', valid2: 'larry', valid3: 'curly', valid4: 'iggy pop'});

   function example26 (input) {
      return teishi.v (['not a stooge', input, ['moe', 'moe', 'moe'], 'oneOf', teishi.test.notEqual]);
   }

   tester (example26, {invalid1: 'moe', valid1: 'larry', valid2: 'curly', valid3: 'iggy pop'});

   function example27 (input) {
      return teishi.v (['not a stooge', ['moe', 'larry', 'curly'], input, 'each', teishi.test.notEqual]);
   }

   tester (example27, {invalid1: 'moe', invalid2: 'larry', invalid3: 'curly', valid: 'iggy pop'});

   function example28 (input) {
      return teishi.v ([
         ['input.time', input.time, 'integer'],
         ['input.time', teishi.time () - input.time, {max: 10}, teishi.test.range],
         ['input.last0', input.last0, false, teishi.test.equal],
         ['input.last1', input.last1, false, teishi.test.equal],
         ['input.last2', input.last2, true, teishi.test.equal],
         ['input.last3', input.last3, 3, teishi.test.equal]
      ]);
   }

   if (! example28 ({
      time: teishi.time (),
      last0: teishi.last (),
      last1: teishi.last (1),
      last2: teishi.last ([1, 2, true]),
      last3: (function () {return teishi.last (arguments)}) (1, 3)
   })) printError ('A test failed!');

   var circ = [];
   circ [0] = circ;

   var cinput = {a: {b: []}};
   cinput.a.b [0] = cinput.a.b;
   cinput.a.b [1] = cinput.a;
   cinput.a.b [2] = cinput;
   cinput.a.b [3] = 1;

   var bagocats = [{
      hello: 'there',
      otra: 'mas',
      fun: fun,
      other: true,
      buffer: isNode ? (Buffer.from ? Buffer.from ('hello there') : new Buffer ('hello there', 'utf8')) : '',
      circular:  circ,
      circular2: cinput
   }, [/a/, /b/, {a: 'aa'}, [some, fun], 'c'], 'yep'];

   function example29 () {
      if (teishi.c (circ) [0] !== '[Circular]') printError ('Circular reference not handled properly #1.');
      var data = [["8FD885B8-B3CE-6E7B-E256-D483BF2F063D","Wylie","Donec.feugiat@mauris.ca","148-1720 Eu St.","Bharatpur","Rajasthan","Korea, South","-54.67525, -4.31423"],["85624A1C-AD8C-D599-C1B6-C0C41FA6E5B1","Bree","non@Sednecmetus.co.uk","6556 Ante Road","Częstochowa","Sląskie","Moldova","-17.70027, 13.07993"],["7F3FA315-309E-E13C-B936-4208668DBF30","Minerva","Mauris.magna.Duis@estac.com","5826 Ullamcorper Street","Sosnowiec","Sląskie","Nigeria","-18.53188, -2.3058"],["D023045D-AE4B-DA1B-690F-7E917E789E3E","Mary","Sed.nunc.est@ipsumdolor.co.uk","7013 Arcu St.","Algeciras","Andalucía","Uruguay","-4.27216, -40.74605"]];
      if (! teishi.eq (data, teishi.c (data))) printError ('Object not copied properly #1');
      if (data === teishi.c (data)) printError ('Object not copied properly #2');
      if (data [0] === teishi.c (data [0])) printError ('Object not copied properly #3');
      data.push ([]);
      teishi.last (data) [0] = teishi.last (data);
      if (teishi.c (data) [4] [0] !== '[Circular]') printError ('Circular reference not handled properly #2.');
      data.push ({});
      teishi.last (data).up = teishi.last (data);
      if (! teishi.eq (teishi.last (teishi.c (data)), {up: '[Circular]'})) printError ('Circular reference not handled properly #3.');
      if (! teishi.eq (teishi.c ({a: 'b', c: circ}), {a: 'b', c: ['[Circular]']})) printError ('Circular reference not handled properly #4.');
      if (! teishi.eq (teishi.c (cinput), {a: {b: ['[Circular]', '[Circular]', '[Circular]', 1]}})) printError ('Circular reference not handled properly #5.');
      if (! teishi.eq ([[{a: 'a'}]], teishi.c ([[{a: 'a'}]]))) printError ('Circular reference not handled properly #6.');
      var bcopy = teishi.c (bagocats);
      if (bcopy [2] !== 'yep' || ! bcopy [1] || bcopy [1].length !== 5 || ! bcopy [1] [3] || bcopy [1] [3].length !== 2 || bcopy [1] [3] [0] !== some || bcopy [1] [3] [1] !== fun) printError ('Circular reference not handled properly #6.');
      if (! teishi.eq (bcopy [0].circular, ['[Circular]'])) printError ('Circular reference not handled properly #7.');
      if (! teishi.eq (bcopy [0].circular2, {a: {b: ['[Circular]', '[Circular]', '[Circular]', 1]}})) printError ('Circular reference not handled properly #8.');
   }

   example29 ();

   function some (e, f, g) {
      // Comment
      var code = ['as', 'data'];
      var inner = function (h, i, j) {
         return i;
      }
      var data = {
         a: [1, 2, 3],
         b: [4, 5, 6]
      }
      return inner ();
   }

   function fun (a, b, c) {
      return d;
   }

   teishi.l (bagocats)

   var d = new Date ().getTime ();

   if (teishi.time (d) !== new Date (d).getTime ())             printError ('teishi.time error #1.');
   if (Math.abs (teishi.time () - new Date ().getTime ()) > 20) printError ('teishi.time error #2.');
   if (teishi.t (teishi.time (d)) !== 'integer')                printError ('teishi.time error #3.');
   if (teishi.t (teishi.time ()) !== 'integer')                 printError ('teishi.time error #4.');
   if (teishi.t (teishi.time (/a/)) !== 'nan')                  printError ('teishi.time error #5.');

   dale.go ([[/regex/, 'regex'], [function () {}, 'function'], [new Date, 'date'], [Infinity, 'infinity'], [NaN, 'nan'], [1.5, 'float'], [0, 'integer'], ['do this', 'string'], [[], 'array'], [{}, 'object'], [null, 'null'], [undefined, 'undefined']], function (v) {
      if (teishi.t (v [0]) !== v [1]) printError ('teishi.t type error with type ' + v [1]);
   });

   teishi.v ('Check', [
      ['aaa', 1, 'string']
   ], function (error) {
      if (error) {
         if (teishi.perf !== false) teishi.perf = teishi.time () - startTime;
         if (isNode) teishi.l ('Finished', 'All tests ran successfully in ' + teishi.perf + 'ms!');
         else        alert ('All tests passed successfully!');
      }
      else       teishi.l ('There was an error with the apres function!');
   });

}) ();
