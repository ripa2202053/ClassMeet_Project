/**
 * ClassMeet — Interactive Controller
 * Handles Navigation, Scroll-Spy, Modals, Forms & Toasts.
 */

(function() {
  'use strict';

  // 1. Navigation Scroll-Spy & Smooth Scrolling
  const navLinks = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('section[id]');

  function updateActiveNav() {
    let currentId = 'home';
    const scrollPos = window.scrollY + 120;

    sections.forEach(sec => {
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        currentId = sec.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentId}`) {
        link.classList.add('active');
      }
    });
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });
  updateActiveNav();

  // Smooth scroll click handler
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetElem = document.querySelector(targetId);
      if (targetElem) {
        e.preventDefault();
        targetElem.scrollIntoView({ behavior: 'smooth' });
        // Close mobile drawer if open
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
          mobileMenu.classList.add('hidden');
        }
      }
    });
  });

  // 2. Mobile Menu Drawer
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      const isClosed = mobileMenu.classList.contains('hidden');
      mobileMenu.classList.toggle('hidden', !isClosed);
      mobileMenuBtn.setAttribute('aria-expanded', String(isClosed));
    });

    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // 3. Modals Controller
  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    const input = modal.querySelector('input');
    if (input) setTimeout(() => input.focus(), 80);
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  // Bind Buttons to Open Modals
  ['navSignUpBtn', 'heroGetStartedBtn', 'mobileSignUpBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => openModal('signUpModal'));
  });

  ['navJoinClassBtn', 'mobileJoinClassBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => openModal('joinClassModal'));
  });

  const watchDemoBtn = document.getElementById('heroWatchDemoBtn');
  if (watchDemoBtn) {
    watchDemoBtn.addEventListener('click', () => openModal('demoModal'));
  }

  // Close buttons
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-close');
      if (target) closeModal(target);
    });
  });

  // Backdrop click closes modal
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal(backdrop.id);
    });
  });

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.open').forEach(m => closeModal(m.id));
    }
  });

  // 4. Form Submissions & Toasts
  const signUpForm = document.getElementById('signUpForm');
  if (signUpForm) {
    signUpForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('suName')?.value || 'Educator';
      closeModal('signUpModal');
      showToast(`Welcome to ClassMeet, ${name}! Your workspace is active.`);
      e.target.reset();
    });
  }

  const joinClassForm = document.getElementById('joinClassForm');
  if (joinClassForm) {
    joinClassForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = document.getElementById('jcCode')?.value || '';
      closeModal('joinClassModal');
      showToast(`Joining room ${code.toUpperCase()} via WebRTC...`);
      e.target.reset();
    });
  }

  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('Inquiry received. An engineer will reach out shortly.');
      e.target.reset();
    });
  }

  // 5. Toast Notification System
  function showToast(message) {
    const hub = document.getElementById('toastHub');
    if (!hub) return;

    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.textContent = message;
    hub.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  // =========================================================================
  // 6. WHY CLASSMEET — 3D CYLINDRICAL CAROUSEL & INTERACTIVE DETAILS PANEL
  // =========================================================================
  const stage = document.getElementById('whyCarouselStage');
  const cylinder = document.getElementById('whyCarouselCylinder');
  const cards = document.querySelectorAll('.why-carousel-card');
  const prevBtn = document.getElementById('whyPrevBtn');
  const nextBtn = document.getElementById('whyNextBtn');
  const dots = document.querySelectorAll('.carousel-dot');

  // Details Panel Elements
  const detailsPanel = document.getElementById('whyDetailsPanel');
  const detailBadge = document.getElementById('whyDetailBadge');
  const detailPill = document.getElementById('whyDetailPill');
  const detailTitle = document.getElementById('whyDetailTitle');
  const detailSubtitle = document.getElementById('whyDetailSubtitle');
  const detailDesc = document.getElementById('whyDetailDesc');
  const detailMediaBox = document.getElementById('whyDetailMediaBox');
  const detailFeaturesGrid = document.getElementById('whyDetailFeaturesGrid');
  const detailFullPageLink = document.getElementById('whyDetailFullPageLink');
  const detailNextTopicBtn = document.getElementById('whyDetailNextTopicBtn');
  const detailJoinBtn = document.getElementById('whyDetailJoinBtn');

  const WHY_TOPICS = [
    {
      index: 0,
      slug: 'what-is-classmeet',
      pill: 'Discover Our Platform',
      titleHtml: 'What is <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#19D5F5] to-[#38BDF8]">ClassMeet</span>?',
      subtitle: 'An AI-powered smart classroom platform that brings teaching, learning, and collaboration together.',
      desc: 'ClassMeet is an AI-powered smart classroom ecosystem purpose-built for synchronous education, peer collaboration, and verified engagement — replacing fragmented corporate video tools with a unified learning theater.',
      image: 'card1_what_is_classmeet.png',
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
      image: 'card2_our_mission.png',
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
      image: 'card3_why_we_built_it.jpg',
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
      iconSvg: '<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>',
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
      iconSvg: '<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
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
      iconSvg: '<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
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
      iconSvg: '<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>',
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

  if (stage && cylinder && cards.length === 7) {
    const totalCards = 7;
    const angleStep = 360 / totalCards; // 51.42857 deg
    let currentVirtualIndex = 0;
    let autoTimer = null;
    let isHovered = false;
    let isDragging = false;
    let startX = 0;
    let dragDistance = 0;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function getRadius() {
      const w = window.innerWidth;
      if (w < 480) return 210;
      if (w < 768) return 235;
      if (w < 1024) return 255;
      return 245; // 245px radius for 205px wide cards in 2-column layout
    }

    function initCardTransforms() {
      const radius = getRadius();
      cards.forEach((card, i) => {
        const baseAngle = i * angleStep;
        card.style.transform = `rotateY(${baseAngle}deg) translateZ(${radius}px)`;
      });
    }

    function updateWhyDetails(index, pulse = false) {
      const topic = WHY_TOPICS[index];
      if (!topic) return;

      if (detailBadge) detailBadge.textContent = `Card 0${index + 1} of 07`;
      if (detailPill) detailPill.textContent = topic.pill;
      if (detailTitle) detailTitle.innerHTML = topic.titleHtml || topic.title;
      if (detailSubtitle) detailSubtitle.textContent = topic.subtitle;
      if (detailDesc) detailDesc.textContent = topic.desc;

      if (detailMediaBox) {
        if (topic.image) {
          detailMediaBox.innerHTML = `
            <div class="rounded-xl overflow-hidden border border-[#19D5F5]/35 bg-[#021224] shadow-[0_0_20px_rgba(25,213,245,0.18)] max-h-[160px] flex items-center justify-center p-1.5 transition-transform duration-300 hover:scale-[1.02]">
              <img src="${topic.image}" alt="${topic.pill} illustration" class="w-full h-auto max-h-[150px] object-cover rounded-lg">
            </div>
          `;
        } else {
          detailMediaBox.innerHTML = `
            <div class="rounded-xl overflow-hidden border border-[#19D5F5]/35 bg-gradient-to-br from-[#062444] to-[#021020] shadow-[0_0_20px_rgba(25,213,245,0.15)] h-[140px] flex flex-col items-center justify-center p-3 text-center">
              <div class="w-10 h-10 rounded-xl bg-[#19D5F5]/20 border border-[#19D5F5]/50 flex items-center justify-center text-[#19D5F5] mb-2 shadow-[0_0_12px_rgba(25,213,245,0.3)]">
                ${topic.iconSvg}
              </div>
              <span class="text-[0.625rem] font-bold text-[#19D5F5] uppercase tracking-wider">${topic.badge}</span>
            </div>
          `;
        }
      }

      if (detailFeaturesGrid) {
        detailFeaturesGrid.innerHTML = topic.features.map(f => `
          <div class="why-detail-feature">
            <div class="flex items-center gap-1.5 mb-1">
              <span class="w-1.5 h-1.5 rounded-full bg-[#19D5F5]"></span>
              <h4 class="text-xs font-bold text-white tracking-tight">${f.title}</h4>
            </div>
            <p class="text-[0.68rem] text-slate-300 leading-snug">${f.desc}</p>
          </div>
        `).join('');
      }

      if (detailFullPageLink) {
        detailFullPageLink.setAttribute('href', `/why-classmeet/${topic.slug}`);
      }

      // Synchronize topic switcher buttons
      document.querySelectorAll('.why-topic-pill').forEach((pill, idx) => {
        pill.classList.toggle('active', idx === index);
      });

      if (pulse && detailsPanel) {
        detailsPanel.classList.remove('highlight-pulse');
        void detailsPanel.offsetWidth; // Trigger reflow to restart CSS animation
        detailsPanel.classList.add('highlight-pulse');
      }
    }

    function updateCardStates(normalizedIndex) {
      cards.forEach((card, i) => {
        const diff = (i - normalizedIndex + totalCards) % totalCards;
        card.classList.remove('active-center', 'flanking-card', 'back-card');

        if (diff === 0) {
          card.classList.add('active-center');
          card.setAttribute('aria-hidden', 'false');
          card.setAttribute('tabindex', '0');
        } else if (diff === 1 || diff === 6) {
          card.classList.add('flanking-card');
          card.setAttribute('aria-hidden', 'false');
          card.setAttribute('tabindex', '-1');
        } else {
          card.classList.add('back-card');
          card.setAttribute('aria-hidden', 'true');
          card.setAttribute('tabindex', '-1');
        }
      });

      // Update dots
      dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === normalizedIndex);
      });
    }

    function rotateTo(virtualIndex, updateDetails = true) {
      currentVirtualIndex = virtualIndex;
      const targetAngle = -currentVirtualIndex * angleStep;
      cylinder.classList.remove('no-transition');
      cylinder.style.transform = `rotateY(${targetAngle}deg)`;

      const normalized = ((currentVirtualIndex % totalCards) + totalCards) % totalCards;
      updateCardStates(normalized);
      if (updateDetails) {
        updateWhyDetails(normalized, false);
      }
    }

    function next() {
      rotateTo(currentVirtualIndex + 1);
    }

    function prev() {
      rotateTo(currentVirtualIndex - 1);
    }

    // Auto-advance approximately every 4 seconds
    function startAutoRotation() {
      stopAutoRotation();
      if (prefersReducedMotion) return;
      autoTimer = setInterval(() => {
        if (!isHovered && !isDragging && document.visibilityState === 'visible') {
          next();
        }
      }, 4000);
    }

    function stopAutoRotation() {
      if (autoTimer) {
        clearInterval(autoTimer);
        autoTimer = null;
      }
    }

    // Prev / Next button clicks
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        prev();
        startAutoRotation();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        next();
        startAutoRotation();
      });
    }

    // Dot indicators click
    dots.forEach((dot, idx) => {
      dot.addEventListener('click', () => {
        const currentNormalized = ((currentVirtualIndex % totalCards) + totalCards) % totalCards;
        let diff = (idx - currentNormalized + totalCards) % totalCards;
        if (diff > 3) diff -= 7; // Shortest rotation direction
        rotateTo(currentVirtualIndex + diff);
        startAutoRotation();
      });
    });

    // Clicking a side card rotates it to center
    cards.forEach((card, i) => {
      card.addEventListener('click', (e) => {
        // If clicking explore button, let the explore handler manage it
        if (e.target.closest('.card-explore-btn')) {
          return;
        }
        const currentNormalized = ((currentVirtualIndex % totalCards) + totalCards) % totalCards;
        let diff = (i - currentNormalized + totalCards) % totalCards;
        if (diff === 0) return; // Already active center card
        if (diff > 3) diff -= 7;
        rotateTo(currentVirtualIndex + diff);
        startAutoRotation();
      });
    });

    // Clicking "Explore More" on any card: updates details and pulses right panel
    document.querySelectorAll('.card-explore-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const exploreIdx = parseInt(btn.getAttribute('data-explore-index'), 10);
        if (isNaN(exploreIdx)) return;

        const currentNormalized = ((currentVirtualIndex % totalCards) + totalCards) % totalCards;
        let diff = (exploreIdx - currentNormalized + totalCards) % totalCards;
        if (diff > 3) diff -= 7;

        rotateTo(currentVirtualIndex + diff, false);
        updateWhyDetails(exploreIdx, true); // pulse highlight!
        startAutoRotation();

        // If tablet or mobile (stacked vertically), smoothly scroll down to details
        if (window.innerWidth < 1024 && detailsPanel) {
          detailsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    });

    // Topic switcher tabs click inside details panel
    document.querySelectorAll('.why-topic-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const targetIdx = parseInt(pill.getAttribute('data-topic-index'), 10);
        if (isNaN(targetIdx)) return;

        const currentNormalized = ((currentVirtualIndex % totalCards) + totalCards) % totalCards;
        let diff = (targetIdx - currentNormalized + totalCards) % totalCards;
        if (diff > 3) diff -= 7;

        rotateTo(currentVirtualIndex + diff, false);
        updateWhyDetails(targetIdx, true);
        startAutoRotation();
      });
    });

    // Next Topic button inside details panel
    if (detailNextTopicBtn) {
      detailNextTopicBtn.addEventListener('click', () => {
        const nextIdx = (((currentVirtualIndex + 1) % totalCards) + totalCards) % totalCards;
        rotateTo(currentVirtualIndex + 1, false);
        updateWhyDetails(nextIdx, true);
        startAutoRotation();
      });
    }

    // Join Class / Experience ClassMeet button inside details panel
    if (detailJoinBtn) {
      detailJoinBtn.addEventListener('click', () => {
        openModal('joinClassModal');
      });
    }

    // Hover & Focus pause
    stage.addEventListener('mouseenter', () => {
      isHovered = true;
    });
    stage.addEventListener('mouseleave', () => {
      isHovered = false;
    });
    stage.addEventListener('focusin', () => {
      isHovered = true;
    });
    stage.addEventListener('focusout', () => {
      isHovered = false;
    });

    if (detailsPanel) {
      detailsPanel.addEventListener('mouseenter', () => {
        isHovered = true;
      });
      detailsPanel.addEventListener('mouseleave', () => {
        isHovered = false;
      });
    }

    // Mouse drag & touch swipe
    function onPointerDown(clientX) {
      isDragging = true;
      startX = clientX;
      dragDistance = 0;
      cylinder.classList.add('no-transition');
      stage.classList.add('is-dragging');
    }

    function onPointerMove(clientX) {
      if (!isDragging) return;
      dragDistance = clientX - startX;
      const currentAngle = -currentVirtualIndex * angleStep;
      cylinder.style.transform = `rotateY(${currentAngle + (dragDistance * 0.22)}deg)`;
    }

    function onPointerUp() {
      if (!isDragging) return;
      isDragging = false;
      stage.classList.remove('is-dragging');
      cylinder.classList.remove('no-transition');

      if (dragDistance < -45) {
        next();
      } else if (dragDistance > 45) {
        prev();
      } else {
        rotateTo(currentVirtualIndex);
      }
      startAutoRotation();
    }

    stage.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('.card-explore-btn')) return;
      onPointerDown(e.clientX);
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        onPointerMove(e.clientX);
      }
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) onPointerUp();
    });

    // Touch events for mobile devices
    stage.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        onPointerDown(e.touches[0].clientX);
      }
    }, { passive: true });

    stage.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length === 1) {
        onPointerMove(e.touches[0].clientX);
      }
    }, { passive: true });

    stage.addEventListener('touchend', () => {
      if (isDragging) onPointerUp();
    });

    // Keyboard navigation (ArrowLeft / ArrowRight)
    stage.setAttribute('tabindex', '0');
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        prev();
        startAutoRotation();
      } else if (e.key === 'ArrowRight') {
        next();
        startAutoRotation();
      }
    });

    // Window resize handler
    window.addEventListener('resize', () => {
      initCardTransforms();
    }, { passive: true });

    // Initialize 3D carousel
    initCardTransforms();
    rotateTo(0);
    startAutoRotation();
  }

})();
