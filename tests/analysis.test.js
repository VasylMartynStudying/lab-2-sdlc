const test = require('node:test');
const assert = require('node:assert/strict');
const { LinearSystem } = require('../js/system.js');
const { solveAll, spectralRadius, compareSizes, measureTime } = require('../js/analysis.js');

test('solveAll дає метрики для трьох методів', () => {
  const { results } = solveAll(LinearSystem.fromVariant(10, 1), { minTime: 1 });
  for (const r of Object.values(results)) {
    assert.ok(r.ok);
    assert.ok(r.residual < 1e-8 && r.error < 1e-8);
    assert.ok(r.timeMs > 0);
  }
});

test('вироджена матриця: жоден метод не дає розв’язку', () => {
  const s = new LinearSystem([[1, 2], [2, 4]], [3, 6]);
  const { results, singular } = solveAll(s, { minTime: 0 });
  assert.equal(singular, true);
  assert.ok(Object.values(results).every((r) => !r.ok));
});

test('нульова діагональ: Гаусс працює, ітераційні — ні', () => {
  const { results } = solveAll(new LinearSystem([[0, 1], [1, 1]], [1, 2]), { minTime: 0 });
  assert.equal(results.gauss.ok, true);
  assert.equal(results.jacobi.ok, false);
  assert.equal(results.seidel.ok, false);
});

test('спектральний радіус на системі 2×2', () => {
  // Власні значення: Якобі ±0,5; Зейдель 0 і 0,25.
  const s = new LinearSystem([[2, 1], [1, 2]], [1, 1]);
  assert.ok(Math.abs(spectralRadius(s, 'jacobi') - 0.5) < 1e-6);
  assert.ok(Math.abs(spectralRadius(s, 'seidel') - 0.25) < 1e-6);
});

test('послаблення переваги збільшує спектральний радіус', () => {
  for (const id of ['jacobi', 'seidel']) {
    const strong = spectralRadius(LinearSystem.fromVariant(20, 1), id);
    const weak = spectralRadius(LinearSystem.fromVariant(20, 0.1), id);
    assert.ok(strong < weak && weak < 1);
  }
});

test('зведена таблиця: 2 значення d × 3 розміри × 3 методи', () => {
  assert.equal(compareSizes({ minTime: 0 }).length, 18);
});

test('measureTime повертає додатний середній час', () => {
  assert.ok(measureTime(() => Math.sqrt(2), 2) > 0);
});
