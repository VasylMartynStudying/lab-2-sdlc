// Порівняння методів: розв’язання, метрики, час і спектральний радіус.
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const api = factory(isNode
    ? Object.assign({}, require('./matrix.js'), require('./system.js'), require('./gauss.js'), require('./iterative.js'))
    : root.Slae);
  if (isNode) module.exports = api;
  root.Slae = Object.assign(root.Slae || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (S) {
  'use strict';

  const METHODS = ['gauss', 'jacobi', 'seidel'];

  function createSolver(id) {
    if (id === 'gauss') return new S.GaussSolver();
    if (id === 'jacobi') return new S.JacobiSolver();
    return new S.SeidelSolver();
  }

  const now = () => performance.now();

  /**
   * Середній час одного виклику, мс. Таймер браузера грубий, тому виклик
   * повторюється, доки сумарний час не досягне minTotal.
   */
  function measureTime(fn, minTotal = 20) {
    let runs = 0;
    let elapsed = 0;
    const start = now();
    do {
      fn();
      runs++;
      elapsed = now() - start;
    } while (elapsed < minTotal);
    return elapsed / runs;
  }

  /**
   * Розв’язує систему всіма методами. Час міряється без запису кроків.
   * Для виродженої матриці ітераційні методи не запускаються.
   */
  function solveAll(system, options = {}) {
    const results = {};
    let singular = null;
    for (const id of METHODS) {
      const solver = createSolver(id);
      if (singular) {
        results[id] = { id, name: solver.name, ok: false, message: 'Не запускався: матриця вироджена.' };
        continue;
      }
      try {
        const run = solver.solve(system, { ...options, record: options.record !== false });
        const timeMs = options.minTime === 0 ? null : measureTime(
          () => solver.solve(system, { ...options, record: false }),
          options.minTime,
        );
        results[id] = {
          ...run,
          id,
          name: solver.name,
          ok: true,
          status: run.status || 'direct',
          residual: system.residualNorm(run.x),
          error: system.errorNorm(run.x),
          timeMs,
        };
      } catch (err) {
        if (err instanceof S.SingularMatrixError) singular = err;
        results[id] = { id, name: solver.name, ok: false, message: err.message };
      }
    }
    return { results, singular: Boolean(singular) };
  }

  /**
   * Оцінка спектрального радіуса матриці переходу: крок методу з b = 0
   * застосовується до пробного вектора; середнє геометричне зростання норми.
   */
  function spectralRadius(system, id, warmup = 200, window = 200) {
    const solver = createSolver(id);
    const zero = new Array(system.n).fill(0);
    let v = zero.map((_, i) => 1 + Math.sin(7 * i + 1));
    let next = zero.slice();
    let logSum = 0;
    for (let k = 0; k < warmup + window; k++) {
      solver.step(system.A, zero, v, next);
      const norm = S.norm2(next);
      if (norm === 0 || !Number.isFinite(norm)) return norm === 0 ? 0 : Infinity;
      if (k >= warmup) logSum += Math.log(norm / S.norm2(v));
      [v, next] = [next.map((x) => x / norm), v];
    }
    return Math.exp(logSum / window);
  }

  /** Зведення для n = 5, 10, 20 і заданих d. */
  function compareSizes(options = {}, ds = [1, 0.1], sizes = [5, 10, 20]) {
    const rows = [];
    for (const d of ds) {
      for (const n of sizes) {
        const system = S.LinearSystem.fromVariant(n, d);
        const { results } = solveAll(system, { ...options, record: false });
        for (const id of METHODS) rows.push({ n, d, ...results[id] });
      }
    }
    return rows;
  }

  return { METHODS, createSolver, measureTime, solveAll, spectralRadius, compareSizes };
});
