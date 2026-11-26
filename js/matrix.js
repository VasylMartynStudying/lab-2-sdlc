// Операції над векторами та матрицями, спільні для всіх методів.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Slae = Object.assign(root.Slae || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function cloneMatrix(A) {
    return A.map((row) => row.slice());
  }

  function matVec(A, x) {
    return A.map((row) => {
      let sum = 0;
      for (let j = 0; j < row.length; j++) sum += row[j] * x[j];
      return sum;
    });
  }

  /** Евклідова норма. Масштабування захищає квадрати від переповнення. */
  function norm2(v) {
    const max = normInf(v);
    if (max === 0 || !Number.isFinite(max)) return max;
    let sum = 0;
    for (const value of v) sum += (value / max) ** 2;
    return max * Math.sqrt(sum);
  }

  /** Максимум-норма. NaN не губиться. */
  function normInf(v) {
    let max = 0;
    for (const value of v) {
      const abs = Math.abs(value);
      if (Number.isNaN(abs)) return NaN;
      if (abs > max) max = abs;
    }
    return max;
  }

  function subtract(a, b) {
    return a.map((value, i) => value - b[i]);
  }

  /** ‖Ax − b‖₂ */
  function residualNorm(A, x, b) {
    return norm2(subtract(matVec(A, x), b));
  }

  return { cloneMatrix, matVec, norm2, normInf, subtract, residualNorm };
});
