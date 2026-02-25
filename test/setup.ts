import 'jest';

// Jest global setup
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeDefined(): R;
      toBe(expected: any): R;
      toEqual(expected: any): R;
    }
  }
}

// Configure Jest globals
global.describe = describe;
global.it = it;
global.expect = expect;
global.beforeAll = beforeAll;
global.afterAll = afterAll;
global.beforeEach = beforeEach;
global.afterEach = afterEach;