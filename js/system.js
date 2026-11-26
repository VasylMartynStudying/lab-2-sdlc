// Система Ax = b: генерація за варіантом, розбір тексту і перевірка вхідних даних.
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const api = factory(isNode ? require('./matrix.js') : root.Slae);
  if (isNode) module.exports = api;
  root.Slae = Object.assign(root.Slae || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (M) {
  'use strict';

  const MAX_N = 50;

  /** Позадіагональний елемент варіанта 3: e^(−(i − j)²). */
  function variantElement(i, j) {
    return Math.exp(-((i - j) ** 2));
  }

  /** Точний розв’язок варіанта 3: (−1)^i · i, i з 1. */
  function variantExact(i) {
    return (i % 2 === 0 ? 1 : -1) * i;
  }

  class LinearSystem {
    constructor(A, b, exact) {
      const n = Array.isArray(A) ? A.length : 0;
      if (n < 1 || n > MAX_N) throw new Error(`Розмір системи має бути від 1 до ${MAX_N}.`);
      if (A.some((row) => row.length !== n)) throw new Error('Матриця A має бути квадратною.');
      if (!Array.isArray(b) || b.length !== n) throw new Error('Довжина вектора b має дорівнювати n.');
      if (exact && exact.length !== n) throw new Error('Довжина точного розв’язку має дорівнювати n.');
      const all = A.flat().concat(b, exact || []);
      if (!all.every(Number.isFinite)) throw new Error('Усі значення мають бути скінченними числами.');
      this.n = n;
      this.A = M.cloneMatrix(A);
      this.b = b.slice();
      this.exact = exact ? exact.slice() : null;
    }

    /** Система варіанта 3: aᵢᵢ = Σ|aᵢⱼ| + d, b = A·x*. */
    static fromVariant(n, d) {
      if (!Number.isInteger(n) || n < 1 || n > MAX_N) throw new Error(`n має бути цілим від 1 до ${MAX_N}.`);
      if (!(d > 0) || !Number.isFinite(d)) throw new Error('d має бути додатним числом.');
      const A = [];
      for (let i = 1; i <= n; i++) {
        const row = [];
        let off = 0;
        for (let j = 1; j <= n; j++) {
          const value = i === j ? 0 : variantElement(i, j);
          off += Math.abs(value);
          row.push(value);
        }
        row[i - 1] = off + d;
        A.push(row);
      }
      const exact = Array.from({ length: n }, (_, k) => variantExact(k + 1));
      return new LinearSystem(A, M.matVec(A, exact), exact);
    }

    /**
     * Текстовий формат: n рядків по n + 1 числу (рядок A і елемент b).
     * Необов’язковий рядок «x*: …» задає точний розв’язок, «#» — коментар.
     * Роздільники — пробіл, табуляція або «;»; дробова частина — крапка чи кома.
     */
    static parse(text) {
      const rows = [];
      let exact = null;
      const lines = String(text).replace(/^﻿/, '').split(/\r?\n/);
      lines.forEach((raw, index) => {
        let line = raw.replace(/#.*$/, '').trim();
        if (!line) return;
        const isExact = /^x\*\s*[:=]/i.test(line);
        if (isExact) line = line.replace(/^x\*\s*[:=]/i, '');
        const values = line.split(/[\s;|]+/).filter(Boolean).map((token) => {
          const value = /^[+-]?(\d+([.,]\d+)?|[.,]\d+)([eE][+-]?\d+)?$/.test(token)
            ? Number(token.replace(',', '.'))
            : NaN;
          if (!Number.isFinite(value)) throw new Error(`Рядок ${index + 1}: «${token}» не є числом.`);
          return value;
        });
        if (isExact) {
          if (exact) throw new Error(`Рядок ${index + 1}: точний розв’язок задано двічі.`);
          exact = values;
        } else {
          rows.push({ values, line: index + 1 });
        }
      });
      const n = rows.length;
      if (!n) throw new Error('Немає жодного рядка матриці.');
      if (n > MAX_N) throw new Error(`Забагато рядків: ${n}, дозволено не більше ${MAX_N}.`);
      for (const row of rows) {
        if (row.values.length !== n + 1) {
          throw new Error(`Рядок ${row.line}: очікується ${n + 1} чисел, отримано ${row.values.length}.`);
        }
      }
      if (exact && exact.length !== n) {
        throw new Error(`x*: очікується ${n} чисел, отримано ${exact.length}.`);
      }
      return new LinearSystem(rows.map((r) => r.values.slice(0, n)), rows.map((r) => r.values[n]), exact);
    }

    toText() {
      const lines = this.A.map((row, i) => `${row.join(' ')} ; ${this.b[i]}`);
      if (this.exact) lines.push(`x*: ${this.exact.join(' ')}`);
      return lines.join('\n') + '\n';
    }

    residualNorm(x) {
      return M.residualNorm(this.A, x, this.b);
    }

    /** ‖x − x*‖₂ або null, якщо точний розв’язок невідомий. */
    errorNorm(x) {
      return this.exact ? M.norm2(M.subtract(x, this.exact)) : null;
    }
  }

  return { MAX_N, variantElement, variantExact, LinearSystem };
});
