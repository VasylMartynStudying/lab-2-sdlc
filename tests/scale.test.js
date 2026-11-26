const test = require('node:test');
const assert = require('node:assert/strict');
const { linearRange, logRange, niceTicks, logTicks, seriesBounds } = require('../js/scale.js');

test('межі охоплюють дані з відступом', () => {
  const r = linearRange([-20, 19], 0.1);
  assert.ok(r.min < -20 && r.max > 19);
});

test('сталий ряд і порожні дані не дають нульового розмаху', () => {
  for (const data of [[5, 5], [0], [], [NaN, Infinity]]) {
    const r = linearRange(data);
    assert.ok(r.max > r.min);
  }
});

test('автомасштаб не роздуває шум округлення', () => {
  const r = linearRange([1, 1 + 2e-16, 1 - 1e-16]);
  assert.ok(r.max - r.min >= 1);
});

test('нескінченні значення не впливають на межі', () => {
  assert.deepEqual(linearRange([0, 10, Infinity, NaN], 0), { min: 0, max: 10 });
});

test('логарифмічні межі — цілі декади, нулі пропускаються', () => {
  assert.deepEqual(logRange([0, 3e-12, 42]), { min: -12, max: 2 });
  assert.deepEqual(logRange([0, 0]), { min: -1, max: 1 });
  assert.deepEqual(logRange([100]), { min: 1, max: 3 });
});

test('поділки круглі, цілі для номерів', () => {
  assert.deepEqual(niceTicks(0, 10, 6), [0, 2, 4, 6, 8, 10]);
  assert.ok(niceTicks(0.9, 5.1, 12, true).every(Number.isInteger));
  assert.deepEqual(niceTicks(1, 1), []);
  assert.ok(logTicks(-30, 2).length <= 9);
});

test('спільні межі всіх серій', () => {
  const b = seriesBounds([
    { points: [[1, -3], [2, 4]] },
    { points: [[0, 9], [5, NaN]] },
  ], { padX: 0, padY: 0 });
  assert.deepEqual(b, { xMin: 0, xMax: 2, yMin: -3, yMax: 9 });
});
