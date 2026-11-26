const test = require('node:test');
const assert = require('node:assert/strict');
const { shortNumber } = require('../js/matrixView.js');

test('малі ненульові елементи не перетворюються на «0»', () => {
  for (const digits of [0, 1, 3]) {
    for (const v of [0.018, -0.0183, 0.3, 1e-7, -0.04]) {
      assert.notEqual(Number(shortNumber(v, digits)), 0, `${v}, digits=${digits}`);
    }
  }
  assert.equal(shortNumber(0, 1), '0');
  assert.equal(shortNumber(1.7725, 1), '1.8');
});
