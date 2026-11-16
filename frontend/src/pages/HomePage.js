import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

const WHY_TOPICS = [
  {
    index: 0,
    slug: 'what-is-classmeet',
    pill: 'Discover Our Platform',
    titleHtml: 'What is <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#19D5F5] to-[#38BDF8]">ClassMeet</span>?',
    subtitle: 'An AI-powered smart classroom platform that brings teaching, learning, and collaboration together.',
    desc: 'ClassMeet is an AI-powered smart classroom ecosystem purpose-built for synchronous education, peer collaboration, and verified engagement — replacing fragmented corporate video tools with a unified learning theater.',
    image: '/card1_what_is_classmeet.png',
    badge: 'Synchronous Lecture Theater • On-Device AI',
    features: [
      {
        title: 'Academic-First Virtual Space',
        desc: 'Built specifically for lecture workflows, structured student questions, and active participation.'
      },
      {
        title: 'Zero-Install WebRTC Access',
        desc: 'Join instantly in any browser without installing intrusive desktop clients or background daemons.'
      },
      {
        title: 'Privacy-Preserving On-Device AI',
        desc: 'Blink authentication & focus analytics execute in the local browser — zero biometric cloud storage.'
      },
      {
        title: 'Live Collaborative Immersion',
        desc: 'Interactive whiteboards, synchronized code notebooks, and real-time breakout pods in one tab.'
      }
    ]
  },
  {
    index: 1,
    slug: 'our-mission',
    pill: 'Our Purpose',
    titleHtml: 'Our <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#19D5F5] to-[#38BDF8]">Mission</span>',
    subtitle: 'Making virtual education smarter, more interactive, and genuinely meaningful.',
    desc: 'We believe digital classrooms should elevate human connection, not reduce learning to passive screen watching. Our mission is to end the "black tile syndrome" and empower educators with real-time pedagogical feedback.',
    image: '/card2_our_mission.png',
    badge: 'Human Connection First • Active Pedagogy',
    features: [
      {
        title: 'Reigniting Classroom Focus',
        desc: 'Thoughtful non-invasive feedback loops that naturally re-engage students without punitive pressure.'
      },
      {
        title: 'Equal Access for Every Learner',
        desc: 'Sub-50ms peer mesh streaming with adaptive bitrates optimized for low-bandwidth connections.'
      },
      {
        title: 'Empowering Educators',
        desc: 'Instant pedagogical heatmaps and automated roster tracking so teachers focus 100% on teaching.'
      },
      {
        title: 'Active Interactive Reactions',
        desc: 'Non-disruptive feedback, polls, and live questions that keep remote classrooms vibrant and lively.'
      }
    ]
  },
  {
    index: 2,
    slug: 'why-we-built-it',
    pill: 'The Inspiration',
    titleHtml: 'Why We <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#19D5F5] to-[#38BDF8]">Built It</span>',
    subtitle: 'Addressing the challenges and frustrations of traditional online learning environments.',
    desc: 'Traditional online education broke down into awkward roll calls, proxy presence, intrusive proctoring plugins, and disconnected apps. ClassMeet was engineered from the ground up to solve these chronic academic friction points.',
    image: '/card3_why_we_built_it.jpg',
    badge: 'No Spyware • Automated Roster • Unified Hub',
    features: [
      {
        title: 'Ending the Roll Call Dilemma',
        desc: 'Automates attendance in the first 10 seconds of class without wasting valuable teaching minutes.'
      },
      {
        title: 'Defeating Proxy Tricks',
        desc: 'Liveness verification using dynamic micro-actions (e.g. natural eye blinks) directly on device.'
      },
      {
        title: 'Eliminating Invasive Software',
        desc: 'No kernel-level drivers or third-party spyware — runs entirely in the standard secure browser sandbox.'
      },
      {
        title: 'Unified Academic Toolset',
        desc: 'Chat, attendance, notes, shared boards, and proctored quizzes live under one seamless interface.'
      }
    ]
  },
  {
    index: 3,
    slug: 'what-makes-us-different',
    pill: 'Our Identity',
    titleHtml: 'What Makes Us <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#19D5F5] to-[#38BDF8]">Different</span>?',
    subtitle: 'Going far beyond standard video meetings with intelligent classroom infrastructure.',
    desc: 'While generic tools treat video calls as static camera tiles, ClassMeet embeds machine intelligence directly into the learning experience — offering real-time participation heatmaps, instant transcription, and smart peer assistance.',
    image: null,
    badge: 'Edge Neural AI • Sub-50ms Ultra Mesh',
    features: [
      {
        title: 'Edge AI Processing',
        desc: 'Neural inferences run on the browser client, ensuring instantaneous response with zero server overhead.'
      },
      {
        title: 'Integrated Anti-Cheat Proctoring',
        desc: 'Dual-camera angle support and tab-switch detection built directly into examination modes.'
      },
      {
        title: 'Adaptive Pedagogy Engine',
        desc: 'Automatically highlights concepts where student questions spike to help instructors clarify live.'
      },
      {
        title: 'Sub-50ms Peer Mesh Network',
        desc: 'Custom WebRTC mesh network with crystal-clear audio prioritization and zero jitter.'
      }
    ]
  },
  {
    index: 4,
    slug: 'who-is-it-for',
    pill: 'Our Community',
    titleHtml: 'Who Is It <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#19D5F5] to-[#38BDF8]">For</span>?',
    subtitle: 'Purpose-built for modern students, dedicated educators, and visionary educational institutions.',
    desc: 'Whether you are a university professor conducting 300-student STEM lectures, a coding bootcamp running peer-programming labs, or an online academy teaching global students — ClassMeet provides the exact controls and workflows needed.',
    image: null,
    badge: 'Universities • K-12 • Academies • Tutors',
    features: [
      {
        title: 'Universities & Colleges',
        desc: 'Campus-wide roster sync, LMS (Canvas/Moodle/Blackboard) integrations, and accredited attendance reporting.'
      },
      {
        title: 'Educators & Instructors',
        desc: 'Effortless class moderation, hand-raising queues, whiteboard controls, and breakout rooms.'
      },
      {
        title: 'Students & Study Groups',
        desc: 'Rich collaborative workspaces, automatic lecture bookmarking, and peer project pods.'
      },
      {
        title: 'Coaching & Training Centers',
        desc: 'Custom branding, student performance analytics, and automated certification workflows.'
      }
    ]
  },
  {
    index: 5,
    slug: 'why-choose-us',
    pill: 'Our Value',
    titleHtml: 'Why <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#19D5F5] to-[#38BDF8]">Choose Us</span>?',
    subtitle: 'Bringing communication, learning, and academic administration into one frictionless experience.',
    desc: 'Institutions choose ClassMeet because it replaces an expensive patchwork of 4 separate subscriptions (video tool + attendance add-on + proctoring vendor + whiteboard software) with a unified, cost-effective platform students love.',
    image: null,
    badge: '99.98% High Availability • 40% Admin Saved',
    features: [
      {
        title: '40% Administrative Time Saved',
        desc: 'Eliminate manual roll calls, spreadsheet reconciliation, and attendance disputes forever.'
      },
      {
        title: '99.98% High Availability',
        desc: 'Redundant global edge infrastructure guaranteed to stay online during critical exam periods.'
      },
      {
        title: 'Total Privacy Compliance',
        desc: 'Fully compliant with FERPA, GDPR, and academic data residency regulations.'
      },
      {
        title: 'Frictionless Zero-Cost Setup',
        desc: 'Start teaching immediately without IT onboarding delays or expensive hardware requirements.'
      }
    ]
  },
  {
    index: 6,
    slug: 'our-vision',
    pill: 'Looking Ahead',
    titleHtml: 'Our <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#19D5F5] to-[#38BDF8]">Vision</span>',
    subtitle: 'Building a more connected, intelligent, and borderless future for global digital education.',
    desc: 'We envision a world where geography never limits access to world-class education. ClassMeet is building the foundational operating system for next-generation virtual universities, collaborative cross-border research, and lifelong mentorship.',
    image: null,
    badge: 'Global Connected Campus • Borderless Education',
    features: [
      {
        title: 'Global Interconnected Campus',
        desc: 'Connecting classrooms across continents for joint seminars, cultural exchanges, and research.'
      },
      {
        title: 'AI-Assisted Personalized Pedagogy',
        desc: 'Real-time AI tutors that generate contextual quizzes and summaries tailored to each student.'
      },
      {
        title: 'Universal Accessibility',
        desc: 'Multi-language live captioning, sign-language recognition, and screen-reader optimizations.'
      },
      {
        title: 'Verifiable Academic Credentials',
        desc: 'Cryptographically verified participation and attendance records portable to student transcripts.'
      }
    ]
  }
];

