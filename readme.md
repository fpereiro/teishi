# teishi

> "A string is a string is a string." --Gertrude Stein

teishi is a tool for validating the input of functions.

teishi means "stop" in Japanese. The inspiration for the library comes from the concept of "auto-activation", which is one of the two main pillars of the Toyota Production System (according to its creator, [Taiichi Ohno](http://en.wikipedia.org/wiki/Taiichi_Ohno)).

## Usage examples

Validate the input of a function that receives two arguments, an integer (`counter`) and a function (`callback`). The second argument is optional.

```javascript
function example1 (counter, callback) {
   if (teishi.stop ('example1', [
      ['counter', counter, 'integer'],
      ['callback', callback, ['function', 'undefined'], 'oneOf']
   ])) return false;

   // If we are here, the tests passed and we can trust the input.
```

Validate the input of a function that receives two arguments, a string (`action`) which can have four possible values ('create', 'read', 'update' and 'delete'), and an integer between 0 and 100 (`limit`).

```javascript
function example2 (action, limit) {
   if (teishi.stop ('example2', [
      ['action', action, ['create', 'read', 'update', 'delete'], 'oneOf', teishi.test.equal],
      ['limit', limit, 'integer'],
      [['limit', 'page size'], limit, {min: 0, max: 100}, teishi.test.range]
   ])) return false;

   // If we are here, the tests passed and we can trust the input.
```

Validate the input of a function that receives an object with two keys, `action` and `limit`. The applicable rules are the same than those in function `example2` above.

```javascript
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

   // If we are here, the tests passed and we can trust the input.
```

## Auto-activation

Auto-activation means that a machine or process stops immediately when an error is found, instead of going on until the faults in the process make it break down completely. Let's restate this: **an auto-activated machine stops on its own when it detects an error.**

The purpose of auto-activation is twofold:
- **No defective products are made**, because every machine involved in the process checks the state of the product and will stop the whole process if any abnormality is found.
- By stopping the process on any error, the system **sharply distinguishes normal from abnormal operation**. The process cannot start again until that error is solved. Thus, errors are not ignored or dismissed, but rather brought into the light so that its root causes can be determined and eliminated.

### Auto-activation in functional programming

This idea can fruitfully be applied to code. More specifically, here's how I think it can be applied to a (mostly) functional style of programming:

- Every function is a machine. The "product" or "throughput" is the data flow that enters the function and then exits it.
- Every function checks its input according to a set of rules.
- If the function deems its input valid, it has the responsability to return valid output.
- If the function deems its input invalid, it must do three things:
   - Notify the user of the error, in the most precise terms possible.
   - Stop its own execution.
   - Return `false`.

I propose returning `false` instead of throwing an exception for the following reasons:

- An uncaught exception stops the whole program. If we want every error to stop the entire program, this approach is the most direct.
- However, if we want our code to deal with an error on its own (and allow it to take correcting measures), each call to a function that might fail must be wrapped in a try/catch block. This is extremely cumbersome.
- In contrast, using `false` to indicate invalid input is comparatively elegant and conforms to the structured data flow of a functional program.
- In practice, the overloading of a valid return value (`false`) to indicate an exception has not exerted either restriction or confusion in other libraries currently based on teishi.

Let's summarize the advantages of auto-activation, applied to code:

- **Cleaner exception handling**: functions can return a false value on receiving a false input, so you can check for a false value instead of placing a try/catch block.
- **Exception-less code**: if your program is correct, your program will never throw an exception or crash, no matter how wrong its input is. Although this doesn't reduce at all the difficulty of writing correct code, it at least offers the guarantee that no malformed input can break a properly written program.
- **Errors can't run far**: in a non-auto-activated program, an invalid input can go through many functions before making one of them crash and burn. Hence, the source of an error can be far from the exception that it provokes later. If every function checks its input, the detection of the error will be much closer to its source.
- **Meaningful error messages**: by specifying the difference between expected and actual input, error messages can convey more information. `argument [1] to myFunction must be a function` explains much more than `undefined is not a function`. If you forgot to pass a function as a second argument to another function, it is easier to just be told that you missed it, instead of debugging the first (failed) usage of that argument.
- **Raise your own bar**: most importantly, you are <del>forced</del> encouraged to clearly specify the inputs of each function. This leads to clearer code and fewer bugs.

### Auto-activation boilerplate

When I started happily applying this concept to my code (as you can see in [old versions of lith](http://github.com/fpereiro/lith/blob/866b71457a5fcabfed246a869e31e4b884bb7ead/lith.js#L105)), I found myself writing this kind of code block, over and over.

```javascript
if (type (input) !== 'array' && type (input) !== 'undefined') {
   console.log ('Input to myFunction must be either an array or undefined, but instead is', input);
   return false;
}

if (type (input) === 'array') {
   if (input.length !== 3) {
      console.log ('Input to myFunction must be an array of length 3, but instead has length', input.length, 'and is', JSON.stringify (input));
      return false;
   }
   for (var item in input) {
      if (type (input [item]) !== 'string') {
         console.log ('Each item of the input to myFunction must be a string, but instead is', input [item]);
         return false;
      }
   }
}
```

These code blocks have three parts in common:

1. Error detection.
2. Error notification.
3. Return immediately from the function, so that no further execution is performed and a false value is returned.

The repetitive parts of the three actions above are:

1. Multiple comparisons:
   - When you have a single input and many accepting values (as in the first example).
   - When you have to iterate the input to see if it matches an accepting value (as in the second example).
   - When you have to do both at the same time.
2. Error notification:
   - Writing the error message every time, such as "Input can be of type array or object but instead is".
   - Having to stringify objects and arrays when printing them for error notification purposes.
3. Returning early from the function requires to write one return clause per possible validation error.

teishi simplifies the first two parts and allows you to return false just once, at the end of all the checks you want to perform. Using teishi, the example above can be rewritten like this:

```javascript
if (teishi.stop ('myFunction', [
   ['input', input, ['array', 'undefined'], 'oneOf'],
   [teishi.t (input) === 'array', [
      function () {
         return ['input.length', input.length, 3, teishi.test.equal]
      },
      ['items of input', input, 'string', 'each']
   ]]
])) return false;
```

Auto-activated validations using teishi are 50-75% smaller (counting either lines or tokens) than the boilerplate they replace.

More importantly, teishi allows you to express rules succintly and regularly, which makes rules easier to both read and write. Its core purpose is to facilitate as much as possible the exacting task of defining precisely the input of your functions.

## Installation

teishi depends on [dale](http://github.com/fpereiro/dale)

teishi is written in Javascript. You can use it in the browser by sourcing dale and the main file:

```html
<script src="dale.js"></script>
<script src="teishi.js"></script>
```

And you also can use it in node.js. To install: `npm install teishi`

## Simple rules

The fundamental pattern of teishi is to compare a variable to an expected value and see if the variable conforms or not to our expectations. Each of these expectations conforms a `rule`. Within a `rule`:

- We will call the variable `compare`, and call the expected value `to`.
- We will also need a `name` to describe what `compare` stands for.

The most basic teishi rules have this form: `[name, compare, to]`.

### The simplest rule

Take this rule from `example1` above:

```javascript
['counter', counter, 'integer']
```

This rule enforces that `counter` will be of type `integer`. If this rule is not fulfulled, teishi will return the following error message: `counter should have as type "integer" but instead has value VALUE and type TYPE.` (with VALUE and TYPE being the value and the type of `counter`, respectively).

Things to notice here:

- The whole rule is an array with three elements.
- The `name` field is `'counter'`.
- The `compare` field is whatever the value of `counter` is.
- The `to` field is `'integer'`.

### The `multi` operator

Let's take a slightly more complex rule, also from `example1`:

```javascript
['callback', callback, ['function', 'undefined'], 'oneOf']
```

This rule enforces that `callback` will be either of type `function` or `undefined`.

Things to notice here:

- The `to` field is an array with two strings, `function` and `undefined`. This is because we have two possible `to` values we accept.
- We add a fourth element to the rule, the string `'oneOf'`. This addition ensures that `compare` should conform to *one of* the `to` values.

`'oneOf'` is an instance of the `multi` operator, which allows you to do one-to-many comparisons (`'oneOf'`), many-to-one comparisons (`'each'`) and many-to-many comparisons (`'eachOf'`). These are the three possible values for the `multi` operator:
- `'oneOf'`: when you have a single `compare` and two or more accepting values, like in the example we just saw.
- `'each'`: when you have many `compare` values and a single accepting value. For example, if we want to check that `strings` is an array of strings, we write the rule: `['strings', strings, 'string', 'each']`
- `'eachOf'`: this variant combines both `'each'` and `'oneOf'`, and it compares multiple `compare` values to multiple `to` values. For example, if we want to check that `input` is an array made of strings or integers, we write the rule: `['input', input, ['string', 'integer'], 'eachOf']`.

If no `multi` operator is present, the rule just compares a single `compare` value to a single `to` value.

### The `test` operator

Notice that so far, we've only checked the *type* of `compare`. Let's see how we can check, for example, its actual value.

Let's take this rule from `example2` above:

```javascript
['action', action, ['create', 'read', 'update', 'delete'], 'oneOf', teishi.test.equal]
```

In this rule, we state that `action` should be either `'create'`, `'read'`, `'update'` or `'delete'`.

Things to notice here:
- As in the previous example, `to` is an array of values.
- Also as in the previous example, the `multi` operator is `'oneOf'`, since we want `compare` to be equal to *one of* `'create'`, `'read'`, `'update'` and `'delete'`.
- In contrast to the previous example, we set the *test function* to `teishi.test.equal`, which is one of the five test functions bundled with teishi.

In any rule, you can add a `multi` operator, a test function, or both of them, in any order you prefer, as long as they are after the three mandatory elements of the rule (`name`, `compare` and `to`).

### Test functions

teishi comes bundled with five test functions.

#### `teishi.test.type`

`teishi.test.type` is the default test function (in these days of dynamic typing, it is remarkable how much we want our inputs to conform to certain types). This function will check the type of *any* input and return a string with one of the following values:

- `'integer'`
- `'float'`
- `'nan'`
- `'infinity'`
- `'object'`
- `'array'`
- `'regex'`
- `'date'`
- `'null'`
- `'function'`
- `'undefined'`
- `'string'`

Type detection is different to the native `typeof` operator in two ways:

- We distinguish between `object`, `array`, `regex`, `date` and `null` (all of which return `object` using `typeof`).
- We distinguish between types of numbers: `nan`, `infinity`, `integer` and `float` (all of which return `number` using `typeof`).

Please remember **that you cannot use `'number'` as a type** since teishi requires more specificity. Instead use one of `'integer'`, `'float'`, `'nan'` or `'infinity'`.

#### `teishi.test.equal`

`teishi.test.equal` checks that two elements are equal, using the `===` operator.

In javascript, when you compare complex objects (arrays and objects), the language does not compare that the value of the two objects is the same, but rather *that both objects are the same object*.

What this means is that if you compare (for example) two arrays with the same values, you will get a `false` value.

```javascript
[1, 2, 3] === [1, 2, 3] // returns false
```

Whereas if you do:

```javascript
var array = [1, 2, 3];
array === array // returns true
```

In practice, most often you will want to compare whether the values of two arrays or objects are equal.

As a result, `teishi.test.equal` will compare the values of two objects or arrays and will return `true` if their values are equal (and `false` if they are not). This kind of comparison is often named *deep equality*.

```javascript
['input', [1, 2, 3], [1, 2, 3], teishi.test.equal] // this will return true
```

Historical note: in a previous version of teishi, `teishi.test.equal` was the default test function, until after dutifully writing `teishi.test.type` in my teishi rules a few hundred times I realized that type checking was 5-10 times more prevalent than equality checks.

#### `teishi.test.notEqual`

`teishi.test.notEqual` is just like `teishi.test.equal`, but will return true if two things are **different** (and false otherwise).

#### `teishi.test.range`

`teishi.test.range` checks that `compare` is in a certain range. This function is useful for testing the range of numbers.

We've already used this function in `example2` above:

```javascript
[['limit', 'page size'], limit, {min: 0, max: 100}, teishi.test.range]
```

Here, we ensure that `limit` can be 0, 100 or any number in between.

`min` and `max` allow the `compare` value to be equal to them. In mathematical terms, they determine a *closed* line segment.

If we want `limit` to be between 0 and 100, but we don't want it to be 0 or 100, we write:

```javascript
[['limit', 'page size'], limit, {more: 0, less: 100}, teishi.test.range]
```

`more` and `less` don't allow the `compare` value to be equal to them. In mathematical terms, they determine an *open* line segment.

If you are using `teishi.test.range`, a valid `to` value is an object with one or more of the following keys: `min`, `max`, `less`, `more`.

Notice that you can mix *open* and *closed* operators. For example:

```javascript
[['limit', 'page size'], limit, {min: 0, less: 100}, teishi.test.range]
```

This rule will allow `limit` to be 0 but it won't allow it to be 100.

#### `teishi.test.match`

`teishi.test.match` checks that `compare` is a string that matches the regex specified in the `to` field.

For example, imagine we want a certain `identifier` to be a string of at least one character composed only of letters and numbers. We can determine this by using the following rule:

```javascript
[['identifier', 'alphanumeric string'], identifier, /^[0-9a-zA-Z]+$/, teishi.test.match]
```

If `compare` is not a string and `to` is not a regex, a proper error message will be displayed.

#### Writing your own test functions

Although the five functions above will take you surprisingly far, you may need to write your own test functions. While this is certainly possible and encouraged, it is an advanced topic that deserves [its own section](http://github.com/fpereiro/teishi#custom-test-functions).

### Two `names` instead of one

Notice this rule, which we've already seen before:

```javascript
[['limit', 'page size'], limit, {min: 0, max: 100}, teishi.test.range]
```

Here, `name` (the first element of the rule) is not a string, but rather an array with two strings. The purpose of the second string is to provide a verbal description of the `to` field.

In this case, if `limit` was out of range, you would get the following error message:

`limit should be in range {min: 0, max: 100} (page size) but instead is LIMIT`, where LIMIT is the actual value of `limit`.

Why didn't we do this for every rule? In practice, the `to` field is usually self-explanatory. When this is not the case, use two names instead of one. The second name will give additional information about the `to` value.

From now on we will refer to `name` as `names`.

### All you need to know about `multi`

There are a few things we haven't explained about the `multi` operator.

Let's first state a few definitions:

- `simple value`: anything that is neither an array, nor an object, nor `undefined`
- `complex value`: an array or an object
- `empty value`: either `undefined` or an empty complex array or object

**What happens if `compare` or `to` are objects instead of arrays?**

If you use an object instead of an array and `multi` goes through each of its elements, teishi will *ignore the keys* of the object and *only take into account its values*. For example, these two rules are equivalent:

```javascript
['length of input', input.length, [1, 2, 3], 'oneOf', teishi.test.equal]
```

```javascript
['length of input', input.length, {cant: 1, touch: 2, this: 3}, 'oneOf', teishi.test.equal]
```

**What happens if `compare` is a `simple value` and you set `multi` to `'each'` or `'eachOf'`?**

If `multi` is set to `'each'` or `'eachOf'`, this is the same as setting `compare` to an array with a single element. For example, these two rules will be the same.

```javascript
['input', 1, 'integer', 'each']
```

```javascript
['input', [1], 'integer', 'each']
```

**What happens if `to` is a `simple value` and you set `multi` to `'oneOf'` or `'eachOf'`?**

Same than above, `to` will be treated as an array with one element. For example, these two rules are equivalent:

```javascript
['input', input, 'integer', 'oneOf']
```

```javascript
['input', input, ['integer'], 'oneOf']
```

**What happens if `compare` is an `empty value` and you set `multi` to `'each'` or `'eachOf'`?**

If `compare` is empty and `multi` is either `'each'` or `'eachOf'`, teishi assumes that there are no values to compare, so there cannot be possibly a source of error. Hence, it will always return `true`. Here are examples of rules that will always return `true`:

```javascript
['input', undefined, 'integer', 'each']
```

```javascript
['input', [], 'integer', 'each']
```

```javascript
['input', {}, 'integer', 'each']
```

**What happens if `to` is an `empty value` and you set `multi` to `'oneOf'` or `'eachOf'`?**

If `to` is empty and `multi` is either `'oneOf'` or `'eachOf'`, teishi assumes that there are no values that `compare` can match, so there cannot be any possible way to pass the test. Hence, it will always return `false`, plus an error message. Here are examples of rules that will always return `false`:

```javascript
['input', input, undefined, 'oneOf']
```

```javascript
['input', input, [], 'oneOf']
```

```javascript
['input', input, {}, 'oneOf']
```

### Summary: teishi simple rules expressed as teishi rules

To sum up what a teishi simple rule is, let's express it in terms of teishi simple rules!

A teishi simple rule is an array.

```javascript
['teishi simple rule', rule, 'array']
```

The rule can have three to five elements.

```javascript
['length of teishi simple rule', rule.length, {min: 3, max: 5}, teishi.test.range],
```

The `names` of the rule must be either a string or an array.

```javascript
['rule name', rule [0], ['string', 'array'], 'oneOf']
```

If `names` is an array, it must have length 2 and only contain strings.

```javascript
['rule name', rule [0].length, 2, teishi.test.equal]
```

```javascript
['rule name', rule [0], 'string', 'each']
```

`compare` and `to` can be *anything*, so we don't have to write any validation rules for them!

The fourth element of the rule can be either the `multi` operator or a test function. Also, it can be `undefined`.

```javascript
['rule options', rule [3], ['string', 'function', 'undefined'], 'oneOf']
```

Same thing with the fifth element.

```javascript
['rule options', rule [4], ['string', 'function', 'undefined'], 'oneOf']
```

If the fourth element of the rule is a string, it needs to be a valid `multi` operator.

```javascript
['multi operator', rule [3], ['each', 'oneOf', 'eachOf'], 'oneOf', teishi.test.equal]
```

Same with the fifth element of the rule, in case it is a string.

```javascript
['multi operator', rule [4], ['each', 'oneOf', 'eachOf'], 'oneOf', teishi.test.equal]
```

If both the fourth and the fifth element are defined, they have to be of different types (one being a string, the other a function).

```javascript
[['type of multi operator', 'type of test function'], teishi.t (rule [3]), teishi.t (rule [4]), teishi.test.notEqual],
```

## Complex rules

There are four kinds of complex rules in teishi. Let's take a look at them.

### Nested rules

A nested teishi rule is an array containing teishi rules. If `a`, `b` and `c` are teishi rules, all of these are valid teishi rules:

```javascript
[a, b, c]
```

```javascript
[[a, b, c]]
```

```javascript
[[a], b, c]
```

`(any other concoction of arrays and a, b, c that you can imagine)`

If you check `example1` through `example3` above, you will notice that the rule passed to the main teishi functions receive an array enclosing many rules. That enclosing array is a nested rule.

A nested rule is just a sequence of rules. When teishi finds a complex rule, it will first test the first rule inside it. If the rule is valid, it will then proceed to the next rule. Otherwise, it will return `false` and display the proper error message.

### Boolean rules

If teishi finds a boolean (`true` or `false`) in place of a rule, it will interpret this result as either a valid or an invalid result. This is useful when you want to reuse your validation functions.

For example, imagine you have a function `validateWidget` that returns `true` if a `widget` is valid and `false` otherwise.

If you want to validate a `widget` as part of the validations on a certain function, you can write the following:

```javascript
function validateSomething (widget, ...) {
   if (teishi.stop ([
      // a rule here...
      // another rule here...
      validateWidget (widget),
      // more rules here...
   ])) return false;
```

When `validateSomething` is invoked, `validateWidget (widget)` will be evaluated to either `true` or `false`, so that when teishi encounters the rule, it will be a simple boolean which can make it either stop or proceed.

### Function guards

Imagine that you want to validate a certain `array`. You want `array` to be an array, and you want it to have a length of 3. So you write the following rules:

```javascript
['array', array, 'array']
```

```javascript
['array length', array.length, 3, teishi.test.equal]
```

However, if `array` is not an array, instead of getting a nice teishi error, you will get an exception! For example, if `array` is `null`, you will get an exception that says something like: `TypeError: Cannot read property 'length' of null`.

Because of [how javascript works](http://en.wikipedia.org/wiki/Eager_evaluation), as soon as teishi receives those two rules, javascript replaces `array` by `null` in the first rule and `array` by `null.length` in the second rule. Of course, this last replacement yields an exception, because `null` has no method `length`.

To prevent this, we want javascript to evaluate the elements of a rule only when teishi is about to use that rule. To do this, we wrap the *potentially dangerous rules* in a function. The function effectively guards the rules to be evaluated before we know it is safe to do so.

When teishi finds a function, it executes it and then considers the result as a rule. So, we can express these two rules as follows:

```javascript
['array', array, 'array']
```

```javascript
function () {
   return ['array length', array.length, 3, teishi.test.equal]
}
```

If `array` is `null`, when teishi is evaluating the first rule, it will find the type discrepancy, return `false` and report the problem. The second rule, wrapped in a function, will never be evaluated, and in this way no exceptions will be generated.

Now, how can we know which are *potentially dangerous rules*? All *dangerous* rules can potentially raise exceptions because of a mismatch between the expected and the actual type of the `compare` field. More specifically, exceptions can be raised when:

- `compare` references an element of an array (for example `input [0]`) but the expected array is not of type `array`.
- `compare` references a property of an object (for example `input.limit`) but the expected object is not of type `object`.
- `compare` invokes a method that is supported on a certain type (for example, `length`, which is supported for strings and arrays) but then the expected element is not of the expected type and hence does not support the method.

Function guards make teishi rules more verbose and they are not easy to grasp at first. And, as you can notice from the examples above, they have to be employed very often.

On the flip side, you will quickly learn where to write them and also quickly you will learn to ignore them while reading a set of rules.

### Conditional rules

Conditional rules allow you to enforce certain teishi rules only when a condition is met. Let's see an example:

```javascript
[teishi.t (input) === 'array', [
   function () {
      return ['input.length', input.length, 3, teishi.test.equal]
   },
   ['items of input', input, 'string', 'each']
]]
```

`teishi.t` is a simple function that returns the type of a value. When teishi is invoked, the expression `teishi.t (input) === 'array'` will be replaced by `true` or `false`, depending on the type of `input`.

When teishi encounters a rule with the form `[boolean, array]`, teishi will only use the rules contained in `array` only if `boolean` is `true`. If the boolean is `false`, teishi will skip the rules contained in array.

In the example above, if `input` is an array, teishi will execute the two rules contained in the array (one of them is contained in a function guard as well!). If `input` is of another type, these rules will be ignored.

Let's see another example:

```javascript
[
   options.port !== undefined,
   ['options.port', options.port, {min: 1, max: 65536}, teishi.test.range]
]
```

As you can see, if `options.port` is not `undefined`, the rule that specifies that `options.port` should be between 1 and 65536 will be enforced. If `options.port` is `undefined`, the rule will be ignored.

To sum up, a conditional rule:
- Is a nested rule.
- Contains exactly two rules.
- The first rule is something that evaluates to a boolean (usually a function call or a comparison).
- The second rule is an array (which can be either a nested rule or a simple rule).

When you use boolean rules (because you are using another validation function as a teishi rule), you must be careful of *conditional capture*. *Conditional capture* happens when you want to express two teishi rules in succession, but teishi thinks that you are using a conditional.

Let's see an example of conditional capture:

```javascript
[
   validateWidget (widget),
   ['sprocket', sprocket, 'object']
]
```

In your eyes, this is a nested rule containing two simple rules. However, since the nested rule is composed of two rules, the first a boolean and the second an array, teishi will interpret this a conditional. Which means that if `validateWidget (widget)` returns `false`, not only it won't return `false`, but it will also ignore the next rule! This is dangerous because if the first rule is not met, not only teishi won't stop, but it will also ignore the next rule.

Although `validateWidget` will print an error message, teishi will proceed as if no errors had been reported.

To avoid conditional capture, you need to bear in mind the following rule:

*When writing a nested rule of length 2 where the first rule is a boolean*, **wrap the second rule in a function guard**.

```javascript
[
   validateWidget (widget),
   function () {return ['sprocket', sprocket, 'object']}
]
```

By doing this, teishi will interpret the rule as a normal nested rule.

This hack has the added benefit of further dignifying the other hack (function guards).

### Summary: teishi rules expressed as teishi rules

Now that we know complex rules, we can write a teishi rule that validates teishi rules!

```javascript
[
   ['teishi rule', rule, ['function', 'boolean', 'array'], 'oneOf'],
   [teishi.t (rule) === 'array', [
      function () {
         return [
            [<conditional which will be true if this is a simple rule>, [
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
               ]],
            ]]
         ]
      }
   ]]
]
```

And there it is! This teishi rule will verify that any teishi rule is indeed valid. As a matter of fact, we will use this rule in `example.js` to validate teishi rules. The only thing I haven't specified here is the intricate conditional which I use to distinguish a simple rule from a nested one.

I wish I could use this code in teishi proper, but we can't because we need to write teishi without teishi. Such are the demands of bootstrapping. To see how teishi actually validates its input, please refer to the annotated source below.

## teishi main functions

### teishi.v

`teishi.v` is a function that receives three arguments:
- `functionName`, a string. This argument is optional.
- `rule`, which is a teishi rule (simple or complex). This argument is required.
- `apres`, an optional argument that can be set to either `true` or a function.

`rule` is a simple or complex teishi rule. We've already explained these in the previous two sections.

`teishi.v` will test that the `rule` (including any sub-rules nested within it) are enforced for the given input. If any rule returns `false`, of them fails, the function does two things:
- Report an error.
- Return `false`.

The canonical usage example of `teishi.v` is to create validation functions. For example:

```javascript
function validateWidget (widget) {
   return teishi.v (['widget', widget, 'object']);
}
```

The function above will return `true` if `widget` is an object, and `false` otherwise.

The purpose of `functionName` is to provide the name of the calling function to the error messages, to locate errors more easily. For example:

```javascript
function validateWidget (widget) {
   return teishi.v ('validateWidget', ['widget', widget, 'object']);
}
```

If `validateWidget` receives a `widget` that is not an object, teishi.v will print the following error:

`widget passed to validateWidget should have as type object but instead is WIDGET with type WIDGETTYPE`

If `functionName` hadn't been specified, the error message would be:

`widget should have as type object but instead is WIDGET with type WIDGETTYPE`

Finally, let's explain `apres`. `apres` is a variable that determines what is to be done if `teishi.v` finds an error.

When `apres` is set to `true`, if `teishi.v` finds an error, instead of reporting it and returning `false`, *it returns the error message itself*. By doing this, you let the function calling `teishi.v` to capture the error message and decide if it should be printed or not to the user. Sometimes it is useful to use teishi's machinery to to find out whether a given condition is matched or not, without having to report an error. I had to use this functionality in lith, when checking whether a given input was of a [certain kind](https://github.com/fpereiro/lith/blob/9bdb176118026607f2c047a3b315954fcbd111d5/lith.js#L58) or of [some other kind](https://github.com/fpereiro/lith/blob/9bdb176118026607f2c047a3b315954fcbd111d5/lith.js#L61). If it belonged to neither kind, the error message would be reported, otherwise it wouldn't.

For certain situations, you might want to do some other thing with the error message. For example, if you are validation an HTTP request, you might want to write the error into the response object. This is where you can set `apres` to a function that receives the `error` as its sole argument:

```javascript
function (request, response) {
   teishi.v (['id', response.body.id, 'integer'], function (error) {
      response.end (error);
   });
}
```

In the case above, the error will not be printed to the console, but rather it will be written to the `response`.

### teishi.stop

`teishi.stop` takes the same arguments as `teishi.v`.

The main difference between `teishi.v` and this function is that when `teishi.stop` finds an error, it returns `true` and when it finds no errors, it returns `false`. Let's state it again: **teishi.stop returns FALSE if there were NO validation errors**.

`teishi.stop` exists because of the following pattern:

```javascript
if (teishi.stop ('myFunction', [
   // here be rules
   // and more rules
])) return false;
```

teishi already does two things for us: a) multiple comparisons; b) automatic error messages. The final thing we need to do to have properly auto-activated code is to return `false` when we find an error. If we were to do this with `teishi.v`, you would use the following pattern:

```javascript
if (teishi.v ('myFunction', [
   // here be rules
   // and more rules
]) === false) return false;
```

Or this other pattern, which is shorter but error-prone:

```javascript
if (! teishi.v ('myFunction', [
   // here be rules
   // and more rules
])) return false;
```

Thanks to `teishi.stop`, we can get rid of the `=== false` or the `!` in the examples above. There is no way, however, to get rid of the conditional wrapping the call to `teishi.stop`, nor a way of omitting the `return false`. The above pattern is the most succint auto-activation code you can get from teishi.

If `apres` set to `true` and a validation error is found, the error will be lost, since `teishi.stop` only returns `true` or `false`. This is useful for when you want to check the absence of a condition, but you don't consider this absence to be an error, just a result that will control the flow of your program. Here's [an example](https://github.com/fpereiro/lith/blob/9bdb176118026607f2c047a3b315954fcbd111d5/lith.js#L167).

If `apres` is set to a function and a validation error is found, you can still do something meaningful with the error. For example:

```javascript
function (request, response) {
   if (teishi.stop (['id', response.body.id, 'integer'], function (error) {
      response.end (error);
   })) return false;
}
```

## Helper functions

teishi relies on eight helper functions which can also be helpful beyond the domain of error checking. You can use these functions directly in your code.

### teishi.t

`teishi.t` (short for `teishi.type`) takes a single argument and returns a string indicating the value of that argument.

The possible types are:
- `'integer'`
- `'float'`
- `'nan'`
- `'infinity'`
- `'object'`
- `'array'`
- `'regex'`
- `'date'`
- `'null'`
- `'function'`
- `'undefined'`
- `'string'`

### teishi.s and teishi.p

Two very useful javascript functions, `JSON.stringify` and `JSON.parse`, throw an exception if they receive an invalid input.

In keeping with the principle of exception-less code, teishi provides two wrappers to these functions:
- `teishi.s`, which wraps `JSON.stringify`.
- `teishi.p`, which wraps `JSON.parse`.

If they receive invalid input, these two functions will return `false` instead of throwing an exception. If the input is valid, they will return the output of `JSON.stringify` and `JSON.parse`, respectively.

### teishi.simple and teishi.complex

`teishi.simple` takes an `input` and returns `true` if it's a simple object (anything but an array or an object).

`teishi.complex` takes an `input` and returns `true` if it's a complex object (array or object).

### teishi.c

`teishi.c` (short for `teishi.copy`) takes a complex input (either an array or an object) and returns a copy. Also, if there are circular references in that input, it will replace them with the string `'[Circular Reference]'`.

This function is useful when you want to pass an array or object to a function that will modify it *and* you want the array or object in question to remain modified outside of the scope of that function. [javascript passes objects and arrays by reference](http://stackoverflow.com/questions/13104494/does-javascript-pass-by-reference/13104500#13104500), so in this case you need to copy the array or object to avoid side effects.

### teishi.time

A function that returns the current date in milliseconds.

### teishi.l

`teishi.l` (short for `teishi.log`) serves the noble purpose of printing output to the console. All teishi functions print error messages through this function.

Why use `teishi.l` instead of `console.log`?
- Output comes in pretty colors, thanks to [cutting edge 1980s technology](http://en.wikipedia.org/wiki/ANSI_escape_code).
- Complex values (arrays and objects) are expanded, so you can print nested objects without having to stringify them.
- It prints a time offset that can be helpful when profiling code.
- You save three keystrokes every time you invoke this function.

`teishi.l` takes one or more arguments, of any type. If the first argument is a string, and there's more than one argument passed to `teishi.l`, the first argument will be treated as a `label`, which is just some text with a different background color, followed by a colon (`:`).

It is important to notice that colorized output will only be present in node.js, since there's no standard way of giving format to the javascript console in browsers.

If you want to send the output of `teishi.l` to a logfile, the color codes will bother you. In this case, invoke instead `teishi.lno` (short for **l**og with **no** colors), which is a minimal wrapper around `teishi.l`.

## Custom test functions

What if the five test functions provided with teishi are not enough? Well, you can write your own custom test functions! Earlier I mentioned that this is an advanced topic. However, if you've made it through the readme, you are ready to do this.

To dispel your fears, here's the code of `teishi.test.type`, the most useful test function in teishi:

```javascript
teishi.test.type = teishi.makeTest (
   function (a, b) {return teishi.t (a) === b},
   ['should have as type', ['with type', teishi.t]]
);
```

To create a test function, you need to invoke the function `teishi.makeTest`. This function takes two arguments:
- `fun`, a function that takes two arguments and returns `true` or `false`. These two arguments will be, as you might imagine, the `compare` and the `to` of each rule.
- `clauses`, which can be one of the following:
   - a string (`shouldClause`)
   - an array containing a `shouldClause`
   - an array containing a `shouldClause` and a `finalClause`

`shouldClause` is required, but `finalClause` is optional. In fact, of all five teishi test functions, only `teishi.test.type` uses a `finalClause`.

The `shouldClause` is the string that teishi will use to specify what kind of validation error was encountered. For example, the `shouldClause` of `teishi.test.type` is `'should have as type'`. In the error message below, the `shouldClause` is responsible for the bolded text:

input **should have as type integer** but instead is INPUT with type INPUTTYPE

The `finalClause` is responsible for the final part of the error message. It is displayed at the end of the error, after the `compare` value. For example, in `teishi.test.type`, the `finalClause` is `['with type', teishi.t]`. In the error message below, the `finalClause` is responsible for the bolded text:

input should have as type integer but instead is INPUT **with type INPUTTYPE**

The `finalClause` can be any of the following:
- `undefined`
- a string or function
- an array containing one or more strings/functions

When you place a function in the `finalClause`, that function will be evaluated with `compare` and `to` as its arguments. This is why we put `teishi.t` in the `finalClause`, so that `teishi.t` will receive `compare` as argument and return its type.

Earlier I said that `fun` can return either `true` or `false`, depending on the result of the validation. However, what happens if `fun` receives invalid arguments altogether? In this case, `fun` can return a special error message, in the form of an array containing text.

To illustrate this, let's take at look at the slightly more intimidating `teishi.test.match`:

```javascript
teishi.test.match = teishi.makeTest (function (a, b) {
   if (teishi.t (a) !== 'string') {
      return ['Invalid comparison string passed to teishi.test.match. Comparison string must be of type string but instead is', a, 'with type', teishi.t (a)];
   }
   if (teishi.t (b) !== 'regex') {
      return ['Invalid regex passed to teishi.test.match. Regex must be of type regex but instead is', b, 'with type', teishi.t (b)];
   }
   return a.match (b) !== null;
}, 'should match');
```

As you can see, if `teishi.test.match` receives a `compare` field that is not a string, or a `to` field that is not a regex, the `fun` will return custom error messages that are more illustrative than the standard one.

When teishi invokes `fun`, it will treat both `false` and a custom error message as indication that the test failed. The only difference between `false` and an error message is that when `false` is returned, the standard error message will be printed, whereas if an error is returned, the error itself will be printed.

The purpose of returning a custom error message is because this kind of error implies a programming error on the way that the teishi rules were written. If, for example, `teishi.test.match` is invoked with a non-string argument, this is because your function didn't check the type of the input before. For this category of errors, the default error message would be misleading, so that's why we print custom errors.

For more information, please refer to the annotated source code below, where I describe `teishi.makeTest` and all the test functions in detail.

## Source code

The complete source code is contained in `teishi.js`. It is about 360 lines long.

Below is the annotated source.

```javascript
/*
teishi - v3.0.3

Written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.

Please refer to readme.md to read the annotated source.
*/
```

### Setup

We wrap the entire file in a self-executing lambda function. This practice is usually named *the javascript module pattern*. The purpose of it is to wrap our code in a closure and hence avoid making our local variables exceed their scope, as well as avoiding unwanted references to local variables from other scripts.

```javascript
(function () {
```

Since this file must run both in the browser and in node.js, we define a variable `isNode` to check where we are. The `exports` object only exists in node.js.

```javascript
   var isNode = typeof exports === 'object';
```

We require [dale](http://github.com/fpereiro/dale).

```javascript
   var dale   = isNode ? require ('dale') : window.dale;
```

This is the most succinct form I found to export an object containing all the public members (functions and constants) of a javascript module.

```javascript
   if (isNode) var teishi = exports;
   else        var teishi = window.teishi = {};
```

### Helper functions

We start by defining `teishi.t`, by far the most useful function of the bunch. This function is inspired on [Douglas Crockford's remedial type function](http://javascript.crockford.com/remedial.html).

The purpose of `teishi.t` is to create an improved version of `typeof`. The improvements are two:

- Distinguish between `object`, `array`, `regex`, `date` and `null` (all of which return `object` in `typeof`).
- Distinguish between types of numbers: `nan`, `infinity`, `integer` and `float` (all of which return `number` in `typeof`).

`type` takes a single argument (of any type, naturally) and returns a string which can be any of: `nan`, `infinity`, `integer`, `float`, `array`, `object`, `function`, `string`, `regex`, `date`, `null` and `undefined`.

```javascript
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
         if (Object.prototype.toString.call (value) === '[object Date]')   type = 'date';
         if (Object.prototype.toString.call (value) === '[object Array]')  type = 'array';
         if (Object.prototype.toString.call (value) === '[object RegExp]') type = 'regex';
      }
      return type;
   }
```

`teishi.s` and `teishi.p` are wrappers around `JSON.stringify` and `JSON.parse`, respectively. The only difference between these functions and their `JSON` counterparts is that if they receive invalid output, they will return `false` instead of throwing an exception.

```javascript
   teishi.s = function () {
      try {return JSON.stringify.apply (JSON.stringify, arguments)}
      catch (error) {return false}
   }

   teishi.p = function () {
      try {return JSON.parse.apply (JSON.parse, arguments)}
      catch (error) {return false}
   }
```

`teishi.simple` and `teishi.complex` return `false`/`true` (respectively) if their `input` is a complex value (array or object) and `true`/`false` otherwise.

```javascript
   teishi.simple = function (input) {
      var type = teishi.t (input);
      return type !== 'array' && type !== 'object';
   }

   teishi.complex = function (input) {
      return ! teishi.simple (input);
   }
```

`teishi.c` does two things: 1) copy an input; 2) eliminate any circular references within the copied input.

The "public" interface of the function (if we allow that distinction) takes a single argument, the `input` we want to copy. However, we define a second "private" argument (`seen`) that the function will use to pass information to recursive calls.

This function is recursive. On recursive calls, `input` won't represent the `input` that the user passed to the function, but rather one of the elements that are contained within the original `input`.

```javascript
   teishi.c = function (input, seen) {
```

If `input` is not an array or object, we just return the `input` itself.

```javascript
      if (teishi.simple (input)) return input;
```

`seen` is where we store the information needed to detect circular references. For any given `input`, `seen` will contain a reference to all arrays and objects that *contain* the current input. For example, if you have an array `a` (the outermost element) which contains an object `b`, and that object `b` contains an array `c`, these will be the values of `seen`:

`When processing a: []`

`When processing b: [a]`

`When processing c: [a, b]`

Now imagine that `c` contains a reference to `a`: this would be a circular reference, because `a` contains `c` and `c` contains `a`. What we want to do here is replace the reference to `a` within `c` to a string, to eliminate the reference.

On the initial (non-recursive) call to the function, `seen` will be `undefined`. Because of how [`dale.do` works](http://github.com/fpereiro/dale#daledo), if `seen` is `undefined`, it will be initialized to an empty array.

If `seen` is already an array, it will be replaced by a new array with the same elements. We do this to create a *local copy* of `seen` that will only be used by the instance of the function being executed (and no other parallel recursive calls).

Why do we copy `seen`? Interestingly enough, for the same reason that we write this function: arrays and objects in javascript are passed by reference. If many simultaneous recursive calls received `seen`, the modifications they will do to it will be visible to other parallel recursive calls, and we want to avoid precisely this.

The detection of circular references in `teishi.c` is best thought of as a path in a graph, from container object to contained one. For any point in the graph, we want to have the list of all containing nodes, and verify that none of them will be repeated. Any other path through the graph is what I tried to convey by *parallel recursive function call*.

```javascript
      seen = dale.do (seen, function (v) {return v});
```

We initialize the `output` variable to either an empty array or object, depending on the type of input.

```javascript
      var output = type === 'array' ? [] : {};
```

We iterate through the elements of `input`.


```javascript
      dale.do (input, function (v, k) {
```

For the purposes of detecting and eliminating circular references, we first consider arrays and objects first.

```javascript
         if (teishi.complex (v)) {
```

We loop through the elements of `seen` and check if `v` (an array/object contained within `input`) is in the list of arrays/objects that *contain* `input`. If that's the case, the iteration will return `true`, stop the process and activate the conditional below.

```javascript
            if (dale.stopOn (seen, true, function (v2) {return v === v2})) {
```

If we are here, we have detected a circular reference. `v` shouldn't be contained in `input`, since it contains either `input` or another element that contains `input`.

We will replace `v` by a string indicating a circular reference.

You may ask: wouldn't doing this destroy the original `v`, which also *contains* `input`? I've asked myself that question, too. But it turns out that javascript passes arrays and objects by reference *as long as you don't replace them by a new object*. For example:

```var a = [];```

```var b = a;```

```a.push (1); // b will now be [1]```

```b = []; // a will still be [1]```

Ok, back to the code. We eliminate the reference to `v` within `input`.

```javascript
               v = '[Circular Reference]';
            }
```

If `v` is a complex object but it is not a circular reference, we push `v` into `seen`.

```javascript
            else seen.push (v);
         }
```

For every element (simple and complex) inside `input`, we make a recursive call to `teishi.c`, passing `v` and `seen`. We set the result of this to the corresponding element in `output`.

If the element in question is a simple value, it will be returned. If it is a complex value, `teishi.c` will return us a copy of that complex value, stripped of circular references.

```javascript
         output [k] = teishi.c (v, seen);
      });
```

We return the output. There's nothing else to do, so we close the function.

```javascript
      return output;
   }
```

We define `teishi.time`, which will return the current date in milliseconds.

```javascript
   teishi.time = function () {return Date.now ()}
```

We define `ms`, a local variable that holds the current date measured in milliseconds. This will be useful for `teishi.l`, which will be defined below.

```javascript
   var ms = teishi.time ();
```

We will now define `teishi.l` which is teishi's wrapper for console.log. The improvements are:
- Colors.
- Expansion of nested arrays and objects.
- Time offset for profiling purposes.

```javascript
   teishi.l = function () {
```

We define two local variables:
- `label` will hold a value only if the first argument passed to `teishi.l` is a string.
- `lastColor` will hold the last color used to paint a string of text, to avoid the same color being used to paint adjacent sections of text.

```javascript
      var label;
      var lastColor;
```

The magic of `teishi.l`'s colors is done through [ANSI escape codes](http://en.wikipedia.org/wiki/ANSI_escape_code). We will define a local object `ansi` which will contain three constants and two functions.

`ansi.bold` will bold the text after it, `ansi.end` will remove all format from the text after it and `ansi.white` will make white the text after it.

```javascript
      var ansi = {
         end:   isNode ? '\033[0m'  : '',
         bold:  isNode ? '\033[1m'  : '',
         white: isNode ? '\033[37m' : '',
```

Notice that if we are in the browser, all of these variables will contain an empty string.

We will use six colors in teishi: red, green, yellow, blue, magenta and cyan. We will skip white because it is too plain, and black because it is hard to read.

`ansi.color` is the function that will return the ANSI codes for coloring text using one of the six colors above, chosen randomly. If the function receives `true` as its argument, it will return a code for coloring the *background* of the text, which is useful for the `label`.

```javascript
         color: function (reverse) {
```

If we are in the browser, we return an empty string.

```javascript
            if (! isNode) return '';
```

We set a local variable `color` to the value of `lastColor`. We then set it to a number between 1 and 6, until it's different from `lastColor`. We then set `lastColor` to `color`. The purpose of this sequence is to ensure that `lastColor` changes to a new value between 1 and 6.

```javascript
            var color = lastColor;
            while (lastColor === color) color = Math.round (Math.random () * 5 + 1);
            lastColor = color;
```

We return the corresponding ANSI codes for coloring either text or background, depending on whether `reverse` is set or not.

```javascript
            return '\033[' + (reverse ? '4' : '3') + color + 'm';
         }
      }
```

We define a function `inner` that we will apply recursively to the `arguments`. The reason for writing a function here is that we want to recurse over complex elements, such as arrays and objects.

The function takes two arguments: `value`, the value to be printed, and `recursive`, a flag that indicates whether we are in a recursive invocation of the function.

```javascript
      function inner (value, recursive) {
```

`inner` will `return` the output of a `dale.do` loop, iterating over the `value`.

```javascript
         return dale.do (value, function (v, k) {
```

For every item in `value`, we'll note its type.

```javascript
            var type = teishi.t (v);
```

If a) we are in a non-recursive (initial) call to `inner`, b) we are iterating the first element of `value`, c) this element is either a string or an integer, and d) there's more than one element in value, we'll set the current value as the `label` and return an empty string.

```javascript
            if (! recursive && k === 0 && (type === 'string' || type === 'integer') && value.length > 1) {
               label = v;
               return '';
            }
```

If the element being iterated is a string and we are in a recursive call to `inner`, we surround the element with single quotes. If we did this on the initial call to `inner`, the output of `teishi.l ('Hey', 'there')` would be `'Hey', 'there'`, whereas what we want is to get `Hey there`. Another way of seeing this is that we treat differently strings that are within objects or arrays.

```javascript
            if (type === 'string' && recursive) v = "'" + v + "'";
```

If the element is an array or object, we invoke `inner` with the element as the `value` and `true` as `recursive`, and set the element to the value returned by `inner`.

```javascript
            if (teishi.complex (v)) v = inner (v, true);
```

If the element is an object, we also want to print its key `k`, using the format `key: value`.

Now, in javascript, the key of an object can be any string, but if you use a key that contains non-alphanumeric characters, you need to surround it by quotes to be able to use it without producing a syntax error.

```javascript
// invalid
{
   !@#@&$*: 'wow'
}
```

```javascript
// valid
{
   '!@#@&$*': 'wow'
}
```

We prepend the element with a color code and then append an ANSI code to clear all formatting.

```javascript
            v = ansi.color () + v + ansi.white;
```

If the element is an array or object, we surround it with angle/curly brackets, taking care of making the brackets white.

```javascript
            if (type === 'array')  v = ansi.white + '[' + v + ansi.white + ']';
            if (type === 'object') v = ansi.white + '{' + v + ansi.white + '}';
```

If `value` (the outer element) is an object, we place the key (colored with `ansi.color`) followed by a colon, a space and `v`. If the key contains non-alphanumeric characters, we will surround it with quotes so that the output of teishi.l is a properly formatted object.

```javascript
            if (teishi.t (value) === 'object') v = ansi.color () + (k.match (/^[0-9a-zA-Z_]+$/) ? k : "'" + k + "'") + ': ' + v;
```

There's nothing else to do, so we return the element.

```javascript
            return v;
```

Before returning the result of the `dale.do` loop, we join this result with either a comma and a space (`, `) or a single space, depending on whether we are on a recursive call or not. This, along with the conditional quoting of strings within the `dale.do` loop, allows us to treat differently the outermost arguments of `teishi.l`.

```javascript
         }).join (recursive ? ', ' : ' ');
      }
```

Here, we first copy the `arguments` into an array. We then pass that array to `teishi.c`, which will return a copy that will eliminate all circular references. We then pass that array to `inner`, and store the result in a local variable `output`.

```javascript
      var output = inner (teishi.c ([].slice.call (arguments)));
```

We print the following:
- The current time in milliseconds minus `ms` (the time in milliseconds when teishi was initialized), which will yield a time offset.
- The `label`, with a random color as background (notice that we do this only if we are not in the browser).
- The `output`, bolded.
- A period at the end.

```javascript
      console.log ('(' + (teishi.time () - ms) + 'ms)', ansi.bold + (label ? ansi.color (true) + label + ':' + ansi.end : '') + ansi.bold + output + ansi.end);
```

We return `false`, since this allows calling functions to print an error and return `false` in the same line. For example: `return teishi.l ('This is an error')`.

There's nothing else to do after this, so we close the function.

```javascript
      return false;
   }
```

We add `teishi.lno`, a function that by setting `isNode` to false, will always print output without any ANSI color codes.

```javascript
   teishi.lno = function () {isNode = false; teishi.l.apply (teishi.l, arguments)}
```

### Test functions

`teishi.makeTest` is a function that will *create* test functions. The common elements of every test function are wired into this function. This simplifies the test functions.

The function receives two arguments, `fun` and `clauses`.

```javascript
   teishi.makeTest = function (fun, clauses) {
```

If `fun` is not a function, we print an error and return `false`.

```javascript
      if (teishi.t (fun) !== 'function') {
         return teishi.l ('teishi.makeTest', 'fun passed to teishi.makeTest should be a function but instead is', fun, 'with type', teishi.t (fun));
      }
```

`clauses` can be either a string (if we only specify a `shouldClause` or an array (which allows us to also specify a `finalClause`). To merge both cases into one, if `clauses` is a string we wrap it in an array.

```javascript
      if (teishi.t (clauses) !== 'string') clauses = [clauses];
```

We check that `clauses` is an array and that `clauses [0]` is a string. If any of these checks fails, we print an error and return `false`.

```javascript
      if (teishi.t (clauses) !== 'array') {
         return teishi.l ('teishi.makeTest', 'clauses argument passed to teishi.makeTest should be an array but instead is', clauses, 'with type', teishi.t (clauses));
      }
      if (teishi.t (clauses [0]) !== 'string') {
         return teishi.l ('teishi.makeTest', 'shouldClause passed to teishi.makeTest should be a string but instead is', clauses [0], 'with type', teishi.t (clauses [0]));
      }
```

If `clauses [1]` is not `undefined` and not an array, we wrap it in an array. We then ensure that it is composed of strings or functions. If that's not the case, we print an error and return `false`.

```javascript
      if (clauses [1] !== undefined) {
         if (teishi.t (clauses [1]) !== 'array') clauses [1] = [clauses [1]];

         var clausesResult = dale.stopOnNot (clauses [1], true, function (v) {
            if (teishi.t (v) === 'string' || teishi.t (v) === 'function') return true;
            return teishi.l ('teishi.makeTest', 'Each finalClause passed to teishi.makeTest should be a string or a function but instead is', v, 'with type', teishi.t (v));
         });
         if (clausesResult !== true) return;
      }
```

If we reach this point, both `fun` and `clauses` are valid. Below is the actual test function that will be returned by `teishi.makeTest`.

This function takes four to six arguments:
- `functionName`, which is an (optional) argument that is passed to `teishi.v` and `teishi.stop`, used to identify the calling function.
- `names`, the names of the `compare` and the `to` arguments, the latter being optional.
- `compare`, the compared value.
- `to`, the reference value.
- `eachValue`, which is the original `compare` value in a rule that has `multi` set to `'each'` or `'eachOf'`.
- `ofValue`, which is the original `to` value in a rule that has `multi` set to `'oneOf'` or `'eachOf'`.

```javascript
      return function (functionName, names, compare, to, eachValue, ofValue) {
```

Notice there's no validation of the arguments in this function. This is for two reasons:
- We already validated the input of teishi.makeTest above.
- This function will be invoked directly by `teishi.v` and `teishi.stop`. We can trust that these two functions will pass their input in a trustworthy (error-free) way, so we don't validate inputs coming from them.

We create a local variable `result` where we store the result of applying the test to `compare` and `to`.

```javascript
         var result = fun.apply (fun, [compare, to]);
```

If the test was valid, we return `true`. If the test returned an array, it is an error. We return it, since we will let `teishi.v` and `teishi.stop` take care of it.

```
         if (result === true) return true;
         if (teishi.t (result) === 'array') return result;
```

If we are here, `result` is equal to `false`. We found a validation error! Below we create an array which will contain the error message.

The block below, although tedious to read, is best explained by reading the code in detail. By adding these elements in order, we will have a specific error message, built from generic blocks.

```javascript
         var error = [];

         if (eachValue !== undefined)  error.push ('each of the');
         if (names [0])                error.push (names [0]);
         if (functionName)             error = error.concat (['passed to', 'function ' + functionName]);
                                       error.push (clauses [0]);
         if (ofValue !== undefined)    error.push ('one of');
             ofValue !== undefined ?   error.push (ofValue) :      error.push (to);
         if (names [1])                error.push ('(' + names [1] + ')');
             eachValue !== undefined ? error.push ('but one of') : error.push ('but instead');
         if (eachValue !== undefined)  error.push (eachValue);
                                       error = error.concat (['is', compare]);
```

We add the elements of `finalClause` to the error. If any of them is a function, we invoke it passing `compare` and `to` as arguments, and use that result in the error message.

```javascript
         error = error.concat (dale.do (clauses [1], function (v) {
            if (teishi.t (v) !== 'function') return v;
            else return v.apply (v, [compare, to]);
         }));
```

We return the `error`.

```javascript
         return error;
      }
   }
```

We create the object that will contain the test functions bundled with teishi.

Notice that all of these functions:
- Are created by invoking `teishi.makeTest`.
- All of them receive two arguments, `compare` and `to`.
- All of them return either `true`, `false`, or an array containing an error message.

```javascript
   teishi.test = {
```

`teishi.test.type` uses a very simple `fun` and defines both a `shouldClause` and a `finalClause`. Notice that the second `finalClause` is the function `teishi.t`.

```javascript
      type:     teishi.makeTest (
         function (a, b) {return teishi.t (a) === b},
         ['should have as type', ['with type', teishi.t]]
      ),
```

`teishi.test.equal` uses the most complex `fun` of all test functions, because it tests for deep equality if its inputs are arrays or objects.

```javascript
      equal:    teishi.makeTest (function (a, b) {
```

We define a function called `inner`. We name it because the function is recursive, so it needs a name to call itself. Also, we wrap the function in parenthesis to execute it immediately. `inner` receives two arguments, which are the two objects we're comparing.

```javascript
         return (function inner (a, b) {
```

If `a` and `b` are simple, we compare them with `===` and return the result.

```javascript
            if (teishi.simple (a) && teishi.simple (b))      return a === b;
```

If we are here, at least one of the arguments is complex. If their type is different, we return `false`, since they can't be equal.

```javascript
            if (teishi.t (a) !== teishi.t (b)) return false;
```

We loop through the elements of `a`.

```javascript
            return dale.stopOn (a, false, function (v, k) {
```

Here `v` is a given element of `a`, and `k` is the key of that element (if `a` is an array, `k` will be a number, and if `a` is an object, `k` will be a string). We invoke `inner` recursively passing it `v` and `b [k]`, the latter being the corresponding element to `v` in `b`.

```javascript
               return inner (v, b [k]);
            });
```

We invoke `inner` passing `a` and `b`. We then close the function and specify the `shouldClause`.

```javascript
         } (a, b))
      }, 'should be equal to'),
```

`teishi.test.notEqual` is almost identical to `teishi.test.equal`, because their `fun`s are almost identical. The only difference between them is in the third line of the `fun`, where we add a `!` to invert the result returned by `inner`.

Their `shouldClause`s also differ by one `'no'`.

Although defining `simple` and `inner` outside of the test functions would eliminate copypasting and save about five lines, I feel that in this particular case, it is more elegant to duplicate the code.

```javascript
      notEqual: teishi.makeTest (function (a, b) {
         return ! (function inner (a, b) {
            if (teishi.simple (a) && teishi.simple (b)) return a === b;
            if (teishi.t (a) !== teishi.t (b)) return false;
            return dale.stopOn (a, false, function (v, k) {
               return inner (v, b [k]);
            });
         } (a, b))
      }, 'should not be equal to'),
```

`teishi.test.range` will do some validation checks to its inputs, namely: `b` should be an object, which can be empty or contain the following keys: `min`, `max`, `less` and `more`.

```javascript
      range:    teishi.makeTest (function (a, b) {
         if (teishi.t (b) !== 'object') {
            return ['Range options object must be an object but instead is', b, 'with type', teishi.t (b)];
         }
```

If there are no conditions, we return `true`.

```javascript
         if (teishi.s (b) === '{}') return true;
```

We iterate through the keys of `b` and validate them.

```javascript
         return dale.stopOnNot (b, true, function (v, k) {
            if (k !== 'min' && k !== 'max' && k !== 'less' && k !== 'more') {
               return ['Range options must be one of "min", "max", "less" and "more", but instead is', k]
            }
```

We test the corresponding condition and return the result. We close the `fun` and add the `shouldClause`.

```javascript
            if (k === 'min')  return a >= v;
            if (k === 'max')  return a <= v;
            if (k === 'less') return a < v;
            if (k === 'more') return a > v;
         });
      }, 'should be in range'),
   }
```

`teishi.test.match`, like the previous function, also does some validation on its inputs. We need `a` to be a string, and `b` to be a regex.

```javascript
      match:    teishi.makeTest (function (a, b) {
         if (teishi.t (a) !== 'string') {
            return ['Invalid comparison string passed to teishi.test.match. Comparison string must be of type string but instead is', a, 'with type', teishi.t (a)];
         }
         if (teishi.t (b) !== 'regex') {
            return ['Invalid regex passed to teishi.test.match. Regex must be of type regex but instead is', b, 'with type', teishi.t (b)];
         }
```

We check whether `a` matches `b`. We then close the `fun` and add the `shouldClause`.

```javascript
         return a.match (b) !== null;
      }, 'should match')
   }
```

### Validation

To ensure that a given teishi rule is valid, we will now define `teishi.validateRule`.

Although this function can be used directly in your code, you will probably never need to use it directly, since the main functions of teishi (`teishi.v` and `teishi.stop`) invoke this function.

`teishi.validateRule` takes a single argument (`rule`).

```javascript
   teishi.validate = function (rule) {
```

We store the type of `rule` in a local variable `ruleType`.

```javascript
      var ruleType = teishi.t (rule);
```

If `ruleType` is `function` or `boolean`, the rule is valid, so we return `true`.

```javascript
      if (ruleType === 'function' || ruleType === 'boolean') return true;
```

If `ruleType` is not an array, the rule is invalid. We return an error message.

```javascript
      if (ruleType !== 'array') {
         return ['each teishi rule must be an array or boolean or function but instead is', rule, 'with type', ruleType];
      }
```

If we are at this point, `rule` is an array.

We now need to determine whether we are dealing with a simple rule or not. If we are *not* dealing with a simple rule, we assume that the array is a complex rule (either a nested or a conditional rule) and return `true`.

You may ask: why don't we do a deep check for the equality of a nested or conditional rule? Since `teishi.v` and `teishi.stop` are recursive functions, when they find a conditional or nested rule, they invoke themselves recursively. When they do so, they validate the inner content of a complex rule.

For example, if `teishi.validateRule` receives an array representing invalid rule (such as `[222, 333, /regex!/]`), it will return `true`. However, when `teishi.v` treats each of the elements of the rule as a rule and passes them again to `teishi.validateRule`, we will obtain an error message saying that `222` cannot be a valid teishi rule.

By just validating rules to one level of deepness, we also make the code efficient, because we don't validate nested rules over and over, just once, when they can be considered simple rules.

To determine whether we are dealing with a simple rule, we will check if there's a valid `names` field in it. Remember that `names` is either a string or an array containing two strings.

Our choice of `names` as the distinctive element of a teishi simple rule is straightforward: `compare` and `to` can have any type, and `options` is not required. `names`, by its possible types, is distinguishible from nested or conditional rules.

We write an intricate conditional to check that whether the rule has a `names` as its first element. If that is **not** the case, we are dealing with a complex rule, so we return `true`.

```javascript
      if (! (teishi.t (rule [0]) === 'string' || (teishi.t (rule [0]) === 'array' && rule [0].length === 2 && teishi.t (rule [0] [0]) === 'string' && teishi.t (rule [0] [1]) === 'string'))) return true;
```

If we are here, we are dealing with a simple rule.

We check that the rule has a length of three to five elements (`names`, `compare`, `to`, plus `multi`, the test function or both). If that's not the case, we return an error.

```javascript
      if (rule.length < 3 || rule.length > 5) {
         return ['Each teishi simple rule must be an array of length between 3 and 5, but instead is', rule, 'and has length', rule.length];
      }
```

Because we used the presence of a valid `names` element to check whether this rule is a simple one, if we are here, we know that `names` is valid.

We also don't need to do any checks on `compare` or `to`, since they can have any value.

If the rule has length 3, no `multi` or test function is present. We've already checked the three elements of the rule, so we return `true`.

```javascript
      if (rule.length === 3) return true;
```

We define two local variables `test` and `multi` to hold the values for the test function and the `multi` parameter.

```javascript
      var test, multi;
```

We iterate through the fourth and fifth elements of the rule. If any of these iterations returns a value that is not `true`, the loop will be stopped and the last value returned will be stored in `result`.

```javascript
      var result = dale.stopOnNot (rule.slice (3, 5), true, function (v, k) {
```

We note the type of the element.

```javascript
         var type = teishi.t (v);
```

If the element is a string, it has to be the `multi` operator. We check that it is one of `'oneOf'`, `'each'` and `'eachOf'`.

```javascript
         if (type === 'string') {
            if (v !== 'oneOf' && v !== 'each' && v !== 'eachOf') return ['Invalid multi parameter', v, '. Valid multi parameters are', ['oneOf', 'each', 'eachOf']];
```

If `multi` is already defined (because we are currently on the fifth element of the rule and the fourth one already turned out to be the `multi` operator) we return an error.

```javascript
            if (multi) return ['You can pass only one multi parameter to a teishi simple rule but instead you passed two:', rule [3], 'and', rule [4]];
```

We set `multi` to the element.

```javascript
            multi = v;
         }
```

If the element is a `function`, and `test` was already set, we return an error. Otherwise, we set `test` to the element.

```javascript
         else if (type === 'function') {
            if (test) return ['You can pass only one test function to a teishi simple rule but instead you passed two:', rule [3], 'and', rule [4]];
            test = v;
         }
```

If the element is neither a `function` nor a `string`, we return an error.

```javascript
         else return ['Elements #4 and #5 of a teishi simple rule must be either a string or a function, but element', '#' + (k + 4), 'is', v, 'and has type', type];
```

If we are here, no error were found within the current iteration. We return `true`.

```javascript
         return true;
      });
```

`result` can be either an error (because the rule is invalid) or `true` (because the rule is valid). In either case, we want to return it. After that, there's nothing else to do.

```javascript
      return result;
   }
```

### The main functions

In this section, we will define `teishi.v` and `teishi.stop`, the main functions of teishi.

`teishi.stop` is a very simple wrapper around `teishi.v`, so most of the action will revolve around `teishi.v`. Without further ado, we proceed to write this function.

```javascript
   teishi.v = function () {
```

The only required argument to `teishi.v` is `rule`, which can be either the first or the second argument. `rule` will be the second argument only if `functionName` is passed.

Since a `rule` can never be a string, and `functionName` always has to be a string, we decide that `functionName` is present if the first argument of the function is a string.

A subtle point: we set `functionName` to an empty string, instead of `undefined`. This is because, for recursive function calls, we want to have a fixed number of arguments, so as to simplify writing the recursive calls.

```javascript
      var functionName = teishi.t (arguments [0]) === 'string' ? arguments [0] : '';
      var rule         = teishi.t (arguments [0]) === 'string' ? arguments [1] : arguments [0];
```

We set `apres` to be the argument that was passed after `rule`. If no argument was passed, it will be `undefined`.

```javascript
      var apres        = teishi.t (arguments [0]) === 'string' ? arguments [2] : arguments [1];
```

Because we assume that `functionName` is defined only if the first argument is a string (and set its value to an empty string otherwise), `functionName` will be a string, so we don't need to validate it. This is similar to what happened with the validation-through-assumption of `names` we did in `teishi.validateRule`.

If an error is found, we might want to do different things with it, depending on the value of the `apres` variable. We will now define a function `reply` which is in charge of doing a set of actions that are performed when `teishi.v` finds an error.

```javascript
      var reply = function (error) {
```

If `apres` is `true`, we want to return an error message. Since the error is an array with strings, we join it into a string separated by spaces before returning it.

```javascript
         if      (apres === true)                  return error.join (' ');
```

If `apres` is a function, we pass the error to it, taking care of first joining it into a string separated with spaces. Notice that we don't `return`.

```javascript
         else if (teishi.t (apres) === 'function') apres (error.join (' '));
```

If `apres` is `undefined` (the default case), we want to print the error through `teishi.l`. We append `'teishi.v'` as the first element of the error, so that it's considered as the label of the error message. Also notice that we don't `return` from this branch of the `if`.

```javascript
         else                                      teishi.l.apply (teishi.l, ['teishi.v'].concat (error));
```

If we are here, it's because `apres` is either a function or `undefined`. We now return `false`.
         return false;
      }
```

We invoke `teishi.ValidateRule` to check that `rule` is valid, and store the result in a local variable `validation`.

```javascript
      var validation = teishi.validateRule (rule);
```

If `rule` is not well-formed, we pass the error to `reply` and `return`.

```javascript
      if (validation !== true) return reply (validation);
```

Boolean rules: if `rule` is a boolean, we return the rule itself.

```javascript
      if (teishi.t (rule) === 'boolean')  return rule;
```

Function guards: if `rule` is a function, we invoke the `rule` and pass it recursively to `teishi.v`, taking care to also pass `functionName` and `apres`.


```javascript
      if (teishi.t (rule) === 'function') return teishi.v (functionName, rule.call (rule), apres);
```

If we are here, `rule` must be an array.

If it has length zero, there are no rules to validate, hence there can't be any validation errors! We return `true`.

```javascript
      if (rule.length === 0) return true;
```

Conditional rules: if the first element of `rule` is a boolean, if `rule` has length 2, and if the second element of `rule` is an array, we treat `rule` as a conditional one.

```javascript
      if (teishi.t (rule [0]) === 'boolean' && rule.length === 2 && teishi.t (rule [1]) === 'array') {
```

If the boolean of the conditional is `false`, the second rule doesn't apply. Hence, we return `true`.

```javascript
         if (rule [0] === false) return true;
```

If we are here, the second rule within `rule` applies, so we pass it recursively to `teishi.v`.

```javascript
         else return teishi.v (functionName, rule [1], apres);
      }
```

We use again the intricate conditional from `teishi.validateRule` to determine whether this rule is **not** a simple one.

```javascript
      if (! (teishi.t (rule [0]) === 'string' || (teishi.t (rule [0]) === 'array' && rule [0].length === 2 && teishi.t (rule [0] [0]) === 'string' && teishi.t (rule [0] [1]) === 'string'))) {
```

Nested rule: we iterate the `rule` and pass each of its elements to recursive calls to `teishi.v`.

If any of these calls returns `false`, the loop is stopped and `false` is returned. If all of these calls returned `true`, we return `true` as well.

```javascript
         return dale.stopOnNot (rule, true, function (rule) {
            return teishi.v (functionName, rule, apres);
         });
      }
```

We define a local variable `test` to hold the test function that we will use. We initialize it to `teishi.test.type`, the default test function.

```javascript
      var test = teishi.test.type;
```

We define a local variable `multi`, to store the multi operator. The default value of `multi` is `undefined`.

```javascript
      var multi;
```

We iterate through the fourth and fifth elements of the rule. If one of them is a string, we set `multi` to its value. And if one of them is a function, we set `test` to its value.

```javascript
      dale.do (rule.splice (3, 5), function (v) {
         var type = teishi.t (v);
         if (type === 'string')   multi = v;
         if (type === 'function') test  = v;
      });
```

We set a local variable `result` to hold the result of the validation.

```javascript
      var result;
```

We set a local variable `names` to hold the `names` field of `rule`.

If `names` is a string, we wrap it in an array, since the test functions will be expecting `names` to be an array. For evidence of this, check that the returned function from `teishi.makeTest` (which comprises the body of every test function) directly invokes `names [0]` and `names [1]`.

```javascript
      var names = teishi.t (rule [0]) === 'array' ? rule [0] : [rule [0]];
```

We deal with a special case of `multi`: if `multi` is either `each` or `eachOf`, and the `compare` field is either `undefined`, an empty array or an empty object, we deem that there are no elements inside `compare`.

In the absence of elements to validate, we consider `rule` to be fulfilled, and return `true`.

```javascript
      if ((multi === 'each' || multi === 'eachOf') && ((teishi.t (rule [1]) === 'array' && rule [1].length === 0) || (teishi.t (rule [1]) === 'object' && Object.keys (rule [1]).length === 0) || rule [1] === undefined)) {
         return true;
      }
```

We deal with the other special case of `multi`: if `multi` is either `oneOf` or `eachOf`, and the `to` field is either `undefined`, an empty array or an empty object, we deem that there are no elements inside `to`.

In the absence of elements to compare to, we consider `rule` to be impossible to be fulfilled. Hence, we set `result` to an error.

```javascript
      if ((multi === 'oneOf' || multi === 'eachOf') && ((teishi.t (rule [2]) === 'array' && rule [2].length === 0) || (teishi.t (rule [2]) === 'object' && Object.keys (rule [2]).length === 0) || rule [2] === undefined)) {
         result = ['To field of teishi rule is', rule.to, 'but multi attribute', multi, 'requires it to be non-empty, at teishi step', rule];
      }
```

We now consider one of the "normal" cases of `multi`: when it is `undefined`.

We invoke the test function with `functionName`, `names`, `rule [1]` and `rule [2]` as arguments, and store the result in `result`.

Notice that the arguments we pass (and their order) match those of the inner function in `teishi.makeTest`. That function receives six arguments, `functionName`, `names`, `compare`, `to`, `eachValue` and `ofValue`.

As you can see, the first two match each other. `rule [1]` corresponds to `compare`, `rule [2]` corresponds to `to`. In this particular case, `eachValue` and `ofValue` are left `undefined`.

Also notice that we use `else if` instead of `if`, because we are computing `result` according to the possible values of `multi`.

```javascript
      else if (multi === undefined) {
         result = test.apply (test, [functionName, names, rule [1], rule [2]]);
      }
```

We now consider `multi === 'each'`.

```javascript
      else if (multi === 'each') {
```

We iterate through `compare` (`rule [1]`) and for each of its elements we invoke the test function.

Notice that, for any given element, the `compare` value received by the test function is the specific element of the `compare` from the rule (named `v` in the function). Notice also that we pass `compare` as the `eachValue` argument.

The purpose of `eachValue` is to provide the test function with the original value of `compare` (before being decomposed into subparts), so that the `compare` value in an error message will match that of `rule`.

If any of these tests returns something other than `true`, we stop the iteration and set result to that value. If every test returns `true`, we set result to `true`.

```javascript
         result = dale.stopOnNot (rule [1], true, function (v) {
            return test.apply (test, [functionName, names, v, rule [2], rule [1]]);
         });
      }
```

We now consider `multi === 'oneOf'`.

```javascript
      else if (multi === 'oneOf') {
```

We iterate through `to` (`rule [2]`) and for each of its elements, we invoke the test function.

The main structural difference between this block and the one above is that it will stop when it finds a test that returns `true`. This is because `oneOf` is valid as long as one of the `to` values matches the `compare` value. In contrast, `each` demands that **every** `compare` value match the `to` value.

Notice also that we pass `undefined` as the `eachValue` and `to` as the `ofValue`.

We store the result of this loop into `result`.

```javascript
         result = dale.stopOn (rule [2], true, function (v) {
            return test.apply (test, [functionName, names, rule [1], v, undefined, rule [2]]);
         });
      }
```

If we are here, `multi` equals `eachOf`. This is the last case.

```javascript
      else {
```

We iterate first through the elements of `compare` (like we did in `each` above), and stop whenever we find something that is **not** `true`. For each of the elements of `compare`, we iterate through the elements of `to`, and stop if any of the comparisons returns `true`.

```javascript
         result = dale.stopOnNot (rule [1], true, function (v) {
            return dale.stopOn (rule [2], true, function (v2) {
```

We invoke the test function passing all six arguments, including the `eachValue` and `ofValue`.

```javascript
               return test.apply (test, [functionName, names, v, v2, rule [1], rule [2]]);
            });
         });
      }
```

If `result` is `true`, `rule` is valid. We return `true`.

```javascript
      if (result === true) return true;
```

If `result` is not `true`, the `rule` is not fulfilled, hence `result` contains an error. We pass it to `reply`. We have nothing else to do, so we close the function.

```javascript
      else return reply (result);
   }
```

We now define `teishi.stop`. The purpose of this function is to invoke `teishi.v` and return `true` if an error is found and `false` otherwise.

Notice that since we apply `arguments` onto `teishi.v`, you can pass an `apres` parameter. If the `apres` parameter is a function, you can still do something meaningful with the error message.

```javascript
   teishi.stop = function () {
      return teishi.v.apply (teishi.v, arguments) === true ? false : true;
   }
```

We close the module.

```javascript
}) ();
```

## License

teishi is written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.
