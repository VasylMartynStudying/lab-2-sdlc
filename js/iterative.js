// Ітераційні методи Якобі та Зейделя.
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const api = factory(isNode ? require('./matrix.js') : root.Slae);
  if (isNode) module.exports = api;
  root.Slae = Object.assign(root.Slae || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (M) {
  'use strict';

  const DEFAULT_EPS = 1e-10;
  const DEFAULT_MAX_ITER = 20000;
  const DIVERGENCE_LIMIT = 1e100;

  /**
   * Спільна частина: цикл, критерій зупинки, журнал нев’язок.
   * Нащадок визначає лише один крок — метод step().
   */
  class IterativeSolver {
    constructor(id, name) {
      this.id = id;
      this.name = name;
    }

    step() {
      throw new Error('Крок ітерації визначає нащадок IterativeSolver.');
    }

    /**
     * Старт з x⁽⁰⁾ = 0. Зупинка, коли ‖x⁽ᵏ⁾ − x⁽ᵏ⁻¹⁾‖∞ ≤ eps.
     * options.record — зберігати наближення та норми ‖Ax − b‖₂ для графіків.
     * status: 'converged' | 'maxIter' | 'diverged'.
     */
    solve(system, options = {}) {
      const eps = options.eps ?? DEFAULT_EPS;
      const maxIter = options.maxIter ?? DEFAULT_MAX_ITER;
      if (!(eps > 0) || !Number.isFinite(eps)) throw new Error('Точність ε має бути додатним числом.');
      if (!Number.isInteger(maxIter) || maxIter < 1) throw new Error('Ліміт ітерацій має бути натуральним числом.');
      const { A, b, n } = system;
      for (let i = 0; i < n; i++) {
        if (A[i][i] === 0) {
          throw new Error(`Метод «${this.name}» незастосовний: нульовий діагональний елемент у рядку ${i + 1}.`);
        }
      }

      let x = new Array(n).fill(0);
      let next = new Array(n).fill(0);
      const history = options.record ? [x.slice()] : null;
      const residuals = options.record ? [system.residualNorm(x)] : null;
      let status = 'maxIter';
      let iterations = 0;
      let increment = Infinity;

      while (iterations < maxIter) {
        this.step(A, b, x, next);
        iterations++;
        increment = 0;
        let size = 0;
        for (let i = 0; i < n; i++) {
          const delta = Math.abs(next[i] - x[i]);
          const abs = Math.abs(next[i]);
          if (!(delta <= increment)) increment = delta; // NaN теж переходить далі
          if (!(abs <= size)) size = abs;
        }
        [x, next] = [next, x];
        if (history) {
          history.push(x.slice());
          residuals.push(system.residualNorm(x));
        }
        if (!(size <= DIVERGENCE_LIMIT)) {
          status = 'diverged';
          break;
        }
        if (increment <= eps) {
          status = 'converged';
          break;
        }
      }
      return { x: x.slice(), iterations, status, increment, history, residuals };
    }
  }

  class JacobiSolver extends IterativeSolver {
    constructor() {
      super('jacobi', 'Якобі');
    }

    /** Усі компоненти нового наближення рахуються за попереднім. */
    step(A, b, x, next) {
      for (let i = 0; i < x.length; i++) {
        const row = A[i];
        let sum = b[i];
        for (let j = 0; j < x.length; j++) if (j !== i) sum -= row[j] * x[j];
        next[i] = sum / row[i];
      }
    }
  }

  class SeidelSolver extends IterativeSolver {
    constructor() {
      super('seidel', 'Зейдель');
    }

    /** Для j < i беруться вже оновлені компоненти. */
    step(A, b, x, next) {
      for (let i = 0; i < x.length; i++) {
        const row = A[i];
        let sum = b[i];
        for (let j = 0; j < i; j++) sum -= row[j] * next[j];
        for (let j = i + 1; j < x.length; j++) sum -= row[j] * x[j];
        next[i] = sum / row[i];
      }
    }
  }

  return { DEFAULT_EPS, DEFAULT_MAX_ITER, DIVERGENCE_LIMIT, IterativeSolver, JacobiSolver, SeidelSolver };
});
