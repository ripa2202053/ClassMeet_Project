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
  onToggleSidebar, onLeave, onReaction,
}, ref) => {
  // ── State ──────────────────────────────────────────────────────────────
  const [peers, setPeers] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
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

  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

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
      if (!isLocalDrawingRef.current && excalidrawAPIRef.current && scene?.elements) {
        excalidrawAPIRef.current.updateScene({ elements: scene.elements });
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
        if (myVideo.current) myVideo.current.srcObject = stream;
      }
      if (mode !== 'full') setIsCameraOff(true);
      setStreamReady(true);
      socket.emit('join-room', roomId, user._id, { name: user.name, role: user.role });
      console.log(`[VideoRoom] ${mode} → joined room ${roomId}`);
      processPending();
    };

    const MEDIA_TIMEOUT = 10000;
    const withTimeout = (promise, ms) => {
      let timer;
      return Promise.race([
        promise,
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('getUserMedia timed out')), ms); }),
      ]).finally(() => clearTimeout(timer));
    };

    withTimeout(navigator.mediaDevices.getUserMedia({ video: true, audio: true }), MEDIA_TIMEOUT)
      .catch((err) => {
        console.warn('[VideoRoom] video+audio failed or timed out:', err.message);
        return withTimeout(navigator.mediaDevices.getUserMedia({ video: false, audio: true }), MEDIA_TIMEOUT)
          .catch((err2) => {
            console.warn('[VideoRoom] audio-only also failed or timed out:', err2.message);
            return null;
          });
      })
      .then((stream) => {
        if (!stream) return joinRoom(null, 'no-media');
        if (!stream.getVideoTracks().length) return joinRoom(stream, 'audio-only');
        joinRoom(stream, 'full');
      });

    return () => {
      mountedRef.current = false;
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

  const toggleCamera = () => {
    if (!streamRef.current) return;
    const videoTracks = streamRef.current.getVideoTracks();
    if (videoTracks.length === 0) return;
    const newCameraOff = !isCameraOff;
    videoTracks.forEach((t) => { t.enabled = !newCameraOff; });
    setIsCameraOff(newCameraOff);
    if (onCameraOff) onCameraOff(newCameraOff);
    socket.emit('user-camera', { roomId, userId: user._id, socketId: socket.id, cameraOff: newCameraOff });
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

  const changePdfPage = (newPage) => {
    if (newPage < 1) return;
    if (isPdfSharing) {
      setLocalPdfPage(newPage);
      socket.emit('pdf-page-change', { roomId, page: newPage });
    }
  };

  const isActivePdfPresenter = isPdfSharing && !!localPdfUrl;
  const activePdfUrl = isActivePdfPresenter ? localPdfUrl : sharedPdfUrl;
  const activePdfPage = isActivePdfPresenter ? localPdfPage : sharedPdfPage;
  const activePdfNumPages = isActivePdfPresenter ? localPdfNumPages : sharedPdfNumPages;
  const activePdfBy = isActivePdfPresenter ? user?.name : sharedPdfBy;
  const canNavigatePdf = isPdfSharing;

  // ═════════════════════════════════════════════════════════════════════════
  // WHITEBOARD (Excalidraw)
  // ═════════════════════════════════════════════════════════════════════════
  const toggleWhiteboard = () => {
    if (isWhiteboardActive) {
      closeWhiteboard();
    } else {
      setIsWhiteboardActive(true);
      setWhiteboardHostSocketId(socket.id);
      socket.emit('whiteboard-started', { roomId, startedBy: user?.name, socketId: socket.id });
    }
  };

  const closeWhiteboard = () => {
      setIsWhiteboardActive(false);
      setRemoteWhiteboardScene(null);
      setWhiteboardHostSocketId(null);
      latestWhiteboardSceneRef.current = null;
      excalidrawAPIRef.current = null;
      isLocalDrawingRef.current = false;
      lastWhiteboardEmitRef.current = 0;
    socket.emit('whiteboard-stop', { roomId });
  };

  const handleWhiteboardChange = useCallback((elements, appState) => {
    if (!socket) return;
    const now = Date.now();
    if (now - lastWhiteboardEmitRef.current < 80) return;
    lastWhiteboardEmitRef.current = now;
    socket.emit('whiteboard-draw', {
      roomId,
      scene: { elements },
      socketId: socket.id,
      startedBy: user?.name,
    });
  }, [socket, roomId, user?.name]);

  const handleWhiteboardPointerDown = useCallback(() => {
    isLocalDrawingRef.current = true;
  }, []);

  const handleWhiteboardPointerUp = useCallback(() => {
    isLocalDrawingRef.current = false;
    if (!socket || !excalidrawAPIRef.current) return;
    const elements = excalidrawAPIRef.current.getSceneElements();
    socket.emit('whiteboard-draw', {
      roomId,
      scene: { elements },
      socketId: socket.id,
      startedBy: user?.name,
    });
  }, [socket, roomId, user?.name]);

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
  // FACE DETECTION (student only)
  // ═════════════════════════════════════════════════════════════════════════
  const handleFaceDetected = useCallback(({ isValidFace, emotion, isSuspicious }) => {
    if (onFaceTime) onFaceTime(isValidFace ? 1 : 0);
    if (onLivenessChange) onLivenessChange(isSuspicious ? 'suspicious' : isValidFace ? 'live' : 'no_face');
    socket.emit('face-detected', {
      roomId, userId: user._id, socketId: socket.id, studentName: user.name, isValidFace,
      emotion: emotion || 'neutral',
      isSuspicious: !!isSuspicious,
    });
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
  const isInPresentationMode = isScreenSharing || isActivePdfPresenter || !!sharedPdfUrl || isWhiteboardActive;
  const isActivePresenter = isScreenSharing || isActivePdfPresenter || (isWhiteboardActive && whiteboardHostSocketId === socket?.id);

  const resolveMeta = (peerId) => {
    const meta = participants?.find((p) => p.socketId === peerId);
    return { name: meta?.name || 'Participant', role: meta?.role || 'student' };
  };

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
    >
      {user?.role === 'student' && localStream && (
        <FaceDetection stream={localStream} onFaceDetected={handleFaceDetected} />
      )}
    </VideoTile>
  );

  const buildPeerTile = (peerObj, opts = {}) => {
    const meta = resolveMeta(peerObj.peerID);
    return (
      <PeerVideo
        key={peerObj.key || peerObj.peerID}
        peer={peerObj.peer}
        name={meta.name}
        role={meta.role}
        peerId={peerObj.peerID}
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
          isScreenSharing={isScreenSharing}
          canNavigatePdf={canNavigatePdf && isActivePresenter}
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
          onWhiteboardClear={handleWhiteboardClear}
          onWhiteboardPointerDown={handleWhiteboardPointerDown}
          onWhiteboardPointerUp={handleWhiteboardPointerUp}
          onCloseWhiteboard={closeWhiteboard}
          excalidrawAPIRef={excalidrawAPIRef}
          whiteboardRef={whiteboardRef}
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

            {/* Whiteboard */}
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
  pdfUrl, pdfPage, pdfNumPages, isPdfSharing, pdfFileName, isScreenSharing, onPdfLoaded,
  canNavigatePdf, isActivePresenter, onPdfPrevPage, onPdfNextPage,
  isWhiteboardActive, remoteWhiteboardScene, onWhiteboardChange, onWhiteboardClear, onWhiteboardPointerDown, onWhiteboardPointerUp, onCloseWhiteboard, excalidrawAPIRef, whiteboardRef,
}) => {
  const [localPdfScale, setLocalPdfScale] = useState(1.0);
  const [hoverSide, setHoverSide] = useState(null);

  // Attach camera stream on mount (fixes timing: PresentationView mounts AFTER startScreenShare sets state)
  useEffect(() => {
    if (localCameraRef.current && cameraStream) {
      localCameraRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, localCameraRef]);

  const showPdf = !!pdfUrl && !isScreenSharing && !isWhiteboardActive;
  const showScreen = isScreenSharing && !isWhiteboardActive;
  const showWhiteboard = isWhiteboardActive;

  return (
    <div style={isMobile ? S.presentationMobile : S.presentationDesktop}>
      {/* ── Main Content Area ────────────────────────────────────── */}
      <div style={isMobile ? S.presentationMainMobile : S.presentationMainDesktop}>
        {showScreen && (
          <video
            ref={mainRef}
            autoPlay
            playsInline
            muted
            style={S.presentationVideo}
          />
        )}

        {showPdf && (
          <div style={S.pdfPresentationContainer}>
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
                pageNumber={pdfPage || 1}
                scale={localPdfScale}
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

            {/* ── Left Arrow (Previous Page) ── */}
            {canNavigatePdf && pdfPage > 1 && (
              <div
                style={{
                  ...S.pdfSideArrow,
                  left: '8px', top: '50%', transform: 'translateY(-50%)',
                  opacity: hoverSide === 'left' ? 0.95 : 0.35,
                }}
                onMouseEnter={() => setHoverSide('left')}
                onMouseLeave={() => setHoverSide(null)}
                onClick={(e) => { e.stopPropagation(); onPdfPrevPage(); }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </div>
            )}

            {/* ── Right Arrow (Next Page) ── */}
            {canNavigatePdf && (!pdfNumPages || pdfPage < pdfNumPages) && (
              <div
                style={{
                  ...S.pdfSideArrow,
                  right: '8px', top: '50%', transform: 'translateY(-50%)',
                  opacity: hoverSide === 'right' ? 0.95 : 0.35,
                }}
                onMouseEnter={() => setHoverSide('right')}
                onMouseLeave={() => setHoverSide(null)}
                onClick={(e) => { e.stopPropagation(); onPdfNextPage(); }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            )}

            {/* ── Page Badge ── */}
            <div style={S.pdfPageBadge}>
              Page {pdfPage || 1} of {pdfNumPages || '?'}
            </div>
          </div>
        )}

        {showWhiteboard && (
          <div
            style={S.whiteboardContainer}
            onPointerDown={onWhiteboardPointerDown}
            onPointerUp={onWhiteboardPointerUp}
          >
            <Suspense fallback={
              <div style={S.whiteboardLoading}>
                <div style={S.loadingSpinnerSmall} />
                <span>Loading Whiteboard...</span>
              </div>
            }>
              <ExcalidrawWrapper
                ref={whiteboardRef}
                excalidrawAPI={(api) => { excalidrawAPIRef.current = api; }}
                initialData={remoteWhiteboardScene ? { elements: remoteWhiteboardScene.elements } : undefined}
                onChange={onWhiteboardChange}
                viewModeEnabled={!isActivePresenter}
                zenModeEnabled={false}
                UIOptions={{
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
                }}
                theme="light"
                name="ClassMeet Whiteboard"
              />
            </Suspense>

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

      {/* ── Filmstrip ──────────────────────────────────────────── */}
      <div style={isMobile ? S.filmstripHorizontal : S.filmstripVertical}>
        {/* Local camera tile */}
        <div style={isMobile ? S.filmstripTileMobile : S.filmstripTileDesktop}>
          <video
            ref={localCameraRef}
            autoPlay
            playsInline
            muted
            style={S.filmstripVideo}
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
  role, isSpotlighted, isActiveSpeaker, isHandRaised, isCompact, onClick, children,
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
const PeerVideo = ({ peer, name, role, peerId, isSpotlighted, isActiveSpeaker, onClick, isCompact, onStreamReady }) => {
  const ref = useRef(null);
  const [isCameraOff, setIsCameraOff] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const attachStream = (stream) => {
      if (cancelled) return;
      const el = ref.current;
      if (!el) return;
      if (!stream || stream.getTracks().length === 0) return;
      el.srcObject = stream;

      const videoTracks = stream.getVideoTracks();
      const updateCameraState = () => {
        if (cancelled) return;
        const allDisabled = videoTracks.length > 0 && videoTracks.every((t) => !t.enabled);
        setIsCameraOff(allDisabled || videoTracks.length === 0);
      };
      updateCameraState();
      videoTracks.forEach((t) => {
        t.addEventListener('mute', updateCameraState);
        t.addEventListener('unmute', updateCameraState);
        t.addEventListener('ended', updateCameraState);
      });

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
    />
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// STYLES — Neon/Cyberpunk Theme
// ═══════════════════════════════════════════════════════════════════════════════
const S = {
  container: {
    width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column', position: 'relative',
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
  videoGrid: { display: 'grid', gap: '10px', width: '100%', flex: 1, alignContent: 'center' },

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
  videoBoxCompact: { width: '160px', height: '120px', flexShrink: 0, aspectRatio: 'auto' },
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
    width: '100%', height: '100%',
  },
  speakerMain: {
    flex: 1, minHeight: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  filmstrip: {
    display: 'flex', gap: '8px', overflowX: 'auto', overflowY: 'hidden',
    padding: '4px 0', flexShrink: 0, scrollbarWidth: 'thin',
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

  // ── Presentation View (Screen Share) ───────────────────────────────
  presentationDesktop: {
    display: 'flex', gap: '10px', width: '100%', flex: 1, minHeight: 0,
  },
  presentationMobile: {
    display: 'flex', flexDirection: 'column', gap: '8px',
    width: '100%', flex: 1, minHeight: 0,
  },
  presentationMainDesktop: {
    flex: 1, minWidth: 0, position: 'relative',
    display: 'flex', flexDirection: 'column',
    backgroundColor: '#0a0e1a',
    border: '1px solid rgba(0,212,255,0.12)',
    borderRadius: '12px', overflow: 'hidden',
    boxShadow: '0 0 24px rgba(0,212,255,0.06)',
  },
  presentationMainMobile: {
    flex: 1, minHeight: 0, position: 'relative',
    display: 'flex', flexDirection: 'column',
    backgroundColor: '#0a0e1a',
    border: '1px solid rgba(0,212,255,0.12)',
    borderRadius: '12px', overflow: 'hidden',
    boxShadow: '0 0 24px rgba(0,212,255,0.06)',
  },
  presentationVideo: {
    width: '100%', height: '100%', objectFit: 'contain', display: 'block',
  },
  presentationLabel: {
    position: 'absolute', top: '10px', left: '10px',
    display: 'flex', alignItems: 'center', gap: '6px',
  },
  presentationLabelText: {
    color: '#00ff88', fontSize: '11px', fontWeight: '600',
    background: 'rgba(0,255,136,0.1)', padding: '4px 10px',
    borderRadius: '6px', border: '1px solid rgba(0,255,136,0.3)',
    letterSpacing: '0.3px',
  },

  // ── PDF Presentation ────────────────────────────────────────────────────
  pdfPresentationContainer: {
    width: '100%', height: '100%',
    overflow: 'auto', display: 'flex', justifyContent: 'center',
    alignItems: 'flex-start', padding: '20px',
    backgroundColor: '#060d16',
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
  pdfSideArrow: {
    position: 'absolute', width: '36px', height: '36px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.1)',
    cursor: 'pointer', transition: 'opacity 0.2s, background 0.2s',
    zIndex: 10, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
  },
  pdfPageBadge: {
    position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
    color: '#fff', fontSize: '11px', fontWeight: '500',
    background: 'rgba(0,0,0,0.45)', padding: '4px 12px',
    borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
    whiteSpace: 'nowrap', zIndex: 10, letterSpacing: '0.3px',
  },

  // ── Whiteboard ─────────────────────────────────────────────────────────
  whiteboardContainer: {
    width: '100%', height: '80vh', flex: 1,
    position: 'relative', overflow: 'hidden',
    display: 'flex', borderRadius: '8px',
    backgroundColor: '#ffffff',
    pointerEvents: 'auto', zIndex: 1,
  },
  whiteboardLoading: {
    width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '10px',
    color: '#555', fontSize: '13px', backgroundColor: '#ffffff',
  },
  whiteboardCloseCircle: {
    position: 'absolute', top: '16px', right: '16px',
    width: '36px', height: '36px', zIndex: 20,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.95)',
    border: '1px solid rgba(0,0,0,0.1)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    cursor: 'pointer', transition: 'all 0.2s',
  },

  // ── Filmstrip (Desktop Vertical / Mobile Horizontal) ───────────────
  filmstripVertical: {
    width: '180px', flexShrink: 0,
    display: 'flex', flexDirection: 'column', gap: '8px',
    overflowY: 'auto', overflowX: 'hidden',
    padding: '2px 0', scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(0,212,255,0.3) transparent',
  },
  filmstripHorizontal: {
    height: '110px', flexShrink: 0,
    display: 'flex', gap: '8px',
    overflowX: 'auto', overflowY: 'hidden',
    padding: '4px 0', scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(0,212,255,0.3) transparent',
  },
  filmstripTileDesktop: {
    width: '100%', height: '100px', flexShrink: 0,
    backgroundColor: '#0a0e1a',
    border: '1px solid rgba(0,212,255,0.12)',
    borderRadius: '8px', overflow: 'hidden', position: 'relative',
    transition: 'border-color 0.3s, box-shadow 0.3s',
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
    position: 'absolute', bottom: '16px', left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '10px 18px',
    background: 'rgba(10, 14, 26, 0.88)',
    backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
    borderRadius: '16px',
    border: '1px solid rgba(0,212,255,0.12)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(0,212,255,0.04), inset 0 1px 0 rgba(255,255,255,0.04)',
    zIndex: 50,
  },
  controlBarCompact: {
    padding: '6px 14px', gap: '4px', borderRadius: '14px', bottom: '10px',
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

  // ═══════════════════════════════════════════════════════════════════════
};

export default VideoRoom;
