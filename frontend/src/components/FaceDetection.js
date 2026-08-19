import { useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';

const DETECTION_INTERVAL_MS = 800;
const HISTORY_BUFFER_SIZE = 5;
const LIVENESS_THRESHOLD = 0.25;
const INPUT_SIZE = 320; // 320px for high-accuracy glasses & partial face detection
const SCORE_THRESHOLD = 0.35; // Lowered to 0.35 for glasses/partial face tolerance
const SPOOF_THRESHOLD_SECONDS = 75;
const BLINK_EAR_THRESHOLD = 0.20; // EAR drop threshold for blink detection

const KEY_LANDMARK_INDICES = [
  0, 8, 16,
  30,
  36, 39, 42, 45,
  48, 54,
];

const EMOTION_LABELS = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised'];

// ── Eye Aspect Ratio (EAR) Calculation for Blink Detection ─────────────────
const calculateEAR = (positions) => {
  if (!positions || positions.length < 68) return 0.3;
  const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

  // Left Eye (36-41)
  const l_v1 = dist(positions[37], positions[41]);
  const l_v2 = dist(positions[38], positions[40]);
  const l_h = dist(positions[36], positions[39]);
  const leftEAR = (l_v1 + l_v2) / (2.0 * (l_h || 1));

  // Right Eye (42-47)
  const r_v1 = dist(positions[43], positions[47]);
  const r_v2 = dist(positions[44], positions[46]);
  const r_h = dist(positions[42], positions[45]);
  const rightEAR = (r_v1 + r_v2) / (2.0 * (r_h || 1));

  return (leftEAR + rightEAR) / 2.0;
};

const FaceDetection = ({ stream, onFaceDetected }) => {
  const videoRef = useRef(null);
  const intervalRef = useRef(null);
  const historyRef = useRef([]);
  const modelsReadyRef = useRef(false);
  const callbackRef = useRef(onFaceDetected);
  const mountedRef = useRef(false);
  const noMovementSecondsRef = useRef(0);
  const isSuspiciousRef = useRef(false);
  const dominantEmotionRef = useRef('neutral');
  const wasEyeClosedRef = useRef(false);
  const blinkCountRef = useRef(0);

  callbackRef.current = onFaceDetected;

  useEffect(() => {
    if (!stream || mountedRef.current) return;
    if (stream.getVideoTracks().length === 0) return;
    mountedRef.current = true;

    let cancelled = false;

    const loadModels = async () => {
      try {
        const MODEL_URL = process.env.PUBLIC_URL + '/models';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        
        // Try loading SSD Mobilenet if available for extra accuracy
        try {
          await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        } catch {
          /* optional fallback */
        }
        
        modelsReadyRef.current = true;
      } catch (err) {
        console.error('[FaceDetection] Model load failed:', err);
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

    const avgLandmarkMovement = (frames) => {
      if (frames.length < 2) return Infinity;

      let totalMovement = 0;
      let comparisons = 0;

      for (let i = 1; i < frames.length; i++) {
        const prev = frames[i - 1];
        const curr = frames[i];
        let frameDist = 0;

        for (const idx of KEY_LANDMARK_INDICES) {
          const dx = curr[idx].x - prev[idx].x;
          const dy = curr[idx].y - prev[idx].y;
          frameDist += Math.sqrt(dx * dx + dy * dy);
        }

        totalMovement += frameDist / KEY_LANDMARK_INDICES.length;
        comparisons++;
      }

      return totalMovement / comparisons;
    };

    const runDetection = async () => {
      if (!modelsReadyRef.current || !videoRef.current || cancelled) return;

      const video = videoRef.current;
      if (video.readyState !== 4 || video.videoWidth === 0) return;

      try {
        // 1. Primary High-Accuracy Detection (Score Threshold 0.35, Input Size 320)
        let detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
            inputSize: INPUT_SIZE,
            scoreThreshold: SCORE_THRESHOLD,
          }))
          .withFaceLandmarks()
          .withFaceExpressions();

        // 2. Adaptive Fallback for Glasses & Partial Face (Score Threshold 0.28)
        if (!detection) {
          detection = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
              inputSize: 224,
              scoreThreshold: 0.28,
            }))
            .withFaceLandmarks()
            .withFaceExpressions();
        }

        if (cancelled) return;

        if (!detection) {
          historyRef.current = [];
          noMovementSecondsRef.current = 0;
          isSuspiciousRef.current = false;
          dominantEmotionRef.current = 'neutral';
          callbackRef.current({
            isValidFace: false,
            emotion: 'neutral',
            isSuspicious: false,
            isBlinking: false,
            blinkCount: blinkCountRef.current,
          });
          return;
        }

        const points = detection.landmarks.positions.map((p) => ({ x: p.x, y: p.y }));
        historyRef.current.push(points);

        if (historyRef.current.length > HISTORY_BUFFER_SIZE) {
          historyRef.current.shift();
        }

        // ── Eye Blink Detection (EAR) ───────────────────────────────────────
        const ear = calculateEAR(points);
        let isBlinking = false;
        if (ear < BLINK_EAR_THRESHOLD) {
          if (!wasEyeClosedRef.current) {
            wasEyeClosedRef.current = true;
            blinkCountRef.current += 1;
            isBlinking = true;
          }
        } else {
          wasEyeClosedRef.current = false;
        }

        // ── Emotion Extraction ──────────────────────────────────────────────
        let emotion = 'neutral';
        if (detection.expressions) {
          let maxScore = 0;
          for (const label of EMOTION_LABELS) {
            const score = detection.expressions[label] || 0;
            if (score > maxScore) {
              maxScore = score;
              emotion = label;
            }
          }
        }
        dominantEmotionRef.current = emotion;

        if (historyRef.current.length < 2) {
          noMovementSecondsRef.current = 0;
          isSuspiciousRef.current = false;
          callbackRef.current({
            isValidFace: true,
            emotion,
            isSuspicious: false,
            isBlinking,
            blinkCount: blinkCountRef.current,
          });
          return;
        }

        const movement = avgLandmarkMovement(historyRef.current);
        const isLive = movement > LIVENESS_THRESHOLD || isBlinking;

        if (isLive) {
          noMovementSecondsRef.current = 0;
          isSuspiciousRef.current = false;
        } else {
          noMovementSecondsRef.current += 1;
          if (noMovementSecondsRef.current >= SPOOF_THRESHOLD_SECONDS) {
            isSuspiciousRef.current = true;
          }
        }

        callbackRef.current({
          isValidFace: true,
          emotion,
          isSuspicious: isSuspiciousRef.current,
          isBlinking,
          blinkCount: blinkCountRef.current,
        });
      } catch (err) {
        console.error('[FaceDetection] Detection error:', err);
        callbackRef.current({
          isValidFace: false,
          emotion: 'neutral',
          isSuspicious: false,
          isBlinking: false,
          blinkCount: blinkCountRef.current,
        });
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

      historyRef.current = [];
      modelsReadyRef.current = false;
      mountedRef.current = false;
      noMovementSecondsRef.current = 0;
      isSuspiciousRef.current = false;
      dominantEmotionRef.current = 'neutral';
      wasEyeClosedRef.current = false;
      blinkCountRef.current = 0;
    };
  }, [stream]);

  return null;
};

export default FaceDetection;
