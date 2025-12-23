// Type definitions for teishi 5.1.2
// Project: https://github.com/fpereiro/teishi
// Definitions by: TypeScript Community

export type TeishiType =
  | 'integer'
  | 'float'
  | 'nan'
  | 'infinity'
  | 'object'
  | 'array'
  | 'regex'
  | 'date'
  | 'null'
  | 'function'
  | 'undefined'
  | 'string'
  | 'boolean'
  | 'arguments';

export type MultiOperator = 'oneOf' | 'each' | 'eachOf';

export type RangeTo = {
  min?: number;
  max?: number;
  less?: number;
  more?: number;
};

/**
 * A test function created by teishi.makeTest
 */
export type TestFunction = (
  functionName: string,
  names: [string] | [string, string],
  compare: any,
  to: any,
  eachValue?: any,
  ofValue?: any
) => true | string[];

/**
 * Simple rule: [name, compare, to] or [name, compare, to, multi?, test?]
 * Name can be a string or [string, string] tuple for additional description
 */
export type SimpleRule =
  | [string | [string, string], any, any]
  | [string | [string, string], any, any, MultiOperator | TestFunction]
  | [string | [string, string], any, any, MultiOperator | TestFunction, MultiOperator | TestFunction];

/**
 * Conditional rule: [boolean, Rule[]]
 */
export type ConditionalRule = [boolean, Rule[]];

/**
 * A teishi rule can be:
 * - A simple rule array
 * - A boolean
 * - A function returning a rule
 * - An array of rules
 * - A conditional rule
 */
export type Rule =
  | SimpleRule
  | ConditionalRule
  | boolean
  | (() => Rule)
  | Rule[];

/**
 * Callback function for error reporting
 */
export type ApresCallback = (error: string) => void;

/**
 * Apres parameter: undefined (log to console), true (return error string), or callback
 */
export type Apres = undefined | true | ApresCallback;

export interface TestFunctions {
  /**
   * Tests if compare has the specified type
   * Default test function
   */
  type: TestFunction;

  /**
   * Tests deep equality between compare and to
   */
  equal: TestFunction;

  /**
   * Tests that compare is NOT equal to to
   */
  notEqual: TestFunction;

  /**
   * Tests that compare is within the specified range
   * @example
   * ['value', value, {min: 0, max: 100}, teishi.test.range]
   */
  range: TestFunction;

  /**
   * Tests that compare (string) matches the regex in to
   * @example
   * ['email', email, /^.+@.+\..+$/, teishi.test.match]
   */
  match: TestFunction;
}

/**
 * Get the type of a value with more granularity than typeof
 * @param value - The value to check
 * @param objectType - If true, distinguishes 'arguments' from 'object'
 * @returns The type as a string
 * @example
 * teishi.type([1, 2, 3]) // 'array'
 * teishi.type(42) // 'integer'
 * teishi.type(3.14) // 'float'
 * teishi.type(null) // 'null'
 */
export function type(value: any, objectType?: boolean): TeishiType;

/**
 * Safe JSON.stringify wrapper
 * @returns The JSON string or false if serialization fails
 */
export function str(value: any, replacer?: (key: string, value: any) => any, space?: string | number): string | false;

/**
 * Safe JSON.parse wrapper
 * @returns The parsed value or false if parsing fails
 */
export function parse(text: string, reviver?: (key: string, value: any) => any): any | false;

/**
 * Check if a value is simple (not array, object, or undefined)
 */
export function simple(input: any): boolean;

/**
 * Check if a value is complex (array or object)
 */
export function complex(input: any): boolean;

/**
 * Check if array includes a value (wrapper for indexOf)
 */
export function inc(array: any[], value: any): boolean;

/**
 * Deep copy a value, handling circular references
 * @param input - Value to copy
 * @param seen - Internal parameter for tracking circular refs
 */
export function copy<T>(input: T, seen?: any[]): T;

/**
 * Deep equality comparison
 * @returns true if values are deeply equal
 */
export function eq(a: any, b: any): boolean;

/**
 * Get the last element(s) of an array
 * @param array - The array
 * @param n - How many positions from the end (default: 1)
 * @returns The element at position array[array.length - n]
 */
export function last<T>(array: T[], n?: number): T;

/**
 * Get current timestamp or timestamp of a date
 * @param d - Optional date value
 * @returns Unix timestamp in milliseconds
 */
export function time(d?: Date | string | number): number;

/**
 * Colored console logging with timestamp
 * @returns false (for chaining with return statements)
 */
export function clog(...args: any[]): false;

/**
 * Disable Node.js mode (use browser-style output)
 */
export function lno(): void;

/**
 * Create a custom test function
 * @param fun - Function that takes (compare, to) and returns true or an error array
 * @param clauses - String or [shouldClause, finalClauses] for error messages
 * @returns A test function for use in rules
 * @example
 * const isPositive = teishi.makeTest(
 *   (a, b) => a > 0,
 *   'should be positive'
 * );
 */
export function makeTest(
  fun: (compare: any, to: any) => boolean | true | any[],
  clauses: string | [string] | [string, (string | ((compare: any, to: any) => string))[]]
): TestFunction | false;

/**
 * Validate a rule structure
 * @returns true if valid, or an error array
 */
export function validateRule(rule: Rule): true | any[];

/**
 * Main validation function
 * @param functionName - Name of the function being validated (for error messages)
 * @param rule - The validation rule(s)
 * @param apres - Error handling: undefined=console.log, true=return string, function=callback
 * @param prod - If true, skip rule validation for production performance
 * @returns true if validation passes, false otherwise
 * @example
 * if (teishi.v('myFunction', [
 *   ['name', name, 'string'],
 *   ['age', age, 'integer']
 * ]) === false) return;
 */
export function v(functionName: string, rule: Rule, apres?: Apres, prod?: boolean): boolean;
export function v(rule: Rule, apres?: Apres, prod?: boolean): boolean;

/**
 * Inverse of teishi.v - returns true if validation FAILS
 * Convenient for early return pattern
 * @example
 * if (teishi.stop('myFunction', [
 *   ['name', name, 'string'],
 *   ['age', age, 'integer']
 * ])) return false;
 */
export function stop(functionName: string, rule: Rule, apres?: Apres, prod?: boolean): boolean;
export function stop(rule: Rule, apres?: Apres, prod?: boolean): boolean;

/**
 * Built-in test functions
 */
export const test: TestFunctions;

/**
 * Production mode flag - set to true to skip rule validation
 */
export let prod: boolean;
