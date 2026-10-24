// Shared motion-challenge rules. Client-reported landmarks are not trusted biometrics.
export function evaluateLiveness(samples, order, direction) {
  if (!Array.isArray(samples) || samples.length > 100 || !['blink-turn', 'turn-blink'].includes(order) || ![-1, 1].includes(direction)) throw Error('Invalid liveness evidence.');
  let previous = -1;
  for (const s of samples) {
    if (!s || !Number.isFinite(s.t) || s.t < 0 || s.t > 25000 || (previous >= 0 && (s.t - previous < 80 || s.t - previous > 2000)) || !Number.isFinite(s.ear) || s.ear < 0 || s.ear > 1 || !Number.isFinite(s.yaw) || Math.abs(s.yaw) > 1) throw Error('Interrupted or invalid liveness capture. Retry with a clear camera view.');
    previous = s.t;
  }
  const stages = order === 'blink-turn' ? ['blink', 'turn'] : ['turn', 'blink'];
  const neutral = samples.slice(0, 3);
  if (neutral.length < 3 || neutral.some(s => s.ear < .18 || Math.abs(s.yaw) > .16)) return {complete: false, progress: 0, stage: 'calibrate', message: 'Look straight at the camera with both eyes open.'};
  const eye = neutral.reduce((n, s) => n + s.ear, 0) / 3;
  const yaw = neutral.reduce((n, s) => n + s.yaw, 0) / 3;
  let stageIndex = 0, phase = 0, consecutive = 0;
  for (const s of samples.slice(3)) {
    if (stageIndex === stages.length) break;
    if (stages[stageIndex] === 'blink') {
      if (phase === 0 && s.ear < eye * .62) { phase = 1; consecutive = 0; }
      else if (phase === 1) {
        consecutive = s.ear > eye * .85 ? consecutive + 1 : 0;
        if (consecutive >= 2) {stageIndex++; phase = 0; consecutive = 0;}
      }
    } else if (phase === 0) {
      consecutive = direction * (s.yaw - yaw) >= .14 && s.ear > eye * .6 ? consecutive + 1 : 0;
      if (consecutive >= 2) {phase = 1; consecutive = 0;}
    } else {
      consecutive = Math.abs(s.yaw - yaw) < .07 && s.ear > eye * .85 ? consecutive + 1 : 0;
      if (consecutive >= 2) {stageIndex++; phase = 0; consecutive = 0;}
    }
  }
  const complete = stageIndex === stages.length;
  const stage = complete ? 'complete' : stages[stageIndex];
  return {complete, progress: 1 + stageIndex, stage, message: complete ? 'Motion challenge passed.' : stage === 'blink' ? phase ? 'Open both eyes and hold still.' : 'Close both eyes for about one second, then open them.' : phase ? 'Return to the centre and look straight ahead.' : `Slowly turn your nose toward the ${direction === -1 ? 'LEFT' : 'RIGHT'} edge of the camera image.`};
}

export function faceDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== 128 || b.length !== 128 || [...a, ...b].some(n => !Number.isFinite(n) || Math.abs(n) >= 10)) return Infinity;
  return Math.sqrt(a.reduce((n, x, i) => n + (x - b[i]) ** 2, 0));
}
