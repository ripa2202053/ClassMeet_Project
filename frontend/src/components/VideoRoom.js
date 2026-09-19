import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback, lazy, Suspense } from 'react';
import SimplePeer from 'simple-peer';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import '@excalidraw/excalidraw/index.css';
import FaceDetection from './FaceDetection';

const ExcalidrawWrapper = lazy(() => import('@excalidraw/excalidraw').then((m) => ({ default: m.Excalidraw })));

pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.js`;

// ═══════════════════════════════════════════════════════════════════════════════
// ICE / STUN CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelay',
      credential: 'openrelay',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelay',
      credential: 'openrelay',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelay',
      credential: 'openrelay',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// ZOOM-STYLE RESPONSIVE GRID LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════
function getGalleryGridStyle(count) {
  if (count <= 1) {
    return {
      gridTemplateColumns: '1fr',
      maxWidth: '900px',
      margin: '0 auto',
      padding: '0 20px',
    };
  }
  if (count === 2) {
    return { gridTemplateColumns: 'repeat(2, 1fr)' };
  }
  if (count <= 4) {
    return { gridTemplateColumns: 'repeat(2, 1fr)' };
  }
  return { gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AVATAR PLACEHOLDER — Camera-off state with glowing initial
// ═══════════════════════════════════════════════════════════════════════════════
const AvatarPlaceholder = ({ name, size }) => {
  const s = size || 80;
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <div style={{
      width: s, height: s, borderRadius: '50%',
      background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,255,136,0.1))',
      border: '2px solid rgba(0,212,255,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0 30px rgba(0,212,255,0.15)',
      flexShrink: 0,
    }}>
      <span style={{
        color: '#00d4ff', fontSize: s * 0.4, fontWeight: '700',
        textShadow: '0 0 12px rgba(0,212,255,0.5)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        {initial}
      </span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// VideoRoom — Full-mesh WebRTC with Zoom-style layout + Cyberpunk Neon UI
// ═══════════════════════════════════════════════════════════════════════════════
const VideoRoom = forwardRef(({
  socket, roomId, user, participants, viewMode, sidebarMode,
  onFaceTime, onMuteChange, onCameraOff, onToggleScreen, onLivenessChange,
  onToggleSidebar, onLeave, onReaction, onToggleAttendance, showAttendance, attendanceData,
}, ref) => {
  // ── State ──────────────────────────────────────────────────────────────
  const [peers, setPeers] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteScreenShareSocketId, setRemoteScreenShareSocketId] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [spotlightedId, setSpotlightedId] = useState(null);
  const [streamReady, setStreamReady] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState(null);
  const [reactions, setReactions] = useState([]);
  const [isPdfSharing, setIsPdfSharing] = useState(false);
  const [localPdfUrl, setLocalPdfUrl] = useState(null);
  const [localPdfFile, setLocalPdfFile] = useState(null);
  const [localPdfPage, setLocalPdfPage] = useState(1);
  const [localPdfNumPages, setLocalPdfNumPages] = useState(null);
  const [sharedPdfUrl, setSharedPdfUrl] = useState(null);
  const [sharedPdfPage, setSharedPdfPage] = useState(1);
  const [sharedPdfBy, setSharedPdfBy] = useState('');
  const [sharedPdfNumPages, setSharedPdfNumPages] = useState(null);
  const [remoteStatuses, setRemoteStatuses] = useState({});
  const [isWhiteboardActive, setIsWhiteboardActive] = useState(false);
  const [remoteWhiteboardScene, setRemoteWhiteboardScene] = useState(null);
  const [whiteboardHostSocketId, setWhiteboardHostSocketId] = useState(null);
  const whiteboardRef = useRef(null);
  const excalidrawAPIRef = useRef(null);
  const latestWhiteboardSceneRef = useRef(null);
  const isLocalDrawingRef = useRef(false);
  const lastWhiteboardEmitRef = useRef(0);
  const whiteboardTrailingTimerRef = useRef(null);
  const whiteboardScrollTimerRef = useRef(null);
  const lastWhiteboardScrollEmitRef = useRef(0);

  // ── Absence Tracking, 3-Strike Warning & Rejoin States ─────────────
  const [accumulatedAbsentSeconds, setAccumulatedAbsentSeconds] = useState(0);
  const [isWarningActive, setIsWarningActive] = useState(false);
  const [warningRemainingSeconds, setWarningRemainingSeconds] = useState(15);
  const [currentStrike, setCurrentStrike] = useState(1);
  const [isKicked, setIsKicked] = useState(false);
  const [rejoinStatus, setRejoinStatus] = useState('idle'); // 'idle' | 'pending' | 'rejected'
  const [rejoinRequests, setRejoinRequests] = useState([]); // for teacher

  const accumulatedAbsentRef = useRef(0);
  const isAuthenticallyPresentRef = useRef(true);
  const isWarningActiveRef = useRef(false);
  const isKickedRef = useRef(false);
  const startMediaRef = useRef(null);

  // ── Refs ───────────────────────────────────────────────────────────────
  const myVideo = useRef(null);
  const peersRef = useRef([]);
  const streamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const mountedRef = useRef(false);
  const pendingAllUsersRef = useRef([]);
  const pendingSignalsRef = useRef([]);
  const socketRef = useRef(socket);
  const peersKeyRef = useRef(0);
  const remoteStreamsRef = useRef({});
  const localStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const audioAnalysersRef = useRef({});
  const localCameraRef = useRef(null);
  const pdfFileInputRef = useRef(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  socketRef.current = socket;

  useEffect(() => {
    localStreamRef.current = localStream;
    if (localStream) {
      if (myVideo.current && myVideo.current.srcObject !== localStream) {
        myVideo.current.srcObject = localStream;
        myVideo.current.play?.().catch(() => {});
      }
      if (localCameraRef.current && localCameraRef.current.srcObject !== localStream) {
        localCameraRef.current.srcObject = localStream;
        localCameraRef.current.play?.().catch(() => {});
      }
    }
  }, [localStream]);

  // Mobile viewport detection
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ═════════════════════════════════════════════════════════════════════════
  // EXPOSED API
  // ═════════════════════════════════════════════════════════════════════════
  useImperativeHandle(ref, () => ({
    toggleMute,
    toggleCamera,
    toggleScreenShare,
  }));

  // ═════════════════════════════════════════════════════════════════════════
  // SIMPLEPEER FACTORY
  // ═════════════════════════════════════════════════════════════════════════
  const createPeer = useCallback((userToSignal, stream) => {
    const peer = new SimplePeer({ initiator: true, trickle: false, stream, config: ICE_SERVERS });
    peer.on('signal', (signal) => {
      socketRef.current?.emit('sending-signal', { userToSignal, signal });
    });
    peer.on('error', (err) => {
      console.error(`[VideoRoom] Initiator error → ${userToSignal}:`, err.message);
    });
    return peer;
  }, []);

  const addPeer = useCallback((incomingSignal, fromUser, stream) => {
    const peer = new SimplePeer({ initiator: false, trickle: false, stream, config: ICE_SERVERS });
    peer.on('signal', (signal) => {
      socketRef.current?.emit('returning-signal', { userToSignal: fromUser, signal });
    });
    peer.on('error', (err) => {
      console.error(`[VideoRoom] Receiver error ← ${fromUser}:`, err.message);
    });
    peer.signal(incomingSignal);
    return peer;
  }, []);

  // ═════════════════════════════════════════════════════════════════════════
  // ACTIVE SPEAKER DETECTION — Web Audio API
  // ═════════════════════════════════════════════════════════════════════════
  const handleRemoteStreamReady = useCallback((peerId, stream) => {
    remoteStreamsRef.current = { ...remoteStreamsRef.current, [peerId]: stream };
  }, []);

  useEffect(() => {
    if (!streamReady) return;

    let ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
    } catch { return; }
    audioCtxRef.current = ctx;

    const sources = {};

    const setupAnalyser = (id, stream) => {
      if (sources[id]) return;
      if (!stream) return;
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0 || !audioTracks[0].enabled) return;
      try {
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        src.connect(analyser);
        sources[id] = { src, analyser };
      } catch { /* ignore */ }
    };

    const removeAnalyser = (id) => {
      if (sources[id]) {
        try { sources[id].src.disconnect(); } catch { /* ignore */ }
        delete sources[id];
      }
    };

    const intervalId = setInterval(() => {
      const local = localStreamRef.current;
      if (local && !isMuted) {
        setupAnalyser('local', local);
      } else {
        removeAnalyser('local');
      }

      Object.entries(remoteStreamsRef.current).forEach(([id, stream]) => {
        setupAnalyser(id, stream);
      });

      Object.keys(sources).forEach((id) => {
        if (id !== 'local' && !remoteStreamsRef.current[id]) {
          removeAnalyser(id);
        }
      });

      let maxLevel = 0;
      let speakerId = null;
      Object.entries(sources).forEach(([id, { analyser }]) => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        if (avg > maxLevel && avg > 8) {
          maxLevel = avg;
          speakerId = id;
        }
      });

      setActiveSpeakerId((prev) => (prev !== speakerId ? speakerId : prev));
    }, 150);

    return () => {
      clearInterval(intervalId);
      Object.values(sources).forEach((s) => { try { s.src.disconnect(); } catch { /* ignore */ } });
      try { ctx.close(); } catch { /* ignore */ }
      audioCtxRef.current = null;
      audioAnalysersRef.current = {};
    };
  }, [streamReady, peers.length, isMuted]);

  // ═════════════════════════════════════════════════════════════════════════
  // WEBRTC + SOCKET LIFECYCLE
  // ═════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!socket) return;
    if (mountedRef.current) return;
    mountedRef.current = true;

    console.log(`[VideoRoom] Mounting — socket=${socket.id}, room=${roomId}`);

    const createAndTrackPeer = (peerID, peer) => {
      peersKeyRef.current += 1;
      peersRef.current.push({ peerID, peer, key: peersKeyRef.current });
      setPeers((prev) => [...prev, { peerID, peer, key: peersKeyRef.current }]);
    };

    const processPending = () => {
      const stream = streamRef.current;
      if (!stream) return;

      const queuedUsers = pendingAllUsersRef.current.splice(0);
      queuedUsers.forEach((users) => {
        users.forEach((u) => {
          if (peersRef.current.some((p) => p.peerID === u.socketId)) return;
          console.log(`[VideoRoom] → Creating INITIATOR peer for ${u.socketId} (${u.name}) [from pending]`);
          const peer = createPeer(u.socketId, stream);
          createAndTrackPeer(u.socketId, peer);
        });
      });

      const queuedSignals = pendingSignalsRef.current.splice(0);
      queuedSignals.forEach(({ signal, from }) => {
        if (peersRef.current.some((p) => p.peerID === from)) return;
        console.log(`[VideoRoom] → Creating RECEIVER peer for ${from} [from pending]`);
        const peer = addPeer(signal, from, stream);
        createAndTrackPeer(from, peer);
      });
    };

    const onAllUsers = (users) => {
      console.log(`[VideoRoom] all-users received: ${users.length} existing users`);
      if (!streamRef.current) {
        console.log(`[VideoRoom] Stream not ready — queuing ${users.length} users`);
        pendingAllUsersRef.current.push(users);
        return;
      }
      users.forEach((u) => {
        if (peersRef.current.some((p) => p.peerID === u.socketId)) return;
        console.log(`[VideoRoom] Creating INITIATOR peer for ${u.socketId} (${u.name})`);
        const peer = createPeer(u.socketId, streamRef.current);
        createAndTrackPeer(u.socketId, peer);
      });
    };

    const onReceivingSignal = ({ signal, from }) => {
      if (from === socket.id) return;
      if (peersRef.current.some((p) => p.peerID === from)) return;
      console.log(`[VideoRoom] Receiving offer from ${from}`);
      if (!streamRef.current) {
        console.log(`[VideoRoom] Stream not ready — queuing signal from ${from}`);
        pendingSignalsRef.current.push({ signal, from });
        return;
      }
      console.log(`[VideoRoom] Creating RECEIVER peer for ${from}`);
      const peer = addPeer(signal, from, streamRef.current);
      createAndTrackPeer(from, peer);
    };

    const onSignalReceived = ({ signal, from }) => {
      const peerObj = peersRef.current.find((p) => p.peerID === from);
      if (peerObj) {
        console.log(`[VideoRoom] Answer received from ${from}`);
        peerObj.peer.signal(signal);
      }
    };

    const onUserLeft = (userId) => {
      console.log(`[VideoRoom] user-left: ${userId}`);
      const peerObj = peersRef.current.find((p) => p.peerID === userId);
      if (peerObj) peerObj.peer.destroy();
      peersRef.current = peersRef.current.filter((p) => p.peerID !== userId);
      setPeers((prev) => prev.filter((p) => p.peerID !== userId));
      setSpotlightedId((prev) => (prev === userId ? null : prev));
      delete remoteStreamsRef.current[userId];
    };

    const onPdfShared = ({ pdfData, page, sharedBy: by }) => {
      console.log(`[VideoRoom] PDF shared by ${by} — page ${page}`);
      setSharedPdfUrl(pdfData);
      setSharedPdfPage(page || 1);
      setSharedPdfBy(by || '');
    };

    const onPdfPageChanged = ({ page }) => {
      setSharedPdfPage(page);
    };

    const onPdfStopped = () => {
      console.log('[VideoRoom] PDF sharing stopped');
      setSharedPdfUrl(null);
      setSharedPdfPage(1);
      setSharedPdfBy('');
      setSharedPdfNumPages(null);
    };

    const onWhiteboardStarted = ({ startedBy, socketId: hostSocketId }) => {
      console.log(`[VideoRoom] Whiteboard started by ${startedBy}`);
      setIsWhiteboardActive(true);
      setWhiteboardHostSocketId(hostSocketId || null);
    };

    const onWhiteboardDraw = ({ scene, socketId, startedBy }) => {
      if (socketId === socketRef.current?.id) return;
      console.log(`[VideoRoom] Whiteboard scene update from ${startedBy}`);
      latestWhiteboardSceneRef.current = scene;
      setRemoteWhiteboardScene(scene);
      if (excalidrawAPIRef.current && scene?.elements) {
        const updatePayload = {
          elements: scene.elements,
          captureUpdate: 2,
        };
        if (scene.appState) {
          updatePayload.appState = {
            scrollX: scene.appState.scrollX,
            scrollY: scene.appState.scrollY,
            zoom: scene.appState.zoom,
            ...(scene.appState.viewBackgroundColor ? { viewBackgroundColor: scene.appState.viewBackgroundColor } : {}),
          };
        }
        excalidrawAPIRef.current.updateScene(updatePayload);
      }
    };

    const onWhiteboardClear = () => {
      console.log('[VideoRoom] Whiteboard cleared');
      latestWhiteboardSceneRef.current = null;
      setRemoteWhiteboardScene(null);
      if (excalidrawAPIRef.current) {
        excalidrawAPIRef.current.updateScene({ elements: [] });
        excalidrawAPIRef.current.resetScene();
      }
    };

    const onWhiteboardStop = () => {
      console.log('[VideoRoom] Whiteboard stopped');
      setIsWhiteboardActive(false);
      setRemoteWhiteboardScene(null);
      setWhiteboardHostSocketId(null);
    };

    const onScreenShareStarted = ({ socketId }) => {
      console.log(`[VideoRoom] Remote screen share started by ${socketId}`);
      setRemoteScreenShareSocketId(socketId);
    };

    const onScreenShareStopped = () => {
      console.log('[VideoRoom] Remote screen share stopped');
      setRemoteScreenShareSocketId(null);
    };

    socket.on('all-users', onAllUsers);
    socket.on('receiving-signal', onReceivingSignal);
    socket.on('signal-received', onSignalReceived);
    socket.on('user-left', onUserLeft);
    socket.on('pdf-shared', onPdfShared);
    socket.on('pdf-page-changed', onPdfPageChanged);
    socket.on('pdf-stopped', onPdfStopped);
    socket.on('whiteboard-draw', onWhiteboardDraw);
    socket.on('whiteboard-clear', onWhiteboardClear);
    socket.on('whiteboard-stop', onWhiteboardStop);
    socket.on('whiteboard-started', onWhiteboardStarted);
    socket.on('screen-share-started', onScreenShareStarted);
    socket.on('screen-share-stopped', onScreenShareStopped);

    const onUserMuted = ({ socketId, muted }) => {
      setRemoteStatuses((prev) => ({ ...prev, [socketId]: { ...prev[socketId], muted } }));
    };
    const onUserCamera = ({ socketId, cameraOff }) => {
      setRemoteStatuses((prev) => ({ ...prev, [socketId]: { ...prev[socketId], cameraOff } }));
    };
    const onMuteAll = () => {
      if (!streamRef.current) return;
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach((t) => { t.enabled = false; });
      setIsMuted(true);
      if (onMuteChange) onMuteChange(true);
    };
    socket.on('user-muted', onUserMuted);
    socket.on('user-camera', onUserCamera);
    socket.on('mute-all', onMuteAll);

    const joinRoom = (stream, mode) => {
      if (!mountedRef.current) {
        if (stream) stream.getTracks().forEach(t => t.stop());
        return;
      }
      if (stream) {
        streamRef.current = stream;
        localStreamRef.current = stream;
        setLocalStream(stream);
        if (myVideo.current) {
          myVideo.current.srcObject = stream;
          myVideo.current.play?.().catch(() => {});
        }
        if (localCameraRef.current) {
          localCameraRef.current.srcObject = stream;
          localCameraRef.current.play?.().catch(() => {});
        }
      }
      if (mode !== 'full') {
        setIsCameraOff(true);
      } else {
        setIsCameraOff(false);
      }
      setStreamReady(true);
      socket.emit('join-room', roomId, user._id, { name: user.name, role: user.role });
      console.log(`[VideoRoom] ${mode} → joined room ${roomId}`);
      processPending();
    };

    const MEDIA_TIMEOUT = 15000;
    const withTimeout = (promise, ms) => {
      let timer;
      return Promise.race([
        promise,
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('getUserMedia timed out')), ms); }),
      ]).finally(() => clearTimeout(timer));
    };

    const acquireAndJoinMedia = async () => {
      let stream = null;
      let mode = 'full';

      try {
        // 1. Try video + audio with ideal constraints
        stream = await withTimeout(
          navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
            audio: true,
          }),
          MEDIA_TIMEOUT
        );
      } catch (err1) {
        console.warn('[VideoRoom] video+audio with constraints failed:', err1.message);

        // 2. Try unconstrained video + audio
        try {
          stream = await withTimeout(
            navigator.mediaDevices.getUserMedia({ video: true, audio: true }),
            MEDIA_TIMEOUT
          );
        } catch (err2) {
          console.warn('[VideoRoom] unconstrained video+audio failed:', err2.message);

          // 3. Try acquiring video and audio separately (crucial on Windows if driver doesn't support simultaneous open)
          try {
            const vStream = await withTimeout(
              navigator.mediaDevices.getUserMedia({ video: true }),
              MEDIA_TIMEOUT
            ).catch((e) => {
              console.warn('[VideoRoom] video-only failed:', e.message);
              return null;
            });

            const aStream = await withTimeout(
              navigator.mediaDevices.getUserMedia({ audio: true }),
              MEDIA_TIMEOUT
            ).catch((e) => {
              console.warn('[VideoRoom] audio-only failed:', e.message);
              return null;
            });

            if (vStream || aStream) {
              stream = new MediaStream();
              if (vStream) vStream.getVideoTracks().forEach((t) => stream.addTrack(t));
              if (aStream) aStream.getAudioTracks().forEach((t) => stream.addTrack(t));
              mode = vStream ? 'full' : 'audio-only';
            }
          } catch (err3) {
            console.warn('[VideoRoom] separate acquisition failed:', err3.message);
          }

          // 4. Fallback to audio-only if video is blocked
          if (!stream) {
            try {
              stream = await withTimeout(
                navigator.mediaDevices.getUserMedia({ video: false, audio: true }),
                MEDIA_TIMEOUT
              );
              mode = 'audio-only';
            } catch (err4) {
              console.warn('[VideoRoom] audio-only also failed:', err4.message);
              stream = null;
              mode = 'no-media';
            }
          }
        }
      }

      if (!mountedRef.current) {
        if (stream) stream.getTracks().forEach((t) => t.stop());
        return;
      }
      if (!stream) return joinRoom(null, 'no-media');
      if (!stream.getVideoTracks().length) return joinRoom(stream, 'audio-only');
      joinRoom(stream, mode);
    };

    startMediaRef.current = acquireAndJoinMedia;
    acquireAndJoinMedia();

    return () => {
      mountedRef.current = false;
      startMediaRef.current = null;
      console.log(`[VideoRoom] Unmounting — cleaning up`);

      socket.off('all-users', onAllUsers);
      socket.off('receiving-signal', onReceivingSignal);
      socket.off('signal-received', onSignalReceived);
      socket.off('user-left', onUserLeft);
      socket.off('pdf-shared', onPdfShared);
      socket.off('pdf-page-changed', onPdfPageChanged);
      socket.off('pdf-stopped', onPdfStopped);
      socket.off('whiteboard-draw', onWhiteboardDraw);
      socket.off('whiteboard-clear', onWhiteboardClear);
      socket.off('whiteboard-stop', onWhiteboardStop);
      socket.off('whiteboard-started', onWhiteboardStarted);
      socket.off('screen-share-started', onScreenShareStarted);
      socket.off('screen-share-stopped', onScreenShareStopped);
      socket.off('user-muted', onUserMuted);
      socket.off('user-camera', onUserCamera);
      socket.off('mute-all', onMuteAll);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }

      peersRef.current.forEach(({ peer }) => peer.destroy());
      peersRef.current = [];
      setPeers([]);
      setLocalStream(null);
      setStreamReady(false);
      pendingAllUsersRef.current = [];
      pendingSignalsRef.current = [];
      remoteStreamsRef.current = {};
      setActiveSpeakerId(null);
      setIsPdfSharing(false);
      setLocalPdfUrl(null);
      setLocalPdfFile(null);
      setLocalPdfPage(1);
      setLocalPdfNumPages(null);
      setSharedPdfUrl(null);
      setSharedPdfPage(1);
      setSharedPdfBy('');
      setSharedPdfNumPages(null);
      setRemoteStatuses({});
      setIsWhiteboardActive(false);
      setRemoteWhiteboardScene(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomId, user._id, createPeer, addPeer]);

  // ═════════════════════════════════════════════════════════════════════════
  // MEDIA CONTROLS
  // ═════════════════════════════════════════════════════════════════════════
  const toggleMute = () => {
    if (!streamRef.current) return;
    const audioTracks = streamRef.current.getAudioTracks();
    if (audioTracks.length === 0) return;
    const newMuted = !isMuted;
    audioTracks.forEach((t) => { t.enabled = !newMuted; });
    setIsMuted(newMuted);
    if (onMuteChange) onMuteChange(newMuted);
    socket.emit('user-muted', { roomId, userId: user._id, socketId: socket.id, muted: newMuted });
  };

  const toggleCamera = async () => {
    try {
      const activeVideoTracks = streamRef.current
        ? streamRef.current.getVideoTracks().filter((t) => t.readyState === 'live')
        : [];

      if (isCameraOff) {
        // User wants to turn camera ON
        if (activeVideoTracks.length > 0) {
          activeVideoTracks.forEach((t) => { t.enabled = true; });
          setIsCameraOff(false);
          if (onCameraOff) onCameraOff(false);
          socket.emit('user-camera', { roomId, userId: user._id, socketId: socket.id, cameraOff: false });
        } else {
          // No live video track exists yet -> acquire one now!
          console.log('[VideoRoom] Requesting camera track dynamically...');
          let newStream = null;
          try {
            newStream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
            });
          } catch (e1) {
            console.warn('[VideoRoom] Ideal constraints failed, trying unconstrained video:', e1.message);
            newStream = await navigator.mediaDevices.getUserMedia({ video: true });
          }

          const newVideoTrack = newStream.getVideoTracks()[0];
          if (!newVideoTrack) {
            throw new Error('No video track returned from camera device.');
          }

          if (!streamRef.current) {
            streamRef.current = new MediaStream();
          }
          streamRef.current.addTrack(newVideoTrack);

          const updatedStream = new MediaStream(streamRef.current.getTracks());
          localStreamRef.current = updatedStream;
          setLocalStream(updatedStream);

          if (myVideo.current) {
            myVideo.current.srcObject = updatedStream;
            myVideo.current.play?.().catch(() => {});
          }
          if (localCameraRef.current) {
            localCameraRef.current.srcObject = updatedStream;
            localCameraRef.current.play?.().catch(() => {});
          }

          // Relay new track to all active peer connections
          peersRef.current.forEach(({ peer }) => {
            try {
              const senders = peer._pc?.getSenders() || [];
              const videoSender = senders.find((s) => s.track?.kind === 'video');
              if (videoSender) {
                videoSender.replaceTrack(newVideoTrack);
              } else if (peer.replaceTrack && activeVideoTracks[0]) {
                peer.replaceTrack(activeVideoTracks[0], newVideoTrack, streamRef.current);
              } else if (peer.addTrack) {
                peer.addTrack(newVideoTrack, streamRef.current);
              } else if (peer._pc) {
                peer._pc.addTrack(newVideoTrack, streamRef.current);
              }
            } catch (err) {
              console.warn('[VideoRoom] Failed to send new video track to peer:', err);
            }
          });

          setIsCameraOff(false);
          if (onCameraOff) onCameraOff(false);
          socket.emit('user-camera', { roomId, userId: user._id, socketId: socket.id, cameraOff: false });
          console.log('[VideoRoom] Camera successfully turned on!');
        }
      } else {
        // User wants to turn camera OFF
        if (activeVideoTracks.length > 0) {
          activeVideoTracks.forEach((t) => { t.enabled = false; });
        }
        setIsCameraOff(true);
        if (onCameraOff) onCameraOff(true);
        socket.emit('user-camera', { roomId, userId: user._id, socketId: socket.id, cameraOff: true });
      }
    } catch (err) {
      console.error('[VideoRoom] Error toggling camera:', err);
      alert(
        `Unable to access camera: ${err.message || err.name}.\n\n` +
        `• Please check that camera permission is allowed for this site (click the settings icon next to the URL in the address bar).\n` +
        `• Make sure no other application (such as Zoom, Microsoft Teams, or another browser window) is currently using your webcam.`
      );
    }
  };

  const toggleScreenShare = () => {
    if (isScreenSharing) stopScreenShare();
    else startScreenShare();
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', displaySurface: 'monitor' },
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      });
      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);
      if (onToggleScreen) onToggleScreen(true);
      if (myVideo.current) myVideo.current.srcObject = screenStream;

      // Attach camera stream to filmstrip tile during screen share
      if (localCameraRef.current && streamRef.current) {
        localCameraRef.current.srcObject = streamRef.current;
      }

      const screenTrack = screenStream.getVideoTracks()[0];
      peersRef.current.forEach(({ peer }) => {
        const sender = peer._pc?.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack);
      });
      screenTrack.onended = () => stopScreenShare();
      socket.emit('screen-share-started', { roomId, userId: user._id, socketId: socket.id });
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        console.error('[VideoRoom] Screen share error:', err);
      }
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    setIsScreenSharing(false);
    if (onToggleScreen) onToggleScreen(false);
    if (myVideo.current && streamRef.current) {
      myVideo.current.srcObject = streamRef.current;
    }
    if (localCameraRef.current) {
      localCameraRef.current.srcObject = null;
    }
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      peersRef.current.forEach(({ peer }) => {
        const sender = peer._pc?.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(videoTrack);
      });
    }
    socket.emit('screen-share-stopped', { roomId, userId: user._id, socketId: socket.id });
  };

  // ═════════════════════════════════════════════════════════════════════════
  // PDF SHARING
  // ═════════════════════════════════════════════════════════════════════════
  const handlePdfFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLocalPdfUrl(ev.target.result);
      setLocalPdfFile(file);
      setLocalPdfPage(1);
      startPdfShare(ev.target.result, file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const startPdfShare = (dataUrl, fileName) => {
    setIsPdfSharing(true);
    setLocalPdfPage(1);
    socket.emit('pdf-share', {
      roomId,
      pdfData: dataUrl,
      page: 1,
      sharedBy: user?.name,
    });
  };

  const stopPdfShare = () => {
    setIsPdfSharing(false);
    setLocalPdfUrl(null);
    setLocalPdfFile(null);
    setLocalPdfPage(1);
    setLocalPdfNumPages(null);
    socket.emit('pdf-stop', { roomId });
  };

  const isActivePdfPresenter = isPdfSharing && !!localPdfUrl;
  const isPdfPresenter = isActivePdfPresenter || (user?.role === 'teacher' && (!!sharedPdfUrl || !!localPdfUrl));
  const activePdfUrl = isActivePdfPresenter ? localPdfUrl : sharedPdfUrl;
  const activePdfPage = isActivePdfPresenter ? localPdfPage : sharedPdfPage;
  const activePdfNumPages = isActivePdfPresenter ? localPdfNumPages : sharedPdfNumPages;
  const activePdfBy = isActivePdfPresenter ? user?.name : sharedPdfBy;
  const canNavigatePdf = isPdfPresenter;

  const changePdfPage = (newPage) => {
    if (newPage < 1) return;
    if (activePdfNumPages && newPage > activePdfNumPages) return;
    setLocalPdfPage(newPage);
    setSharedPdfPage(newPage);
    socket.emit('pdf-page-change', { roomId, page: newPage });
  };

  // ═════════════════════════════════════════════════════════════════════════
  // WHITEBOARD (Excalidraw)
  // ═════════════════════════════════════════════════════════════════════════
  const emitWhiteboardScene = useCallback((elements, appState) => {
    if (!socket || !roomId) return;
    const currentAppState = appState || excalidrawAPIRef.current?.getAppState?.();
    const appStateToSync = currentAppState ? {
      scrollX: currentAppState.scrollX,
      scrollY: currentAppState.scrollY,
      zoom: currentAppState.zoom,
      viewBackgroundColor: currentAppState.viewBackgroundColor,
    } : undefined;

    socket.emit('whiteboard-draw', {
      roomId,
      scene: {
        elements,
        appState: appStateToSync,
      },
      socketId: socket.id,
      startedBy: user?.name,
    });
  }, [socket, roomId, user?.name]);

  const toggleWhiteboard = () => {
    if (user?.role !== 'teacher') return;
    if (isWhiteboardActive) {
      closeWhiteboard();
    } else {
      setIsWhiteboardActive(true);
      setWhiteboardHostSocketId(socket.id);
      socket.emit('whiteboard-started', { roomId, startedBy: user?.name, socketId: socket.id });
      const currentElements = excalidrawAPIRef.current?.getSceneElements?.() || [];
      const currentAppState = excalidrawAPIRef.current?.getAppState?.();
      if (currentElements.length > 0) {
        emitWhiteboardScene(currentElements, currentAppState);
      }
    }
  };

  const closeWhiteboard = () => {
    if (whiteboardTrailingTimerRef.current) {
      clearTimeout(whiteboardTrailingTimerRef.current);
    }
    if (whiteboardScrollTimerRef.current) {
      clearTimeout(whiteboardScrollTimerRef.current);
    }
    setIsWhiteboardActive(false);
    setRemoteWhiteboardScene(null);
    setWhiteboardHostSocketId(null);
    latestWhiteboardSceneRef.current = null;
    excalidrawAPIRef.current = null;
    isLocalDrawingRef.current = false;
    lastWhiteboardEmitRef.current = 0;
    lastWhiteboardScrollEmitRef.current = 0;
    socket.emit('whiteboard-stop', { roomId });
  };

  const handleWhiteboardChange = useCallback((elements, appState) => {
    if (!socket || user?.role !== 'teacher') return;
    const now = Date.now();
    if (whiteboardTrailingTimerRef.current) {
      clearTimeout(whiteboardTrailingTimerRef.current);
    }
    // Emit promptly, and guarantee trailing flush so no strokes or elements are ever dropped
    if (now - lastWhiteboardEmitRef.current >= 60) {
      lastWhiteboardEmitRef.current = now;
      emitWhiteboardScene(elements, appState);
    } else {
      whiteboardTrailingTimerRef.current = setTimeout(() => {
        lastWhiteboardEmitRef.current = Date.now();
        emitWhiteboardScene(elements, appState);
      }, 70);
    }
  }, [socket, user?.role, emitWhiteboardScene]);

  const handleWhiteboardScrollChange = useCallback((scrollX, scrollY, zoom) => {
    if (!socket || user?.role !== 'teacher' || !excalidrawAPIRef.current) return;
    const now = Date.now();
    if (whiteboardScrollTimerRef.current) {
      clearTimeout(whiteboardScrollTimerRef.current);
    }

    const syncScroll = () => {
      if (!excalidrawAPIRef.current) return;
      const elements = excalidrawAPIRef.current.getSceneElements();
      const appState = {
        scrollX,
        scrollY,
        zoom,
      };
      emitWhiteboardScene(elements, appState);
    };

    if (now - lastWhiteboardScrollEmitRef.current >= 60) {
      lastWhiteboardScrollEmitRef.current = now;
      syncScroll();
    } else {
      whiteboardScrollTimerRef.current = setTimeout(() => {
        lastWhiteboardScrollEmitRef.current = Date.now();
        syncScroll();
      }, 70);
    }
  }, [socket, user?.role, emitWhiteboardScene]);

  const handleWhiteboardPointerDown = useCallback(() => {
    isLocalDrawingRef.current = true;
  }, []);

  const handleWhiteboardPointerUp = useCallback(() => {
    isLocalDrawingRef.current = false;
    if (!socket || !excalidrawAPIRef.current || user?.role !== 'teacher') return;
    const elements = excalidrawAPIRef.current.getSceneElements();
    const appState = excalidrawAPIRef.current.getAppState();
    emitWhiteboardScene(elements, appState);
  }, [socket, user?.role, emitWhiteboardScene]);

  const handleWhiteboardClear = useCallback(() => {
    setRemoteWhiteboardScene(null);
    if (socket) socket.emit('whiteboard-clear', { roomId });
  }, [socket, roomId]);

  const toggleHandRaise = () => {
    const next = !isHandRaised;
    setIsHandRaised(next);
    if (next) {
      addReaction('✋');
      socket.emit('reaction', { roomId, emoji: '✋', userId: user._id, socketId: socket.id });
    }
  };

  const addReaction = (emoji) => {
    const id = Date.now();
    setReactions((prev) => [...prev, { emoji, id }]);
    if (onReaction) onReaction();
    setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 2500);
  };

  const sendQuickReaction = (emoji) => {
    addReaction(emoji);
    socket.emit('reaction', { roomId, emoji, userId: user._id, socketId: socket.id });
  };

  // ═════════════════════════════════════════════════════════════════════════
  // AUTO-KICK & REJOIN WORKFLOW
  // ═════════════════════════════════════════════════════════════════════════
  const executeAutoKick = useCallback(() => {
    console.warn('[VideoRoom] Absence limit exceeded (3 Strikes). Auto-kicking student.');
    setIsKicked(true);
    isKickedRef.current = true;
    setIsWarningActive(false);
    isWarningActiveRef.current = false;
    setRejoinStatus('idle');

    // 1. Terminate all local WebRTC tracks immediately
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    if (myVideo.current) {
      myVideo.current.srcObject = null;
    }

    // 2. Destroy all peer connections
    peersRef.current.forEach(({ peer }) => {
      try {
        peer.destroy();
      } catch (e) {}
    });
    peersRef.current = [];
    setPeers([]);
    setStreamReady(false);
    remoteStreamsRef.current = {};

    // 3. Inform backend / peers that student left
    socket.emit('leave-room', roomId, user._id);
  }, [socket, roomId, user._id]);

  const rejoinClassroom = useCallback(() => {
    console.log('[VideoRoom] Re-admitted to classroom. Re-initializing media.');
    setIsKicked(false);
    isKickedRef.current = false;
    setRejoinStatus('idle');
    accumulatedAbsentRef.current = 0;
    setAccumulatedAbsentSeconds(0);
    setIsWarningActive(false);
    isWarningActiveRef.current = false;
    setWarningRemainingSeconds(15);
    setCurrentStrike(1);

    if (startMediaRef.current) {
      startMediaRef.current();
    }
  }, []);

  const handleRequestRejoin = () => {
    setRejoinStatus('pending');
    socket.emit('request-rejoin', {
      roomId,
      userId: user._id,
      studentName: user.name,
    });
  };

  const handleApproveRejoin = (targetUserId) => {
    socket.emit('approve-rejoin', { roomId, targetUserId });
    setRejoinRequests((prev) => prev.filter((r) => r.userId !== targetUserId));
  };

  const handleRejectRejoin = (targetUserId) => {
    socket.emit('reject-rejoin', { roomId, targetUserId });
    setRejoinRequests((prev) => prev.filter((r) => r.userId !== targetUserId));
  };

  // Student & Teacher Rejoin Event Listeners
  useEffect(() => {
    if (!socket) return;

    const onApproveRejoin = ({ targetUserId }) => {
      if (user?.role === 'student' && targetUserId === user._id) {
        rejoinClassroom();
      }
    };

    const onRejectRejoin = ({ targetUserId }) => {
      if (user?.role === 'student' && targetUserId === user._id) {
        setRejoinStatus('rejected');
      }
    };

    const onRequestRejoin = ({ roomId: reqRoomId, userId: reqUserId, studentName, socketId }) => {
      if (user?.role === 'teacher') {
        setRejoinRequests((prev) => {
          if (prev.some((r) => r.userId === reqUserId)) return prev;
          return [...prev, { userId: reqUserId, studentName, socketId, roomId: reqRoomId }];
        });
      }
    };

    socket.on('approve-rejoin', onApproveRejoin);
    socket.on('reject-rejoin', onRejectRejoin);
    socket.on('request-rejoin', onRequestRejoin);

    return () => {
      socket.off('approve-rejoin', onApproveRejoin);
      socket.off('reject-rejoin', onRejectRejoin);
      socket.off('request-rejoin', onRequestRejoin);
    };
  }, [socket, user._id, user?.role, rejoinClassroom]);

  // Face detection warning system disabled per user request
  useEffect(() => {
    setIsWarningActive(false);
    isWarningActiveRef.current = false;
  }, []);

  // ═════════════════════════════════════════════════════════════════════════
  // FACE DETECTION (student only)
  // ═════════════════════════════════════════════════════════════════════════
  const handleFaceDetected = useCallback(({ isValidFace, emotion, isSuspicious, isAuthenticallyPresent }) => {
    isAuthenticallyPresentRef.current = !!isAuthenticallyPresent;

    // Fast-dismiss warning modal if student blinks & face detected
    if (isAuthenticallyPresent && isWarningActiveRef.current) {
      setIsWarningActive(false);
      isWarningActiveRef.current = false;
      setWarningRemainingSeconds(15);
      setCurrentStrike(1);
    }

    if (onFaceTime) onFaceTime(isValidFace ? 1 : 0);
    if (onLivenessChange) onLivenessChange(isSuspicious ? 'suspicious' : isValidFace ? 'live' : 'no_face');

    // CRITICAL PRIVACY RULE: Zero socket alerts, notifications, or badges emitted to teacher or peers during warning phase or when kicked
    if (!isWarningActiveRef.current && !isKickedRef.current) {
      socket.emit('face-detected', {
        roomId, userId: user._id, socketId: socket.id, studentName: user.name, isValidFace,
        emotion: emotion || 'neutral',
        isSuspicious: !!isSuspicious,
      });
    }
  }, [socket, roomId, user._id, user.name, onFaceTime, onLivenessChange]);

  // ═════════════════════════════════════════════════════════════════════════
  // SPOTLIGHT
  // ═════════════════════════════════════════════════════════════════════════
  const handleSpotlight = useCallback((peerId) => {
    setSpotlightedId((prev) => (prev === peerId ? null : peerId));
  }, []);

  // ═════════════════════════════════════════════════════════════════════════
  // DERIVED DATA
  // ═════════════════════════════════════════════════════════════════════════
  const activePeers = peers.filter((p) => p.peer && p.peerID !== socket?.id);
  const localMeta = { name: user?.name, role: user?.role };
  const remoteScreenShareStream = remoteScreenShareSocketId ? remoteStreamsRef.current[remoteScreenShareSocketId] : null;
  const isInPresentationMode = isScreenSharing || !!remoteScreenShareSocketId || isActivePdfPresenter || !!sharedPdfUrl || isWhiteboardActive;
  const isActivePresenter = isScreenSharing || isActivePdfPresenter || (isWhiteboardActive && (whiteboardHostSocketId === socket?.id || user?.role === 'teacher'));

  const resolveMeta = (peerId) => {
    const meta = participants?.find((p) => p.socketId === peerId);
    return { name: meta?.name || 'Participant', role: meta?.role || 'student', userId: meta?.userId };
  };

  const getDetectedDuration = (peerName, peerId) => {
    if (!attendanceData?.students) return null;
    const meta = resolveMeta(peerId);
    const student = attendanceData.students.find(
      (s) => (meta.userId && s.studentId === meta.userId) || s.name === meta.name || s.name === peerName
    );
    if (!student) return null;
    if (student.isSuspicious) return { text: '⚠️ Photo Spoof', isSuspicious: true };
    if (!student.faceTime) return null;
    const s = Math.floor(student.faceTime);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    return { text: timeStr, isSuspicious: false };
  };

  const localDetectedDuration = user?.role === 'student' && attendanceData?.students ? (() => {
    const me = attendanceData.students.find((s) => s.studentId === user._id || s.name === user.name);
    if (!me) return null;
    if (me.isSuspicious) return { text: '⚠️ Photo Spoof', isSuspicious: true };
    if (!me.faceTime) return null;
    const s = Math.floor(me.faceTime);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    return { text: timeStr, isSuspicious: false };
  })() : null;

  // ═════════════════════════════════════════════════════════════════════════
  // TILE BUILDERS
  // ═════════════════════════════════════════════════════════════════════════
  const localTile = (
    <VideoTile
      videoRef={myVideo}
      name={localMeta.name}
      suffix=" (You)"
      isMuted={isMuted}
      isCameraOff={isCameraOff}
      isLocal
      role={localMeta.role}
      isActiveSpeaker={activeSpeakerId === 'local'}
      isHandRaised={isHandRaised}
      detectedDuration={localDetectedDuration}
    />
  );

  const buildPeerTile = (peerObj, opts = {}) => {
    const meta = resolveMeta(peerObj.peerID);
    const duration = getDetectedDuration(meta.name, peerObj.peerID);
    return (
      <PeerVideo
        key={peerObj.key || peerObj.peerID}
        peer={peerObj.peer}
        name={meta.name}
        role={meta.role}
        peerId={peerObj.peerID}
        detectedDuration={duration}
        remoteStatus={remoteStatuses[peerObj.peerID]}
        isSpotlighted={spotlightedId === peerObj.peerID}
        isActiveSpeaker={activeSpeakerId === peerObj.peerID}
        onClick={user?.role === 'teacher' ? () => handleSpotlight(peerObj.peerID) : undefined}
        isCompact={opts.isCompact || false}
        onStreamReady={handleRemoteStreamReady}
      />
    );
  };

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div style={S.container}>
      {/* ── Headless Face Detection (Runs continuously across all views including Presentation) ── */}
      {user?.role === 'student' && localStream && !isKicked && (
        <FaceDetection stream={localStream} onFaceDetected={handleFaceDetected} />
      )}

      {/* ── Auto-Kicked Overlay (Student Only) ────────────────────── */}
      {isKicked && (
        <div style={S.kickedOverlay}>
          <div style={S.kickedCard}>
            <div style={S.kickedIconContainer}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ff4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>
            <h2 style={S.kickedTitle}>Removed for Excessive Absence</h2>
            <p style={S.kickedDesc}>
              You have been removed from the classroom after receiving 3 strikes for sustained absence or unverified presence.
              Your camera and microphone have been disconnected.
            </p>

            {rejoinStatus === 'idle' && (
              <div style={S.kickedActions}>
                <button style={S.rejoinBtn} onClick={handleRequestRejoin}>
                  Request to Re-join Class
                </button>
                <button style={S.kickedLeaveBtn} onClick={onLeave}>
                  Leave Class
                </button>
              </div>
            )}

            {rejoinStatus === 'pending' && (
              <div style={S.rejoinPendingBox}>
                <div style={S.loadingSpinnerSmall} />
                <span style={S.rejoinPendingText}>Request sent to teacher. Waiting for admission...</span>
                <button style={{ ...S.kickedLeaveBtn, marginTop: '12px' }} onClick={onLeave}>
                  Leave Class
                </button>
              </div>
            )}

            {rejoinStatus === 'rejected' && (
              <div style={S.rejoinRejectedBox}>
                <p style={S.rejoinRejectedText}>Your re-join request was declined by the teacher.</p>
                <div style={S.kickedActions}>
                  <button style={S.rejoinBtn} onClick={handleRequestRejoin}>
                    Request Again
                  </button>
                  <button style={S.kickedLeaveBtn} onClick={onLeave}>
                    Leave Class
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Teacher Rejoin Requests Toast (Teacher Only) ─────────────── */}
      {user?.role === 'teacher' && rejoinRequests.length > 0 && (
        <div style={S.teacherRejoinToastContainer}>
          {rejoinRequests.map((req) => (
            <div key={req.userId} style={S.teacherRejoinToast}>
              <div style={S.teacherToastHeader}>
                <div style={S.teacherToastAvatar}>
                  {req.studentName?.[0]?.toUpperCase() || 'S'}
                </div>
                <div style={S.teacherToastInfo}>
                  <div style={S.teacherToastName}>{req.studentName}</div>
                  <div style={S.teacherToastSub}>Removed for absence &bull; Requesting to re-join</div>
                </div>
              </div>
              <div style={S.teacherToastActions}>
                <button
                  style={S.teacherToastApproveBtn}
                  onClick={() => handleApproveRejoin(req.userId)}
                >
                  Admit
                </button>
                <button
                  style={S.teacherToastRejectBtn}
                  onClick={() => handleRejectRejoin(req.userId)}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!streamReady && (
        <div style={S.loadingOverlay}>
          <div style={S.loadingSpinner} />
          <span style={S.loadingText}>Connecting to camera...</span>
        </div>
      )}

      {isScreenSharing && !isWhiteboardActive && (
        <div style={S.screenShareBanner}>
          <span style={{ marginRight: '6px' }}>&#9632;</span>
          You are sharing your screen
        </div>
      )}

      {isActivePdfPresenter && !isWhiteboardActive && (
        <div style={S.screenShareBanner}>
          <span style={{ marginRight: '6px' }}>&#9632;</span>
          You are sharing: {localPdfFile?.name || 'PDF'}
        </div>
      )}

      {sharedPdfUrl && !isActivePdfPresenter && !isWhiteboardActive && (
        <div style={{ ...S.screenShareBanner, background: 'rgba(0,212,255,0.08)', borderColor: 'rgba(0,212,255,0.3)', color: '#00d4ff' }}>
          <span style={{ marginRight: '6px' }}>&#128196;</span>
          {activePdfBy} is sharing a PDF
        </div>
      )}

      {isWhiteboardActive && (
        <div style={{ ...S.screenShareBanner, background: 'rgba(255,193,7,0.08)', borderColor: 'rgba(255,193,7,0.3)', color: '#ffc107' }}>
          <span style={{ marginRight: '6px' }}>&#9998;</span>
          Whiteboard is active
        </div>
      )}

      {/* ── Presentation View (Screen Share, PDF, or Whiteboard) ───── */}
      {isInPresentationMode && (
        <PresentationView
          mainRef={myVideo}
          localCameraRef={localCameraRef}
          localMeta={localMeta}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          isHandRaised={isHandRaised}
          activePeers={activePeers}
          buildPeerTile={buildPeerTile}
          isMobile={isMobile}
          activeSpeakerId={activeSpeakerId}
          cameraStream={localStream}
          pdfUrl={activePdfUrl}
          pdfPage={activePdfPage}
          pdfNumPages={activePdfNumPages}
          isPdfSharing={isActivePdfPresenter || !!sharedPdfUrl}
          pdfFileName={localPdfFile?.name || (sharedPdfBy ? `${sharedPdfBy}'s PDF` : '')}
          isScreenSharing={isScreenSharing || !!remoteScreenShareSocketId}
          remoteScreenShareStream={remoteScreenShareStream}
          isPdfPresenter={isPdfPresenter}
          canNavigatePdf={isPdfPresenter}
          isActivePresenter={isActivePresenter}
          onPdfPrevPage={() => changePdfPage((activePdfPage || 1) - 1)}
          onPdfNextPage={() => changePdfPage((activePdfPage || 1) + 1)}
          onPdfLoaded={(n) => {
            if (isActivePdfPresenter) setLocalPdfNumPages(n);
            else setSharedPdfNumPages(n);
          }}
          isWhiteboardActive={isWhiteboardActive}
          remoteWhiteboardScene={remoteWhiteboardScene}
          onWhiteboardChange={handleWhiteboardChange}
          onWhiteboardScrollChange={handleWhiteboardScrollChange}
          onWhiteboardClear={handleWhiteboardClear}
          onWhiteboardPointerDown={handleWhiteboardPointerDown}
          onWhiteboardPointerUp={handleWhiteboardPointerUp}
          onCloseWhiteboard={closeWhiteboard}
          excalidrawAPIRef={excalidrawAPIRef}
          whiteboardRef={whiteboardRef}
          socket={socket}
          roomId={roomId}
        />
      )}

      {/* ── Normal Views (No Presentation Active) ────────────────── */}
      {!isInPresentationMode && viewMode === 'gallery' && (
        <GalleryView localTile={localTile} activePeers={activePeers} buildPeerTile={buildPeerTile} />
      )}
      {!isInPresentationMode && viewMode === 'speaker' && (
        <SpeakerView localTile={localTile} activePeers={activePeers} buildPeerTile={buildPeerTile} localMeta={localMeta} />
      )}
      {!isInPresentationMode && viewMode === 'spotlight' && (
        <SpotlightView
          localTile={localTile} activePeers={activePeers} buildPeerTile={buildPeerTile}
          spotlightedId={spotlightedId} localMeta={localMeta} userRole={user?.role}
        />
      )}

      {/* ── Reactions Float ────────────────────────────────────────── */}
      <div style={S.reactionsFloat}>
        {reactions.map((r) => (
          <span key={r.id} style={S.reactionEmoji}>{r.emoji}</span>
        ))}
      </div>

      {/* ── Floating Bottom Control Bar (Zoom-Style) ──────────────── */}
      {(() => {
        const c = isInPresentationMode;
        const _grp = c ? { ...S.ctrlGroup, ...S.ctrlGroupCompact } : S.ctrlGroup;
        const _btn = c ? (extra) => ({ ...S.ctrlBtn, ...S.ctrlBtnCompact, ...extra }) : (extra) => ({ ...S.ctrlBtn, ...extra });
        const _lbl = c ? { ...S.ctrlLabel, ...S.ctrlLabelCompact } : S.ctrlLabel;
        const _div = c ? { ...S.ctrlDivider, ...S.ctrlDividerCompact } : S.ctrlDivider;
        const svgSize = c ? 16 : 20;
        return (
          <div style={{ ...S.controlBar, ...(c ? S.controlBarCompact : null) }}>
            {/* Mute */}
            <div style={_grp} onClick={toggleMute}>
              <div style={_btn(isMuted ? S.ctrlBtnOff : S.ctrlBtnDefault)}>
                {isMuted ? (
                  <svg width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                ) : (
                  <svg width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                )}
              </div>
              <span style={_lbl}>{isMuted ? 'Unmute' : 'Mute'}</span>
            </div>

            {/* Camera */}
            <div style={_grp} onClick={toggleCamera}>
              <div style={_btn(isCameraOff ? S.ctrlBtnOff : S.ctrlBtnDefault)}>
                {isCameraOff ? (
                  <svg width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16.5 9.4l-2-2.1M2 2l20 20" />
                    <path d="M23 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
                    <circle cx="12" cy="14" r="3" />
                  </svg>
                ) : (
                  <svg width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                )}
              </div>
              <span style={_lbl}>{isCameraOff ? 'Cam Off' : 'Camera'}</span>
            </div>

            {/* Screen Share */}
            <div style={_grp} onClick={toggleScreenShare}>
              <div style={_btn(isScreenSharing ? S.ctrlBtnActive : S.ctrlBtnDefault)}>
                <svg width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                  {isScreenSharing && <line x1="7" y1="7" x2="17" y2="13" strokeWidth="3" stroke="#ff4444" />}
                </svg>
              </div>
              <span style={_lbl}>{isScreenSharing ? 'Stop' : 'Share'}</span>
            </div>

            {/* Whiteboard (Teacher Only) */}
            {user?.role === 'teacher' && (
              <div style={_grp} onClick={toggleWhiteboard}>
                <div style={_btn(isWhiteboardActive ? S.ctrlBtnActive : S.ctrlBtnDefault)}>
                  <svg width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <path d="M7 7l4 4M12 12l-2 2M15 15l-3-3" />
                    <circle cx="8.5" cy="8.5" r="0.5" fill="currentColor" />
                    <circle cx="16" cy="16" r="0.5" fill="currentColor" />
                  </svg>
                </div>
                <span style={_lbl}>Board</span>
              </div>
            )}

            {/* PDF Share */}
            <div style={_grp} onClick={() => { if (isPdfSharing) stopPdfShare(); else pdfFileInputRef.current?.click(); }}>
              <div style={_btn(isPdfSharing ? S.ctrlBtnActive : S.ctrlBtnDefault)}>
                <svg width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <span style={_lbl}>{isPdfSharing ? 'Stop PDF' : 'PDF'}</span>
            </div>
            <input
              ref={pdfFileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handlePdfFileSelect}
              style={{ display: 'none' }}
            />

            {/* Participants */}
            <div style={_grp} onClick={() => onToggleSidebar?.('people')}>
              <div style={_btn(sidebarMode === 'people' ? S.ctrlBtnActive : S.ctrlBtnDefault)}>
                <svg width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <span style={_lbl}>{(participants?.length || 0) + 1}</span>
            </div>

            <div style={_div} />

            {/* Raise Hand */}
            <div style={_grp} onClick={toggleHandRaise}>
              <div style={_btn(isHandRaised ? S.ctrlBtnHand : S.ctrlBtnDefault)}>
                <svg width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8V6a2 2 0 0 0-4 0v1" />
                  <path d="M14 7V4a2 2 0 0 0-4 0v4" />
                  <path d="M10 7V5a2 2 0 0 0-4 0v6" />
                  <path d="M18 8a2 2 0 0 1 4 0v5a8 8 0 0 1-8 8h-2c-2.5 0-4-.8-5.5-2.5L3 14" />
                </svg>
              </div>
              <span style={_lbl}>Hand</span>
            </div>

            {/* Quick Reactions */}
            <div style={_grp} onClick={() => sendQuickReaction('👍')}>
              <div style={_btn(S.ctrlBtnDefault)}>
                <span style={{ fontSize: c ? '14px' : '18px' }}>&#128077;</span>
              </div>
              <span style={_lbl}>React</span>
            </div>

            <div style={_div} />

            {/* Chat */}
            <div style={_grp} onClick={() => onToggleSidebar?.('chat')}>
              <div style={_btn(sidebarMode === 'chat' ? S.ctrlBtnActive : S.ctrlBtnDefault)}>
                <svg width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <span style={_lbl}>Chat</span>
            </div>

            <div style={_div} />

            {/* Leave */}
            <div style={_grp} onClick={onLeave}>
              <div style={_btn(S.ctrlBtnDanger)}>
                <svg width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              <span style={{ ..._lbl, color: '#ff4444' }}>Leave</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
});


// ═══════════════════════════════════════════════════════════════════════════════
// GALLERY VIEW — Responsive grid
// ═══════════════════════════════════════════════════════════════════════════════
const GalleryView = ({ localTile, activePeers, buildPeerTile }) => {
  const count = 1 + activePeers.length;
  const grid = getGalleryGridStyle(count);
  return (
    <div style={{ ...S.videoGrid, ...grid }}>
      {localTile}
      {activePeers.map((p) => buildPeerTile(p))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SPEAKER VIEW
// ═══════════════════════════════════════════════════════════════════════════════
const SpeakerView = ({ localTile, activePeers, buildPeerTile, localMeta }) => {
  const isTeacherLocal = localMeta.role === 'teacher';
  const speakerPeer = isTeacherLocal ? null : activePeers[0];
  const filmstripPeers = isTeacherLocal ? activePeers : activePeers.slice(1);

  return (
    <div style={S.speakerContainer}>
      <div style={S.speakerMain}>
        {isTeacherLocal
          ? localTile
          : speakerPeer
            ? buildPeerTile(speakerPeer)
            : localTile}
      </div>
      {activePeers.length > 0 && (
        <div style={S.filmstrip}>
          {isTeacherLocal
            ? activePeers.map((p) => buildPeerTile(p, { isCompact: true }))
            : <>{localTile}{filmstripPeers.map((p) => buildPeerTile(p, { isCompact: true }))}</>}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SPOTLIGHT VIEW
// ═══════════════════════════════════════════════════════════════════════════════
const SpotlightView = ({ localTile, activePeers, buildPeerTile, spotlightedId, localMeta, userRole }) => {
  const spotlightedPeer = spotlightedId ? activePeers.find((p) => p.peerID === spotlightedId) : null;

  return (
    <div style={S.speakerContainer}>
      <div style={S.speakerMain}>
        {spotlightedPeer ? buildPeerTile(spotlightedPeer) : localTile}
        {!spotlightedId && activePeers.length > 0 && (
          <div style={S.spotlightPrompt}>
            <span style={S.spotlightPromptText}>
              {userRole === 'teacher'
                ? 'Click any participant below to spotlight'
                : 'Waiting for host to spotlight a participant...'}
            </span>
          </div>
        )}
      </div>
      {activePeers.length > 0 && (
        <div style={S.filmstrip}>
          {localTile}
          {activePeers.map((p) => buildPeerTile(p, { isCompact: true }))}
        </div>
      )}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// PRESENTATION VIEW — Screen share or PDF layout (Zoom/Google Meet style)
//
// Desktop: Main content (~80%) + vertical filmstrip on right (20%)
// Mobile:  Main content (100%) + horizontal filmstrip on bottom
// ═══════════════════════════════════════════════════════════════════════════════
const PresentationView = ({
  mainRef, localCameraRef, localMeta, isMuted, isCameraOff, isHandRaised,
  activePeers, buildPeerTile, isMobile, activeSpeakerId, cameraStream,
  pdfUrl, pdfPage, pdfNumPages, isPdfSharing, pdfFileName, isScreenSharing, remoteScreenShareStream, onPdfLoaded,
  canNavigatePdf, isPdfPresenter, isActivePresenter, onPdfPrevPage, onPdfNextPage,
  isWhiteboardActive, remoteWhiteboardScene, onWhiteboardChange, onWhiteboardScrollChange, onWhiteboardClear, onWhiteboardPointerDown, onWhiteboardPointerUp, onCloseWhiteboard, excalidrawAPIRef, whiteboardRef,
  socket, roomId,
}) => {
  const [hoverSide, setHoverSide] = useState(null);
  const screenVideoRef = useRef(null);
  const pdfWrapperRef = useRef(null);
  const [wrapperSize, setWrapperSize] = useState({ width: 0, height: 0 });
  const [pdfPageSize, setPdfPageSize] = useState(null);
  const [userZoom, setUserZoom] = useState(1.0);

  // PDF Annotation state
  const annotationCanvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastCoordRef = useRef({ x: 0, y: 0 });
  const [toolMode, setToolMode] = useState('pen'); // 'pen' | 'highlighter' | 'eraser' | 'off'
  const [drawColor, setDrawColor] = useState('#ef4444');

  // Whiteboard Video / Media Sync state
  const [videoInteractionMode, setVideoInteractionMode] = useState('video'); // 'video' | 'move'
  const [hasEmbedInDom, setHasEmbedInDom] = useState(false);
  const currentVideoTimeRef = useRef(0);

  const canControlPdf = Boolean(isPdfPresenter ?? canNavigatePdf);
  const currentPage = pdfPage || 1;
  const totalPages = pdfNumPages || null;
  const isLeftDisabled = currentPage <= 1;
  const isRightDisabled = Boolean(totalPages && currentPage >= totalPages);

  const showPdf = !!pdfUrl && !isScreenSharing && !isWhiteboardActive;
  const showScreen = isScreenSharing && !isWhiteboardActive;
  const showWhiteboard = isWhiteboardActive;

  // Responsive measurement: calculate container size so PDF fits viewport above bottom bar
  useEffect(() => {
    const el = pdfWrapperRef.current;
    if (!el) return;

    const measure = () => {
      if (el) {
        setWrapperSize({
          width: el.clientWidth,
          height: el.clientHeight,
        });
      }
    };

    measure();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          setWrapperSize({ width, height });
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    } else {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
  }, [showPdf]);

  // Usable area inside presentation wrapper:
  // Leaves 96px+ clearance at bottom for floating control bar
  // Leaves 100px horizontally (50px each side) for margin & side arrows
  const availW = Math.max(280, (wrapperSize.width || 800) - (isMobile ? 24 : 100));
  const availH = Math.max(200, (wrapperSize.height || 600) - (isMobile ? 100 : 124));

  const nativeW = pdfPageSize?.width || 960;
  const nativeH = pdfPageSize?.height || 720;

  const fitScale = Math.min(availW / nativeW, availH / nativeH, 2.0);
  const effectivePdfScale = Math.max(0.4, Number((fitScale * userZoom).toFixed(3)));

  const renderedW = Math.max(10, Math.round(nativeW * effectivePdfScale));
  const renderedH = Math.max(10, Math.round(nativeH * effectivePdfScale));

  const handlePageLoadSuccess = (page) => {
    const w = page.originalWidth || page.width;
    const h = page.originalHeight || page.height;
    if (w && h) {
      setPdfPageSize({ width: w, height: h });
    }
  };

  // Real-time canvas stroke drawing helper (used both locally and remotely)
  const drawStroke = useCallback((data) => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.save();
    if (data.isClear) {
      ctx.clearRect(0, 0, W, H);
    } else if (data.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(data.currX * W, data.currY * H, data.width || 18, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = data.color || '#ef4444';
      ctx.lineWidth = data.width || (data.tool === 'highlighter' ? 14 : 2.5);
      ctx.globalAlpha = data.alpha !== undefined ? data.alpha : (data.tool === 'highlighter' ? 0.4 : 1.0);
      ctx.beginPath();
      ctx.moveTo(data.prevX * W, data.prevY * H);
      ctx.lineTo(data.currX * W, data.currY * H);
      ctx.stroke();
    }
    ctx.restore();
  }, []);

  // Listen for real-time annotation strokes from presenter
  useEffect(() => {
    if (!socket) return;
    const handleRemoteDraw = ({ strokeData }) => {
      if (!strokeData) return;
      drawStroke(strokeData);
    };
    socket.on('pdf-draw-stroke', handleRemoteDraw);
    return () => {
      socket.off('pdf-draw-stroke', handleRemoteDraw);
    };
  }, [socket, drawStroke]);

  // Clear annotation canvas whenever page changes
  useEffect(() => {
    const canvas = annotationCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [currentPage]);

  const getCanvasPoint = (e) => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    if (!canControlPdf || toolMode === 'off') return;
    const pt = getCanvasPoint(e);
    if (!pt) return;
    isDrawingRef.current = true;
    lastCoordRef.current = { x: pt.x, y: pt.y };
  };

  const continueDrawing = (e) => {
    if (!isDrawingRef.current || !canControlPdf || toolMode === 'off') return;
    const pt = getCanvasPoint(e);
    if (!pt) return;

    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    if (!W || !H) return;

    const prev = lastCoordRef.current;
    const curr = { x: pt.x, y: pt.y };

    // Normalized coordinates (0.0 to 1.0)
    const prevX = prev.x / W;
    const prevY = prev.y / H;
    const currX = curr.x / W;
    const currY = curr.y / H;

    const width = toolMode === 'highlighter' ? 14 : (toolMode === 'eraser' ? 22 : 2.5);
    const alpha = toolMode === 'highlighter' ? 0.4 : 1.0;

    const strokeData = {
      prevX,
      prevY,
      currX,
      currY,
      color: drawColor,
      width,
      alpha,
      tool: toolMode,
      isClear: false,
      page: currentPage,
    };

    drawStroke(strokeData);

    if (socket && roomId) {
      socket.emit('pdf-draw-stroke', { roomId, strokeData });
    }

    lastCoordRef.current = curr;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const handleClearAll = () => {
    const canvas = annotationCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (socket && roomId) {
      socket.emit('pdf-draw-stroke', {
        roomId,
        strokeData: { isClear: true, page: currentPage },
      });
    }
  };

  // Attach camera stream on mount
  useEffect(() => {
    if (localCameraRef.current && cameraStream) {
      localCameraRef.current.srcObject = cameraStream;
      localCameraRef.current.play?.().catch(() => {});
    }
  }, [cameraStream, localCameraRef]);

  // Attach screen share stream (local or remote)
  useEffect(() => {
    if (screenVideoRef.current) {
      if (mainRef.current && mainRef.current.srcObject) {
        screenVideoRef.current.srcObject = mainRef.current.srcObject;
        screenVideoRef.current.play().catch(() => {});
      } else if (remoteScreenShareStream) {
        screenVideoRef.current.srcObject = remoteScreenShareStream;
        screenVideoRef.current.play().catch(() => {});
      }
    }
  }, [mainRef, remoteScreenShareStream, isScreenSharing]);

  // Check if whiteboard scene has embeddables/videos
  const hasEmbedInScene = Boolean(
    remoteWhiteboardScene?.elements?.some(
      (el) => el.type === 'embeddable' || el.type === 'iframe'
    ) || excalidrawAPIRef.current?.getSceneElements?.()?.some(
      (el) => el.type === 'embeddable' || el.type === 'iframe'
    )
  );
  const isVideoPresent = hasEmbedInDom || hasEmbedInScene;

  // Presenter media control actions
  const handlePlayAll = useCallback(() => {
    const iframes = document.querySelectorAll('.excalidraw__embeddable-container iframe, iframe.excalidraw__embeddable');
    iframes.forEach((iframe) => {
      try {
        iframe.contentWindow?.postMessage(JSON.stringify({
          event: 'command',
          func: 'playVideo',
          args: [],
        }), '*');
      } catch (_) {}
    });
    if (socket && roomId) {
      socket.emit('whiteboard-media-sync', {
        roomId,
        action: 'play',
        currentTime: currentVideoTimeRef.current || 0,
      });
    }
  }, [socket, roomId]);

  const handlePauseAll = useCallback(() => {
    const iframes = document.querySelectorAll('.excalidraw__embeddable-container iframe, iframe.excalidraw__embeddable');
    iframes.forEach((iframe) => {
      try {
        iframe.contentWindow?.postMessage(JSON.stringify({
          event: 'command',
          func: 'pauseVideo',
          args: [],
        }), '*');
      } catch (_) {}
    });
    if (socket && roomId) {
      socket.emit('whiteboard-media-sync', {
        roomId,
        action: 'pause',
        currentTime: currentVideoTimeRef.current || 0,
      });
    }
  }, [socket, roomId]);

  const handleSyncAll = useCallback(() => {
    if (socket && roomId) {
      socket.emit('whiteboard-media-sync', {
        roomId,
        action: 'force-sync',
        currentTime: currentVideoTimeRef.current || 0,
      });
    }
  }, [socket, roomId]);

  // Handshake to YouTube iframes to enable postMessage API events and state tracking
  useEffect(() => {
    if (!isWhiteboardActive) return;
    const interval = setInterval(() => {
      const iframes = document.querySelectorAll('.excalidraw__embeddable-container iframe, iframe.excalidraw__embeddable');
      if (iframes.length > 0) {
        setHasEmbedInDom(true);
        iframes.forEach((iframe) => {
          try {
            const win = iframe.contentWindow;
            if (!win) return;
            win.postMessage(JSON.stringify({ event: 'listening' }), '*');
            win.postMessage(JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }), '*');
            win.postMessage(JSON.stringify({ event: 'command', func: 'addEventListener', args: ['infoDelivery'] }), '*');
            win.postMessage(JSON.stringify({ event: 'command', func: 'getCurrentTime', args: [] }), '*');
            if (isActivePresenter) {
              win.postMessage(JSON.stringify({ event: 'command', func: 'getPlayerState', args: [] }), '*');
            }
          } catch (_) {}
        });
      } else {
        setHasEmbedInDom(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isWhiteboardActive, isActivePresenter]);

  // Listen for YouTube player events to auto-sync play/pause from teacher
  const lastReportedPlayerStateRef = useRef(-1);

  useEffect(() => {
    const handleWindowMessage = (e) => {
      try {
        let data = e.data;
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch (_) { return; }
        }
        if (!data) return;

        if (data.info && typeof data.info.currentTime === 'number') {
          currentVideoTimeRef.current = data.info.currentTime;
        }

        let playerState = null;
        if (data.event === 'onStateChange') {
          playerState = typeof data.info === 'number' ? data.info : (typeof data.data === 'number' ? data.data : null);
        } else if (data.info && typeof data.info.playerState === 'number') {
          playerState = data.info.playerState;
        }

        if (playerState !== null && isActivePresenter && socket && roomId) {
          const time = (data.info && typeof data.info.currentTime === 'number') ? data.info.currentTime : (currentVideoTimeRef.current || 0);
          if (playerState === 1 && lastReportedPlayerStateRef.current !== 1) {
            lastReportedPlayerStateRef.current = 1;
            console.log('[VideoRoom] Teacher playing YouTube video at', time);
            socket.emit('whiteboard-media-sync', {
              roomId,
              action: 'play',
              currentTime: time,
            });
          } else if (playerState === 2 && lastReportedPlayerStateRef.current !== 2) {
            lastReportedPlayerStateRef.current = 2;
            console.log('[VideoRoom] Teacher paused YouTube video at', time);
            socket.emit('whiteboard-media-sync', {
              roomId,
              action: 'pause',
              currentTime: time,
            });
          }
        }
      } catch (_) {}
    };

    window.addEventListener('message', handleWindowMessage);
    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, [isActivePresenter, socket, roomId]);

  // Periodic heartbeat sync while teacher is actively playing
  useEffect(() => {
    if (!isActivePresenter || !isWhiteboardActive || !socket || !roomId) return;
    const syncInterval = setInterval(() => {
      if (lastReportedPlayerStateRef.current === 1) {
        socket.emit('whiteboard-media-sync', {
          roomId,
          action: 'sync',
          currentTime: currentVideoTimeRef.current || 0,
        });
      }
    }, 3000);
    return () => clearInterval(syncInterval);
  }, [isActivePresenter, isWhiteboardActive, socket, roomId]);

  // Student listener for synchronized video playback
  const lastStudentMediaStateRef = useRef({ action: 'pause', currentTime: 0 });

  useEffect(() => {
    if (!socket || isActivePresenter) return;

    const executePlayerSync = (action, currentTime) => {
      const iframes = document.querySelectorAll(
        '.classmeet-whiteboard-student .excalidraw__embeddable-container iframe, .excalidraw__embeddable-container iframe, iframe.excalidraw__embeddable'
      );
      iframes.forEach((iframe) => {
        try {
          const win = iframe.contentWindow;
          if (!win) return;

          win.postMessage(JSON.stringify({ event: 'listening' }), '*');

          if (typeof currentTime === 'number' && (action === 'play' || action === 'force-sync')) {
            win.postMessage(JSON.stringify({
              event: 'command',
              func: 'seekTo',
              args: [currentTime, true],
            }), '*');
          }

          if (action === 'play') {
            win.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: [] }), '*');
            win.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }), '*');
            win.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
          } else if (action === 'pause') {
            win.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
          } else if (action === 'sync') {
            const studentTime = currentVideoTimeRef.current || 0;
            if (typeof currentTime === 'number' && Math.abs(studentTime - currentTime) > 2.5) {
              win.postMessage(JSON.stringify({
                event: 'command',
                func: 'seekTo',
                args: [currentTime, true],
              }), '*');
            }
            win.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
          } else if (action === 'force-sync') {
            if (typeof currentTime === 'number') {
              win.postMessage(JSON.stringify({
                event: 'command',
                func: 'seekTo',
                args: [currentTime, true],
              }), '*');
            }
            win.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: [] }), '*');
            win.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }), '*');
            win.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
          }
        } catch (_) {}
      });
    };

    const handleMediaSync = ({ action, currentTime }) => {
      console.log('[VideoRoom] Student received media sync:', action, currentTime);
      lastStudentMediaStateRef.current = { action, currentTime };
      executePlayerSync(action, currentTime);
      setTimeout(() => executePlayerSync(action, currentTime), 400);
      setTimeout(() => executePlayerSync(action, currentTime), 1000);
    };

    // User interaction unlock listener for browser autoplay policy
    const handleUserGestureUnlock = () => {
      const state = lastStudentMediaStateRef.current;
      if (state.action === 'play' || state.action === 'sync' || state.action === 'force-sync') {
        executePlayerSync('play', state.currentTime);
      }
    };
    window.addEventListener('pointerdown', handleUserGestureUnlock, { passive: true });

    socket.on('whiteboard-media-sync', handleMediaSync);
    return () => {
      socket.off('whiteboard-media-sync', handleMediaSync);
      window.removeEventListener('pointerdown', handleUserGestureUnlock);
    };
  }, [socket, isActivePresenter]);

  // Fit and center all elements in viewport (teacher tool & initial centering)
  const handleFitAndCenter = useCallback(() => {
    if (excalidrawAPIRef.current) {
      const elements = excalidrawAPIRef.current.getSceneElements();
      if (elements && elements.length > 0) {
        excalidrawAPIRef.current.scrollToContent(elements, {
          fitToViewport: true,
          viewportZoomFactor: 0.82,
          animate: true,
          duration: 250,
        });
      }
    }
  }, [excalidrawAPIRef]);

  // Sync remote whiteboard scene (elements & scroll/zoom) to student Excalidraw in real time
  const hasAutoCenteredRef = useRef(false);

  useEffect(() => {
    if (!isActivePresenter && excalidrawAPIRef?.current && remoteWhiteboardScene?.elements) {
      try {
        const updatePayload = {
          elements: remoteWhiteboardScene.elements,
          captureUpdate: 2,
        };
        const hasCustomScroll = remoteWhiteboardScene.appState &&
          ((typeof remoteWhiteboardScene.appState.scrollY === 'number' && remoteWhiteboardScene.appState.scrollY !== 0) ||
           (typeof remoteWhiteboardScene.appState.scrollX === 'number' && remoteWhiteboardScene.appState.scrollX !== 0));

        if (remoteWhiteboardScene.appState) {
          updatePayload.appState = {
            scrollX: remoteWhiteboardScene.appState.scrollX,
            scrollY: remoteWhiteboardScene.appState.scrollY,
            zoom: remoteWhiteboardScene.appState.zoom,
            ...(remoteWhiteboardScene.appState.viewBackgroundColor ? { viewBackgroundColor: remoteWhiteboardScene.appState.viewBackgroundColor } : {}),
          };
        }
        excalidrawAPIRef.current.updateScene(updatePayload);

        // If teacher has not manually panned, auto-fit content so video never drops behind bottom bar
        if (!hasCustomScroll && !hasAutoCenteredRef.current && remoteWhiteboardScene.elements.length > 0) {
          hasAutoCenteredRef.current = true;
          setTimeout(() => {
            try {
              excalidrawAPIRef.current?.scrollToContent(remoteWhiteboardScene.elements, {
                fitToViewport: true,
                viewportZoomFactor: 0.82,
                animate: false,
              });
            } catch (_) {}
          }, 100);
        }
      } catch (_) {}
    }
  }, [isActivePresenter, remoteWhiteboardScene, excalidrawAPIRef]);

  return (
    <div style={isMobile ? S.presentationMobile : S.presentationDesktop}>
      {/* ── Main Content Area ────────────────────────────────────── */}
      <div style={isMobile ? S.presentationMainMobile : S.presentationMainDesktop}>
        {showScreen && (
          <video
            ref={screenVideoRef}
            autoPlay
            playsInline
            muted
            style={S.presentationVideo}
          />
        )}

        {showPdf && (
          <div ref={pdfWrapperRef} style={S.pdfPresentationWrapper}>
            <div style={S.pdfPresentationContainer}>
              <div
                style={{
                  ...S.pdfDocumentWrapper,
                  position: 'relative',
                  width: `${renderedW}px`,
                  height: `${renderedH}px`,
                }}
              >
                <Document
                  file={pdfUrl}
                  onLoadSuccess={({ numPages: n }) => {
                    if (onPdfLoaded) onPdfLoaded(n);
                  }}
                  loading={
                    <div style={S.pdfLoading}>
                      <div style={S.loadingSpinnerSmall} />
                      <span>Loading PDF...</span>
                    </div>
                  }
                  error={
                    <div style={S.pdfError}>
                      Failed to load PDF. Please try another file.
                    </div>
                  }
                >
                  <Page
                    pageNumber={currentPage}
                    scale={effectivePdfScale}
                    onLoadSuccess={handlePageLoadSuccess}
                    loading={
                      <div style={S.pdfLoading}>
                        <div style={S.loadingSpinnerSmall} />
                        <span>Loading page...</span>
                      </div>
                    }
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>

                {/* ── Overlay Annotation Canvas (1:1 with PDF) ── */}
                <canvas
                  ref={annotationCanvasRef}
                  width={renderedW}
                  height={renderedH}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: `${renderedW}px`,
                    height: `${renderedH}px`,
                    zIndex: 30,
                    pointerEvents: canControlPdf && toolMode !== 'off' ? 'auto' : 'none',
                    cursor: canControlPdf && toolMode !== 'off'
                      ? (toolMode === 'eraser' ? 'cell' : 'crosshair')
                      : 'default',
                    touchAction: 'none',
                  }}
                  onMouseDown={startDrawing}
                  onMouseMove={continueDrawing}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={(e) => { e.preventDefault(); startDrawing(e); }}
                  onTouchMove={(e) => { e.preventDefault(); continueDrawing(e); }}
                  onTouchEnd={(e) => { e.preventDefault(); stopDrawing(e); }}
                />
              </div>
            </div>

            {/* ── Presenter Floating Annotation Toolbar (Top Center) ── */}
            {canControlPdf && (
              <div style={{ ...S.pdfAnnotationToolbar, ...(isMobile ? { top: '48px' } : null) }}>
                {/* Pointer (Drawing Off) */}
                <button
                  type="button"
                  title="Cursor / Select (Drawing Off)"
                  style={{
                    ...S.pdfToolBtn,
                    ...(toolMode === 'off' ? S.pdfToolBtnActive : null),
                  }}
                  onClick={() => setToolMode('off')}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M3 3l7 18 3-7 7-3L3 3z" />
                  </svg>
                </button>

                {/* Pen Tool */}
                <button
                  type="button"
                  title="Pen Tool (Stroke: 2px, 100% Opacity)"
                  style={{
                    ...S.pdfToolBtn,
                    ...(toolMode === 'pen' ? S.pdfToolBtnActive : null),
                  }}
                  onClick={() => setToolMode('pen')}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M12 19l7-7 3 3-7 7-3-3z" />
                    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                    <path d="M2 2l7.586 7.586" />
                  </svg>
                </button>

                {/* Highlighter Tool */}
                <button
                  type="button"
                  title="Highlighter Tool (Stroke: 14px, 40% Opacity)"
                  style={{
                    ...S.pdfToolBtn,
                    ...(toolMode === 'highlighter' ? S.pdfToolBtnActive : null),
                  }}
                  onClick={() => setToolMode('highlighter')}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M14 2l4 4L7 17H3v-4L14 2z" />
                    <path d="M3 22h18" strokeWidth="2.5" stroke="#eab308" />
                  </svg>
                </button>

                {/* Divider */}
                <div style={S.pdfToolDivider} />

                {/* Color Palette */}
                <div style={S.pdfColorPalette}>
                  {[
                    { color: '#ef4444', name: 'Red' },
                    { color: '#3b82f6', name: 'Blue' },
                    { color: '#22c55e', name: 'Green' },
                    { color: '#eab308', name: 'Yellow' },
                    { color: '#0f172a', name: 'Black' },
                  ].map((c) => {
                    const isSelected = drawColor === c.color && toolMode !== 'off' && toolMode !== 'eraser';
                    return (
                      <div
                        key={c.color}
                        title={c.name}
                        onClick={() => {
                          setDrawColor(c.color);
                          if (toolMode === 'off' || toolMode === 'eraser') {
                            setToolMode('pen');
                          }
                        }}
                        style={{
                          ...S.pdfColorDot,
                          background: c.color,
                          border: c.color === '#0f172a' ? '1px solid rgba(255,255,255,0.4)' : 'none',
                          transform: isSelected ? 'scale(1.25)' : 'scale(1)',
                          boxShadow: isSelected
                            ? `0 0 0 2px #0a0e1a, 0 0 0 4px ${c.color === '#0f172a' ? '#38bdf8' : c.color}`
                            : 'none',
                        }}
                      />
                    );
                  })}
                </div>

                {/* Divider */}
                <div style={S.pdfToolDivider} />

                {/* Eraser Tool */}
                <button
                  type="button"
                  title="Eraser (Erase strokes)"
                  style={{
                    ...S.pdfToolBtn,
                    ...(toolMode === 'eraser' ? S.pdfToolBtnActive : null),
                  }}
                  onClick={() => setToolMode('eraser')}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M20 20H7L3 16C2 15 2 13 3 12L13 2L22 11L18 15" />
                    <path d="M18 15L11 8" />
                  </svg>
                </button>

                {/* Clear All */}
                <button
                  type="button"
                  title="Clear All Annotations"
                  style={S.pdfToolBtnDanger}
                  onClick={handleClearAll}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span style={{ fontSize: '11px', fontWeight: '600' }}>Clear</span>
                </button>
              </div>
            )}

            {/* ── Left Navigation Arrow (Previous Page) ── */}
            {canControlPdf && (
              <button
                type="button"
                aria-label="Previous Page"
                title="Previous Page"
                disabled={isLeftDisabled}
                style={{
                  ...S.pdfNavArrow,
                  ...S.pdfNavArrowLeft,
                  ...(isLeftDisabled
                    ? S.pdfNavArrowDisabled
                    : hoverSide === 'left'
                    ? S.pdfNavArrowHover
                    : null),
                }}
                onMouseEnter={() => !isLeftDisabled && setHoverSide('left')}
                onMouseLeave={() => setHoverSide(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isLeftDisabled && onPdfPrevPage) {
                    onPdfPrevPage();
                  }
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}

            {/* ── Right Navigation Arrow (Next Page) ── */}
            {canControlPdf && (
              <button
                type="button"
                aria-label="Next Page"
                title="Next Page"
                disabled={isRightDisabled}
                style={{
                  ...S.pdfNavArrow,
                  ...S.pdfNavArrowRight,
                  ...(isRightDisabled
                    ? S.pdfNavArrowDisabled
                    : hoverSide === 'right'
                    ? S.pdfNavArrowHover
                    : null),
                }}
                onMouseEnter={() => !isRightDisabled && setHoverSide('right')}
                onMouseLeave={() => setHoverSide(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isRightDisabled && onPdfNextPage) {
                    onPdfNextPage();
                  }
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}

            {/* ── Top Bar: Page Counter & Zoom Controls ── */}
            <div style={S.pdfTopBar}>
              <div style={S.pdfPageBadge}>
                <span style={S.pdfPageText}>
                  Page {currentPage} of {totalPages || '?'}
                </span>
                <span style={S.pdfBadgeDivider} />
                <button
                  type="button"
                  aria-label="Zoom Out"
                  title="Zoom Out"
                  style={S.pdfZoomBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))));
                  }}
                >
                  &minus;
                </button>
                <span style={S.pdfZoomPct}>
                  {Math.round(userZoom * 100)}%
                </span>
                <button
                  type="button"
                  aria-label="Zoom In"
                  title="Zoom In"
                  style={S.pdfZoomBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))));
                  }}
                >
                  &#43;
                </button>
                {userZoom !== 1.0 && (
                  <button
                    type="button"
                    aria-label="Reset Zoom to Fit"
                    title="Fit to Screen"
                    style={S.pdfZoomResetBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setUserZoom(1.0);
                    }}
                  >
                    Fit
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {showWhiteboard && (
          <div
            className={`${isActivePresenter ? "classmeet-whiteboard-presenter" : "classmeet-whiteboard-student"} ${videoInteractionMode === 'move' ? 'move-mode' : ''}`}
            style={S.whiteboardContainer}
            onPointerDown={isActivePresenter ? onWhiteboardPointerDown : undefined}
            onPointerUp={isActivePresenter ? onWhiteboardPointerUp : undefined}
          >
            <Suspense fallback={
              <div style={S.whiteboardLoading}>
                <div style={S.loadingSpinnerSmall} />
                <span>Loading Whiteboard...</span>
              </div>
            }>
              <ExcalidrawWrapper
                ref={whiteboardRef}
                excalidrawAPI={(api) => {
                  excalidrawAPIRef.current = api;
                  if (!isActivePresenter && remoteWhiteboardScene?.elements && remoteWhiteboardScene.elements.length > 0) {
                    try {
                      const updatePayload = {
                        elements: remoteWhiteboardScene.elements,
                        captureUpdate: 2,
                      };
                      if (remoteWhiteboardScene.appState) {
                        updatePayload.appState = {
                          scrollX: remoteWhiteboardScene.appState.scrollX,
                          scrollY: remoteWhiteboardScene.appState.scrollY,
                          zoom: remoteWhiteboardScene.appState.zoom,
                          ...(remoteWhiteboardScene.appState.viewBackgroundColor ? { viewBackgroundColor: remoteWhiteboardScene.appState.viewBackgroundColor } : {}),
                        };
                      }
                      api.updateScene(updatePayload);
                    } catch (_) {}
                  }
                }}
                initialData={remoteWhiteboardScene ? {
                  elements: remoteWhiteboardScene.elements,
                  appState: remoteWhiteboardScene.appState ? {
                    scrollX: remoteWhiteboardScene.appState.scrollX,
                    scrollY: remoteWhiteboardScene.appState.scrollY,
                    zoom: remoteWhiteboardScene.appState.zoom,
                  } : undefined,
                } : undefined}
                onChange={isActivePresenter ? onWhiteboardChange : undefined}
                onScrollChange={isActivePresenter ? onWhiteboardScrollChange : undefined}
                viewModeEnabled={!isActivePresenter}
                zenModeEnabled={false}
                UIOptions={isActivePresenter ? {
                  canvasActions: {
                    changeViewBackgroundColor: true,
                    clearCanvas: true,
                    loadScene: false,
                    toggleTheme: false,
                    saveToActiveFile: false,
                    export: { saveFileToDisk: true },
                    saveAsImage: { saveFileToDisk: true },
                  },
                  tools: {
                    image: false,
                  },
                } : {
                  canvasActions: {
                    changeViewBackgroundColor: false,
                    clearCanvas: false,
                    loadScene: false,
                    toggleTheme: false,
                    saveToActiveFile: false,
                    export: false,
                    saveAsImage: false,
                  },
                  tools: {
                    image: false,
                  },
                }}
                theme="light"
                name="ClassMeet Whiteboard"
              />
            </Suspense>

            {/* ── Presenter Video Sync Toolbar (top-center, presenter only when video/embed exists) ── */}
            {isActivePresenter && isVideoPresent && (
              <div style={{ ...S.whiteboardMediaToolbar, ...(isMobile ? { top: '48px' } : null) }}>
                <div style={S.mediaToolbarBadge}>
                  <span style={S.mediaPulseDot} />
                  <span>Video Control</span>
                </div>

                <div style={S.mediaToolbarGroup}>
                  <button
                    type="button"
                    style={{
                      ...S.mediaModeBtn,
                      ...(videoInteractionMode === 'video' ? S.mediaModeBtnActive : null),
                    }}
                    onClick={() => setVideoInteractionMode('video')}
                    title="Control video directly (Play, Pause, Seek like YouTube)"
                  >
                    🎬 Video Mode
                  </button>
                  <button
                    type="button"
                    style={{
                      ...S.mediaModeBtn,
                      ...(videoInteractionMode === 'move' ? S.mediaModeBtnActive : null),
                    }}
                    onClick={() => setVideoInteractionMode('move')}
                    title="Move or resize video element on whiteboard"
                  >
                    ✋ Move/Resize
                  </button>
                </div>

                <div style={S.mediaDivider} />

                <div style={S.mediaToolbarGroup}>
                  <button
                    type="button"
                    style={{
                      ...S.mediaActionBtn,
                      background: 'rgba(16, 185, 129, 0.16)',
                      borderColor: 'rgba(16, 185, 129, 0.4)',
                      color: '#34d399',
                    }}
                    onClick={handleFitAndCenter}
                    title="Fit & center video on all screens"
                  >
                    🎯 Fit & Center
                  </button>
                  <button
                    type="button"
                    style={S.mediaActionBtn}
                    onClick={handlePlayAll}
                    title="Play video on all screens"
                  >
                    ▶ Play for All
                  </button>
                  <button
                    type="button"
                    style={{
                      ...S.mediaActionBtn,
                      background: 'rgba(239, 68, 68, 0.16)',
                      borderColor: 'rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                    }}
                    onClick={handlePauseAll}
                    title="Pause video on all screens"
                  >
                    ⏸ Pause for All
                  </button>
                  <button
                    type="button"
                    style={{
                      ...S.mediaActionBtn,
                      background: 'rgba(0, 212, 255, 0.16)',
                      borderColor: 'rgba(0, 212, 255, 0.4)',
                      color: '#00d4ff',
                    }}
                    onClick={handleSyncAll}
                    title="Sync students to current time"
                  >
                    🔄 Sync Time
                  </button>
                </div>
              </div>
            )}

            {/* ── Student View-Only Notification Badge ── */}
            {!isActivePresenter && isVideoPresent && (
              <div style={{ ...S.studentViewOnlyBadge, ...(isMobile ? { top: '48px' } : null) }}>
                <span style={S.studentViewOnlyDot} />
                <span>🔒 View Mode &bull; Controlled by Teacher</span>
              </div>
            )}

            {/* ── Student View-Only Protective Shield (blocks all canvas and embed interaction) ── */}
            {!isActivePresenter && (
              <div
                style={S.studentWhiteboardShield}
                title="View Only (Teacher is presenting)"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              />
            )}

            {/* ── Circular Close Button (top-right, presenter only) ── */}
            {isActivePresenter && (
              <div
                style={S.whiteboardCloseCircle}
                onClick={onCloseWhiteboard}
                title="Close Whiteboard"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
            )}
          </div>
        )}


        {/* Label — hidden when whiteboard active (Excalidraw has its own toolbar) */}
        {!showWhiteboard && (
        <div style={S.presentationLabel}>
          {showScreen && (
            <span style={S.presentationLabelText}>Screen Share</span>
          )}
          {showPdf && (
            <span style={S.presentationLabelText}>
              {pdfFileName || 'PDF Presentation'}
            </span>
          )}
        </div>
        )}

      </div>

      {/* ── Filmstrip / Right-Hand Participant Sidebar ────────── */}
      <div
        className="custom-slim-scrollbar"
        style={isMobile ? S.filmstripHorizontal : S.filmstripVertical}
      >
        {/* Local camera tile */}
        <div style={isMobile ? S.filmstripTileMobile : S.filmstripTileDesktop}>
          <video
            ref={localCameraRef}
            autoPlay
            playsInline
            muted
            style={{
              ...S.filmstripVideo,
              display: isCameraOff ? 'none' : 'block',
            }}
          />
          {isCameraOff && (
            <div style={S.filmstripAvatar}>
              <AvatarPlaceholder name={localMeta.name} size={36} />
            </div>
          )}
          <div style={S.filmstripOverlay}>
            <span style={S.filmstripName}>{localMeta.name} (You)</span>
            {isMuted && (
              <span style={S.filmstripMicOff}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#ff4444" strokeWidth="3">
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                </svg>
              </span>
            )}
            {localMeta.role === 'teacher' && <span style={S.filmstripHost}>HOST</span>}
            {isHandRaised && <span style={S.filmstripHand}>&#9995;</span>}
          </div>
          {activeSpeakerId === 'local' && <div style={S.filmstripSpeakerGlow} />}
        </div>

        {/* Remote peer tiles */}
        {activePeers.map((p) => buildPeerTile(p, { isCompact: true }))}
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO TILE — Shared tile for local and remote video (Neon UI)
// ═══════════════════════════════════════════════════════════════════════════════
const VideoTile = ({
  videoRef, name, suffix = '', isMuted, isCameraOff, isLocal,
  role, isSpotlighted, isActiveSpeaker, isHandRaised, isCompact, onClick, children, detectedDuration,
}) => {
  const boxStyle = isCompact
    ? { ...S.videoBox, ...S.videoBoxCompact }
    : isSpotlighted
      ? { ...S.videoBox, ...S.videoBoxSpotlight }
      : isActiveSpeaker
        ? { ...S.videoBox, ...S.videoBoxActiveSpeaker }
        : S.videoBox;

  const videoStyle = isCompact
    ? { ...S.video, minHeight: '0', height: '100%' }
    : S.video;

  return (
    <div
      style={{
        ...boxStyle,
        ...(onClick ? { cursor: 'pointer' } : {}),
        ...(isSpotlighted ? S.tileSpotlight : {}),
        ...(isActiveSpeaker && !isSpotlighted ? S.tileActiveSpeaker : {}),
      }}
      onClick={onClick}
      className="video-tile"
    >
      {/* Video element — hidden when camera is off */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        style={{
          ...videoStyle,
          display: isCameraOff ? 'none' : 'block',
        }}
      />

      {/* Avatar placeholder when camera is off */}
      {isCameraOff && (
        <div style={S.avatarContainer}>
          <AvatarPlaceholder name={name} size={isCompact ? 48 : 80} />
        </div>
      )}

      {children}

      {/* ── Tile Overlay: Name + Badges (bottom-left) ──────────── */}
      <div style={S.tileOverlay}>
        <div style={S.tileOverlayRow}>
          {isMuted && (
            <span style={S.micIconOff}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ff4444" strokeWidth="2.5">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              </svg>
            </span>
          )}
          <span style={S.tileName}>{name}{suffix}</span>
          {role === 'teacher' && <span style={S.hostBadge}>HOST</span>}
          {isSpotlighted && <span style={S.spotlightBadge}>SPOTLIGHT</span>}
          {isHandRaised && <span style={S.handBadge}>&#9995;</span>}
          {detectedDuration && (
            <span style={{
              background: (typeof detectedDuration === 'object' && detectedDuration.isSuspicious) ? 'rgba(255,68,68,0.25)' : 'rgba(0,255,136,0.18)',
              color: (typeof detectedDuration === 'object' && detectedDuration.isSuspicious) ? '#ff4444' : '#00ff88',
              border: `1px solid ${(typeof detectedDuration === 'object' && detectedDuration.isSuspicious) ? 'rgba(255,68,68,0.5)' : 'rgba(0,255,136,0.4)'}`,
              fontSize: '9px',
              padding: '2px 6px',
              borderRadius: '10px',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              marginLeft: '4px',
            }}>
              {(typeof detectedDuration === 'object' && detectedDuration.isSuspicious)
                ? '⚠️ Photo Spoof'
                : `👁️ ${typeof detectedDuration === 'string' ? detectedDuration : detectedDuration.text}`}
            </span>
          )}
        </div>
      </div>

      {/* Hover hint for teacher spotlight */}
      {onClick && (
        <div style={S.spotlightHover}>
          <span style={S.spotlightHoverText}>Click to spotlight</span>
        </div>
      )}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// PEER VIDEO — Remote video tile with stream tracking + camera detection
// ═══════════════════════════════════════════════════════════════════════════════
const PeerVideo = ({ peer, name, role, peerId, isSpotlighted, isActiveSpeaker, onClick, isCompact, onStreamReady, remoteStatus, detectedDuration }) => {
  const ref = useRef(null);
  const [hasVideoTrack, setHasVideoTrack] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const attachStream = (stream) => {
      if (cancelled) return;
      const el = ref.current;
      if (!el || !stream) return;
      
      try {
        el.srcObject = stream;
        el.play().catch(() => {});
      } catch (e) {
        console.warn('[PeerVideo] srcObject attach error:', e);
      }

      const vTracks = stream.getVideoTracks();
      const hasLiveVideo = vTracks.length > 0 && vTracks.some((t) => t.enabled && t.readyState !== 'ended');
      setHasVideoTrack(hasLiveVideo);

      const updateState = () => {
        if (cancelled) return;
        const tracks = stream.getVideoTracks();
        const live = tracks.length > 0 && tracks.some((t) => t.enabled && t.readyState !== 'ended');
        setHasVideoTrack(live);
      };

      vTracks.forEach((t) => {
        t.addEventListener('mute', updateState);
        t.addEventListener('unmute', updateState);
        t.addEventListener('ended', updateState);
      });

      stream.addEventListener('addtrack', updateState);
      stream.addEventListener('removetrack', updateState);

      if (onStreamReady) onStreamReady(peerId, stream);
    };

    if (peer._remoteStreams && peer._remoteStreams.length > 0) {
      attachStream(peer._remoteStreams[0]);
    }

    const onStream = (stream) => {
      console.log(`[PeerVideo] 'stream' event from ${name}`);
      attachStream(stream);
    };
    const onTrack = (_track, stream) => {
      console.log(`[PeerVideo] 'track' event from ${name}`);
      attachStream(stream);
    };
    const onError = (err) => {
      console.error(`[PeerVideo] Error from ${name}:`, err.message);
    };

    peer.on('stream', onStream);
    peer.on('track', onTrack);
    peer.on('error', onError);

    return () => {
      cancelled = true;
      peer.off('stream', onStream);
      peer.off('track', onTrack);
      peer.off('error', onError);
    };
  }, [peer, name, peerId, onStreamReady]);

  const isCameraOff = remoteStatus?.cameraOff !== undefined ? remoteStatus.cameraOff : !hasVideoTrack;

  return (
    <VideoTile
      videoRef={ref}
      name={name}
      role={role}
      isCameraOff={isCameraOff}
      isSpotlighted={isSpotlighted}
      isActiveSpeaker={isActiveSpeaker}
      isCompact={isCompact}
      onClick={onClick}
      detectedDuration={detectedDuration}
    />
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// STYLES — Neon/Cyberpunk Theme
// ═══════════════════════════════════════════════════════════════════════════════
const S = {
  container: {
    width: '100%',
    height: '100%',
    maxHeight: '100%',
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  // ── Loading ──────────────────────────────────────────────────────────
  loadingOverlay: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '12px', backgroundColor: 'rgba(5,10,20,0.9)', zIndex: 10, borderRadius: '12px',
  },
  loadingSpinner: {
    width: '36px', height: '36px',
    border: '3px solid rgba(0,212,255,0.2)', borderTop: '3px solid #00d4ff',
    borderRadius: '50%', animation: 'spin 1s linear infinite',
  },
  loadingText: { color: '#7ecfff', fontSize: '13px', fontWeight: '500' },

  // ── Screen Share Banner ─────────────────────────────────────────────
  screenShareBanner: {
    backgroundColor: 'rgba(0,255,136,0.08)',
    border: '1px solid rgba(0,255,136,0.3)',
    color: '#00ff88', padding: '8px 12px', borderRadius: '8px',
    textAlign: 'center', marginBottom: '10px', fontSize: '13px', fontWeight: '600',
    boxShadow: '0 0 20px rgba(0,255,136,0.08)',
  },

  // ── Video Grid ──────────────────────────────────────────────────────
  videoGrid: {
    display: 'grid',
    gap: '10px',
    width: '100%',
    flex: 1,
    minHeight: 0,
    maxHeight: 'calc(100vh - 120px)',
    overflowY: 'auto',
    alignContent: 'center',
    padding: '4px 4px 85px 4px',
    boxSizing: 'border-box',
  },

  // ── Video Box ───────────────────────────────────────────────────────
  videoBox: {
    backgroundColor: '#0a0e1a',
    border: '1px solid rgba(0,212,255,0.12)',
    borderRadius: '12px', overflow: 'hidden', position: 'relative',
    transition: 'border-color 0.3s, box-shadow 0.3s',
    boxShadow: '0 0 20px rgba(0,212,255,0.04)',
    aspectRatio: '16/9',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  videoBoxCompact: {
    width: '100%',
    height: '110px',
    minHeight: '110px',
    maxHeight: '110px',
    flexShrink: 0,
    aspectRatio: 'auto',
    boxSizing: 'border-box',
  },
  videoBoxSpotlight: { width: '100%', height: '100%', aspectRatio: 'auto' },
  videoBoxActiveSpeaker: {},
  tileSpotlight: {
    border: '2px solid #00d4ff',
    boxShadow: '0 0 30px rgba(0,212,255,0.3), inset 0 0 30px rgba(0,212,255,0.05)',
  },
  tileActiveSpeaker: {
    border: '2px solid #00d4ff',
    boxShadow: '0 0 20px rgba(0,212,255,0.25), inset 0 0 20px rgba(0,212,255,0.03)',
  },
  video: {
    width: '100%', height: '100%', minHeight: '200px',
    objectFit: 'cover', display: 'block',
  },

  // ── Avatar Container ────────────────────────────────────────────────
  avatarContainer: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at center, rgba(0,212,255,0.03) 0%, transparent 70%)',
  },

  // ── Tile Overlay ────────────────────────────────────────────────────
  tileOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: '10px 12px',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
  },
  tileOverlayRow: {
    display: 'flex', alignItems: 'center', gap: '6px',
  },
  micIconOff: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '18px', height: '18px', borderRadius: '50%',
    background: 'rgba(255,68,68,0.2)', flexShrink: 0,
  },
  tileName: {
    color: '#fff', fontSize: '12px', fontWeight: '500',
    textShadow: '0 1px 4px rgba(0,0,0,0.8)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  hostBadge: {
    display: 'inline-block',
    background: 'rgba(0,212,255,0.2)', color: '#00d4ff',
    fontSize: '9px', fontWeight: '700', padding: '2px 8px',
    borderRadius: '4px', border: '1px solid rgba(0,212,255,0.4)',
    letterSpacing: '0.5px', boxShadow: '0 0 8px rgba(0,212,255,0.2)',
    flexShrink: 0,
  },
  spotlightBadge: {
    display: 'inline-block',
    background: 'rgba(255,170,0,0.2)', color: '#ffcc00',
    fontSize: '9px', fontWeight: '700', padding: '2px 8px',
    borderRadius: '4px', border: '1px solid rgba(255,204,0,0.4)',
    letterSpacing: '0.5px', boxShadow: '0 0 8px rgba(255,170,0,0.2)',
    flexShrink: 0,
  },
  handBadge: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', flexShrink: 0,
  },
  spotlightHover: {
    position: 'absolute', inset: 0,
    background: 'rgba(0,212,255,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none',
  },
  spotlightHoverText: {
    color: '#00d4ff', fontSize: '12px', fontWeight: '600',
    background: 'rgba(0,0,0,0.7)', padding: '4px 12px', borderRadius: '6px',
  },

  // ── Speaker / Spotlight Layout ──────────────────────────────────────
  speakerContainer: {
    display: 'flex', flexDirection: 'column', gap: '10px',
    width: '100%', height: 'calc(100vh - 120px)', maxHeight: 'calc(100vh - 120px)',
    flex: 1, minHeight: 0, overflow: 'hidden',
  },
  speakerMain: {
    flex: 1, minHeight: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  },
  filmstrip: {
    display: 'flex', gap: '8px', overflowX: 'auto', overflowY: 'hidden',
    padding: '4px 0 85px 0', flexShrink: 0, scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(0,212,255,0.3) transparent',
  },
  spotlightPrompt: {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)', zIndex: 5,
  },
  spotlightPromptText: {
    color: '#7ecfff', fontSize: '14px', fontWeight: '500',
    background: 'rgba(0,0,0,0.7)', padding: '8px 16px',
    borderRadius: '8px', border: '1px solid rgba(0,212,255,0.2)',
  },

  // ── Presentation View (Screen Share, PDF, Whiteboard) ───────────────
  presentationDesktop: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: '12px',
    width: '100%',
    height: 'calc(100vh - 2rem)',
    maxHeight: 'calc(100vh - 2rem)',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  presentationMobile: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
    height: '100%',
    maxHeight: 'calc(100vh - 110px)',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  presentationMainDesktop: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    height: '100%',
    maxHeight: '100%',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0a0e1a',
    border: '1px solid rgba(0,212,255,0.12)',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 0 24px rgba(0,212,255,0.06)',
    boxSizing: 'border-box',
  },
  presentationMainMobile: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0a0e1a',
    border: '1px solid rgba(0,212,255,0.12)',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 0 24px rgba(0,212,255,0.06)',
    boxSizing: 'border-box',
  },
  presentationVideo: {
    width: '100%',
    height: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    display: 'block',
  },
  presentationLabel: {
    position: 'absolute', top: '10px', left: '10px',
    display: 'flex', alignItems: 'center', gap: '6px',
    zIndex: 5,
  },
  presentationLabelText: {
    color: '#00ff88', fontSize: '11px', fontWeight: '600',
    background: 'rgba(0,255,136,0.1)', padding: '4px 10px',
    borderRadius: '6px', border: '1px solid rgba(0,255,136,0.3)',
    letterSpacing: '0.3px',
  },

  // ── PDF Presentation ────────────────────────────────────────────────────
  pdfPresentationWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxSizing: 'border-box',
    borderRadius: '12px',
  },
  pdfPresentationContainer: {
    width: '100%',
    height: '100%',
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '16px 20px 96px 20px',
    backgroundColor: '#060d16',
    boxSizing: 'border-box',
  },
  pdfDocumentWrapper: {
    margin: 'auto',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  pdfLoading: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '10px', padding: '60px 20px',
    color: '#7ecfff', fontSize: '13px',
  },
  loadingSpinnerSmall: {
    width: '28px', height: '28px',
    border: '3px solid rgba(0,212,255,0.2)', borderTop: '3px solid #00d4ff',
    borderRadius: '50%', animation: 'spin 1s linear infinite',
  },
  pdfError: {
    color: '#ff4444', padding: '60px 20px', textAlign: 'center', fontSize: '13px',
  },
  pdfNavArrow: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 40,
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(0, 0, 0, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    transition: 'all 0.2s ease',
    outline: 'none',
    userSelect: 'none',
    padding: 0,
  },
  pdfNavArrowLeft: {
    left: '1rem',
  },
  pdfNavArrowRight: {
    right: '1rem',
  },
  pdfNavArrowHover: {
    background: 'rgba(0, 0, 0, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.45)',
    transform: 'translateY(-50%) scale(1.08)',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.8)',
  },
  pdfNavArrowDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
    pointerEvents: 'none',
  },
  pdfTopBar: {
    position: 'absolute',
    top: '12px',
    right: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    zIndex: 40,
  },
  pdfPageBadge: {
    color: '#fff',
    fontSize: '12px',
    fontWeight: '500',
    background: 'rgba(10, 14, 26, 0.82)',
    padding: '4px 10px',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    whiteSpace: 'nowrap',
    letterSpacing: '0.3px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    userSelect: 'none',
  },
  pdfPageText: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#e2e8f0',
  },
  pdfBadgeDivider: {
    width: '1px',
    height: '12px',
    background: 'rgba(255, 255, 255, 0.2)',
    margin: '0 2px',
  },
  pdfZoomBtn: {
    width: '22px',
    height: '22px',
    borderRadius: '4px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '14px',
    lineHeight: '1',
    padding: 0,
    outline: 'none',
    transition: 'all 0.15s ease',
  },
  pdfZoomPct: {
    fontSize: '11px',
    color: '#7ecfff',
    fontWeight: '600',
    minWidth: '32px',
    textAlign: 'center',
  },
  pdfZoomResetBtn: {
    padding: '2px 7px',
    borderRadius: '4px',
    background: 'rgba(0, 212, 255, 0.15)',
    border: '1px solid rgba(0, 212, 255, 0.3)',
    color: '#00d4ff',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: '600',
    outline: 'none',
    transition: 'all 0.15s ease',
  },

  // ── PDF Annotation Toolbar ─────────────────────────────────────────────
  pdfAnnotationToolbar: {
    position: 'absolute',
    top: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(10, 14, 26, 0.92)',
    border: '1px solid rgba(0, 212, 255, 0.3)',
    borderRadius: '24px',
    padding: '4px 10px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7), 0 0 16px rgba(0, 212, 255, 0.12)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    zIndex: 45,
    userSelect: 'none',
  },
  pdfToolBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'transparent',
    border: '1px solid transparent',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    outline: 'none',
    transition: 'all 0.15s ease',
  },
  pdfToolBtnActive: {
    background: 'rgba(0, 212, 255, 0.22)',
    borderColor: 'rgba(0, 212, 255, 0.55)',
    color: '#00d4ff',
    boxShadow: '0 0 10px rgba(0, 212, 255, 0.35)',
  },
  pdfToolBtnDanger: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    borderRadius: '14px',
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    color: '#f87171',
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.15s ease',
  },
  pdfToolDivider: {
    width: '1px',
    height: '16px',
    background: 'rgba(255, 255, 255, 0.15)',
    margin: '0 2px',
  },
  pdfColorPalette: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 4px',
  },
  pdfColorDot: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },

  // ── Whiteboard ─────────────────────────────────────────────────────────
  whiteboardContainer: {
    width: '100%',
    height: '100%',
    flex: 1,
    minHeight: 0,
    maxHeight: '100%',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    pointerEvents: 'auto',
    zIndex: 1,
    boxSizing: 'border-box',
  },
  whiteboardLoading: {
    width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '10px',
    color: '#555', fontSize: '13px', backgroundColor: '#ffffff',
  },
  whiteboardCloseCircle: {
    position: 'absolute', top: '16px', right: '16px',
    width: '36px', height: '36px', zIndex: 50,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.95)',
    border: '1px solid rgba(0,0,0,0.1)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    cursor: 'pointer', transition: 'all 0.2s',
  },
  whiteboardMediaToolbar: {
    position: 'absolute',
    top: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(10, 14, 26, 0.94)',
    border: '1px solid rgba(0, 212, 255, 0.35)',
    borderRadius: '24px',
    padding: '4px 12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.75), 0 0 16px rgba(0, 212, 255, 0.15)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    zIndex: 48,
    userSelect: 'none',
  },
  mediaToolbarBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#38bdf8',
    letterSpacing: '0.3px',
    paddingRight: '6px',
    borderRight: '1px solid rgba(255, 255, 255, 0.15)',
  },
  mediaPulseDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: '#ef4444',
    boxShadow: '0 0 8px #ef4444',
  },
  mediaToolbarGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  mediaModeBtn: {
    padding: '3px 9px',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#cbd5e1',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: '500',
    outline: 'none',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  },
  mediaModeBtnActive: {
    background: 'rgba(0, 212, 255, 0.22)',
    borderColor: 'rgba(0, 212, 255, 0.6)',
    color: '#00d4ff',
    boxShadow: '0 0 10px rgba(0, 212, 255, 0.3)',
    fontWeight: '600',
  },
  mediaActionBtn: {
    padding: '3px 9px',
    borderRadius: '12px',
    background: 'rgba(16, 185, 129, 0.16)',
    border: '1px solid rgba(16, 185, 129, 0.4)',
    color: '#34d399',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: '500',
    outline: 'none',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  },
  mediaDivider: {
    width: '1px',
    height: '16px',
    background: 'rgba(255, 255, 255, 0.15)',
    margin: '0 2px',
  },
  studentViewOnlyBadge: {
    position: 'absolute',
    top: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(10, 14, 26, 0.92)',
    border: '1px solid rgba(0, 212, 255, 0.35)',
    borderRadius: '20px',
    padding: '6px 16px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 12px rgba(0, 212, 255, 0.12)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    zIndex: 40,
    userSelect: 'none',
    pointerEvents: 'none',
    color: '#e2e8f0',
    fontSize: '12px',
    fontWeight: '500',
    letterSpacing: '0.3px',
  },
  studentViewOnlyDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#10b981',
    boxShadow: '0 0 8px #10b981',
    flexShrink: 0,
  },
  studentWhiteboardShield: {
    position: 'absolute',
    inset: 0,
    zIndex: 35,
    backgroundColor: 'transparent',
    cursor: 'default',
    pointerEvents: 'auto',
  },

  // ── Filmstrip / Right-Hand Participant Sidebar ─────────────────────
  filmstripVertical: {
    width: '200px',
    minWidth: '200px',
    maxWidth: '220px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    height: 'calc(100vh - 2rem)',
    maxHeight: 'calc(100vh - 2rem)',
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '4px 6px 90px 2px',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(0, 212, 255, 0.3) rgba(10, 14, 26, 0.4)',
    boxSizing: 'border-box',
  },
  filmstripHorizontal: {
    height: '100px',
    minHeight: '100px',
    flexShrink: 0,
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    overflowY: 'hidden',
    padding: '4px 0',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(0, 212, 255, 0.3) rgba(10, 14, 26, 0.4)',
    boxSizing: 'border-box',
  },
  filmstripTileDesktop: {
    width: '100%',
    height: '110px',
    minHeight: '110px',
    maxHeight: '110px',
    flexShrink: 0,
    backgroundColor: '#0a0e1a',
    border: '1px solid rgba(0,212,255,0.12)',
    borderRadius: '8px',
    overflow: 'hidden',
    position: 'relative',
    transition: 'border-color 0.3s, box-shadow 0.3s',
    boxSizing: 'border-box',
  },
  filmstripTileMobile: {
    width: '140px', height: '80px', flexShrink: 0,
    backgroundColor: '#0a0e1a',
    border: '1px solid rgba(0,212,255,0.12)',
    borderRadius: '8px', overflow: 'hidden', position: 'relative',
    transition: 'border-color 0.3s, box-shadow 0.3s',
  },
  filmstripVideo: {
    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
  },
  filmstripAvatar: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse, rgba(0,212,255,0.04) 0%, transparent 70%)',
  },
  filmstripOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: '3px 6px',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
    display: 'flex', alignItems: 'center', gap: '4px',
  },
  filmstripName: {
    color: '#fff', fontSize: '9px', fontWeight: '500',
    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
  },
  filmstripMicOff: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '12px', height: '12px', borderRadius: '50%',
    background: 'rgba(255,68,68,0.25)', flexShrink: 0,
  },
  filmstripHost: {
    color: '#00d4ff', fontSize: '7px', fontWeight: '700',
    padding: '1px 4px', borderRadius: '3px',
    background: 'rgba(0,212,255,0.2)', border: '1px solid rgba(0,212,255,0.3)',
    flexShrink: 0, letterSpacing: '0.3px',
  },
  filmstripHand: { fontSize: '9px', flexShrink: 0 },
  filmstripSpeakerGlow: {
    position: 'absolute', inset: 0, borderRadius: '8px',
    border: '2px solid #00d4ff',
    boxShadow: '0 0 14px rgba(0,212,255,0.3)',
    pointerEvents: 'none',
  },

  // ── Reactions Float ─────────────────────────────────────────────────
  reactionsFloat: {
    position: 'absolute', bottom: '100px', right: '20px',
    display: 'flex', flexDirection: 'column', gap: '4px',
    pointerEvents: 'none', zIndex: 60,
  },
  reactionEmoji: {
    fontSize: '28px', animation: 'reactionFloat 2.5s ease-out forwards',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // FLOATING CONTROL BAR — Zoom-Style with Neon Glassmorphism
  // ═══════════════════════════════════════════════════════════════════════
  controlBar: {
    position: 'fixed',
    bottom: '1.5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 14px',
    maxWidth: '95vw',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    background: 'rgba(10, 14, 26, 0.92)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: '16px',
    border: '1px solid rgba(0,212,255,0.2)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(0,212,255,0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
    zIndex: 50,
    pointerEvents: 'auto',
  },
  controlBarCompact: {
    padding: '6px 10px',
    gap: '4px',
    borderRadius: '14px',
    bottom: '1.5rem',
    maxWidth: '95vw',
    overflowX: 'auto',
    zIndex: 50,
    pointerEvents: 'auto',
  },
  ctrlGroup: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
    cursor: 'pointer', userSelect: 'none',
  },
  ctrlGroupCompact: {
    gap: '1px',
  },
  ctrlBtn: {
    width: '44px', height: '44px', borderRadius: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
    color: '#7ecfff',
  },
  ctrlBtnCompact: {
    width: '34px', height: '34px', borderRadius: '10px',
  },
  ctrlBtnDefault: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  ctrlBtnActive: {
    background: 'rgba(0,212,255,0.15)',
    border: '1px solid rgba(0,212,255,0.35)',
    boxShadow: '0 0 12px rgba(0,212,255,0.12)',
    color: '#00d4ff',
  },
  ctrlBtnOff: {
    background: 'rgba(255,68,68,0.12)',
    border: '1px solid rgba(255,68,68,0.3)',
    color: '#ff4444',
  },
  ctrlBtnHand: {
    background: 'rgba(255,204,0,0.12)',
    border: '1px solid rgba(255,204,0,0.3)',
    boxShadow: '0 0 12px rgba(255,204,0,0.1)',
    color: '#ffcc00',
  },
  ctrlBtnDanger: {
    background: '#ff4444',
    color: '#ffffff',
    boxShadow: '0 0 16px rgba(255,68,68,0.3)',
  },
  ctrlLabel: {
    color: '#7ecfff', fontSize: '9px', fontWeight: '500',
  },
  ctrlLabelCompact: {
    fontSize: '0px', height: 0, overflow: 'hidden', margin: 0, padding: 0,
  },
  ctrlDivider: {
    width: '1px', height: '28px',
    background: 'rgba(255,255,255,0.08)', margin: '0 4px',
    alignSelf: 'center',
  },
  ctrlDividerCompact: {
    height: '20px', margin: '0 2px',
  },

  // ── Auto-Kicked Overlay Styles ──────────────────────────────────────
  kickedOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(5, 8, 16, 0.95)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  kickedCard: {
    backgroundColor: '#0d1322',
    border: '1px solid rgba(255, 68, 68, 0.4)',
    borderRadius: '16px',
    padding: '36px 32px',
    maxWidth: '460px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 68, 68, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '14px',
  },
  kickedIconContainer: {
    width: '68px',
    height: '68px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 68, 68, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
  },
  kickedTitle: {
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: '700',
    margin: 0,
    letterSpacing: '0.2px',
  },
  kickedDesc: {
    color: '#94a3b8',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: 0,
  },
  kickedActions: {
    display: 'flex',
    gap: '12px',
    width: '100%',
    marginTop: '10px',
  },
  rejoinBtn: {
    flex: 1,
    padding: '12px 18px',
    backgroundColor: '#00d4ff',
    color: '#070a13',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 14px rgba(0, 212, 255, 0.3)',
  },
  kickedLeaveBtn: {
    padding: '12px 18px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: '#cbd5e1',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  rejoinPendingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    marginTop: '10px',
    width: '100%',
  },
  rejoinPendingText: {
    color: '#7ecfff',
    fontSize: '14px',
    fontWeight: '500',
  },
  rejoinRejectedBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    marginTop: '10px',
    width: '100%',
  },
  rejoinRejectedText: {
    color: '#ff6b6b',
    fontSize: '14px',
    fontWeight: '500',
  },

  // ── Warning Phase Modal Styles ─────────────────────────────────────
  warningOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9998,
    padding: '20px',
  },
  warningModal: {
    backgroundColor: '#0d1322',
    border: '1px solid rgba(255, 87, 87, 0.6)',
    borderRadius: '16px',
    padding: '30px 28px',
    maxWidth: '440px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(255, 68, 68, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    animation: 'pulseWarning 2s infinite',
  },
  warningBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 12px',
    backgroundColor: 'rgba(255, 68, 68, 0.15)',
    border: '1px solid rgba(255, 68, 68, 0.35)',
    borderRadius: '20px',
  },
  warningBadgeText: {
    color: '#ff4444',
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.8px',
  },
  warningPulseDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#ff4444',
  },
  strikeContainer: {
    display: 'flex',
    gap: '10px',
    marginTop: '6px',
  },
  strikePill: {
    padding: '6px 14px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
  },
  strikePillActive: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderColor: '#ff4444',
    color: '#ff4444',
    boxShadow: '0 0 10px rgba(255, 68, 68, 0.3)',
  },
  warningHeadline: {
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: '700',
    margin: '4px 0 0 0',
  },
  warningDescription: {
    color: '#94a3b8',
    fontSize: '13px',
    lineHeight: '1.5',
    margin: 0,
  },
  warningCountdownBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: 'rgba(255, 68, 68, 0.08)',
    border: '1px solid rgba(255, 68, 68, 0.25)',
    borderRadius: '12px',
    margin: '6px 0',
    width: '100%',
    boxSizing: 'border-box',
  },
  warningCountdownNumber: {
    color: '#ff4444',
    fontSize: '32px',
    fontWeight: '800',
    fontVariantNumeric: 'tabular-nums',
  },
  warningCountdownLabel: {
    color: '#cbd5e1',
    fontSize: '12px',
    fontWeight: '500',
  },
  warningPrivacyNote: {
    color: '#64748b',
    fontSize: '11px',
    fontStyle: 'italic',
  },

  // ── Teacher Rejoin Notification Styles ──────────────────────────────
  teacherRejoinToastContainer: {
    position: 'fixed',
    top: '24px',
    right: '24px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxWidth: '380px',
    width: 'calc(100% - 48px)',
  },
  teacherRejoinToast: {
    backgroundColor: '#0d1322',
    border: '1px solid rgba(0, 212, 255, 0.35)',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7), 0 0 15px rgba(0, 212, 255, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    animation: 'toastSlideIn 0.3s ease-out forwards',
  },
  teacherToastHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  teacherToastAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    border: '1px solid rgba(0, 212, 255, 0.4)',
    color: '#00d4ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '15px',
    flexShrink: 0,
  },
  teacherToastInfo: {
    flex: 1,
    minWidth: 0,
  },
  teacherToastName: {
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  teacherToastSub: {
    color: '#94a3b8',
    fontSize: '11px',
    marginTop: '2px',
  },
  teacherToastActions: {
    display: 'flex',
    gap: '8px',
  },
  teacherToastApproveBtn: {
    flex: 1,
    padding: '8px 14px',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  teacherToastRejectBtn: {
    padding: '8px 14px',
    backgroundColor: 'rgba(255, 68, 68, 0.15)',
    color: '#ff6b6b',
    border: '1px solid rgba(255, 68, 68, 0.3)',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },

  // ═══════════════════════════════════════════════════════════════════════
};

export default VideoRoom;
