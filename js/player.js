// Відтворення покрокової анімації: номер кадру і швидкість у кадрах за секунду.
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Slae = Object.assign(root.Slae || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  class Player {
    constructor(onFrame) {
      this.onFrame = onFrame;
      this.count = 0;
      this.index = 0;
      this.speed = 3;
      this.playing = false;
      this._raf = 0;
      this._last = null;
      this._acc = 0;
    }

    load(count, index = 0) {
      this.stop();
      this.count = count;
      this.index = 0;
      this.seek(index);
    }

    seek(index) {
      this.index = Math.max(0, Math.min(this.count - 1, Math.round(index)));
      this.onFrame(this.index, this.playing);
    }

    stop() {
      this.playing = false;
      if (this._raf) root.cancelAnimationFrame(this._raf);
      this._raf = 0;
      if (this.count) this.onFrame(this.index, false);
    }

    play() {
      if (this.count < 2) return;
      if (this.index >= this.count - 1) this.index = 0;
      this.playing = true;
      this._last = null;
      this._acc = 0;
      this.onFrame(this.index, true);
      const loop = (now) => {
        if (!this.playing) return;
        if (this._last !== null) this.advance((now - this._last) / 1000);
        this._last = now;
        if (this.playing) this._raf = root.requestAnimationFrame(loop);
      };
      this._raf = root.requestAnimationFrame(loop);
    }

    toggle() {
      if (this.playing) this.stop();
      else this.play();
    }

    /** Просуває анімацію на dt секунд; на останньому кадрі зупиняється. */
    advance(dt) {
      this._acc += dt * this.speed;
      const frames = Math.floor(this._acc);
      if (frames < 1) return;
      this._acc -= frames;
      this.index = Math.min(this.count - 1, this.index + frames);
      if (this.index >= this.count - 1) this.playing = false;
      this.onFrame(this.index, this.playing);
    }
  }

  return { Player };
});
