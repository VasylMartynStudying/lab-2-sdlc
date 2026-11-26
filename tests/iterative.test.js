const test = require('node:test');
const assert = require('node:assert/strict');
const { LinearSystem } = require('../js/system.js');
const { JacobiSolver, SeidelSolver } = require('../js/iterative.js');
const { normInf, subtract } = require('../js/matrix.js');

const jacobi = new JacobiSolver();
const seidel = new SeidelSolver();

for (const solver of [jacobi, seidel]) {
  test(`${solver.name}: збігається для n = 5, 10, 20 і d = 1; 0,1`, () => {
    for (const n of [5, 10, 20]) {
      for (const d of [1, 0.1]) {
        const s = LinearSystem.fromVariant(n, d);
        const r = solver.solve(s, { eps: 1e-10 });
        assert.equal(r.status, 'converged');
        assert.ok(normInf(subtract(r.x, s.exact)) < 1e-8, `n=${n}, d=${d}`);
      }
    }
  });

  test(`${solver.name}: менше d — більше ітерацій`, () => {
    const strong = solver.solve(LinearSystem.fromVariant(20, 1));
    const weak = solver.solve(LinearSystem.fromVariant(20, 0.1));
    assert.ok(weak.iterations > 2 * strong.iterations);
  });

  test(`${solver.name}: журнал має запис на кожну ітерацію`, () => {
    const r = solver.solve(LinearSystem.fromVariant(5, 1), { record: true });
    assert.equal(r.history.length, r.iterations + 1);
    assert.equal(r.residuals.length, r.iterations + 1);
    assert.ok(r.residuals.at(-1) < r.residuals[0]);
  });

  test(`${solver.name}: розбіжність виявляється`, () => {
    const s = new LinearSystem([[1, 3], [4, 1]], [1, 1]);
    const r = solver.solve(s);
    assert.equal(r.status, 'diverged');
    assert.ok(r.iterations < 20000);
  });

  test(`${solver.name}: ліміт ітерацій дотримується`, () => {
    const r = solver.solve(LinearSystem.fromVariant(10, 0.1), { maxIter: 3 });
    assert.equal(r.status, 'maxIter');
    assert.equal(r.iterations, 3);
  });

  test(`${solver.name}: нульова діагональ і некоректний ε відхиляються`, () => {
    assert.throws(() => solver.solve(new LinearSystem([[0, 1], [1, 1]], [1, 2])), /рядку 1/);
    assert.throws(() => solver.solve(LinearSystem.fromVariant(5, 1), { eps: 0 }), /ε/);
  });
}

test('перший крок Якобі та Зейделя на системі 2×2', () => {
  const s = new LinearSystem([[4, 1], [2, 5]], [8, 10]);
  assert.deepEqual(jacobi.solve(s, { maxIter: 1 }).x, [2, 2]);
  assert.deepEqual(seidel.solve(s, { maxIter: 1 }).x, [2, 1.2]);
});
