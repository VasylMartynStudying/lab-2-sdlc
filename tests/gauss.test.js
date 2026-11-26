const test = require('node:test');
const assert = require('node:assert/strict');
const { LinearSystem } = require('../js/system.js');
const { GaussSolver, SingularMatrixError } = require('../js/gauss.js');
const { matVec, normInf, subtract } = require('../js/matrix.js');

const gauss = new GaussSolver();
const close = (a, b, tol) => assert.ok(normInf(subtract(a, b)) < tol, `${a} ≠ ${b}`);

test('Гаусс відтворює точний розв’язок варіанта', () => {
  for (const n of [5, 10, 20]) {
    for (const d of [1, 0.1]) {
      const s = LinearSystem.fromVariant(n, d);
      close(gauss.solve(s).x, s.exact, 1e-11);
    }
  }
});

test('a11 = 0: рядки переставляються і розв’язок правильний', () => {
  const base = LinearSystem.fromVariant(5, 1);
  const A = base.A.map((r) => r.slice());
  A[0][0] = 0;
  const s = new LinearSystem(A, matVec(A, base.exact), base.exact);
  const result = gauss.solve(s);
  assert.ok(result.swaps > 0);
  close(result.x, s.exact, 1e-12);
});

test('малий головний елемент 1e-17 не руйнує точність', () => {
  const s = new LinearSystem([[1e-17, 1], [1, 1]], [1, 2]);
  close(gauss.solve(s).x, [1, 1], 1e-12);
});

test('вироджені матриці виявляються', () => {
  for (const A of [[[1, 2], [2, 4]], [[0, 0], [0, 0]], [[1, 2, 3], [4, 5, 6], [7, 8, 9]], [[0]]]) {
    const s = new LinearSystem(A, A.map(() => 1));
    assert.throws(() => gauss.solve(s), SingularMatrixError);
  }
});

test('матриця з малими, але незалежними елементами не вважається виродженою', () => {
  const s = new LinearSystem([[2e-20, 0], [0, 3e-20]], [2e-20, 6e-20]);
  close(gauss.solve(s).x, [1, 2], 1e-12);
});

test('визначник і кроки для анімації', () => {
  const s = new LinearSystem([[1, 2], [3, 4]], [5, 6]);
  const r = gauss.solve(s, { record: true });
  assert.ok(Math.abs(r.det + 2) < 1e-12);
  assert.deepEqual(r.steps.map((x) => x.type), ['start', 'pivot', 'swap', 'eliminate', 'pivot', 'back', 'back']);
  assert.deepEqual(r.steps[0].matrix, [[1, 2, 5], [3, 4, 6]]);
});

test('вхідна система не змінюється', () => {
  const s = LinearSystem.fromVariant(5, 1);
  const before = JSON.stringify(s);
  gauss.solve(s);
  assert.equal(JSON.stringify(s), before);
});
