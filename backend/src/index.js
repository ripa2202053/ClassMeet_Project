const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const Room = require('./models/Room');
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const exportRoutes = require('./routes/exportRoutes');
const quizRoutes = require('./routes/quizRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const breakoutRoutes = require('./routes/breakoutRoutes');

dotenv.config();
console.log('[Startup] Environment loaded');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 10 * 1024 * 1024,
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/breakout', breakoutRoutes);

app.get('/', (_req, res) => res.send('Live Class API Running...'));

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, _req, res, _next) => {
  console.log('Unhandled error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY ROOM STATE
//
// activeRooms = Map<roomId, {
//   startTime, duration, teacherSocket, students, participants
// }>
//
// participants Map key = socket.id → { userId, name, role }
// students   Map key = userId     → { name, faceTime, livenessStatus, ... }
// ═══════════════════════════════════════════════════════════════════════════════
const activeRooms = new Map();

async function ensureRoomTracked(roomId) {
  if (activeRooms.has(roomId)) return activeRooms.get(roomId);

  let startTime = Date.now();
  let duration = 60;
  try {
    const room = await Room.findById(roomId);
    if (room) {
      if (room.startTime) startTime = new Date(room.startTime).getTime();
      if (room.duration) duration = room.duration;
    }
  } catch (err) {
    console.error('[Attendance] Failed to load room:', err.message);
  }

  const entry = {
    startTime,
    duration,
    teacherSocket: null,
    students: new Map(),
    participants: new Map(),
  };
  activeRooms.set(roomId, entry);
  return entry;
}

function computeAttendancePayload(roomId) {
  const room = activeRooms.get(roomId);
  if (!room) return null;

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - room.startTime) / 1000));
  const totalClassSeconds = room.duration * 60;

  const students = [];
  for (const [sid, s] of room.students) {
    const percentage = elapsedSeconds > 0
      ? Math.min((s.faceTime / elapsedSeconds) * 100, 100)
      : 0;
    students.push({
      studentId: s.userId || sid,
      name: s.name,
      faceTime: s.faceTime,
      percentage: parseFloat(percentage.toFixed(1)),
      isPresent: percentage >= 75,
      livenessStatus: s.livenessStatus,
      isOnline: s.isOnline !== false,
      lastUpdate: s.lastUpdate,
      emotion: s.emotion || 'neutral',
      isSuspicious: s.isSuspicious || false,
    });
  }

  students.sort((a, b) => b.percentage - a.percentage);
  return { roomId, elapsedSeconds, totalClassSeconds, students };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOCKET EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // ─────────────────────────────────────────────────────────────────────────
  // join-room
  //
  // NEW SIGNALING FLOW (Zoom-style):
  //   1. Socket joins the Socket.IO room
  //   2. Metadata stored in participants Map
  //   3. Server emits 'all-users' to the JOINER containing every existing user
  //   4. The JOINER creates an initiator SimplePeer for each existing user
  //   5. Each existing user receives the offer via 'receiving-signal' and
  //      creates a non-initiator peer to answer
  //   6. The answer is relayed back via 'returning-signal'
  //
  // This is the correct direction: JOINER = initiator.
  // The existing users do NOT create peers proactively — they only respond.
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('join-room', async (roomId, userId, metadata = {}) => {
    socket.join(roomId);
    const { name, role } = metadata;

    const room = await ensureRoomTracked(roomId);

    // Guard: if this socket already exists in this room, skip duplicate setup
    if (room.participants.has(socket.id)) {
      console.log(`[Room] Duplicate join ignored — ${name || userId} (${socket.id}) already in ${roomId}`);
      return;
    }

    room.participants.set(socket.id, { userId, name, role });

    if (role === 'teacher') {
      room.teacherSocket = socket.id;
    }

    // Build list of ALL existing users (excluding the joiner)
    const existingUsers = [];
    for (const [sid, p] of room.participants) {
      if (sid !== socket.id) {
        existingUsers.push({ socketId: sid, ...p });
      }
    }

    console.log(
      `[Room] ${name || userId} (${role || '?'}) joined ${roomId} — ` +
      `${room.participants.size} total, ${existingUsers.length} existing`
    );

    // KEY EVENT: Send the full list of existing users back to the joiner.
    socket.emit('all-users', existingUsers);
    socket.emit('room:participants', existingUsers);

    socket.to(roomId).emit('room:participant-joined', {
      socketId: socket.id,
      userId,
      name,
      role,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // sending-signal — Relay WebRTC OFFER from initiator to target
  //
  // Frontend: socket.emit('sending-signal', { userToSignal, signal })
  // Server:   io.to(userToSignal).emit('receiving-signal', { signal, from })
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('sending-signal', ({ userToSignal, signal }) => {
    console.log(`[Signal] Offer: ${socket.id} → ${userToSignal}`);
    io.to(userToSignal).emit('receiving-signal', {
      signal,
      from: socket.id,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // returning-signal — Relay WebRTC ANSWER from receiver back to initiator
  //
  // Frontend: socket.emit('returning-signal', { userToSignal, signal })
  // Server:   io.to(userToSignal).emit('signal-received', { signal, from })
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('returning-signal', ({ userToSignal, signal }) => {
    console.log(`[Signal] Answer: ${socket.id} → ${userToSignal}`);
    io.to(userToSignal).emit('signal-received', {
      signal,
      from: socket.id,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Chat
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('send-message', (roomId, message) => {
    socket.to(roomId).emit('receive-message', message);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // User status events
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('user-muted', ({ roomId, userId, socketId, muted }) => {
    socket.to(roomId).emit('user-muted', { userId, socketId, muted });
  });

  socket.on('user-camera', ({ roomId, userId, socketId, cameraOff }) => {
    socket.to(roomId).emit('user-camera', { userId, socketId, cameraOff });
  });

  socket.on('reaction', ({ roomId, emoji, userId }) => {
    socket.to(roomId).emit('reaction', { emoji, userId });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Mute All / Mute Individual (Teacher → Student)
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('mute-all', ({ roomId }) => {
    console.log(`[Room] Mute-all requested by ${socket.id} in ${roomId}`);
    socket.to(roomId).emit('mute-all');
  });

  socket.on('mute-participant', ({ roomId, targetSocketId }) => {
    console.log(`[Room] Mute-participant ${targetSocketId} requested by ${socket.id} in ${roomId}`);
    io.to(targetSocketId).emit('mute-all');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Quiz
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('quiz-started', ({ roomId, quiz }) => {
    socket.to(roomId).emit('quiz-started', { quiz });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Breakout rooms
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('breakout-started', ({ mainRoomId, rooms }) => {
    socket.to(mainRoomId).emit('breakout-started', { rooms });
  });

  socket.on('breakout-ended', ({ mainRoomId }) => {
    socket.to(mainRoomId).emit('breakout-ended');
  });

  socket.on('breakout-broadcast', ({ mainRoomId, message }) => {
    socket.to(mainRoomId).emit('breakout-broadcast', message);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PDF sharing
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('pdf-share', ({ roomId, pdfData, page, sharedBy }) => {
    socket.to(roomId).emit('pdf-shared', { pdfData, page, sharedBy });
  });

  socket.on('pdf-page-change', ({ roomId, page }) => {
    socket.to(roomId).emit('pdf-page-changed', { page });
  });

  socket.on('pdf-stop', ({ roomId }) => {
    socket.to(roomId).emit('pdf-stopped');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Whiteboard (Excalidraw) synchronization
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('whiteboard-started', ({ roomId, startedBy, socketId }) => {
    console.log(`[Whiteboard] Started by ${startedBy} in room ${roomId}`);
    socket.to(roomId).emit('whiteboard-started', { startedBy, socketId });
  });

  socket.on('whiteboard-draw', ({ roomId, scene, socketId, startedBy }) => {
    socket.to(roomId).emit('whiteboard-draw', { scene, startedBy, socketId });
  });

  socket.on('whiteboard-clear', ({ roomId }) => {
    console.log(`[Whiteboard] Cleared in room ${roomId}`);
    socket.to(roomId).emit('whiteboard-clear');
  });

  socket.on('whiteboard-stop', ({ roomId }) => {
    console.log(`[Whiteboard] Stopped in room ${roomId}`);
    socket.to(roomId).emit('whiteboard-stop');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Legacy face update
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('student:face_update', ({ classId, studentId, studentName, faceTime, livenessStatus }) => {
    socket.to(classId).emit('student:face_update', {
      studentId, studentName, faceTime, livenessStatus,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // face-detected — Core attendance tracking
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('face-detected', async ({ roomId, userId, socketId, studentName, isValidFace, emotion, isSuspicious }) => {
    if (!roomId || !userId) return;

    const room = await ensureRoomTracked(roomId);
    const sid = socketId || socket.id;

    if (!room.students.has(sid)) {
      room.students.set(sid, {
        userId,
        name: studentName || 'Student',
        faceTime: 0,
        livenessStatus: 'detecting',
        socketId: sid,
        isOnline: true,
        lastUpdate: Date.now(),
        emotion: 'neutral',
        isSuspicious: false,
      });
    }

    const student = room.students.get(sid);
    if (studentName) student.name = studentName;
    student.userId = userId;
    student.socketId = sid;
    student.isOnline = true;
    student.livenessStatus = isValidFace ? 'live' : 'no_face';
    student.lastUpdate = Date.now();
    if (emotion) student.emotion = emotion;
    if (typeof isSuspicious === 'boolean') student.isSuspicious = isSuspicious;
    if (isValidFace) student.faceTime += 1;

    const payload = computeAttendancePayload(roomId);
    if (!payload) return;

    if (room.teacherSocket) {
      io.to(room.teacherSocket).emit('attendance-update', payload);
    } else {
      io.to(roomId).emit('attendance-update', payload);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // disconnect
  //
  // CRITICAL: Socket.IO v4 removes the socket from all rooms BEFORE firing
  // 'disconnect'. socket.rooms is { socket.id } at this point. We iterate
  // activeRooms (our source of truth) and use io.to() for reliable broadcast.
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);

    for (const [roomId, room] of activeRooms) {
      if (room.teacherSocket === socket.id) {
        room.teacherSocket = null;
        console.log(`[Room] Teacher left ${roomId}`);
      }

      if (room.participants.has(socket.id)) {
        const { name, role } = room.participants.get(socket.id);
        room.participants.delete(socket.id);

        io.to(roomId).emit('room:participant-left', { socketId: socket.id });
        io.to(roomId).emit('user-left', socket.id);

        console.log(
          `[Room] ${name || socket.id} (${role || '?'}) left ${roomId} — ` +
          `${room.participants.size} remaining`
        );
      }

      for (const [sid, s] of room.students) {
        if (sid === socket.id || s.socketId === socket.id) {
          s.isOnline = false;
          s.livenessStatus = 'no_face';
        }
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STALE ROOM CLEANUP
// ═══════════════════════════════════════════════════════════════════════════════
setInterval(() => {
  const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
  for (const [roomId, room] of activeRooms) {
    let allStale = true;
    for (const [, s] of room.students) {
      if (s.lastUpdate > fourHoursAgo) {
        allStale = false;
        break;
      }
    }
    if (allStale && room.teacherSocket === null && room.participants.size === 0) {
      activeRooms.delete(roomId);
      console.log(`[Cleanup] Removed stale room ${roomId}`);
    }
  }
}, 30 * 60 * 1000);

const PORT = process.env.PORT || 5000;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Server] ERROR: Port ${PORT} is already in use.`);
    console.error(`[Server] Stop the process currently using port ${PORT} (e.g. another node/nodemon instance) and restart.`);
  } else {
    console.error(`[Server] Error on port ${PORT}:`, err);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught exception:', err);
});

server.listen(PORT, () => {
  console.log(`[Server] HTTP + Socket.IO server running on port ${PORT}`);
});

connectDB();
