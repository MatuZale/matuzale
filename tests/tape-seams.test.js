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
let path = [];
const ctx = {
  setTransform() {},
  clearRect() { drawn = []; renders.push(drawn); },
  fillRect() { drawn.push(['background', this.fillStyle]); },
  createLinearGradient() {
    const stops = [];
    return { stops, addColorStop(offset, colour) { stops.push([offset, colour]); } };
  },
  beginPath() { path = []; },
  moveTo(x, y) { path.push([x, y]); },
  lineTo(x, y) { path.push([x, y]); },
  closePath() {},
  fill() { drawn.push(['surface', this.fillStyle, path]); },
  fillText(char, x, y) { drawn.push([char, x, y, this.fillStyle, this.globalAlpha]); },
};
const canvas = { width: 300, height: 150, getContext: () => ctx };
const element = { classList: { contains: () => false }, querySelector: () => canvas, getBoundingClientRect: () => rect };
let deckOpen = false;
const doc = { ...documentEvents, hidden: false, documentElement: { classList: { contains: name => name === 'deck-open' && deckOpen } }, querySelectorAll: () => [element] };
let observer;
class IntersectionObserver {
  constructor(callback) { this.callback = callback; observer = this; }
  observe() {}
  setVisible(visible) { this.callback([{ target: element, isIntersecting: visible }]); }
}
let mutationObserver;
class MutationObserver { constructor(callback) { this.callback = callback; mutationObserver = this; } observe() {} }
let queue = [];
let time = 100;
const env = {
  ...windowEvents, window: { IntersectionObserver }, document: doc,
  IntersectionObserver, MutationObserver, matchMedia: media,
  innerHeight: 900, devicePixelRatio: 1,
  getComputedStyle: () => ({ getPropertyValue: name => name === '--accent-2' ? '#9955ff' : name === '--bg' ? '#fbfaff' : '#44ddee' }),
  requestAnimationFrame: callback => { queue.push(callback); return queue.length; },
};
const flush = () => {
  const pending = queue;
  queue = [];
  time += 70;
  pending.forEach(callback => callback(time));
};
const snapshot = () => JSON.stringify(renders.at(-1));

runInNewContext(readFileSync(new URL('../js/tape-seams.js', import.meta.url), 'utf8'), env);
observer.setVisible(true);
flush();
assert.ok(renders.at(-1).length > 50, 'a visible seam draws a field of characters');
const initial = snapshot();
flush();
assert.notEqual(snapshot(), initial, 'a visible wave moves without scrolling');
assert.equal(queue.length, 1, 'one animation frame is scheduled while visible');
deckOpen = true;
mutationObserver.callback();
flush();
assert.equal(queue.length, 0, 'a modal collection pauses the wave behind it');
deckOpen = false;
mutationObserver.callback();
flush();
assert.equal(queue.length, 1, 'the wave resumes when the collection closes');
rect = { ...rect, top: 140, bottom: 284 };
windowEvents.emit('scroll');
flush();
assert.notEqual(snapshot(), initial, 'the wave continues as the page moves');
const beforePointer = snapshot();
windowEvents.emit('pointermove', { pointerType: 'mouse', clientX: 400, clientY: 148 });
flush();
assert.notEqual(snapshot(), beforePointer, 'the pointer bends the wave');
motion.matches = true;
motion.emit('change');
flush();
assert.equal(queue.length, 0, 'reduced motion stops the animation loop');
const still = snapshot();
rect = { ...rect, top: 210, bottom: 354 };
windowEvents.emit('scroll');
windowEvents.emit('pointermove', { pointerType: 'mouse', clientX: 200, clientY: 230 });
flush();
assert.equal(snapshot(), still, 'reduced motion does not react to scroll or pointer');
observer.setVisible(false);
flush();
assert.equal(queue.length, 0, 'an off-screen seam does not keep animating');
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
for (const [direction, top, bottom] of [['to', '#fbfaff', '#00093d'], ['from', '#00093d', '#fbfaff']]) {
  element.classList.contains = name => name === `tape-seam--${direction}-bentos`;
  runInNewContext(readFileSync(new URL('../js/tape-seams.js', import.meta.url), 'utf8'), env);
  observer.setVisible(true);
  flush();
  const background = renders.at(-1).find(entry => entry[0] === 'background');
  const surface = renders.at(-1).find(entry => entry[0] === 'surface');
  assert.equal(background[1], top, `${direction}: top matches the neighbouring section`);
  assert.equal(surface[1], bottom, `${direction}: bottom matches the neighbouring section`);
  assert.ok(surface[2].slice(1, -1).every(([, y]) => y > 0 && y < rect.height), 'the wave stays between the section edges');
  assert.ok(renders.at(-1).some(entry => entry[0] === 'background' && Array.isArray(entry[1]?.stops) && entry[1].stops[0][1] === top && entry[1].stops[1][1] === bottom), 'the boundary blends the adjacent colours');
}

