const test = require('node:test');
const assert = require('node:assert/strict');
const { Player } = require('../js/player.js');

test('кадр просувається за швидкістю і зупиняється в кінці', () => {
  const player = new Player(() => {});
  player.load(10);
  player.speed = 4;
  player.playing = true;
  player.advance(0.1);
  assert.equal(player.index, 0);
  player.advance(0.4);
  assert.equal(player.index, 2);
  player.advance(100);
  assert.equal(player.index, 9);
  assert.equal(player.playing, false);
});

test('seek не виходить за межі', () => {
  const player = new Player(() => {});
  player.load(5);
  player.seek(-3);
  assert.equal(player.index, 0);
  player.seek(99);
  assert.equal(player.index, 4);
});
