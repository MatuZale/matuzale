// A small lifecycle check for the decorative wave: no browser or GPU required.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function events() {
  const handlers = new Map();
  return {
    addEventListener(type, handler) {
      if (!handlers.has(type)) handlers.set(type, []);
      handlers.get(type).push(handler);
    },
    emit(type, event = {}) { for (const fn of handlers.get(type) || []) fn(event); },
  };
}

const windowEvents = events();
const documentEvents = events();
const motion = { ...events(), matches: false };
const fine = { ...events(), matches: true };
const scheme = { ...events(), matches: false };
const media = query => query.includes('reduced-motion') ? motion : query.includes('any-hover') ? fine : scheme;
let rect = { left: 0, right: 800, top: 300, bottom: 444, width: 800, height: 144 };
const renders = [];
let drawn = [];
const ctx = {
  setTransform() {},
  clearRect() { drawn = []; renders.push(drawn); },
  fillText(char, x, y) { drawn.push([char, x, y, this.fillStyle, this.globalAlpha]); },
};
const canvas = { width: 300, height: 150, getContext: () => ctx };
const element = { querySelector: () => canvas, getBoundingClientRect: () => rect };
const doc = { ...documentEvents, hidden: false, documentElement: {}, querySelectorAll: () => [element] };
let observer;
class IntersectionObserver {
  constructor(callback) { this.callback = callback; observer = this; }
  observe() {}
  setVisible(visible) { this.callback([{ target: element, isIntersecting: visible }]); }
}
class MutationObserver { observe() {} }
let queue = [];
const env = {
  ...windowEvents, window: { IntersectionObserver }, document: doc,
  IntersectionObserver, MutationObserver, matchMedia: media,
  innerHeight: 900, devicePixelRatio: 1,
  getComputedStyle: () => ({ getPropertyValue: name => name === '--accent-2' ? '#9955ff' : '#44ddee' }),
  requestAnimationFrame: callback => { queue.push(callback); return queue.length; },
};
const flush = () => {
  const pending = queue;
  queue = [];
  pending.forEach(callback => callback());
  assert.equal(queue.length, 0, 'drawing must not create a continuous animation loop');
};
const snapshot = () => JSON.stringify(renders.at(-1));

runInNewContext(readFileSync(new URL('../js/tape-seams.js', import.meta.url), 'utf8'), env);
observer.setVisible(true);
flush();
assert.ok(renders.at(-1).length > 50, 'a visible seam draws a field of characters');
const initial = snapshot();
rect = { ...rect, top: 140, bottom: 284 };
windowEvents.emit('scroll');
flush();
assert.notEqual(snapshot(), initial, 'scroll changes the wave');
const beforePointer = snapshot();
windowEvents.emit('pointermove', { pointerType: 'mouse', clientX: 400, clientY: 148 });
flush();
assert.notEqual(snapshot(), beforePointer, 'the pointer bends the wave');
motion.matches = true;
motion.emit('change');
flush();
const still = snapshot();
rect = { ...rect, top: 210, bottom: 354 };
windowEvents.emit('scroll');
windowEvents.emit('pointermove', { pointerType: 'mouse', clientX: 200, clientY: 230 });
flush();
assert.equal(snapshot(), still, 'reduced motion does not react to scroll or pointer');
observer.setVisible(false);
flush();
const count = renders.length;
windowEvents.emit('resize');
flush();
assert.equal(renders.length, count, 'off-screen seams are not redrawn');
rect = { left: 0, right: 360, top: 100, bottom: 212, width: 360, height: 112 };
observer.setVisible(true);
flush();
assert.equal(canvas.width, 360, 'the canvas follows a narrow viewport');
assert.equal(canvas.height, 112, 'the canvas fits the seam');
assert.ok(renders.at(-1).length > 20, 'the still field is visible at mobile width');
console.log('tape-seams: scroll, pointer, reduced motion and visibility passed');
