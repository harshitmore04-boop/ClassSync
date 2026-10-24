(() => {
  let core;
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const centre = points => ({x: points.reduce((n, p) => n + p.x, 0) / points.length, y: points.reduce((n, p) => n + p.y, 0) / points.length});
  function eyeRatio(points) {
    return (distance(points[1], points[5]) + distance(points[2], points[4])) / (2 * distance(points[0], points[3]));
  }
  window.runClassSyncLiveness = async ({video, challenge, cancelled, onUpdate, recoverTracking = false}) => {
    core ||= await import('/liveness-core.js?v=1');
    let started = performance.now(); const samples = []; const overallStarted = started;
    let first, final;
    const ensureActive = () => {
      if (cancelled() || document.hidden || video.readyState < 2 || !video.srcObject?.getVideoTracks().some(t => t.readyState === 'live')) throw Error('Liveness cancelled. Start the camera and try again.');
      if (performance.now() - started > 25000 || Date.now() >= challenge.expires) throw Error('Liveness timed out. Retry and follow the on-screen steps.');
    };
    while (samples.length < 100) {
      ensureActive();
      const detected = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({inputSize:320, scoreThreshold:.6})).withFaceLandmarks(true).withFaceDescriptors();
      ensureActive();
      if(recoverTracking && detected.length === 0 && performance.now()-overallStarted < 45000){samples.length=0;started=performance.now();onUpdate({message:'Face not visible. Look at the camera; the motion steps will restart.',progress:0});await delay(120);continue;}
      if (detected.length !== 1) throw Error(detected.length ? 'Multiple faces detected. Retry with only one person in view.' : 'Face lost. Retry in good light with your face visible.');
      const face = detected[0];
      if (face.detection.box.width < 80) throw Error('Move closer to the camera and retry liveness.');
      final = Array.from(face.descriptor);
      first ||= final;
      if (core.faceDistance(first, final) > .45) throw Error('Face changed during the challenge. Keep the same person in view and retry.');
      const points = face.landmarks.positions, left = points.slice(36, 42), right = points.slice(42, 48);
      const l = centre(left), r = centre(right), separation = Math.abs(r.x - l.x);
      if (separation < 10) throw Error('Face angle is too large. Retry facing the camera.');
      const frame = {t: Math.round(performance.now() - started), ear: (eyeRatio(left) + eyeRatio(right)) / 2, yaw: (points[30].x - (l.x + r.x) / 2) / separation};
      // Calibration can restart until three clear, neutral frames are available.
      if (samples.length < 3 && (frame.ear < .18 || Math.abs(frame.yaw) > .16)) {
        samples.length = 0;
        onUpdate({message:'Look straight at the camera with both eyes open.', progress:0});
      } else {
        samples.push(frame);
        const status = core.evaluateLiveness(samples, challenge.order, challenge.direction);
        onUpdate(status);
        if (status.complete) return {descriptor:final, liveness:{nonce:challenge.nonce, samples, startDescriptor:first, endDescriptor:final}};
      }
      await delay(120);
    }
    throw Error('Challenge not completed. Try again with clear lighting.');
  };
})();
