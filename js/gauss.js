// Метод Гаусса з вибором головного елемента за стовпцем.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Slae = Object.assign(root.Slae || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  class SingularMatrixError extends Error {
    constructor(column) {
      super(`Матриця вироджена або чисельно вироджена: у стовпці ${column} немає ненульового головного елемента.`);
      this.name = 'SingularMatrixError';
      this.column = column;
    }
  }

  class GaussSolver {
    constructor() {
      this.id = 'gauss';
      this.name = 'Гаусс';
    }

    /**
     * options.record — зберігати кроки для анімації.
     * Повертає { x, swaps, det, steps }.
     */
    solve(system, options = {}) {
      const n = system.n;
      const W = system.A.map((row, i) => [...row, system.b[i]]);
      const steps = options.record ? [] : null;
      const push = (step) => {
        if (steps) steps.push({ ...step, matrix: W.map((row) => row.slice()) });
      };

      // Поріг виродженості відносний: масштаб матриці не впливає на висновок.
      let scale = 0;
      for (const row of system.A) for (const v of row) scale = Math.max(scale, Math.abs(v));
      const tolerance = n * Number.EPSILON * scale;

      let swaps = 0;
      let det = 1;
      push({ type: 'start', k: 0 });

      for (let k = 0; k < n; k++) {
        let p = k;
        for (let i = k + 1; i < n; i++) {
          if (Math.abs(W[i][k]) > Math.abs(W[p][k])) p = i;
        }
        push({ type: 'pivot', k, row: p, value: W[p][k] });
        if (Math.abs(W[p][k]) <= tolerance) throw new SingularMatrixError(k + 1);
        if (p !== k) {
          [W[k], W[p]] = [W[p], W[k]];
          swaps++;
          det = -det;
          push({ type: 'swap', k, row: k, other: p });
        }
        det *= W[k][k];
        for (let i = k + 1; i < n; i++) {
          const factor = W[i][k] / W[k][k];
          if (factor !== 0) {
            for (let j = k + 1; j <= n; j++) W[i][j] -= factor * W[k][j];
          }
          W[i][k] = 0;
          push({ type: 'eliminate', k, row: i, factor });
        }
      }

      const x = new Array(n).fill(0);
      for (let i = n - 1; i >= 0; i--) {
        let sum = W[i][n];
        for (let j = i + 1; j < n; j++) sum -= W[i][j] * x[j];
        x[i] = sum / W[i][i];
        push({ type: 'back', k: i, row: i, x: x.slice(), solvedFrom: i });
      }
      if (!x.every(Number.isFinite)) throw new Error('Переповнення під час обчислень: розв’язок нескінченний.');
      return { x, swaps, det, steps };
    }
  }

  return { GaussSolver, SingularMatrixError };
});
