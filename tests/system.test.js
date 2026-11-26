const test = require('node:test');
const assert = require('node:assert/strict');
const { LinearSystem } = require('../js/system.js');
const { checkDominance } = require('../js/dominance.js');
const { norm2 } = require('../js/matrix.js');

test('елементи варіанта 3 відповідають формулам', () => {
  const s = LinearSystem.fromVariant(5, 1);
  assert.equal(s.A[0][1], Math.exp(-1));
  assert.equal(s.A[0][2], Math.exp(-4));
  const off = s.A[2].reduce((sum, v, j) => (j === 2 ? sum : sum + v), 0);
  assert.ok(Math.abs(s.A[2][2] - off - 1) < 1e-15);
  assert.deepEqual(s.exact, [-1, 2, -3, 4, -5]);
});

test('права частина узгоджена з точним розв’язком', () => {
  for (const n of [5, 10, 20]) {
    const s = LinearSystem.fromVariant(n, 0.1);
    assert.equal(s.residualNorm(s.exact), 0);
    assert.equal(s.errorNorm(s.exact), 0);
  }
});

test('матриця варіанта має строгу перевагу для d = 1 і d = 0,1', () => {
  for (const d of [1, 0.1]) {
    const report = checkDominance(LinearSystem.fromVariant(20, d).A);
    assert.equal(report.strict, true);
    for (const row of report.rows) assert.ok(Math.abs(row.margin - d) < 1e-12);
  }
});

test('перевірка називає порушені рядки і нульову діагональ', () => {
  const report = checkDominance([[0, 1], [1, 5]]);
  assert.equal(report.strict, false);
  assert.deepEqual(report.violated, [1]);
  assert.deepEqual(report.zeroDiagonal, [1]);
  assert.equal(report.q, Infinity);
});

test('рівність модулів не є строгою перевагою', () => {
  assert.equal(checkDominance([[1, 1], [0, 1]]).strict, false);
});

test('розбір тексту: коментарі, коми, крапка з комою, x*', () => {
  const s = LinearSystem.parse('﻿# приклад\r\n2,5 1 ; 4,5\r\n1;3;7 # другий\r\nx*: 1 2\r\n');
  assert.deepEqual(s.A, [[2.5, 1], [1, 3]]);
  assert.deepEqual(s.b, [4.5, 7]);
  assert.deepEqual(s.exact, [1, 2]);
});

test('toText і parse взаємно обернені без втрати точності', () => {
  const s = LinearSystem.fromVariant(20, 0.1);
  const copy = LinearSystem.parse(s.toText());
  assert.deepEqual(copy.A, s.A);
  assert.deepEqual(copy.b, s.b);
});

test('помилки введення мають номер рядка', () => {
  assert.throws(() => LinearSystem.parse('1 2 3\n4 abc 6'), /Рядок 2/);
  assert.throws(() => LinearSystem.parse('1 2 3\n4 5'), /Рядок 2/);
  assert.throws(() => LinearSystem.parse('   \n# порожньо'), /жодного/);
  assert.throws(() => LinearSystem.parse('1 2 3\n4 5 6\nx*: 1'), /x\*/);
  assert.throws(() => LinearSystem.parse('1, 2, 3'), /не є числом/);
  assert.throws(() => LinearSystem.parse('1e999 1'), /не є числом/);
});

test('некоректні параметри генерації відхиляються', () => {
  assert.throws(() => LinearSystem.fromVariant(0, 1));
  assert.throws(() => LinearSystem.fromVariant(51, 1));
  assert.throws(() => LinearSystem.fromVariant(5, 0));
});

test('норма не переповнюється на великих числах', () => {
  assert.ok(Math.abs(norm2([3e200, 4e200]) / 5e200 - 1) < 1e-15);
});