const HomePage = ({ onGetStarted, onLogin }) => {
  const navigate = useNavigate();

  // Navigation states
  const [activeNav, setActiveNav] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modal states
  const [signUpModalOpen, setSignUpModalOpen] = useState(false);
  const [joinClassModalOpen, setJoinClassModalOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  // Form states
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [joinStudentName, setJoinStudentName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactInst, setContactInst] = useState('');
  const [contactMsg, setContactMsg] = useState('');

  // Toast hub
  const [toasts, setToasts] = useState([]);

  // 3D Carousel states
  const totalCards = 7;
  const angleStep = 360 / totalCards;
  const [virtualIndex, setVirtualIndex] = useState(0);
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const [pulseDetails, setPulseDetails] = useState(false);
  const [radius, setRadius] = useState(245);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const dragDistanceRef = useRef(0);
  const isHoveredRef = useRef(false);
  const autoTimerRef = useRef(null);

  const cylinderRef = useRef(null);
  const stageRef = useRef(null);
  const detailsPanelRef = useRef(null);

  const showToast = useCallback((msg) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  // Update radius on resize
  useEffect(() => {
    const calcRadius = () => {
      const w = window.innerWidth;
      if (w < 480) return 210;
      if (w < 768) return 235;
      if (w < 1024) return 255;
      return 245;
    };
    const handleResize = () => setRadius(calcRadius());
    setRadius(calcRadius());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll spy
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'why-classmeet', 'features', 'how-it-works', 'about-us', 'contact'];
      const scrollPos = window.scrollY + 140;
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveNav(id);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Rotate 3D carousel
  const rotateTo = useCallback((newVirtIdx, updateDetails = true, pulse = false) => {
    setVirtualIndex(newVirtIdx);
    const norm = ((newVirtIdx % totalCards) + totalCards) % totalCards;
    if (updateDetails) {
      setActiveTopicIndex(norm);
      if (pulse) {
        setPulseDetails(true);
        setTimeout(() => setPulseDetails(false), 700);
      }
    }
  }, [totalCards]);

  const handleNextCard = useCallback(() => {
    rotateTo(virtualIndex + 1);
  }, [virtualIndex, rotateTo]);

  const handlePrevCard = useCallback(() => {
    rotateTo(virtualIndex - 1);
  }, [virtualIndex, rotateTo]);

  // Auto rotation
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isHoveredRef.current && !isDraggingRef.current && document.visibilityState === 'visible') {
        setVirtualIndex((prev) => {
          const next = prev + 1;
          const norm = ((next % totalCards) + totalCards) % totalCards;
          setActiveTopicIndex(norm);
          return next;
        });
      }
    }, 4000);
    autoTimerRef.current = timer;
    return () => clearInterval(timer);
  }, [totalCards]);

  // Mouse / Touch Drag handlers for 3D stage
  const onPointerDown = (clientX) => {
    isDraggingRef.current = true;
    startXRef.current = clientX;
    dragDistanceRef.current = 0;
    if (cylinderRef.current) {
      cylinderRef.current.classList.add('no-transition');
    }
  };

  const onPointerMove = (clientX) => {
    if (!isDraggingRef.current || !cylinderRef.current) return;
    dragDistanceRef.current = clientX - startXRef.current;
    const baseAngle = -virtualIndex * angleStep;
    cylinderRef.current.style.transform = `rotateY(${baseAngle + dragDistanceRef.current * 0.22}deg)`;
  };

  const onPointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (cylinderRef.current) {
      cylinderRef.current.classList.remove('no-transition');
    }
    const dist = dragDistanceRef.current;
    if (dist < -45) {
      rotateTo(virtualIndex + 1);
    } else if (dist > 45) {
      rotateTo(virtualIndex - 1);
    } else {
      rotateTo(virtualIndex);
    }
  };

  const handleExploreClick = (idx, e) => {
    e.preventDefault();
    const currNorm = ((virtualIndex % totalCards) + totalCards) % totalCards;
    let diff = (idx - currNorm + totalCards) % totalCards;
    if (diff > 3) diff -= 7;
    rotateTo(virtualIndex + diff, true, true);
    if (window.innerWidth < 1024 && detailsPanelRef.current) {
      detailsPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleTopicTabClick = (idx) => {
    const currNorm = ((virtualIndex % totalCards) + totalCards) % totalCards;
    let diff = (idx - currNorm + totalCards) % totalCards;
    if (diff > 3) diff -= 7;
    rotateTo(virtualIndex + diff, true, true);
  };

  const handleNextTopic = () => {
    const nextVirt = virtualIndex + 1;
    rotateTo(nextVirt, true, true);
  };

  const handleJoinClassSubmit = (e) => {
    e.preventDefault();
    if (!joinRoomCode.trim()) {
      showToast('Please enter a valid Room Code');
      return;
    }
    setJoinClassModalOpen(false);
    showToast(`Connecting to room ${joinRoomCode.toUpperCase()}...`);
    navigate(`/room/${joinRoomCode.trim().toUpperCase()}`);
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    showToast('Inquiry received. An engineer will reach out shortly.');
    setContactName('');
    setContactEmail('');
    setContactInst('');
    setContactMsg('');
  };

  const handleSignUpSubmit = (e) => {
    e.preventDefault();
    setSignUpModalOpen(false);
    if (onGetStarted) {
      onGetStarted();
    } else {
      navigate('/register');
    }
  };

  const currentTopic = WHY_TOPICS[activeTopicIndex] || WHY_TOPICS[0];
  const targetCylinderAngle = -virtualIndex * angleStep;
  const currentNormalized = ((virtualIndex % totalCards) + totalCards) % totalCards;

  return (
    <div className="min-h-screen bg-[#000B18] text-white font-sans relative overflow-x-hidden selection:bg-[#18D5FD] selection:text-[#000E1D]">
      {/* ── Fixed Full Background Image ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#000B18]" aria-hidden="true">
        <img
          src="/background.png"
          alt="ClassMeet Background"
          className="w-full h-full object-cover object-center pointer-events-none select-none"
        />
      </div>

      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-50 w-full px-6 sm:px-12 lg:px-16 py-4 bg-[#000B18]/85 backdrop-blur-md border-b border-[#18D5FD]/15 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo */}
          <a href="#home" className="flex items-center gap-3.5 cursor-pointer group select-none" aria-label="ClassMeet Home">
            <div className="w-10 h-10 flex items-center justify-center">
              <svg viewBox="0 0 36 36" fill="none" className="w-9 h-9 transform group-hover:scale-105 transition-transform" aria-hidden="true">
                <path d="M18 4L34 11.5L18 19L2 11.5L18 4Z" fill="#38BDF8" stroke="#18D5FD" strokeWidth="1.5" />
                <path d="M6.5 13.5V20.5C6.5 20.5 5 21.5 5 23" stroke="#18D5FD" strokeWidth="2" strokeLinecap="round" />
                <circle cx="5" cy="23.5" r="1.6" fill="#18D5FD" />
                <path d="M8 16.5L18 21.5L28 16.5V20.5L18 25.5L8 20.5V16.5Z" fill="#0284C7" />
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white flex items-center">
              Class<span className="text-[#18D5FD]">Meet</span>
            </span>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 lg:gap-10" aria-label="Main Navigation">
            <a href="#home" className={`nav-item text-sm lg:text-[0.9375rem] ${activeNav === 'home' ? 'active font-semibold text-white' : 'font-medium text-slate-300 hover:text-white'}`}>Home</a>
            <a href="#why-classmeet" className={`nav-item text-sm lg:text-[0.9375rem] ${activeNav === 'why-classmeet' ? 'active font-semibold text-white' : 'font-medium text-slate-300 hover:text-white'}`}>Why ClassMeet</a>
            <a href="#features" className={`nav-item text-sm lg:text-[0.9375rem] ${activeNav === 'features' ? 'active font-semibold text-white' : 'font-medium text-slate-300 hover:text-white'}`}>Features</a>
            <a href="#how-it-works" className={`nav-item text-sm lg:text-[0.9375rem] ${activeNav === 'how-it-works' ? 'active font-semibold text-white' : 'font-medium text-slate-300 hover:text-white'}`}>How It Works</a>
            <a href="#about-us" className={`nav-item text-sm lg:text-[0.9375rem] ${activeNav === 'about-us' ? 'active font-semibold text-white' : 'font-medium text-slate-300 hover:text-white'}`}>About Us</a>
            <a href="#contact" className={`nav-item text-sm lg:text-[0.9375rem] ${activeNav === 'contact' ? 'active font-semibold text-white' : 'font-medium text-slate-300 hover:text-white'}`}>Contact</a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => onLogin ? onLogin() : navigate('/login')}
              className="text-sm font-semibold text-slate-300 hover:text-[#18D5FD] transition-colors hidden sm:block px-2"
            >
              Sign In
            </button>
            <button
              onClick={() => setJoinClassModalOpen(true)}
              className="btn-outline hidden sm:inline-flex items-center justify-center px-5 py-2 rounded-full text-white font-medium text-sm"
            >
              Join Class
            </button>
            <button
              onClick={() => onGetStarted ? onGetStarted() : navigate('/register')}
              className="btn-cyan inline-flex items-center justify-center px-6 py-2 rounded-full text-[#001324] font-bold text-sm"
            >
              Sign Up
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-white hover:text-[#18D5FD] focus:outline-none"
              aria-label="Toggle Mobile Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 max-w-7xl mx-auto rounded-2xl p-6 border border-[#18D5FD]/30 bg-[#031526]/95 backdrop-blur-md shadow-2xl transition-all">
            <nav className="flex flex-col gap-4 text-center">
              <a href="#home" onClick={() => setMobileMenuOpen(false)} className="text-[#18D5FD] text-base font-semibold py-1">Home</a>
              <a href="#why-classmeet" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#18D5FD] text-base font-semibold py-1">Why ClassMeet</a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#18D5FD] text-base font-semibold py-1">Features</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#18D5FD] text-base font-semibold py-1">How It Works</a>
              <a href="#about-us" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#18D5FD] text-base font-semibold py-1">About Us</a>
              <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[#18D5FD] text-base font-semibold py-1">Contact</a>
              <div className="pt-4 border-t border-[#18D5FD]/20 flex flex-col gap-3">
                <button
                  onClick={() => { setMobileMenuOpen(false); setJoinClassModalOpen(true); }}
                  className="btn-outline w-full py-2.5 rounded-full text-white font-medium text-sm"
                >
                  Join Class
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); onGetStarted ? onGetStarted() : navigate('/register'); }}
                  className="btn-cyan w-full py-2.5 rounded-full text-[#001324] font-bold text-sm"
                >
                  Sign Up
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); onLogin ? onLogin() : navigate('/login'); }}
                  className="text-slate-300 hover:text-white text-sm font-medium py-1"
                >
                  Already have an account? Sign In
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ── Main Content Container ── */}
      <main className="relative z-10">
        {/* HERO SECTION */}
        <section id="home" className="min-h-[calc(100vh-76px)] lg:h-[calc(100vh-76px)] flex items-center justify-center px-6 sm:px-10 lg:px-12 py-6 lg:py-0 overflow-hidden relative">
          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Headline & CTAs */}
            <div className="lg:col-span-7 xl:col-span-6 flex flex-col items-start text-left z-20">
              <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-[2.75rem] xl:text-[3.4rem] 2xl:text-[3.75rem] font-extrabold text-white tracking-tight leading-[1.15]">
                <span className="block whitespace-nowrap">The Smarter Way to</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#18D5FD] via-[#38BDF8] to-[#22D3EE] drop-shadow-[0_0_25px_rgba(24,213,253,0.3)] whitespace-nowrap">
                  Learn, Teach &amp; Connect.
                </span>
              </h1>

              <p className="mt-6 sm:mt-7 text-base sm:text-lg lg:text-xl text-slate-300/90 max-w-2xl leading-relaxed tracking-normal font-normal">
                An AI-Powered Smart Live Classroom for Automated Attendance, Secure Proctoring and Pedagogical Collaboration.
              </p>

              <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-4 sm:gap-5">
                <button
                  onClick={() => onGetStarted ? onGetStarted() : navigate('/register')}
                  className="btn-cyan px-8 sm:px-9 py-3.5 sm:py-4 rounded-full text-[#001324] font-bold text-base sm:text-lg flex items-center gap-2.5 shadow-[0_0_25px_rgba(24,213,253,0.35)] hover:shadow-[0_0_35px_rgba(24,213,253,0.55)] transition-all"
                >
                  <span>Get Started Free</span>
                  <span className="text-lg font-bold">&rarr;</span>
                </button>
                <button
                  onClick={() => setDemoModalOpen(true)}
                  className="btn-outline px-7 sm:px-8 py-3.5 sm:py-4 rounded-full text-white font-medium text-base sm:text-lg flex items-center gap-2.5"
                >
                  <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                    <polygon points="6 4 20 12 6 20 6 4" />
                  </svg>
                  <span>Watch Demo</span>
                </button>
              </div>
            </div>

            {/* Right Column: 3D Laptop Asset */}
            <div className="lg:col-span-5 xl:col-span-6 flex items-center justify-center lg:justify-end relative">
              <div className="relative w-full max-w-[760px] xl:max-w-[850px] 2xl:max-w-[920px] flex items-center justify-center lg:scale-105 xl:scale-110 origin-center lg:origin-right transition-transform duration-300">
                <img
                  src="/laptop_final_perfect.png"
                  alt="ClassMeet AI Smart Classroom on Laptop"
                  className="laptop-asset w-full h-auto object-contain"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── WHY CLASSMEET: 3D CYLINDRICAL CAROUSEL SECTION ── */}
        <section id="why-classmeet" className="py-24 sm:py-28 px-4 sm:px-8 lg:px-12 border-t border-[#18D5FD]/20 bg-[#000B18]/65 backdrop-blur-sm relative overflow-hidden select-none">
          <div className="why-carousel-glow" aria-hidden="true" />

          <div className="max-w-7xl mx-auto relative z-10">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-widest text-[#19D5F5] bg-[#061D35]/85 border border-[#19D5F5]/40 shadow-[0_0_15px_rgba(25,213,245,0.22)] mb-4">
                <span className="w-2 h-2 rounded-full bg-[#19D5F5] animate-pulse" />
                DISCOVER CLASSMEET
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
                Why <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#19D5F5] via-[#38BDF8] to-[#0284C7]">ClassMeet</span>?
              </h2>
              <p className="mt-4 text-slate-300/90 text-base sm:text-lg lg:text-xl font-normal leading-relaxed">
                &ldquo;Discover the purpose, innovation, and vision behind a smarter virtual learning experience.&rdquo;
              </p>
            </div>

            {/* 2-Column Showcase */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12 items-center">
              {/* Left Column: 3D Cylinder Stage */}
              <div className="lg:col-span-5 xl:col-span-5 w-full flex flex-col items-center">
                <div
                  ref={stageRef}
                  className="why-carousel-stage"
                  role="region"
                  aria-label="Why ClassMeet 3D Carousel"
                  onMouseEnter={() => { isHoveredRef.current = true; }}
                  onMouseLeave={() => { isHoveredRef.current = false; }}
                  onMouseDown={(e) => {
                    if (e.button === 0 && !e.target.closest('.card-explore-btn')) {
                      onPointerDown(e.clientX);
                    }
                  }}
                  onMouseMove={(e) => onPointerMove(e.clientX)}
                  onMouseUp={onPointerUp}
                  onTouchStart={(e) => {
                    if (e.touches.length === 1) onPointerDown(e.touches[0].clientX);
                  }}
                  onTouchMove={(e) => {
                    if (e.touches.length === 1) onPointerMove(e.touches[0].clientX);
                  }}
                  onTouchEnd={onPointerUp}
                  tabIndex="0"
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') handlePrevCard();
                    if (e.key === 'ArrowRight') handleNextCard();
                  }}
                >
                  <div
                    ref={cylinderRef}
                    className="why-carousel-cylinder"
                    style={{ transform: `rotateY(${targetCylinderAngle}deg)` }}
                  >
                    {WHY_TOPICS.map((topic, i) => {
                      const baseAngle = i * angleStep;
                      const diff = (i - currentNormalized + totalCards) % totalCards;
                      let cardClass = 'why-carousel-card ';
                      if (diff === 0) cardClass += 'active-center';
                      else if (diff === 1 || diff === 6) cardClass += 'flanking-card';
                      else cardClass += 'back-card';

                      return (
                        <article
                          key={topic.slug}
                          className={cardClass}
                          style={{
                            transform: `rotateY(${baseAngle}deg) translateZ(${radius}px)`
                          }}
                          onClick={(e) => {
                            if (!e.target.closest('.card-explore-btn') && diff !== 0) {
                              let shortestDiff = diff;
                              if (shortestDiff > 3) shortestDiff -= 7;
                              rotateTo(virtualIndex + shortestDiff);
                            }
                          }}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="card-pill">{topic.pill}</span>
                              <div className="card-icon-box shrink-0" aria-hidden="true">
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                              </div>
                            </div>
                            <h3 className="text-[0.8125rem] sm:text-[0.875rem] font-bold text-white tracking-tight leading-tight mb-1">
                              {topic.titleHtml ? topic.titleHtml.replace(/<[^>]+>/g, '') : topic.slug}
                            </h3>

                            {topic.image ? (
                              <div className="card-image-box mb-1">
                                <img src={topic.image} alt={topic.pill} loading="lazy" />
                              </div>
                            ) : (
                              <div className="card-image-box mb-1 flex items-center justify-center bg-gradient-to-br from-[#062444] to-[#021020] border border-[#19D5F5]/35 p-2">
                                <span className="text-[0.54rem] font-bold tracking-wider text-[#19D5F5] uppercase text-center">
                                  {topic.badge}
                                </span>
                              </div>
                            )}

                            <p className="text-[0.65rem] text-[#B8CBDC] leading-snug line-clamp-2">
                              {topic.subtitle}
                            </p>
                          </div>

                          <div className="pt-1 border-t border-[#19D5F5]/20">
                            <button
                              type="button"
                              onClick={(e) => handleExploreClick(i, e)}
                              className="card-explore-btn"
                            >
                              <span>Explore More</span>
                              <span className="text-[#19D5F5] font-bold text-xs">&rarr;</span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>

                {/* Carousel Controls */}
                <div className="flex items-center justify-center gap-5 mt-7 z-20">
                  <button
                    onClick={handlePrevCard}
                    className="carousel-nav-btn"
                    aria-label="Rotate Previous Card"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="flex items-center gap-2">
                    {WHY_TOPICS.map((_, dotIdx) => (
                      <button
                        key={dotIdx}
                        onClick={() => {
                          let diff = (dotIdx - currentNormalized + totalCards) % totalCards;
                          if (diff > 3) diff -= 7;
                          rotateTo(virtualIndex + diff);
                        }}
                        className={`carousel-dot ${dotIdx === currentNormalized ? 'active' : ''}`}
                        aria-label={`Go to Card ${dotIdx + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={handleNextCard}
                    className="carousel-nav-btn"
                    aria-label="Rotate Next Card"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                <div className="mt-3 text-[0.72rem] text-slate-400/80 flex items-center justify-center gap-1.5 text-center">
                  <svg className="w-3.5 h-3.5 text-[#19D5F5]/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span>Click Explore More or drag cards to inspect</span>
                </div>
              </div>

              {/* Right Column: Interactive Details Panel */}
              <div className="lg:col-span-7 xl:col-span-7 w-full">
                <div
                  ref={detailsPanelRef}
                  className={`why-details-card ${pulseDetails ? 'highlight-pulse' : ''}`}
                >
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3.5 border-b border-[#19D5F5]/20 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="card-pill">Card 0{activeTopicIndex + 1} of 07</span>
                      <span className="inline-flex items-center gap-1.5 text-[0.625rem] font-bold text-[#19D5F5] uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#19D5F5] animate-ping" />
                        Active Topic Focus
                      </span>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      {WHY_TOPICS.map((t, idx) => (
                        <button
                          key={t.slug}
                          onClick={() => handleTopicTabClick(idx)}
                          className={`why-topic-pill ${idx === activeTopicIndex ? 'active' : ''}`}
                        >
                          {`0${idx + 1}. ${t.pill.split(' ')[0]}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Header & Visual Media */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 items-center">
                    <div className="md:col-span-7">
                      <span className="text-[0.68rem] font-bold text-[#19D5F5] uppercase tracking-widest block mb-1">
                        {currentTopic.pill}
                      </span>
                      <h3
                        className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug mb-1.5"
                        dangerouslySetInnerHTML={{ __html: currentTopic.titleHtml }}
                      />
                      <p className="text-xs sm:text-[0.8125rem] font-medium text-[#38BDF8] leading-relaxed mb-2">
                        {currentTopic.subtitle}
                      </p>
                      <p className="text-xs text-slate-300 leading-relaxed font-normal">
                        {currentTopic.desc}
                      </p>
                    </div>

                    <div className="md:col-span-5">
                      {currentTopic.image ? (
                        <div className="rounded-xl overflow-hidden border border-[#19D5F5]/35 bg-[#021224] shadow-[0_0_20px_rgba(25,213,245,0.18)] max-h-[160px] flex items-center justify-center p-1.5">
                          <img
                            src={currentTopic.image}
                            alt={currentTopic.pill}
                            className="w-full h-auto max-h-[150px] object-cover rounded-lg"
                          />
                        </div>
                      ) : (
                        <div className="rounded-xl overflow-hidden border border-[#19D5F5]/35 bg-gradient-to-br from-[#062444] to-[#021020] shadow-[0_0_20px_rgba(25,213,245,0.15)] h-[140px] flex flex-col items-center justify-center p-3 text-center">
                          <div className="w-10 h-10 rounded-xl bg-[#19D5F5]/20 border border-[#19D5F5]/50 flex items-center justify-center text-[#19D5F5] mb-2 shadow-[0_0_12px_rgba(25,213,245,0.3)]">
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </div>
                          <span className="text-[0.625rem] font-bold text-[#19D5F5] uppercase tracking-wider">
                            {currentTopic.badge}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4 Highlights Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                    {currentTopic.features.map((f, i) => (
                      <div key={i} className="why-detail-feature">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#19D5F5]" />
                          <h4 className="text-xs font-bold text-white tracking-tight">{f.title}</h4>
                        </div>
                        <p className="text-[0.68rem] text-slate-300 leading-snug">{f.desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* Footer Action */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-[#19D5F5]/20">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setJoinClassModalOpen(true)}
                        className="btn-cyan text-xs font-bold py-1.5 px-4 rounded-full shadow-[0_0_12px_rgba(25,213,245,0.4)]"
                      >
                        Experience ClassMeet
                      </button>
                      <button
                        onClick={handleNextTopic}
                        className="text-xs font-semibold text-[#19D5F5] hover:text-white transition-colors flex items-center gap-1"
                      >
                        <span>Next Topic</span>
                        <span>&rarr;</span>
                      </button>
                    </div>
                    <a
                      href={`/why-classmeet/${currentTopic.slug}.html`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-slate-300 hover:text-[#19D5F5] transition-colors flex items-center gap-1"
                    >
                      <span>Dedicated Full Page</span>
                      <span>&nearr;</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CORE FEATURES SECTION ── */}
        <section id="features" className="py-24 px-6 sm:px-12 lg:px-16 border-t border-[#18D5FD]/20 bg-[#000B18]/70 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-[#18D5FD] text-xs sm:text-sm font-bold tracking-widest uppercase mb-2 block">
                Pedagogy First Architecture
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Four Pillars of Academic Immersion
              </h2>
              <p className="mt-3 text-slate-400 text-base sm:text-lg">
                Engineered with strict on-device machine learning, zero cloud biometric storage, and sub-50ms peer mesh streaming.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {/* Feature 1 */}
              <div className="p-8 rounded-2xl bg-[#031526]/85 border border-[#18D5FD]/30 shadow-lg hover:border-[#18D5FD]/70 hover:shadow-[0_0_25px_rgba(24,213,253,0.2)] transition-all">
                <div className="w-12 h-12 rounded-xl bg-[#18D5FD]/20 border border-[#18D5FD]/50 flex items-center justify-center text-[#18D5FD] mb-5">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">AI Eye-Blink Attendance</h3>
                <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
                  On-device FaceMesh calculates physiological Eye Aspect Ratio (EAR) curves to authenticate living student attendance without photo spoofing or cloud video leakage.
                </p>
                <div className="mt-5 inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-[#18D5FD]/15 text-[#18D5FD] border border-[#18D5FD]/35">
                  <span>🔒 100% Client-Side WebGL</span>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="p-8 rounded-2xl bg-[#031526]/85 border border-[#18D5FD]/30 shadow-lg hover:border-[#18D5FD]/70 hover:shadow-[0_0_25px_rgba(24,213,253,0.2)] transition-all">
                <div className="w-12 h-12 rounded-xl bg-[#18D5FD]/20 border border-[#18D5FD]/50 flex items-center justify-center text-[#18D5FD] mb-5">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Dynamic 3-Strike Proctoring</h3>
                <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
                  Respectful and progressive tab-switching and gaze-away warnings. Fosters genuine classroom focus without invasive or punitive spyware installations.
                </p>
                <div className="mt-5 inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-[#18D5FD]/15 text-[#18D5FD] border border-[#18D5FD]/35">
                  <span>🛡️ Transparent Integrity</span>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="p-8 rounded-2xl bg-[#031526]/85 border border-[#18D5FD]/30 shadow-lg hover:border-[#18D5FD]/70 hover:shadow-[0_0_25px_rgba(24,213,253,0.2)] transition-all">
                <div className="w-12 h-12 rounded-xl bg-[#18D5FD]/20 border border-[#18D5FD]/50 flex items-center justify-center text-[#18D5FD] mb-5">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 19l7-7 3 3-7 7-3-3z" />
                    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Real-Time Excalidraw Sync</h3>
                <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
                  Infinite collaborative hand-drawn whiteboards synced at 60 FPS over WebSocket delta packets. Teachers and students co-sketch diagrams and equations synchronously.
                </p>
                <div className="mt-5 inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-[#18D5FD]/15 text-[#18D5FD] border border-[#18D5FD]/35">
                  <span>⚡ Sub-20ms Socket Deltas</span>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="p-8 rounded-2xl bg-[#031526]/85 border border-[#18D5FD]/30 shadow-lg hover:border-[#18D5FD]/70 hover:shadow-[0_0_25px_rgba(24,213,253,0.2)] transition-all">
                <div className="w-12 h-12 rounded-xl bg-[#18D5FD]/20 border border-[#18D5FD]/50 flex items-center justify-center text-[#18D5FD] mb-5">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Synchronized Slide Annotations</h3>
                <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
                  Broadcast slide decks with synchronized laser pointer trails, student doubt pins, and lockstep slide presentation that keeps all remote learners on the same page.
                </p>
                <div className="mt-5 inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-[#18D5FD]/15 text-[#18D5FD] border border-[#18D5FD]/35">
                  <span>📑 Vector Laser Trails</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS SECTION ── */}
        <section id="how-it-works" className="py-24 px-6 sm:px-12 lg:px-16 border-t border-[#18D5FD]/20 bg-[#000B18]/70 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-[#18D5FD] text-xs sm:text-sm font-bold tracking-widest uppercase mb-2 block">
                Zero-Friction Workflow
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                How ClassMeet Works
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-2xl bg-[#031526]/80 border border-[#18D5FD]/30 text-center flex flex-col items-center">
                <span className="text-3xl font-black text-[#18D5FD] mb-4 font-mono">01</span>
                <h3 className="text-lg font-bold text-white mb-2">Instant Room Code</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Launch a live class session in 3 seconds. Students join instantly through a browser URL without downloads or account barriers.
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-[#031526]/80 border border-[#18D5FD]/30 text-center flex flex-col items-center">
                <span className="text-3xl font-black text-[#18D5FD] mb-4 font-mono">02</span>
                <h3 className="text-lg font-bold text-white mb-2">On-Device Edge ML</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  MediaPipe FaceMesh operates directly in the browser's WebGL context, validating eye blinks while safeguarding student privacy.
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-[#031526]/80 border border-[#18D5FD]/30 text-center flex flex-col items-center">
                <span className="text-3xl font-black text-[#18D5FD] mb-4 font-mono">03</span>
                <h3 className="text-lg font-bold text-white mb-2">Automated LMS Reports</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Verified attendance rosters and proctoring audit summaries automatically export directly into Canvas, Moodle, or Blackboard.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── ABOUT US SECTION ── */}
        <section id="about-us" className="py-24 px-6 sm:px-12 lg:px-16 border-t border-[#18D5FD]/20 bg-[#000B18]/70 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto text-center">
            <span className="text-[#18D5FD] text-xs sm:text-sm font-bold tracking-widest uppercase mb-2 block">
              Our Mission
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-8">
              Restoring Authenticity to Virtual Education
            </h2>
            <p className="text-lg sm:text-xl text-white font-medium leading-relaxed mb-6">
              Traditional web conferencing tools were architected for corporate sales meetings, not interactive pedagogical environments.
            </p>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto">
              ClassMeet was built from the ground up by educators and engineers to combat proxy attendance and passive disengagement. By combining browser-based edge neural networks with high-performance WebRTC mesh routing, we give educators the confidence of a proctored, interactive physical auditorium right inside the browser.
            </p>
          </div>
        </section>

        {/* ── CONTACT SECTION ── */}
        <section id="contact" className="py-24 px-6 sm:px-12 lg:px-16 border-t border-[#18D5FD]/20 bg-[#000B18]/70 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-[#18D5FD] text-xs sm:text-sm font-bold tracking-widest uppercase mb-2 block">
                Institutional Inquiries
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Connect with Our Engineering Team
              </h2>
              <p className="mt-3 text-base text-slate-300">
                Inquire about campus-wide LTI 1.3 integrations, dedicated SFU clusters, or pilot evaluations.
              </p>
            </div>

            <form onSubmit={handleContactSubmit} className="p-8 sm:p-10 rounded-2xl bg-[#031526]/90 border border-[#18D5FD]/40 shadow-xl flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="cName" className="block text-xs font-semibold text-white uppercase tracking-wider mb-2">Your Name</label>
                  <input
                    type="text"
                    id="cName"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Dr. Aris Vance"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-[#000E1D] border border-[#18D5FD]/40 text-white placeholder-slate-500 focus:outline-none focus:border-[#18D5FD] transition-colors text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="cEmail" className="block text-xs font-semibold text-white uppercase tracking-wider mb-2">Institutional Email</label>
                  <input
                    type="email"
                    id="cEmail"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="vance@university.edu"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-[#000E1D] border border-[#18D5FD]/40 text-white placeholder-slate-500 focus:outline-none focus:border-[#18D5FD] transition-colors text-sm"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="cInstitution" className="block text-xs font-semibold text-white uppercase tracking-wider mb-2">University / Organization</label>
                <input
                  type="text"
                  id="cInstitution"
                  value={contactInst}
                  onChange={(e) => setContactInst(e.target.value)}
                  placeholder="Department of Computer Science"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[#000E1D] border border-[#18D5FD]/40 text-white placeholder-slate-500 focus:outline-none focus:border-[#18D5FD] transition-colors text-sm"
                />
              </div>
              <div>
                <label htmlFor="cMsg" className="block text-xs font-semibold text-white uppercase tracking-wider mb-2">Cohort Size / Message</label>
                <textarea
                  id="cMsg"
                  rows="3"
                  value={contactMsg}
                  onChange={(e) => setContactMsg(e.target.value)}
                  placeholder="Tell us about your cohort size or specific LMS requirements..."
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[#000E1D] border border-[#18D5FD]/40 text-white placeholder-slate-500 focus:outline-none focus:border-[#18D5FD] transition-colors text-sm"
                />
              </div>
              <button
                type="submit"
                className="btn-cyan mt-2 w-full py-3.5 rounded-full text-[#001324] font-bold text-sm tracking-wide"
              >
                Send Institutional Message
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#18D5FD]/20 py-10 px-6 sm:px-12 bg-[#000812]/90 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-slate-400">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 36 36" fill="none" className="w-6 h-6" aria-hidden="true">
              <path d="M18 4L34 11.5L18 19L2 11.5L18 4Z" fill="#38BDF8" stroke="#18D5FD" strokeWidth="1.5" />
              <path d="M6.5 13.5V20.5C6.5 20.5 5 21.5 5 23" stroke="#18D5FD" strokeWidth="2" strokeLinecap="round" />
              <circle cx="5" cy="23.5" r="1.6" fill="#18D5FD" />
              <path d="M8 16.5L18 21.5L28 16.5V20.5L18 25.5L8 20.5V16.5Z" fill="#0284C7" />
            </svg>
            <span className="font-extrabold text-white text-lg">Class<span className="text-[#18D5FD]">Meet</span></span>
            <span className="ml-2 text-xs text-slate-500">&copy; 2026 ClassMeet Inc.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#home" className="hover:text-white transition-colors">Home</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#about-us" className="hover:text-white transition-colors">About Us</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      {/* ── MODAL: SIGN UP ── */}
      {signUpModalOpen && (
        <div
          className="modal-backdrop open fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000E1D]/85 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSignUpModalOpen(false);
          }}
        >
          <div className="modal-box w-full max-w-md p-8 rounded-2xl bg-[#031526] border border-[#18D5FD]/50 shadow-2xl text-white">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#18D5FD]/30">
              <h3 className="text-xl font-bold text-white">Get Started with ClassMeet</h3>
              <button
                type="button"
                className="modal-close text-2xl text-[#18D5FD] hover:text-white"
                onClick={() => setSignUpModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSignUpSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-white">Full Name</label>
                <input
                  type="text"
                  placeholder="Prof. Elena Rostova"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-[#000E1D] border border-[#18D5FD]/40 text-white text-sm focus:outline-none focus:border-[#18D5FD]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-white">Institutional Email</label>
                <input
                  type="email"
                  placeholder="elena@university.edu"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-[#000E1D] border border-[#18D5FD]/40 text-white text-sm focus:outline-none focus:border-[#18D5FD]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-white">Academic Role</label>
                <select className="w-full px-4 py-2.5 rounded-xl bg-[#000E1D] border border-[#18D5FD]/40 text-white text-sm focus:outline-none focus:border-[#18D5FD]">
                  <option>Professor / Instructor</option>
                  <option>Department Administrator</option>
                  <option>Student Cohort Lead</option>
                </select>
              </div>
              <button
                type="submit"
                className="btn-cyan mt-4 w-full py-3.5 rounded-full text-[#001324] font-bold text-sm tracking-wide"
              >
                Create Free Academic Workspace
              </button>
              <p className="text-xs text-center text-slate-400 mt-2">Zero credit card required • Instant WebRTC setup</p>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: JOIN CLASS ── */}
      {joinClassModalOpen && (
        <div
          className="modal-backdrop open fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000E1D]/85 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setJoinClassModalOpen(false);
          }}
        >
          <div className="modal-box w-full max-w-md p-8 rounded-2xl bg-[#031526] border border-[#18D5FD]/50 shadow-2xl text-white">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#18D5FD]/30">
              <h3 className="text-xl font-bold text-white">Join Live Classroom</h3>
              <button
                type="button"
                className="modal-close text-2xl text-[#18D5FD] hover:text-white"
                onClick={() => setJoinClassModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleJoinClassSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-white">Class Room Code</label>
                <input
                  type="text"
                  value={joinRoomCode}
                  onChange={(e) => setJoinRoomCode(e.target.value)}
                  placeholder="e.g. CM-8429-XQ"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-[#000E1D] border border-[#18D5FD]/40 text-white text-sm font-mono uppercase focus:outline-none focus:border-[#18D5FD]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-white">Your Name (For Roll Call)</label>
                <input
                  type="text"
                  value={joinStudentName}
                  onChange={(e) => setJoinStudentName(e.target.value)}
                  placeholder="Liam Vance"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-[#000E1D] border border-[#18D5FD]/40 text-white text-sm focus:outline-none focus:border-[#18D5FD]"
                />
              </div>
              <button
                type="submit"
                className="btn-cyan mt-4 w-full py-3.5 rounded-full text-[#001324] font-bold text-sm tracking-wide"
              >
                Connect via WebRTC Mesh
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: WATCH DEMO ── */}
      {demoModalOpen && (
        <div
          className="modal-backdrop open fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000E1D]/90 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDemoModalOpen(false);
          }}
        >
          <div className="modal-box w-full max-w-3xl p-6 sm:p-8 rounded-2xl bg-[#031526] border border-[#18D5FD]/50 shadow-2xl text-white">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#18D5FD]/30">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <h3 className="text-lg font-bold text-white">ClassMeet Live Demo Preview</h3>
              </div>
              <button
                type="button"
                className="modal-close text-2xl text-[#18D5FD] hover:text-white"
                onClick={() => setDemoModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <div className="relative rounded-xl overflow-hidden bg-[#000E1D] border border-[#18D5FD]/30 aspect-video flex items-center justify-center group">
              <img
                src="/laptop_final_perfect.png"
                alt="ClassMeet Live Demo Session"
                className="w-full h-full object-cover opacity-85"
              />
              <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center p-6 text-center">
                <div
                  onClick={() => showToast('Playing Classroom Demo Stream...')}
                  className="w-16 h-16 rounded-full bg-[#18D5FD] text-[#001324] flex items-center justify-center text-2xl font-bold shadow-[0_0_30px_rgba(24,213,253,0.7)] hover:scale-110 transition-transform cursor-pointer"
                >
                  ▶
                </div>
                <p className="mt-4 text-white font-semibold text-lg">Interactive Smart Classroom Session</p>
                <p className="text-xs text-slate-300 mt-1">Eye-Blink Verification • Real-Time Excalidraw • 3-Strike Proctoring</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="btn-cyan px-6 py-2.5 rounded-full text-[#001324] font-bold text-sm"
                onClick={() => setDemoModalOpen(false)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notifications Hub ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="toast-msg">
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
