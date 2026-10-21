/**
 * Lightweight Zero-Dependency Assertion Library
 */

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

class Expectation {
  constructor(actual, isNot = false) {
    this.actual = actual;
    this.isNot = isNot;
  }

  get not() {
    return new Expectation(this.actual, !this.isNot);
  }

  _assert(condition, messageGenerator) {
    const passed = this.isNot ? !condition : condition;
    if (!passed) {
      const msg = messageGenerator();
      const err = new Error(msg);
      // Clean stack trace
      Error.captureStackTrace(err, this._assert);
      throw err;
    }
  }

  toBe(expected) {
    this._assert(
      Object.is(this.actual, expected),
      () => `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not to be' : 'to be'} ${JSON.stringify(expected)}`
    );
  }

  toEqual(expected) {
    this._assert(
      deepEqual(this.actual, expected),
      () => `Expected ${JSON.stringify(this.actual, null, 2)} ${this.isNot ? 'not to equal' : 'to equal'} ${JSON.stringify(expected, null, 2)}`
    );
  }

  toBeTruthy() {
    this._assert(
      Boolean(this.actual),
      () => `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not to be truthy' : 'to be truthy'}`
    );
  }

  toBeFalsy() {
    this._assert(
      !this.actual,
      () => `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not to be falsy' : 'to be falsy'}`
    );
  }

  toBeNull() {
    this._assert(
      this.actual === null,
      () => `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not to be null' : 'to be null'}`
    );
  }

  toBeDefined() {
    this._assert(
      this.actual !== undefined,
      () => `Expected value ${this.isNot ? 'to be undefined' : 'to be defined'}`
    );
  }

  toBeUndefined() {
    this._assert(
      this.actual === undefined,
      () => `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not to be undefined' : 'to be undefined'}`
    );
  }

  toBeGreaterThan(num) {
    this._assert(
      this.actual > num,
      () => `Expected ${this.actual} ${this.isNot ? 'not to be >' : 'to be >'} ${num}`
    );
  }

  toBeGreaterThanOrEqual(num) {
    this._assert(
      this.actual >= num,
      () => `Expected ${this.actual} ${this.isNot ? 'not to be >=' : 'to be >='} ${num}`
    );
  }

  toBeLessThan(num) {
    this._assert(
      this.actual < num,
      () => `Expected ${this.actual} ${this.isNot ? 'not to be <' : 'to be <'} ${num}`
    );
  }

  toBeLessThanOrEqual(num) {
    this._assert(
      this.actual <= num,
      () => `Expected ${this.actual} ${this.isNot ? 'not to be <=' : 'to be <='} ${num}`
    );
  }

  toContain(item) {
    let condition = false;
    if (typeof this.actual === 'string') {
      condition = this.actual.includes(item);
    } else if (Array.isArray(this.actual)) {
      condition = this.actual.includes(item) || this.actual.some(x => deepEqual(x, item));
    }
    this._assert(
      condition,
      () => `Expected collection ${this.isNot ? 'not to contain' : 'to contain'} ${JSON.stringify(item)}`
    );
  }

  toHaveLength(length) {
    const len = this.actual ? this.actual.length : undefined;
    this._assert(
      len === length,
      () => `Expected length ${len} ${this.isNot ? 'not to be' : 'to be'} ${length}`
    );
  }

  toMatch(pattern) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    this._assert(
      regex.test(String(this.actual)),
      () => `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not to match pattern' : 'to match pattern'} ${pattern}`
    );
  }

  toThrow(expectedMessageOrRegex) {
    let thrownError = null;
    try {
      if (typeof this.actual !== 'function') {
        throw new Error(`toThrow requires a function but received ${typeof this.actual}`);
      }
      this.actual();
    } catch (err) {
      thrownError = err;
    }

    if (!expectedMessageOrRegex) {
      this._assert(
        thrownError !== null,
        () => `Expected function ${this.isNot ? 'not to throw' : 'to throw'}`
      );
    } else if (typeof expectedMessageOrRegex === 'string') {
      this._assert(
        thrownError && thrownError.message.includes(expectedMessageOrRegex),
        () => `Expected function to throw error containing "${expectedMessageOrRegex}", got ${thrownError ? thrownError.message : 'no error thrown'}`
      );
    } else if (expectedMessageOrRegex instanceof RegExp) {
      this._assert(
        thrownError && expectedMessageOrRegex.test(thrownError.message),
        () => `Expected function to throw error matching ${expectedMessageOrRegex}, got ${thrownError ? thrownError.message : 'no error thrown'}`
      );
    }
  }
}

function expect(actual) {
  return new Expectation(actual);
}

module.exports = {
  expect,
  deepEqual
};