// Compare equal times with and without a pointer. Moving the page alone must not
// change the phase abruptly, and the pointer must move the actual colour boundary.
function boundaryWithPointer(usePointer) {
  const eventsForPage = events();
  const motionSetting = { matches: false, addEventListener() {} };
  let bounds = { left: 0, right: 800, top: 300, bottom: 444, width: 800, height: 144 };
  let points = [], surface = [], scheduled = [];
  const context = {
    setTransform() {}, clearRect() {}, fillRect() {}, fillText() {},
    createLinearGradient: () => ({ addColorStop() {} }),
    beginPath() { points = []; }, moveTo(x, y) { points.push([x, y]); },
    lineTo(x, y) { points.push([x, y]); }, closePath() {}, fill() { surface = points; },
  };
  const transitionCanvas = { getContext: () => context };
  const seam = { classList: { contains: name => name === 'tape-seam--to-bentos' }, querySelector: () => transitionCanvas, getBoundingClientRect: () => bounds };
  const page = { hidden: false, documentElement: { classList: { contains: () => false } }, querySelectorAll: () => [seam], addEventListener() {} };
  let io;
  class Observer { constructor(callback) { this.callback = callback; io = this; } observe() {} }
  const testEnv = {
    ...eventsForPage, window: { IntersectionObserver: Observer }, document: page, IntersectionObserver: Observer,
    MutationObserver: class { observe() {} }, innerHeight: 900, devicePixelRatio: 1,
    matchMedia: query => query.includes('any-hover') ? { ...motionSetting, matches: true } : motionSetting,
    getComputedStyle: env.getComputedStyle,
    requestAnimationFrame: callback => { scheduled.push(callback); return scheduled.length; },
  };
  const tick = time => { const callbacks = scheduled; scheduled = []; callbacks.forEach(callback => callback(time)); };
  runInNewContext(readFileSync(new URL('../js/tape-seams.js', import.meta.url), 'utf8'), testEnv);
  io.callback([{ target: seam, isIntersecting: true }]);
  tick(100);
  const beforeScroll = surface.map(([, y]) => y);
  bounds = { ...bounds, top: 140, bottom: 284 };
  eventsForPage.emit('scroll');
  tick(170);
  const afterScroll = surface.map(([, y]) => y);
  assert.ok(Math.max(...afterScroll.map((y, i) => Math.abs(y - beforeScroll[i]))) < 1.5, 'scrolling does not jump the wave phase');
  if (usePointer) eventsForPage.emit('pointermove', { pointerType: 'mouse', clientX: 400, clientY: 200 });
  for (let t = 240; t <= 1080; t += 70) tick(t);
  return surface[51][1];
}
assert.ok(Math.abs(boundaryWithPointer(true) - boundaryWithPointer(false)) > 3, 'the pointer gently moves the colour boundary');
console.log('tape-seams: animation, scroll, pointer, reduced motion and visibility passed');
