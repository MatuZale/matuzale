import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { Spring } from '../js/deck.js';

// Execute the production class without a browser or copied implementation. These
// are callback schedules, not FPS measurements; rendering/layout is not simulated.
export function checkSpringCadence() {
  const samples = [15, 30, 60, 120].map(hz => {
    const spring = new Spring(0, .06, .28);
    spring.set(100);
    let timeTo95PercentMs = null, timeToStopMs = null, framesToStop = null;
    for (let frame = 1; frame <= hz * 4; frame++) {
      const moving = spring.step(1000 / hz);
      assert.ok(Number.isFinite(spring.value) && Number.isFinite(spring.velocity));
      if (timeTo95PercentMs === null && spring.value >= 95) timeTo95PercentMs = frame * 1000 / hz;
      if (!moving) { framesToStop = frame; timeToStopMs = frame * 1000 / hz; break; }
    }
    assert.ok(timeTo95PercentMs >= 190 && timeTo95PercentMs <= 280, `${hz} Hz: response must not stretch with callback count`);
    assert.ok(timeToStopMs >= 1000 && timeToStopMs <= 1300, `${hz} Hz: must settle in bounded elapsed time`);
    assert.equal(spring.value, 100);
    assert.equal(spring.velocity, 0);
    assert.equal(spring.step(1000 / hz), false, 'A settled spring stays asleep');
    return { hz, timeTo95PercentMs, timeToStopMs, framesToStop };
  });
  // Preserve the known 60 Hz lift response, including full settlement (target 100).
  assert.equal(samples[2].timeTo95PercentMs, 13 * 1000 / 60);
  assert.equal(samples[2].framesToStop, 71);

  // Test changing targets, tilt/light, relaxation, mouse spin and explicit flip.
  // Compare actual trajectories at common wall-clock times, not just the endpoint.
  const settings = [[.07, .26], [.02, .12], [.03, .2], [.03, .14], [.04, .18], [.2, .45]];
  let maxCadenceDifference = 0;
  for (const [stiffness, damping] of settings) {
    const paths = [30, 60, 120].map(hz => {
      const spring = new Spring(0, stiffness, damping);
      const path = [];
      for (let block = 0; block < 40; block++) {
        if (block === 0) spring.set(100);
        if (block === 3) spring.set(-50); // Retarget while moving, as a finger does.
        if (block === 7) spring.set(0);
        for (let frame = 0; frame < hz / 10; frame++) spring.step(1000 / hz);
        assert.ok(Number.isFinite(spring.value) && Number.isFinite(spring.velocity));
        assert.ok(Math.abs(spring.value) < 160, 'No unstable overshoot');
        path.push(spring.value);
      }
      assert.equal(spring.value, 0);
      assert.equal(spring.velocity, 0);
      return path;
    });
    for (const path of [paths[0], paths[2]]) path.forEach((value, i) => {
      const difference = Math.abs(value - paths[1][i]);
      maxCadenceDifference = Math.max(maxCadenceDifference, difference);
      assert.ok(difference < 10, 'Cadence must preserve the reference trajectory within 10% of the initial target');
    });
  }

  const paused = new Spring(0, .06, .28), reference = new Spring(0, .06, .28);
  paused.set(100); reference.set(100);
  paused.step(10_000);
  for (let i = 0; i < 4; i++) reference.step(1000 / 60);
  assert.equal(paused.value, reference.value, 'A long pause advances at most four reference steps');
  assert.equal(paused.velocity, reference.velocity);
  paused.step(1000 / 60); reference.step(1000 / 60);
  assert.equal(paused.value, reference.value, 'No catch-up backlog survives the next callback');
  const beforeZero = paused.value;
  paused.step(0);
  assert.equal(paused.value, beforeZero, 'No elapsed time means no motion');
  paused.jump(0); paused.set(100);
  reference.jump(0); reference.set(100);
  paused.step(1000 / 120); reference.step(1000 / 120);
  assert.equal(paused.value, reference.value, 'Restart carries no residual velocity');
  return { kind: 'Production Spring under controlled callback schedules; no browser or physical-device timing', samples, maxCadenceDifference };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(checkSpringCadence(), null, 2));
}
