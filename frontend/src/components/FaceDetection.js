import { useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';

const DETECTION_INTERVAL_MS = 600;
const BLINK_CLOSED_THRESHOLD = 0.18; // EAR drops below 0.18
const BLINK_OPEN_THRESHOLD = 0.22;   // EAR recovers back above 0.22
const BLINK_TIMEOUT_MS = 20000;      // Must blink within last 20 seconds

// ── Eye Aspect Ratio (EAR) Calculation ──────────────────────────────────────
// Left Eye: 36-41, Right Eye: 42-47
// EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
const calculateEAR = (positions) => {
  if (!positions || positions.length < 68) return 0.3;
  const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

  // Left eye: p1=36, p2=37, p3=38, p4=39, p5=40, p6=41
  const l_v1 = dist(positions[37], positions[41]);
  const l_v2 = dist(positions[38], positions[40]);
  const l_h = dist(positions[36], positions[39]);
  const leftEAR = (l_v1 + l_v2) / (2.0 * Math.max(0.1, l_h));

  // Right eye: p1=42, p2=43, p3=44, p4=45, p5=46, p6=47
  const r_v1 = dist(positions[43], positions[47]);
  const r_v2 = dist(positions[44], positions[46]);
  const r_h = dist(positions[42], positions[45]);
  const rightEAR = (r_v1 + r_v2) / (2.0 * Math.max(0.1, r_h));

  return (leftEAR + rightEAR) / 2.0;
};

const FaceDetection = ({ stream, onFaceDetected }) => {
  const videoRef = useRef(null);
  const intervalRef = useRef(null);
  const modelsReadyRef = useRef(false);
  const callbackRef = useRef(onFaceDetected);
  const mountedRef = useRef(false);

  // Blink state machine
  const wasEyeClosedRef = useRef(false);
  const lastBlinkTimeRef = useRef(Date.now());
  const blinkCountRef = useRef(0);

  callbackRef.current = onFaceDetected;

  useEffect(() => {
    if (!stream) return;
    if (stream.getVideoTracks().length === 0) return;

    let cancelled = false;

    // Load ONLY the 2 lightweight models: tinyFaceDetector and faceLandmark68Net
    const loadModels = async () => {
      if (modelsReadyRef.current) return;
      try {
        const MODEL_URL = process.env.PUBLIC_URL + '/models';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        modelsReadyRef.current = true;
      } catch (err) {
        console.error('[FaceDetection] Lightweight models load failed:', err);
      }
    };

    const createHiddenVideo = () => {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.setAttribute('aria-hidden', 'true');
      video.tabIndex = -1;
      video.style.display = 'none';
      video.style.width = '0px';
      video.style.height = '0px';
      video.style.opacity = '0';
      video.style.position = 'absolute';
      video.style.pointerEvents = 'none';
      video.style.overflow = 'hidden';
      document.body.appendChild(video);
      return video;
    };

    const runDetection = async () => {
      if (!modelsReadyRef.current || !videoRef.current || cancelled) return;

      const video = videoRef.current;
      if (video.readyState !== 4 || video.videoWidth === 0) return;

      try {
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.35,
          }))
          .withFaceLandmarks();

        if (cancelled) return;

        if (!detection) {
          // No face detected -> ABSENT / UNVERIFIED
          if (callbackRef.current) {
            callbackRef.current({
              isValidFace: false,
              isAuthenticallyPresent: false,
              isSuspicious: false,
              ear: 0,
              blinkCount: blinkCountRef.current,
              secondsSinceLastBlink: Math.floor((Date.now() - lastBlinkTimeRef.current) / 1000),
            });
          }
          return;
        }

        const positions = detection.landmarks.positions;
        const ear = calculateEAR(positions);

        // ── Valid Blink Logic: Drops below 0.18 and recovers above 0.22 ──
        if (ear < BLINK_CLOSED_THRESHOLD) {
          wasEyeClosedRef.current = true;
        } else if (ear > BLINK_OPEN_THRESHOLD && wasEyeClosedRef.current) {
          wasEyeClosedRef.current = false;
          blinkCountRef.current += 1;
          lastBlinkTimeRef.current = Date.now();
        }

        const now = Date.now();
        const timeSinceBlink = now - lastBlinkTimeRef.current;
        const hasBlinkedInLast20s = timeSinceBlink <= BLINK_TIMEOUT_MS;

        // Student is considered "Authentically Present" ONLY when face is detected
        // AND at least one natural blink occurred in the last 20 seconds.
        const isAuthenticallyPresent = hasBlinkedInLast20s;
        // If face is detected but zero blinks in 20s, flag as photo spoofing / unverified
        const isSuspicious = !hasBlinkedInLast20s;

        if (callbackRef.current) {
          callbackRef.current({
            isValidFace: true,
            isAuthenticallyPresent,
            isSuspicious,
            ear,
            blinkCount: blinkCountRef.current,
            secondsSinceLastBlink: Math.floor(timeSinceBlink / 1000),
          });
        }
      } catch (err) {
        console.error('[FaceDetection] Detection error:', err);
        if (callbackRef.current) {
          callbackRef.current({
            isValidFace: false,
            isAuthenticallyPresent: false,
            isSuspicious: false,
            ear: 0,
            blinkCount: blinkCountRef.current,
            secondsSinceLastBlink: Math.floor((Date.now() - lastBlinkTimeRef.current) / 1000),
          });
        }
      }
    };

    const init = async () => {
      await loadModels();
      if (cancelled) return;

      const video = createHiddenVideo();
      videoRef.current = video;

      try {
        video.srcObject = stream;
        await video.play();
      } catch (err) {
        console.error('[FaceDetection] Video play error:', err);
        return;
      }

      // Initial grace period: start lastBlinkTimeRef at now
      lastBlinkTimeRef.current = Date.now();
      intervalRef.current = setInterval(runDetection, DETECTION_INTERVAL_MS);
    };

    init();

    return () => {
      cancelled = true;

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.remove();
        videoRef.current = null;
      }

      wasEyeClosedRef.current = false;
      blinkCountRef.current = 0;
    };
  }, [stream]);

  return null;
};

export default FaceDetection;
