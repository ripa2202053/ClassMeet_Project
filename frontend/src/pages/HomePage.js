import logo from '../assets/logo.png';
import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Magnetic Button ─────────────────────────────────────────────────
const MagBtn = ({ children, className, onClick, style }) => {
  const ref = useRef(null);
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    ref.current.style.transform = `translate(${x * 0.18}px, ${y * 0.18}px)`;
  };
  const onLeave = () => { ref.current.style.transform = 'translate(0,0)'; };
  return (
    <button ref={ref} className={className} onClick={onClick} style={{ transition: 'transform 0.4s cubic-bezier(0.23,1,0.32,1)', ...style }}
      onMouseMove={onMove} onMouseLeave={onLeave}>{children}</button>
  );
};

// ── Animated Counter ────────────────────────────────────────────────
const Counter = ({ end, suffix = '', duration = 2000 }) => {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const ob = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        const t0 = performance.now();
        const tick = (now) => {
          const p = Math.min((now - t0) / duration, 1);
          setVal(Math.floor(end * (1 - Math.pow(1 - p, 4))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        ob.disconnect();
      }
    }, { threshold: 0.5 });
    if (ref.current) ob.observe(ref.current);
    return () => ob.disconnect();
  }, [end, duration]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
};

// ── Floating Particle ───────────────────────────────────────────────
const Particles = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.3 + 0.08,
      color: Math.random() > 0.5 ? '37,99,235' : '13,148,136',
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(37,99,235,${0.05 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
};

// ── Feature Card (3D tilt) ──────────────────────────────────────────
const TiltCard = ({ children, style, className }) => {
  const ref = useRef(null);
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) scale(1.02)`;
    ref.current.style.boxShadow = `${-x * 20}px ${-y * 20}px 40px rgba(15,23,42,0.08), 0 0 30px rgba(37,99,235,${Math.abs(x) * 0.18 + 0.04})`;
  };
  const onLeave = () => {
    ref.current.style.transform = 'perspective(800px) rotateY(0) rotateX(0) scale(1)';
    ref.current.style.boxShadow = '';
  };
  return (
    <div ref={ref} className={className} style={{ transition: 'transform 0.4s cubic-bezier(0.23,1,0.32,1), box-shadow 0.4s', ...style }}
      onMouseMove={onMove} onMouseLeave={onLeave}>{children}</div>
  );
};

// ═══════════════════════════════════════════════════════════════════
const HomePage = ({ onGetStarted, onLogin }) => {
  const [navScrolled, setNavScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [videoOpen, setVideoOpen] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [wordIdx, setWordIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const cursorRef = useRef(null);
  const cursorDotRef = useRef(null);

  const words = ['Attendance.', 'Whiteboard.', 'Live Quizzes.', 'Breakout Rooms.', 'Private Vivas.'];

  // typewriter
  useEffect(() => {
    const curr = words[wordIdx];
    const t = setTimeout(() => {
      if (!isDeleting) {
        if (typedText.length < curr.length) setTypedText(curr.slice(0, typedText.length + 1));
        else setTimeout(() => setIsDeleting(true), 1800);
      } else {
        if (typedText.length > 0) setTypedText(curr.slice(0, typedText.length - 1));
        else { setIsDeleting(false); setWordIdx(i => (i + 1) % words.length); }
      }
    }, isDeleting ? 55 : 110);
    return () => clearTimeout(t);
  }, [typedText, isDeleting, wordIdx]);

  // cursor
  useEffect(() => {
    let cx = -200, cy = -200;
    let tx = -200, ty = -200;
    const move = (e) => { tx = e.clientX; ty = e.clientY; };
    window.addEventListener('mousemove', move);
    const tick = () => {
      cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12;
      if (cursorRef.current) { cursorRef.current.style.left = `${tx}px`; cursorRef.current.style.top = `${ty}px`; }
      if (cursorDotRef.current) { cursorDotRef.current.style.left = `${cx}px`; cursorDotRef.current.style.top = `${cy}px`; }
      requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener('mousemove', move); cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    const s = () => setNavScrolled(window.scrollY > 50);
    window.addEventListener('scroll', s);
    return () => window.removeEventListener('scroll', s);
  }, []);

  const features = [
    {
      icon: '👁️', label: 'AI Attendance', color: '#0D9488',
      title: 'Face Detection Attendance',
      desc: 'AI scans every face as class starts. Students marked present instantly — full timestamped reports auto-generated.',
      pills: ['Real-time scan', 'Excel export', 'Low-light support'],
      img: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=700&q=85&fit=crop',
    },
    {
      icon: '🖊️', label: 'Smart Whiteboard', color: '#2563EB',
      title: 'Intelligent Smart Whiteboard',
      desc: 'Infinite canvas that feels like a real smart classroom board. Handwriting recognition, math templates, multi-user live drawing.',
      pills: ['Infinite canvas', 'Shape recognition', 'Multi-user'],
      img: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=700&q=85&fit=crop',
    },
    {
      icon: '⚡', label: 'Live Quiz', color: '#7C3AED',
      title: 'AI-Proctored Live Quiz',
      desc: 'Launch quizzes mid-class. Tab switch = auto-submit. AI detects suspicious patterns. Live leaderboard appears instantly.',
      pills: ['Anti-cheat', 'Live leaderboard', 'AI proctoring'],
      img: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=700&q=85&fit=crop',
    },
    {
      icon: '🎙️', label: 'Private Viva', color: '#D97706',
      title: 'Private Viva Room',
      desc: 'Oral exams without disrupting class. AI randomly selects a student, sends private notification, opens a secure one-on-one room.',
      pills: ['Random selection', 'Private room', 'Auto-recorded'],
      img: 'https://images.unsplash.com/photo-1560439514-4e9645039924?w=700&q=85&fit=crop',
    },
    {
      icon: '👥', label: 'Breakout Rooms', color: '#059669',
      title: 'Smart Breakout Rooms',
      desc: 'Split class into groups in 2 seconds. Set timers, hop between rooms, students auto-return when time is up.',
      pills: ['Instant groups', 'Auto-return', 'Teacher visits'],
      img: 'https://images.unsplash.com/photo-1543269664-7eef42226a21?w=700&q=85&fit=crop',
    },
    {
      icon: '📄', label: 'PDF Viewer', color: '#E11D48',
      title: 'In-Class PDF Viewer',
      desc: 'Upload PDF, teach from it live — no screen share needed. Students follow the same page. Annotate and highlight live.',
      pills: ['No screen share', 'Live annotation', 'Auto-sync'],
      img: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=700&q=85&fit=crop',
    },
  ];

  const af = features[activeFeature];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        :root {
          --bg: #EAF2FB;
          --s1: #FFFFFF;
          --s2: #F3F8FE;
          --s3: #E7F0FC;
          --b1: rgba(15,52,96,0.08);
          --b2: rgba(15,52,96,0.14);
          --t: #0F2647;
          --m: rgba(15,38,71,0.58);
          --a: #2563EB;
          --g: #0D9488;
          --fh: 'Bricolage Grotesque', sans-serif;
          --fb: 'DM Sans', sans-serif;
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: var(--bg); }

        .hp { font-family: var(--fb); background: var(--bg); color: var(--t); min-height: 100vh; overflow-x: hidden; cursor: none; }

        /* ── CURSOR ── */
        .hp-cursor {
          position: fixed; width: 36px; height: 36px;
          border: 1.5px solid rgba(13,148,136,0.45); border-radius: 50%;
          pointer-events: none; z-index: 9999;
          transform: translate(-50%,-50%);
          transition: width 0.3s, height 0.3s, border-color 0.3s, background 0.3s;
        }
        .hp-cursor-dot {
          position: fixed; width: 4px; height: 4px;
          background: #0D9488; border-radius: 50%;
          pointer-events: none; z-index: 9999;
          transform: translate(-50%,-50%);
        }
        .hp a:hover ~ .hp-cursor, .hp button:hover ~ .hp-cursor {
          width: 56px; height: 56px; background: rgba(13,148,136,0.08); border-color: rgba(13,148,136,0.7);
        }

        /* ── BG EFFECTS ── */
        .hp-bg {
          position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden;
          background: linear-gradient(180deg, #EAF2FB 0%, #F3F8FE 45%, #EAF2FB 100%);
        }
        .hp-orb {
          position: absolute; border-radius: 50%; filter: blur(120px);
          animation: orbDrift 20s ease-in-out infinite;
        }
        .hp-orb-1 { width: 700px; height: 700px; background: rgba(37,99,235,0.10); top: -200px; left: -150px; animation-delay: 0s; }
        .hp-orb-2 { width: 500px; height: 500px; background: rgba(13,148,136,0.09); bottom: -100px; right: -100px; animation-delay: -7s; }
        .hp-orb-3 { width: 400px; height: 400px; background: rgba(124,58,237,0.06); top: 40%; left: 40%; animation-delay: -14s; }
        @keyframes orbDrift {
          0%,100%{transform:translate(0,0) scale(1)}
          33%{transform:translate(30px,-20px) scale(1.05)}
          66%{transform:translate(-20px,30px) scale(0.95)}
        }
        .hp-grid {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background-image:
            linear-gradient(rgba(15,52,96,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15,52,96,0.035) 1px, transparent 1px);
          background-size: 52px 52px;
          mask-image: radial-gradient(ellipse 100% 80% at 50% 0%, black 20%, transparent 70%);
        }

        /* ── NAV ── */
        .hp-nav {
          position: sticky; top: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 56px; height: 72px;
          background: rgba(234,242,251,0.72);
          backdrop-filter: blur(18px) saturate(1.4);
          border-bottom: 1px solid transparent;
          transition: all 0.4s cubic-bezier(0.23,1,0.32,1);
        }
        .hp-nav.sc {
          background: rgba(255,255,255,0.86); backdrop-filter: blur(24px) saturate(1.6);
          border-bottom: 1px solid var(--b1);
          box-shadow: 0 1px 30px rgba(15,52,96,0.06);
        }
        .hp-logo { display: flex; align-items: center; gap: 11px; text-decoration: none; position: relative; z-index: 2; }
        .hp-logo-name { font-family: var(--fh); font-size: 21px; font-weight: 800; color: var(--t); letter-spacing: -0.02em; }

        .hp-nav-center { display: flex; align-items: center; gap: 34px; }
        .hp-nav-links { display: flex; align-items: center; gap: 30px; }
        .hp-nav-links a {
          display: flex; align-items: center; gap: 5px;
          color: #2A3A52; text-decoration: none; font-size: 14.5px; font-weight: 600;
          transition: color 0.2s; position: relative; padding: 6px 0;
        }
        .hp-nav-links a svg { transition: transform 0.25s; opacity: 0.55; }
        .hp-nav-links a:hover svg { transform: translateY(1px); }
        .hp-nav-links a::after { content:''; position:absolute; bottom:0; left:0; width:0; height:2px; border-radius: 2px; background:var(--a); transition:width 0.3s cubic-bezier(0.23,1,0.32,1); }
        .hp-nav-links a:hover { color: var(--a); }
        .hp-nav-links a:hover::after { width: 100%; }

        .hp-nav-r { display: flex; align-items: center; gap: 22px; }
        .hp-icon-btn {
          width: 38px; height: 38px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: rgba(15,52,96,0.05); border: 1px solid transparent; color: #2A3A52;
          cursor: pointer; transition: all 0.25s;
        }
        .hp-icon-btn:hover { background: rgba(37,99,235,0.1); color: var(--a); }
        .hp-nav-textlink {
          display: flex; align-items: center; gap: 5px;
          font-size: 14.5px; font-weight: 600; color: #2A3A52; text-decoration: none;
          background: none; border: none; cursor: pointer; font-family: var(--fb);
          transition: color 0.2s;
        }
        .hp-nav-textlink:hover { color: var(--a); }
        .btn-solid-sm {
          background: var(--a); border: none; color: #fff; padding: 11px 26px;
          border-radius: 100px; font-size: 14px; font-weight: 700; cursor: pointer;
          font-family: var(--fb); transition: all 0.3s;
          box-shadow: 0 8px 22px rgba(37,99,235,0.28);
        }
        .btn-solid-sm:hover { background: #1D4ED8; transform: translateY(-1px); box-shadow: 0 10px 28px rgba(37,99,235,0.38); }

        /* ── HERO ── */
        .hp-hero {
          position: relative; z-index: 5;
          min-height: 92vh; display: flex; align-items: center;
          padding: 0 64px;
          overflow: hidden;
        }
        .hp-hero-inner { max-width: 1200px; margin: 0 auto; width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }

        .hp-hero-left {}
        .hp-pill {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(13,148,136,0.09); border: 1px solid rgba(13,148,136,0.22);
          color: #0D7468; font-size: 12px; font-weight: 600;
          padding: 5px 14px 5px 8px; border-radius: 100px; margin-bottom: 30px;
          animation: pillGlow 3s ease-in-out infinite;
        }
        @keyframes pillGlow { 0%,100%{box-shadow:0 0 0 rgba(13,148,136,0)} 50%{box-shadow:0 0 20px rgba(13,148,136,0.16)} }
        .hp-pill-dot { width: 7px; height: 7px; border-radius: 50%; background: #0D9488; animation: pdot 1.8s ease-in-out infinite; }
        @keyframes pdot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.6)} }

        .hp-hero h1 {
          font-family: var(--fh);
          font-size: clamp(44px, 5.8vw, 72px);
          font-weight: 800; color: var(--t); line-height: 1.04;
          letter-spacing: -0.03em; margin-bottom: 6px;
        }
        .hp-hero-typed {
          font-family: var(--fh);
          font-size: clamp(44px, 5.8vw, 72px);
          font-weight: 800; line-height: 1.04;
          letter-spacing: -0.03em; margin-bottom: 26px;
          background: linear-gradient(90deg, #2563EB 0%, #0D9488 65%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          min-height: 1.1em;
        }
        .hp-cursor-blink { display: inline-block; width: 3px; height: 0.85em; background: #0D9488; margin-left: 3px; vertical-align: middle; animation: cblink 1s step-end infinite; }
        @keyframes cblink { 0%,100%{opacity:1} 50%{opacity:0} }

        .hp-sub { font-size: 17px; font-weight: 400; color: var(--m); line-height: 1.78; margin-bottom: 44px; max-width: 500px; }

        .hp-ctas { display: flex; gap: 14px; margin-bottom: 52px; flex-wrap: wrap; }
        .btn-hero-primary {
          padding: 16px 38px; border-radius: 100px; font-size: 15px; font-weight: 700;
          cursor: pointer; font-family: var(--fb); border: none; color: #fff;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          box-shadow: 0 14px 34px rgba(37,99,235,0.32);
          transition: all 0.4s cubic-bezier(0.23,1,0.32,1);
          display: flex; align-items: center; gap: 9px;
          position: relative; overflow: hidden;
        }
        .btn-hero-primary::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.18), transparent);
          opacity: 0; transition: opacity 0.3s;
        }
        .btn-hero-primary:hover { transform: translateY(-5px) scale(1.02); box-shadow: 0 20px 46px rgba(37,99,235,0.42); }
        .btn-hero-primary:hover::before { opacity: 1; }
        .btn-hero-ghost {
          padding: 16px 32px; border-radius: 100px; font-size: 15px; font-weight: 600;
          cursor: pointer; font-family: var(--fb);
          background: #fff; border: 1px solid var(--b2); color: var(--t);
          transition: all 0.3s; display: flex; align-items: center; gap: 9px;
          box-shadow: 0 4px 14px rgba(15,52,96,0.05);
        }
        .btn-hero-ghost:hover { background: var(--s2); border-color: rgba(37,99,235,0.3); transform: translateY(-4px); }

        /* trust */
        .hp-trust { display: flex; align-items: center; gap: 16px; }
        .hp-avs { display: flex; }
        .hp-av { width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--bg); margin-left: -9px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
        .hp-av:first-child { margin-left: 0; }
        .hp-trust-t { font-size: 13px; color: var(--m); line-height: 1.5; }
        .hp-trust-t strong { color: var(--t); font-weight: 700; }

        /* Hero right — classroom mockup */
        .hp-hero-r { position: relative; }
        .hp-mockup {
          border-radius: 20px; overflow: hidden;
          border: 1px solid var(--b1);
          box-shadow: 0 40px 90px rgba(15,52,96,0.16), 0 0 0 1px rgba(15,52,96,0.02);
          position: relative;
        }
        .hp-mk-bar {
          background: #F7FAFE; padding: 11px 16px;
          display: flex; align-items: center; gap: 10px;
          border-bottom: 1px solid var(--b1);
        }
        .hp-mk-dots { display: flex; gap: 5px; }
        .hp-mk-dot { width: 10px; height: 10px; border-radius: 50%; }
        .hp-mk-title { font-size: 12px; color: rgba(15,38,71,0.32); flex: 1; text-align: center; font-family: 'DM Mono', monospace; }
        .hp-mk-body { background: #FFFFFF; display: grid; grid-template-columns: 1fr 200px; min-height: 320px; }
        .hp-mk-video { position: relative; display: flex; flex-direction: column; padding: 14px; gap: 10px; border-right: 1px solid var(--b1); }
        .hp-mk-main-cam {
          flex: 1; border-radius: 12px; overflow: hidden; position: relative; min-height: 180px;
          background: linear-gradient(135deg, #DCEBFB, #EAF2FB);
        }
        .hp-mk-main-cam img { width: 100%; height: 100%; object-fit: cover; display: block; opacity: 0.92; }
        .hp-mk-cam-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(15,38,71,0.45), transparent 50%); }
        .hp-mk-cam-name { position: absolute; bottom: 10px; left: 12px; font-size: 11px; font-weight: 600; color: #fff; background: rgba(15,38,71,0.55); padding: 3px 8px; border-radius: 5px; backdrop-filter: blur(8px); }
        .hp-mk-live { position: absolute; top: 10px; right: 10px; display: flex; align-items: center; gap: 5px; background: rgba(225,29,72,0.14); border: 1px solid rgba(225,29,72,0.32); padding: 4px 9px; border-radius: 6px; font-size: 10px; font-weight: 700; color: #E11D48; letter-spacing: 0.06em; }
        .hp-mk-livedot { width: 5px; height: 5px; border-radius: 50%; background: #E11D48; animation: pdot 1.4s ease-in-out infinite; }
        .hp-mk-cams { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
        .hp-mk-cam-sm {
          border-radius: 8px; overflow: hidden; position: relative; aspect-ratio: 4/3;
          background: linear-gradient(135deg, #DCEBFB, #EAF2FB);
        }
        .hp-mk-cam-sm img { width: 100%; height: 100%; object-fit: cover; display: block; opacity: 0.85; }
        .hp-mk-cam-sm-name { position: absolute; bottom: 4px; left: 6px; font-size: 9px; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
        .hp-mk-ai-badge { position: absolute; top: 6px; right: 6px; width: 14px; height: 14px; border-radius: 50%; background: #0D9488; display: flex; align-items: center; justify-content: center; font-size: 7px; color: #fff; }
        .hp-mk-toolbar {
          padding: 10px 14px;
          background: #F7FAFE; border-top: 1px solid var(--b1);
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .hp-mk-tool { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; background: rgba(15,52,96,0.05); border: 1px solid var(--b1); cursor: pointer; transition: background 0.2s; }
        .hp-mk-tool.on { background: rgba(37,99,235,0.16); border-color: rgba(37,99,235,0.3); }
        .hp-mk-tool.red { background: rgba(225,29,72,0.14); border-color: rgba(225,29,72,0.28); }
        .hp-mk-sidebar { background: #FAFCFF; display: flex; flex-direction: column; }
        .hp-mk-sb-head { padding: 10px 12px; border-bottom: 1px solid var(--b1); font-size: 11px; font-weight: 700; color: rgba(15,38,71,0.55); }
        .hp-mk-msgs { padding: 10px 10px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
        .hp-mk-msg { display: flex; gap: 6px; }
        .hp-mk-msg-av { width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: 700; flex-shrink: 0; }
        .hp-mk-msg-body { font-size: 10px; color: rgba(15,38,71,0.62); line-height: 1.4; }
        .hp-mk-msg-name { font-size: 9px; color: rgba(15,38,71,0.35); margin-bottom: 2px; }
        .hp-mk-ai-row { padding: 8px 10px; border-top: 1px solid var(--b1); background: rgba(13,148,136,0.07); }
        .hp-mk-ai-text { font-size: 10px; color: #0D7468; font-weight: 600; display: flex; align-items: center; gap: 5px; }

        /* Floating badges */
        .hp-float {
          position: absolute; background: #fff; backdrop-filter: blur(20px);
          border: 1px solid var(--b1); border-radius: 14px; padding: 12px 16px;
          box-shadow: 0 16px 40px rgba(15,52,96,0.14);
          animation: floatUD 6s ease-in-out infinite;
          transition: transform 0.4s cubic-bezier(0.23,1,0.32,1);
          cursor: default;
        }
        .hp-float:hover { transform: scale(1.05) translateY(-4px) !important; }
        .hp-f1 { bottom: -24px; left: -32px; animation-delay: 0s; }
        .hp-f2 { top: -20px; right: -24px; animation-delay: -3s; }
        .hp-f3 { bottom: 60px; right: -40px; animation-delay: -5s; }
        @keyframes floatUD { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        .hp-float-num { font-family: var(--fh); font-size: 22px; font-weight: 800; color: var(--t); line-height: 1; }
        .hp-float-lbl { font-size: 11px; color: var(--m); margin-top: 2px; }
        .hp-float-chip { font-size: 11px; font-weight: 700; display: flex; align-items: center; gap: 6px; }

        /* ── TICKER ── */
        .hp-ticker {
          position: relative; z-index: 5;
          overflow: hidden; border-top: 1px solid var(--b1); border-bottom: 1px solid var(--b1);
          padding: 15px 0; background: var(--s1);
        }
        .hp-ticker-track { display: flex; gap: 52px; animation: tick 28s linear infinite; white-space: nowrap; width: max-content; }
        .hp-ticker-track:hover { animation-play-state: paused; }
        @keyframes tick { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .hp-tick { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--m); }
        .hp-tick span { color: var(--t); font-weight: 600; }
        .hp-tick-sep { width: 4px; height: 4px; border-radius: 50%; background: var(--a); flex-shrink: 0; }

        /* ── STATS ── */
        .hp-stats {
          position: relative; z-index: 5;
          display: grid; grid-template-columns: repeat(4, 1fr);
          max-width: 1100px; margin: 80px auto 0;
          border: 1px solid var(--b1); border-radius: 22px; overflow: hidden;
          background: var(--s1);
          box-shadow: 0 20px 50px rgba(15,52,96,0.06);
        }
        .hp-stat {
          padding: 44px 32px; text-align: center;
          border-right: 1px solid var(--b1); position: relative; overflow: hidden;
          transition: background 0.3s; cursor: default;
        }
        .hp-stat:last-child { border-right: none; }
        .hp-stat:hover { background: var(--s2); }
        .hp-stat-glow { position: absolute; inset: 0; background: radial-gradient(circle at 50% 100%, rgba(37,99,235,0.07), transparent 60%); opacity: 0; transition: opacity 0.3s; pointer-events: none; }
        .hp-stat:hover .hp-stat-glow { opacity: 1; }
        .hp-stat-line { position: absolute; bottom: 0; left: 0; height: 2px; width: 0; background: linear-gradient(90deg, var(--a), var(--g)); transition: width 0.8s cubic-bezier(0.23,1,0.32,1); }
        .hp-stat:hover .hp-stat-line { width: 100%; }
        .hp-stat-num { font-family: var(--fh); font-size: 42px; font-weight: 800; color: var(--t); display: block; line-height: 1; }
        .hp-stat-lbl { font-size: 13px; color: var(--m); margin-top: 8px; }

        /* ── SECTION ── */
        .hp-sec { position: relative; z-index: 5; max-width: 1200px; margin: 0 auto; padding: 100px 64px; }
        .hp-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--g); margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
        .hp-eyebrow::before { content: ''; width: 28px; height: 1.5px; background: var(--g); border-radius: 1px; }
        .hp-sec-h { font-family: var(--fh); font-size: clamp(30px, 4vw, 50px); font-weight: 800; color: var(--t); line-height: 1.1; letter-spacing: -0.025em; margin-bottom: 12px; }
        .hp-sec-sub { font-size: 16px; color: var(--m); line-height: 1.68; max-width: 480px; margin-bottom: 56px; }

        /* ── FEATURES ── */
        .hp-ftabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 44px; }
        .hp-ftab {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 18px; border-radius: 11px; cursor: pointer;
          background: var(--s1); border: 1px solid var(--b1);
          font-size: 13px; color: var(--m); font-family: var(--fb); font-weight: 500;
          transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
          position: relative; overflow: hidden;
        }
        .hp-ftab:hover { color: var(--t); border-color: var(--b2); transform: translateY(-2px); }
        .hp-ftab.on { font-weight: 700; transform: translateY(-2px); border-color: transparent; box-shadow: 0 8px 24px rgba(15,52,96,0.1); }

        .hp-fpanel {
          display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center;
          background: var(--s1); border: 1px solid var(--b1);
          border-radius: 24px; padding: 52px; position: relative; overflow: hidden;
          box-shadow: 0 20px 60px rgba(15,52,96,0.07);
        }
        .hp-fpanel-glow { position: absolute; width: 350px; height: 350px; border-radius: 50%; filter: blur(100px); opacity: 0.16; top: -100px; right: -100px; pointer-events: none; transition: background 0.6s; }
        .hp-ftag { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 12px; border-radius: 5px; display: inline-block; margin-bottom: 16px; }
        .hp-ftitle { font-family: var(--fh); font-size: 32px; font-weight: 800; color: var(--t); line-height: 1.15; margin-bottom: 16px; letter-spacing: -0.02em; }
        .hp-fdesc { font-size: 15px; color: var(--m); line-height: 1.75; margin-bottom: 28px; }
        .hp-fpills { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 32px; }
        .hp-fpill { font-size: 12px; font-weight: 600; padding: 5px 12px; border-radius: 100px; }
        .btn-f { display: inline-flex; align-items: center; gap: 8px; padding: 13px 26px; border-radius: 100px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: var(--fb); border: none; color: #fff; transition: all 0.3s cubic-bezier(0.23,1,0.32,1); }
        .btn-f:hover { transform: translateY(-3px); }
        .hp-fimg { border-radius: 18px; overflow: hidden; border: 1px solid var(--b1); position: relative; }
        .hp-fimg img { width: 100%; height: 320px; object-fit: cover; display: block; transition: transform 0.7s cubic-bezier(0.23,1,0.32,1); }
        .hp-fimg:hover img { transform: scale(1.05); }
        .hp-fimg-shine { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.10) 0%, transparent 50%); pointer-events: none; }

        /* ── VIDEO SECTION ── */
        .hp-demo { position: relative; z-index: 5; max-width: 1000px; margin: 0 auto; padding: 0 64px 80px; text-align: center; }
        .hp-demo-thumb {
          border-radius: 24px; overflow: hidden; cursor: pointer; position: relative;
          border: 1px solid var(--b1);
          box-shadow: 0 30px 80px rgba(15,52,96,0.14);
          transition: all 0.4s cubic-bezier(0.23,1,0.32,1);
        }
        .hp-demo-thumb:hover { transform: translateY(-8px) scale(1.01); box-shadow: 0 40px 100px rgba(15,52,96,0.18), 0 0 0 1px rgba(37,99,235,0.2); }
        .hp-demo-thumb img { width: 100%; height: 440px; object-fit: cover; display: block; filter: brightness(0.92); }
        .hp-demo-over { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 18px; background: rgba(15,38,71,0.28); }
        .hp-play {
          width: 90px; height: 90px; border-radius: 50%;
          background: rgba(255,255,255,0.2); backdrop-filter: blur(16px);
          border: 2px solid rgba(255,255,255,0.5);
          display: flex; align-items: center; justify-content: center; font-size: 32px; color: #fff;
          transition: all 0.4s cubic-bezier(0.23,1,0.32,1);
        }
        .hp-demo-thumb:hover .hp-play { background: var(--a); border-color: var(--a); transform: scale(1.12); box-shadow: 0 0 0 16px rgba(37,99,235,0.14), 0 0 50px rgba(37,99,235,0.3); }
        .hp-play-lbl { font-size: 16px; font-weight: 600; color: #fff; letter-spacing: 0.02em; }

        /* ── HOW IT WORKS ── */
        .hp-steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--b1); border-radius: 22px; overflow: hidden; border: 1px solid var(--b1); }
        .hp-step { background: var(--s1); padding: 40px 30px; position: relative; overflow: hidden; transition: background 0.3s; cursor: default; }
        .hp-step:hover { background: var(--s2); }
        .hp-step::after { content: ''; position: absolute; bottom: 0; left: 0; height: 3px; width: 0; background: linear-gradient(90deg, var(--a), var(--g)); transition: width 0.6s cubic-bezier(0.23,1,0.32,1); }
        .hp-step:hover::after { width: 100%; }
        .hp-step-num { font-family: var(--fh); font-size: 60px; font-weight: 900; color: rgba(37,99,235,0.14); line-height: 1; margin-bottom: 20px; }
        .hp-step h4 { font-family: var(--fh); font-size: 17px; font-weight: 700; color: var(--t); margin-bottom: 9px; }
        .hp-step p { font-size: 13px; color: var(--m); line-height: 1.65; }

        /* ── TESTIMONIALS ── */
        .hp-tgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .hp-tcard {
          background: var(--s1); border: 1px solid var(--b1); border-radius: 20px; padding: 28px;
          transition: all 0.35s cubic-bezier(0.23,1,0.32,1); cursor: default; position: relative; overflow: hidden;
          box-shadow: 0 4px 20px rgba(15,52,96,0.04);
        }
        .hp-tcard::before { content: '"'; position: absolute; top: -15px; right: 18px; font-size: 120px; color: rgba(37,99,235,0.06); font-family: Georgia, serif; line-height: 1; pointer-events: none; }
        .hp-tcard:hover { transform: translateY(-8px); border-color: var(--b2); box-shadow: 0 24px 60px rgba(15,52,96,0.12); }
        .hp-tstars { color: #D97706; font-size: 14px; letter-spacing: 2px; margin-bottom: 14px; }
        .hp-ttext { font-size: 14px; color: rgba(15,38,71,0.68); line-height: 1.7; font-style: italic; margin-bottom: 22px; }
        .hp-tfoot { display: flex; align-items: center; gap: 12px; }
        .hp-tav { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex-shrink: 0; }
        .hp-tname { font-size: 14px; font-weight: 700; color: var(--t); }
        .hp-trole { font-size: 11px; color: var(--m); margin-top: 1px; }

        /* ── INTEGRATIONS ── */
        .hp-ints { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 40px; }
        .hp-int { background: var(--s1); border: 1px solid var(--b1); border-radius: 12px; padding: 13px 22px; font-size: 13px; color: var(--m); font-weight: 500; display: flex; align-items: center; gap: 9px; transition: all 0.3s cubic-bezier(0.23,1,0.32,1); cursor: default; }
        .hp-int:hover { background: var(--s2); color: var(--t); border-color: var(--b2); transform: translateY(-3px); box-shadow: 0 10px 26px rgba(15,52,96,0.08); }

        /* ── CTA FINAL ── */
        .hp-cta {
          position: relative; z-index: 5; margin: 0 64px 90px;
          border-radius: 28px; padding: 100px 64px; text-align: center; overflow: hidden;
          border: 1px solid rgba(37,99,235,0.16);
          background: radial-gradient(ellipse 80% 60% at 50% 100%, rgba(37,99,235,0.12), transparent 70%),
                      radial-gradient(ellipse 60% 40% at 50% 0%, rgba(13,148,136,0.07), transparent 60%),
                      #FFFFFF;
          box-shadow: 0 30px 80px rgba(15,52,96,0.1);
        }
        .hp-cta-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(37,99,235,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.05) 1px, transparent 1px); background-size: 44px 44px; mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent); pointer-events: none; }
        .hp-cta h2 { font-family: var(--fh); font-size: clamp(30px, 5vw, 58px); font-weight: 900; color: var(--t); margin-bottom: 16px; position: relative; letter-spacing: -0.03em; line-height: 1.08; }
        .hp-cta p { font-size: 17px; color: var(--m); margin-bottom: 44px; position: relative; }
        .hp-cta-btns { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; position: relative; }

        /* ── MODAL ── */
        .hp-modal { position: fixed; inset: 0; background: rgba(15,23,42,0.85); z-index: 999; display: flex; align-items: center; justify-content: center; padding: 20px; animation: mIn 0.25s ease; }
        @keyframes mIn { from{opacity:0} to{opacity:1} }
        .hp-modal-box { width: 100%; max-width: 880px; border-radius: 20px; overflow: hidden; border: 1px solid rgba(255,255,255,0.12); position: relative; background: #000; animation: mScale 0.35s cubic-bezier(0.23,1,0.32,1); }
        @keyframes mScale { from{transform:scale(0.88);opacity:0} to{transform:scale(1);opacity:1} }
        .hp-close { position: absolute; top: 12px; right: 12px; z-index: 5; width: 36px; height: 36px; border-radius: 50%; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.2); color: #fff; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
        .hp-close:hover { background: rgba(225,29,72,0.5); }
        .hp-yt { width: 100%; aspect-ratio: 16/9; border: none; display: block; }

        /* ── FOOTER ── */
        footer { position: relative; z-index: 5; border-top: 1px solid var(--b1); padding: 30px 64px; display: flex; align-items: center; justify-content: space-between; background: var(--s1); }
        .fp-links { display: flex; gap: 22px; }
        .fp-links a { font-size: 12px; color: var(--m); text-decoration: none; transition: color 0.2s; font-weight: 500; }
        .fp-links a:hover { color: var(--a); }
        footer span { font-size: 12px; color: rgba(15,38,71,0.32); }

        /* ── FADE IN ── */
        .fi { opacity: 0; transform: translateY(28px); animation: fiIn 0.8s cubic-bezier(0.23,1,0.32,1) forwards; }
        @keyframes fiIn { to{opacity:1;transform:translateY(0)} }
        .fi-1{animation-delay:0.08s} .fi-2{animation-delay:0.18s} .fi-3{animation-delay:0.28s} .fi-4{animation-delay:0.38s} .fi-5{animation-delay:0.48s}

        @media(max-width:920px){
          .hp-nav{padding:0 20px} .hp-nav-center{display:none}
          .hp-hero{padding:60px 20px 40px; min-height:auto; padding-top:80px}
          .hp-hero-inner{grid-template-columns:1fr;gap:40px}
          .hp-hero-r{display:none}
          .hp-sec{padding:60px 20px} .hp-fpanel{grid-template-columns:1fr;gap:28px;padding:28px}
          .hp-steps{grid-template-columns:1fr 1fr} .hp-tgrid{grid-template-columns:1fr}
          .hp-stats{grid-template-columns:1fr 1fr;margin:40px 20px 0}
          .hp-cta{margin:0 16px 60px;padding:50px 20px}
          footer{padding:24px;flex-direction:column;gap:12px;text-align:center}
          .hp-demo{padding:0 20px 60px}
          .hp-cursor,.hp-cursor-dot{display:none} .hp{cursor:auto}
          .hp-nav-r .hp-icon-btn:nth-of-type(1){display:none}
        }
      `}</style>

      <div className="hp">
        {/* Custom cursor */}
        <div className="hp-cursor" ref={cursorRef} />
        <div className="hp-cursor-dot" ref={cursorDotRef} />

        {/* BG */}
        <div className="hp-bg">
          <div className="hp-orb hp-orb-1" />
          <div className="hp-orb hp-orb-2" />
          <div className="hp-orb hp-orb-3" />
        </div>
        <div className="hp-grid" />
        <Particles />

        {/* VIDEO MODAL */}
        {videoOpen && (
          <div className="hp-modal" onClick={() => setVideoOpen(false)}>
            <div className="hp-modal-box" onClick={e => e.stopPropagation()}>
              <button className="hp-close" onClick={() => setVideoOpen(false)}>✕</button>
              <iframe className="hp-yt" src="https://www.youtube.com/embed/8o7-BL-a998?autoplay=1&rel=0" title="Demo" allow="autoplay; fullscreen" allowFullScreen />
            </div>
          </div>
        )}

        {/* NAV — light theme, matches reference screenshot */}
        <nav className={`hp-nav ${navScrolled ? 'sc' : ''}`}>
          <a href="/" className="hp-logo">
            <img src={logo} alt="ClassMeet" style={{height:'36px',width:'auto'}} />
            <span className="hp-logo-name">ClassMeet</span>
          </a>

          <div className="hp-nav-center">
            <div className="hp-nav-links">
              <a href="/">Home</a>
              <a href="#features">Features
                <svg width="11" height="7" viewBox="0 0 11 7" fill="none"><path d="M1 1L5.5 5.5L10 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </a>
              <a href="#about">About</a>
              <a href="#how">How it works</a>
            </div>
          </div>

          <div className="hp-nav-r">
            <button className="hp-icon-btn" aria-label="Search">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="M21 21L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
            <a href="#contact" className="hp-nav-textlink">
              Contact
              <svg width="11" height="7" viewBox="0 0 11 7" fill="none"><path d="M1 1L5.5 5.5L10 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
            <button className="hp-nav-textlink" onClick={onLogin}>Sign In</button>
            <a href="#support" className="hp-nav-textlink">Support</a>
            <MagBtn className="btn-solid-sm" onClick={onGetStarted}>Sign Up Free</MagBtn>
          </div>
        </nav>

        {/* HERO */}
        <section className="hp-hero">
          <div className="hp-hero-inner">
            <div className="hp-hero-left">
              <div className="hp-pill fi fi-1"><span className="hp-pill-dot" />AI-Powered Live Classroom Platform</div>
              <h1 className="fi fi-2">Teach Online.<br />Smarter with</h1>
              <div className="hp-hero-typed fi fi-2">
                {typedText}<span className="hp-cursor-blink" />
              </div>
              <p className="hp-sub fi fi-3">
                HD live classes, AI face-detection attendance, smart whiteboard, anti-cheat quizzes,
                private viva rooms, breakout rooms, PDF sharing — everything in one seamless platform.
              </p>
              <div className="hp-ctas fi fi-4">
                <MagBtn className="btn-hero-primary" onClick={onGetStarted}>▶ Start Teaching Free</MagBtn>
                <MagBtn className="btn-hero-ghost" onClick={() => setVideoOpen(true)}>▷ Watch Demo</MagBtn>
              </div>
              <div className="hp-trust fi fi-5">
                <div className="hp-avs">
                  {[['AR','#2563EB'],['PS','#0D9488'],['MH','#7C3AED'],['JK','#D97706'],['FK','#E11D48']].map(([i,c],k)=>(
                    <div key={k} className="hp-av" style={{background:`${c}1A`,color:c}}>{i}</div>
                  ))}
                </div>
                <div className="hp-trust-t"><strong>12,400+ students</strong><br/>learning live every day</div>
              </div>
            </div>

            {/* HERO MOCKUP */}
            <div className="hp-hero-r fi fi-3">
              <div className="hp-mockup">
                <div className="hp-mk-bar">
                  <div className="hp-mk-dots">
                    <div className="hp-mk-dot" style={{background:'#FF5F57'}}/>
                    <div className="hp-mk-dot" style={{background:'#FEBC2E'}}/>
                    <div className="hp-mk-dot" style={{background:'#28C840'}}/>
                  </div>
                  <div className="hp-mk-title">ClassMeet · Data Structures · CS301</div>
                </div>
                <div className="hp-mk-body">
                  <div className="hp-mk-video">
                    <div className="hp-mk-main-cam">
                      <img src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&q=80&fit=crop" alt="Teacher" />
                      <div className="hp-mk-cam-overlay" />
                      <div className="hp-mk-cam-name">Dr. Rahman 👩‍🏫</div>
                      <div className="hp-mk-live"><div className="hp-mk-livedot"/>LIVE</div>
                    </div>
                    <div className="hp-mk-cams">
                      {[
                        ['https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=120&q=70&fit=crop','Arif R.'],
                        ['https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=120&q=70&fit=crop','Priya S.'],
                        ['https://images.unsplash.com/photo-1531482615713-2afd69097998?w=120&q=70&fit=crop','Mehedi H.'],
                      ].map(([src,name],i)=>(
                        <div className="hp-mk-cam-sm" key={i}>
                          <img src={src} alt={name} />
                          <div className="hp-mk-cam-sm-name">{name}</div>
                          <div className="hp-mk-ai-badge">✓</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="hp-mk-sidebar">
                    <div className="hp-mk-sb-head">💬 Live Chat</div>
                    <div className="hp-mk-msgs">
                      {[
                        {av:'AR',c:'#2563EB',n:'Arif',t:'Can you slow down a bit?'},
                        {av:'PS',c:'#0D9488',n:'Priya',t:'✋ Question please!'},
                        {av:'DR',c:'#7C3AED',n:'Dr. Rahman',t:'Sure, Priya go ahead 👍'},
                      ].map((m,i)=>(
                        <div className="hp-mk-msg" key={i}>
                          <div className="hp-mk-msg-av" style={{background:`${m.c}1A`,color:m.c}}>{m.av}</div>
                          <div className="hp-mk-msg-body"><div className="hp-mk-msg-name">{m.n}</div>{m.t}</div>
                        </div>
                      ))}
                    </div>
                    <div className="hp-mk-ai-row">
                      <div className="hp-mk-ai-text">✓ AI: 3 students marked present</div>
                    </div>
                  </div>
                </div>
                <div className="hp-mk-toolbar">
                  {[['🎙️','on'],['📷','on'],['🖥️','on'],['✋',''],['📄',''],['🖊️',''],['⏺️',''],['📞','red']].map(([ic,cls],i)=>(
                    <div key={i} className={`hp-mk-tool ${cls}`}>{ic}</div>
                  ))}
                </div>
              </div>
              {/* Floating badges */}
              <div className="hp-float hp-f1">
                <div className="hp-float-num">840+</div>
                <div className="hp-float-lbl">Active Educators</div>
              </div>
              <div className="hp-float hp-f2">
                <div className="hp-float-chip" style={{color:'#0D9488'}}>✓ AI Attendance On</div>
                <div className="hp-float-lbl" style={{marginTop:4}}>24 students marked present</div>
              </div>
              <div className="hp-float hp-f3">
                <div className="hp-float-chip" style={{color:'#7C3AED'}}>⚡ Live Quiz Active</div>
                <div className="hp-float-lbl" style={{marginTop:4}}>18/24 submitted</div>
              </div>
            </div>
          </div>
        </section>

        {/* TICKER */}
        <div className="hp-ticker">
          <div className="hp-ticker-track">
            {[...Array(2)].flatMap((_, r) =>
              ['AI Attendance','Smart Whiteboard','Live Quiz','Anti-Cheat','Screen Share','PDF Viewer','Breakout Rooms','Private Viva Room','Excel Reports','Auto Recording','Face Detection','Real-time Chat'].map((item,i)=>(
                <div className="hp-tick" key={`${r}-${i}`}>
                  <div className="hp-tick-sep"/>
                  <span>{item}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* STATS */}
        <div className="hp-stats" style={{marginLeft:'64px',marginRight:'64px'}}>
          {[
            {end:12400,suf:'+',lbl:'Active Students'},
            {end:840,suf:'+',lbl:'Educators'},
            {end:98000,suf:'+',lbl:'Classes Held'},
            {end:99.9,suf:'%',lbl:'Uptime'},
          ].map((s,i)=>(
            <div className="hp-stat" key={i}>
              <div className="hp-stat-glow"/>
              <div className="hp-stat-line"/>
              <span className="hp-stat-num"><Counter end={s.end} suffix={s.suf} /></span>
              <div className="hp-stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* FEATURES */}
        <section className="hp-sec" id="features">
          <div className="hp-eyebrow">Powerful Features</div>
          <h2 className="hp-sec-h">Everything you need to teach live.</h2>
          <p className="hp-sec-sub">Built specifically for educators — not just a video call with a chat box.</p>
          <div className="hp-ftabs">
            {features.map((f,i)=>(
  <button key={i} className={`hp-ftab ${activeFeature===i?'on':''}`}
                onClick={()=>setActiveFeature(i)}
                style={activeFeature===i?{background:`linear-gradient(135deg,${f.color}1A,${f.color}0D)`,borderColor:`${f.color}40`,color:f.color}:{}}
              >{f.icon} {f.label}</button>
            ))}
          </div>
          <TiltCard className="hp-fpanel">
            <div className="hp-fpanel-glow" style={{background:af.color}}/>
            <div style={{position:'relative',zIndex:1}}>
              <div className="hp-ftag" style={{background:`${af.color}15`,color:af.color,border:`1px solid ${af.color}30`}}>
                {['AI-Powered','Smart Board','Anti-Cheat','Unique Feature','Collaboration','Classroom Tool'][activeFeature]}
              </div>
              <div className="hp-ftitle">{af.title}</div>
              <div className="hp-fdesc">{af.desc}</div>
              <div className="hp-fpills">
                {af.pills.map(p=>(
                  <div key={p} className="hp-fpill" style={{background:`${af.color}12`,color:af.color,border:`1px solid ${af.color}25`}}>✓ {p}</div>
                ))}
              </div>
              <MagBtn className="btn-f" onClick={onGetStarted} style={{background:`linear-gradient(135deg,${af.color},${af.color}cc)`,color:'#fff',boxShadow:`0 10px 26px ${af.color}40`}}>
                Try {af.label} Free →
              </MagBtn>
            </div>
            <div className="hp-fimg" style={{position:'relative',zIndex:1}}>
              <img src={af.img} alt={af.title}/>
              <div className="hp-fimg-shine"/>
            </div>
          </TiltCard>
        </section>

        {/* DEMO VIDEO */}
        <div className="hp-demo" id="demo">
          <div className="hp-eyebrow" style={{justifyContent:'center'}}>See It In Action</div>
          <h2 className="hp-sec-h" style={{textAlign:'center',maxWidth:'none',marginBottom:10}}>Watch a real live class.</h2>
          <p style={{fontSize:15,color:'var(--m)',textAlign:'center',marginBottom:32}}>See every feature working together in one real session.</p>
          <div className="hp-demo-thumb" onClick={()=>setVideoOpen(true)}>
            <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=900&q=85&fit=crop" alt="Demo"/>
            <div className="hp-demo-over">
              <div className="hp-play">▶</div>
              <div className="hp-play-lbl">Watch Full Demo — 3 min</div>
            </div>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <section className="hp-sec" id="how" style={{paddingTop:0}}>
          <div className="hp-eyebrow">How It Works</div>
          <h2 className="hp-sec-h">Up and running in 60 seconds.</h2>
          <div className="hp-steps">
            {[
              {n:'01',t:'Create Account',d:'Sign up with Google. Choose Teacher or Student. Dashboard ready instantly.'},
              {n:'02',t:'Schedule or Join',d:'Teachers create class in one click. Students join via link — no downloads.'},
              {n:'03',t:'Go Live',d:'HD video, AI attendance, whiteboard, quizzes — all tools ready the moment class starts.'},
              {n:'04',t:'Track Everything',d:'Attendance logs, quiz scores, recordings — all auto-saved and exported to Excel.'},
            ].map(s=>(
              <div className="hp-step" key={s.n}>
                <div className="hp-step-num">{s.n}</div>
                <h4>{s.t}</h4><p>{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="hp-sec" id="reviews" style={{paddingTop:0}}>
          <div className="hp-eyebrow">Testimonials</div>
          <h2 className="hp-sec-h">Loved by teachers and students.</h2>
          <div className="hp-tgrid">
            {[
              {n:'Dr. Ayesha Rahman',r:'University Lecturer, BUET',av:'AR',c:'#2563EB',t:'The AI attendance alone saves me 15 minutes every class. The private viva room is something I have never seen on any other platform.'},
              {n:'Tanvir Ahmed',r:'Student, NSU',av:'TA',c:'#0D9488',t:'The smart whiteboard actually feels like a real classroom board. I can follow every lesson perfectly from home.'},
              {n:'Ms. Fatema Khanam',r:'School Teacher, Dhaka',av:'FK',c:'#7C3AED',t:'PDF viewer and breakout rooms changed how I teach. My students are more engaged than they have ever been.'},
            ].map((t,i)=>(
              <TiltCard className="hp-tcard" key={i}>
                <div className="hp-tstars">★★★★★</div>
                <p className="hp-ttext">"{t.t}"</p>
                <div className="hp-tfoot">
                  <div className="hp-tav" style={{background:`${t.c}1A`,color:t.c}}>{t.av}</div>
                  <div><div className="hp-tname">{t.n}</div><div className="hp-trole">{t.r}</div></div>
                </div>
              </TiltCard>
            ))}
          </div>
        </section>

        {/* INTEGRATIONS */}
        <section className="hp-sec" style={{paddingTop:0,textAlign:'center'}}>
          <div className="hp-eyebrow" style={{justifyContent:'center'}}>Integrations</div>
          <h2 className="hp-sec-h" style={{textAlign:'center',maxWidth:'none'}}>Fits your existing workflow.</h2>
          <div className="hp-ints">
            {['📊 Excel Export','📁 Google Drive','📧 Email Alerts','🔔 Notifications','📱 Mobile Ready','🔐 Google SSO','📋 PDF Viewer','🎬 Auto Recording'].map(x=>(
              <div className="hp-int" key={x}>{x}</div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <div className="hp-cta">
          <div className="hp-cta-grid"/>
          <h2>Start your first live<br/>class today.</h2>
          <p>Free forever for small classes. No credit card required.</p>
          <div className="hp-cta-btns">
            <MagBtn className="btn-hero-primary" onClick={onGetStarted} style={{fontSize:16,padding:'18px 52px'}}>▶ Get Started Free</MagBtn>
            <MagBtn className="btn-hero-ghost" onClick={()=>setVideoOpen(true)} style={{fontSize:16,padding:'18px 40px'}}>▷ Watch Demo</MagBtn>
          </div>
        </div>

        <footer>
          <a href="/" className="hp-logo"><img src={logo} alt="ClassMeet" style={{height:'32px',width:'auto'}} /><span className="hp-logo-name" style={{fontSize:17}}>ClassMeet</span></a>
          <div className="fp-links">
            {['Privacy','Terms','Contact','Blog','Docs'].map(l=><a href="#" key={l}>{l}</a>)}
          </div>
          <span>© 2025 ClassMeet. Built for learners, everywhere.</span>
        </footer>
      </div>
    </>
  );
};

export default HomePage;