# teishi

> "A string is a string is a string." --Gertrude Stein

teishi is a tool for validating the input of a function.

teishi means "stop" in Japanese. The inspiration for the library and the approach comes from the concept of "auto-activation", which is one of the two main pillars of the Toyota Production System (according to its creator, [Taiichi Ohno](http://en.wikipedia.org/wiki/Taiichi_Ohno)).

## Auto-activation

Auto-activation means that a machine or process stops immediately when an error is found, instead of going on until the faults in the process make it break down completely. Let's restate it: **an auto-activated machine stops on its own when it detects a defect.**

This idea can fruitfully be applied to code, for many reasons:

- You get cleaner exception handling. Functions can return a false value on receiving a false input, so you can check for a false value instead of placing a try/catch block.
- Your functions return error messages, instead of crashing and burning when attempting to execute a statement that would always be valid if the input was valid.
- You usually get an error message that is much more meaningful. `Input to my_function must be an array of length 2` explains much more than `undefined is not a function`. If you forgot to pass a function as a second argument to a given function, it is easier to just be told that you missed it, instead of debugging the first (failed) usage of that argument.  Also, the error message points to the actual origin of the error, instead of the point where the program crashes.
- Most importantly, when you are writing code, you are forced (encouraged?) to clearly specify the inputs of each function. This leads to fewer bugs and clearer code.

## Rationale for teishi

When I started applying this concept to my code (as you can see in [lith](https://github.com/fpereiro/lith/blob/master/lith.js)), I found myself writing this kind of code block, over and over.

```javascript
if (type (input) !== 'array' && type (input) !== 'undefined') {
   console.log ('Input to my_function must be either an array or undefined, but instead is', input);
   return false;
}
```

Another example:

```javascript
if (type (input) === 'array') {
   if (input.length !== 3) {
      console.log ('Input to my_function must be an array of length 3, but instead has length', input.length, 'and is', JSON.stringify (input));
      return false;
   }
   for (var item in input) {
      if (type (input [item]) !== 'string') {
         console.log ('Each item of the input to my_function must be a string, but instead is', input [item]);
         return false;
      }
   }
}
```

These code blocks have three parts in common:

1. Error detection.
2. Error notification.
3. Return immediately from the function, so that no further execution is performed and a false value is returned.

The repetitive parts about the three actions above are:

1. Multiple comparisons:
   - When you have a single input and many accepting values (as in the first example).
   - When you want to iterate the input to see if it matches an accepting value (as in the second example).
   - When you have both.
2. Error notification:
   - Writing the error message every time, such as "Input can be of type array or object but instead is".
   - Having to stringify objects and arrays when printing them for error notification purposes.
3. Early returning from the function requires to write one return clause per possible validation error.

teishi simplifies the first two parts and allows you to return false just once, at the end of all the checks you want to perform. Using teishi, the examples above can be rewritten like this:

```javascript
if (teishi.stop ({
   compare: input,
   to: ['array', 'undefined'],
   multi: 'one_of',
   test: teishi.test.type,
   label: 'Input to my_function'
})) return false;

if (teishi.type (input) === 'array') {
   if (teishi.stop ([{
      compare: input.length,
      to: 3,
      label: 'Length of input to my_function'
   }, {
      compare: input,
      to: 'string',
      test: teishi.test.type,
      multi: 'each',
      label: 'Items of input to my_function'
   }])) return false;
}
```

## teishi\_step

The most important structure in teishi is the `teishi_step`. A `teishi_step` is an object that contains the following elements:

- `compare`: can be anything. *This object is required.*
- `to`: can be anything. *This object is required.*
- `multi`: can be either `undefined`, or a string with the values `'each'`, `'of'` and `'each_of'`. The usage of `multi` is explained [below](https://github.com/fpereiro/teishi#teishimulti).
- `test`: a function that compares the fields `compare` and `to`. When this value is omitted, teishi uses equality ('===') as the function for comparing.
- `label`: a string that gives further information about the `compare` field, for error reporting purposes.
- `label_to`: a string that gives further information about the `to` field, for error reporting purposes.

No other key is considered valid.

## teishi test functions

The functions used in the `test` element of a `teishi_step` do the following:

1. Take the arguments `compare`, `to`, `label`, `label_to` and `label_of` (`label_of` will be explained below, where the `multi` field is documented).
2. Compare the first two arguments:
   - If the test was successful, return `true`.
   - If the test was unsuccessful, return an error message. The error message can have any format (the only forbidden value is `true`, since that wouldn't be considered as an error!). You will likely want to use `label` and `label_to` to provide useful information to the user. The error message will be formatted and stringified by `teishi.e`, which is the error function, explained below.

teishi comes bundled with a few `test` functions:

- `teishi.test.equal`, which compares two values for deep equality (`===`). This is used as the default comparison if the `test` field of a `teishi_object` is omitted.
- `teishi.test.not_equal`: same than above, but with (`!==`).
- `teishi.test.type`, which compares the type of an object with a string. It is a teishi-compliant version of `typeof`, with a couple of improvements (it detects arrays and regexes too).
- `teishi.test.match`, which receives a string as the `compare` field and a regex as the `to` field. The function returns true if the string matches the regex provided, and false if the match failed.
- `teishi.test.is_integer`: checks that the `compare` field is an integer. Notice that the `to` field passed to this function is irrelevant.

There's nothing magical about these functions. If you use teishi, you'll be writing your own test functions in no time. To dispel your fears (or to encourage them, I'm not sure) here's the source code for `teishi.test.type`, probably the most useful test function of teishi:

```javascript
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
```

As you can see, this function:

- Returns either true or an error message.
- Provides a default label ("Input") if no label is passed.
- Has a mysterious code block within the error message: `label_of ? label_of : to`. Later we're going to see why, in the [label_of section](https://github.com/fpereiro/teishi#label_of).

## teishi.stop

`teishi.stop` is the main function of teishi.

It takes two arguments:

1. A `teishi_step` or an array of `teishi_steps`.
2. An optional `return_error_message` flag, explained below.

`teishi.stop` does the following:

- Compares the field `compare` with the field `to`, using the function in the field `test` as the criteria.
- If the comparison returns false, teishi.stop returns `true`, because a validation error has been found. Let's state it again: **teishi.stop returns `true` if there WAS a validation error**.
- Also, when the comparison returns false, teishi reports a properly formatted error message through console.log.
- If the comparison returns true, it jumps to the next `teishi_step` (if there is one).
- If we reached the end and no errors were found, teishi.stop returns false. Let's state it again: **teishi.stop returns FALSE if there were NO validation errors**.

Let's see an example:

```javascript
function process_array_of_strings (fun, array) {
   if (teishi.stop ([{
      compare: fun,
      to: 'function',
      test: teishi.test.type,
      label: 'Function input to process_array_of_strings'
   }, {
      compare: array,
      to: 'string',
      multi: 'each',
      test: teishi.test.type,
      label: 'String in array passed to process_array_of_strings'
   }])) return false;
}
```

Notice that we wrap the call to `teishi.stop` in an if clause, and call `return false` if `teishi.stop` returns `true`. There is no way around this pattern, because you must explicitly make your function return false. If you place n `teishi_objects` in a `teishi.stop` call, you only need to use this pattern once instead of using it n times.

## teishi.multi

It's time to explain the `multi` operator. It can take four values:

1. `undefined`, which does nothing.
2. `'each'`: compares each of the elements of `compare` to the `to` element, using the `test`. If one of those elements doesn't match, the test immediately stops and `teishi.stop` returns `true`.
2. `'one_of'`: compares `compare` with each of the elements of `to`, using the `test`. If one of those elements matches, the test is considered valid. If no element matches, `teishi.stop` returns `true`.
3. `'each_of'`: it is a combination of `'each'` and `'one_of'`. For each element in `compare`, at least one of the elements of `to` must match, otherwise `teishi.stop` returns `true`.

**Examples:**

```javascript
teishi.stop ({
   compare: [2, 3, 5],
   to: 3,
   multi: 'each'
}); // returns true (error found), since 2 !== 3

teishi.stop ({
   compare: 3,
   to: [2, 3, 5],
   multi: 'one_of'
}); // returns false (error not found), since 3 === 3

teishi.stop ({
   compare: [2, 3],
   to: [2, 3, 5],
   multi: 'each_of'
}); // returns false (error not found), since 2 === 2 && 3 === 3
```

## return\_error\_message

If a `true` value is passed to the second value of `teishi.stop`, the function returns always returns an array with two elements:

1. A `true` or `false` value (whether an error was found or wasn't found, respectively).
2. An error message or undefined (whether an error was found or wasn't found, respectively).

The purpose of this is to let another function capture the error message and decide if it should be printed or not to the user. Sometimes `teishi.stop` is useful to find out whether a given condition is matched or not, without having to report an error. I had to use this functionality in [lith](https://github.com/fpereiro/lith/blob/master/lith.js), when checking whether a given input was of a certain kind or of other kind. If it belonged to neither kind, the error message would be reported, otherwise it wouldn't.

**Example:**

```javascript
teishi.stop ({
   compare: 3,
   to: [2, 4, 5],
   multi: 'one_of'
}, true) // returns [true, "Input must be one of [2, 4, 5] but instead is 3"]
         // and doesn't log an error to the console.
```

## Two more points about `multi`

### label\_of

teishi.stop takes care of passing each comparison pair to the test functions and detect their errors. In this way, you can write the test functions without having to worry about the multi operators.

This means that when a `multi` value is present, `teishi.stop` feeds the validating function with a pair of `compare` and `to` values at a time, and stops this process when an error is found.

Now, since the validating functions are not aware that a `multi` operation is taking place, their error messages would be incorrect. Consider this example:

```javascript
teishi.stop ({
   compare: 3,
   to: [2, 4, 5],
   multi: 'one_of'
}) // returns true
```

The validation function would go on to compare `3` against `2`, `4` and `5`. When it reaches the end and no matches are found, the error message produced will be `Input must be 5, but instead is 3`. But the proper error message should be `Input must be one of [2, 3, 5] but instead is 3`.

This situation arises when an `'one_of'` or `'each_of'` `multi` value is present, which make `teishi.stop` iterate over many possible values within the `to` field. In both of this cases, `teishi.stop` passes a further argument to the test functions, named `label_of`, which contains the actual value of the `to` field.

So, to go back to the example, the arguments passed to `teishi.test.equal` (the default test function used above) would be:

```javascript
compare: 3,
to: 5,
label: ...
label_to: ...
label_of: [2, 4, 5]
```

And so teishi.test.equal can report an error using this `label_of` value, whenever it is present (ie: not undefined).

### Special cases

Let's insert a couple of definitions for the purpose of this section:

`single value` = anything that is neither an array, nor an object, nor undefined

`empty value` = anything that is undefined, an empty array or an empty object

**Q:** What happens if `compare` is a `single value` and you use the `'each'` or `'each_of'` operator?

**A:** This is equivalent as passing an array the `single value` as its first and only element. That is, `compare: 2` is equivalent to `compare: [2]` (of course, when `'each'` or `'each_of'` is set).

**Q:** What happens if `to` is a `single value` and you use the `'one_of'` or `'each_of'` operator?

**A:** It's the same than above. This is equivalent as passing an array the `single value` as its first and only element. That is, `to: 2` is equivalent to `to: [2]` (of course, when `'each'` or `'each_of'` is set).

**Q:** What happens if `compare` is a `empty value` and you use the `'each'` or `'each_of'` operator?

**A:** `teishi.stop` assumes that there are no values to compare, so there cannot be possibly a source of error. hence, it will always return `true`.

**Q:** What happens if `to` is a `empty value` and you use the `'one_of'` or `'each_of'` operator?

**A:** `teishi.stop` assumes that there are no values that `compare` can match, so there cannot be possibly a way to pass the test. Hence, it will always return `false`, plus an error message.

## Helper functions

### teishi.type

The most useful function of the bunch. It is a patched based on [Crockford's remedial type function](http://javascript.crockford.com/remedial.html) and modified to add detection of regexes.

It receives a single argument and always returns a string with the argument type.

You can invoke it directly.

### teishi.s and teishi.p

Two useful wrappers around JSON.stringify and JSON.parse. They attempt to stringify/parse the argument, and if there is an error, instead of getting an exception, you just get a `false` value.

### teishi.stringify

`teishi.stringify` is a helper function for `teishi.e`, also used to process the error message when it is returned to the user directly (instead of through `teishi.e`.

1. It only accepts an array as its input.
2. For every element of the array, if it is an array, it is displayed as an array (surrounded by "[" and "]"). If it is an object, it is displayed as an object (listing all keys and values, and surrounding it by "{" and "}"). Else, it is displayed as it is.
3. It returns a string concatenating all the elements in the input array.

### teishi.e

`teishi.e` is an error message function. It is very simple:

1. It only accepts a single argument. That argument has to be a string or an array.
2. If the console object exists (because we are on a good browser or on node.js), it applies its input to `teishi.s` (only if the input is an array, otherwise it uses the input itself) and then prints it to the console.
3. Always returns false.

## Installation

teishi depends on [dale](https://github.com/fpereiro/dale)

teishi is written in Javascript. You can use it in the browser by sourcing dale and the main file:

```html
<script src="dale.js"></script>
<script src="teishi.js"></script>
```

And you also can use it in node.js. To install: `npm install teishi`

## Source code

The complete source code is contained in `teishi.js`. It is about 340 lines long.

## License

lith is written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.
