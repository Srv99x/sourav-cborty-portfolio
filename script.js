/* ==========================================================================
   SOURAV CHAKRABORTY — Portfolio Scripts
   
   This file handles:
   1. Terminal-style typing effect in the hero section
   2. Scroll-triggered animations via Intersection Observer
   3. Navigation scroll behavior (solid on scroll)
   4. Mobile navigation toggle
   5. Magnetic 3D tilt hover effect on project cards
   6. Copy-to-clipboard on email with toast notification
   7. Light/Dark theme toggle
   ========================================================================== */


/* --------------------------------------------------------------------------
   1. TERMINAL TYPING EFFECT
   
   HOW IT WORKS:
   - We have an array of role strings to cycle through.
   - The effect types each character one at a time, pauses, then deletes
     character by character, then moves to the next string.
   - The cursor blink is handled purely by CSS (see .cursor in style.css).
   -------------------------------------------------------------------------- */
const typingConfig = {
  strings: [
    'AI Backend Engineer',
    'MLOps Engineer',
    'FastAPI Developer',
    'Open Source Contributor',
  ],
  typeSpeed: 70,       // ms per character typed
  deleteSpeed: 40,     // ms per character deleted
  pauseDuration: 2000, // ms to pause after full string is typed
};

function initTypingEffect() {
  const element = document.getElementById('typing-text');
  if (!element) return;

  let stringIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  function tick() {
    const currentString = typingConfig.strings[stringIndex];

    if (isDeleting) {
      // Remove one character
      charIndex--;
      element.textContent = currentString.substring(0, charIndex);
    } else {
      // Add one character
      charIndex++;
      element.textContent = currentString.substring(0, charIndex);
    }

    // Determine the delay before the next tick
    let delay = isDeleting ? typingConfig.deleteSpeed : typingConfig.typeSpeed;

    if (!isDeleting && charIndex === currentString.length) {
      // Finished typing — pause before deleting
      delay = typingConfig.pauseDuration;
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      // Finished deleting — move to next string
      isDeleting = false;
      stringIndex = (stringIndex + 1) % typingConfig.strings.length;
      delay = 400; // brief pause before typing next string
    }

    setTimeout(tick, delay);
  }

  // Start the loop
  tick();
}


/* --------------------------------------------------------------------------
   2. SCROLL-TRIGGERED ANIMATIONS (Intersection Observer)
   
   HOW IT WORKS:
   - The Intersection Observer API watches elements with class
     "animate-on-scroll" as they enter/exit the viewport.
   - When an element's visibility crosses the threshold (10% visible),
     the observer adds the "in-view" class, which triggers the CSS
     transition defined in style.css (opacity 0→1, translateY 24px→0).
   - We use { once: true } so the animation only plays once (no flickering
     when scrolling back up).
   - This is far more performant than scroll event listeners because the
     browser optimizes observer callbacks off the main thread.
   -------------------------------------------------------------------------- */
function initScrollAnimations() {
  const elements = document.querySelectorAll('.animate-on-scroll');

  // If IntersectionObserver isn't supported (very old browsers), 
  // just show everything immediately.
  if (!('IntersectionObserver' in window)) {
    elements.forEach(el => el.classList.add('in-view'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          // Stop observing once animated — saves resources
          observer.unobserve(entry.target);
        }
      });
    },
    {
      // Trigger when 10% of the element is visible
      threshold: 0.1,
      // Start observing slightly before element enters viewport
      rootMargin: '0px 0px -40px 0px',
    }
  );

  elements.forEach(el => observer.observe(el));
}


/* --------------------------------------------------------------------------
   3. NAVIGATION — add "scrolled" class on scroll for solid background
   -------------------------------------------------------------------------- */
function initNavScroll() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  // Use a small threshold so the nav doesn't flicker
  const scrollThreshold = 20;

  function handleScroll() {
    if (window.scrollY > scrollThreshold) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }

  // Passive listener for better scroll performance
  window.addEventListener('scroll', handleScroll, { passive: true });

  // Run once on load in case page is already scrolled
  handleScroll();
}


/* --------------------------------------------------------------------------
   4. MOBILE NAVIGATION TOGGLE
   -------------------------------------------------------------------------- */
function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  const overlay = document.querySelector('.nav-overlay');

  if (!toggle || !links) return;

  function closeMenu() {
    toggle.classList.remove('active');
    links.classList.remove('open');
    if (overlay) overlay.classList.remove('visible');
    document.body.style.overflow = '';
  }

  function openMenu() {
    toggle.classList.add('active');
    links.classList.add('open');
    if (overlay) overlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  toggle.addEventListener('click', () => {
    if (links.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Close menu when clicking a link
  links.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close menu when clicking the overlay
  if (overlay) {
    overlay.addEventListener('click', closeMenu);
  }
}


/* --------------------------------------------------------------------------
   5. SMOOTH SCROLL for nav anchor links (fallback for browsers without
      CSS scroll-behavior support)
   -------------------------------------------------------------------------- */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}


/* --------------------------------------------------------------------------
   6. MAGNETIC 3D TILT HOVER on .project-card elements

   HOW THE MATH WORKS:
   - We get the cursor position (clientX/Y) relative to the card's center.
   - We normalize that to a -1 → +1 range (left/right, top/bottom).
   - rotateY uses the horizontal offset (tilt left/right as cursor moves
     left/right). rotateX uses the NEGATED vertical offset (tilt toward
     the cursor — moving up tilts forward, which is negative rotateX).
   - We multiply by MAX_TILT (7deg) for a subtle, precise effect.
   - perspective(800px) creates the 3D depth. scale(1.02) adds a tiny
     "lift" feel on hover.
   - On mouseleave, we remove the inline transform so the CSS transition
     smoothly returns the card to its neutral flat state.
   -------------------------------------------------------------------------- */
function initMagneticCards() {
  const cards = document.querySelectorAll('.project-card');
  const MAX_TILT = 7; // degrees — keep subtle (6-8 range)

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();

      // Cursor position relative to card center, normalized to -1..1
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

      // rotateY: positive x → tilt right. rotateX: negative y → tilt toward cursor.
      const rotateY = x * MAX_TILT;
      const rotateX = -y * MAX_TILT;

      // Add .is-tilting to disable the transform transition (real-time tracking)
      card.classList.add('is-tilting');
      card.style.transform =
        `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    });

    card.addEventListener('mouseleave', () => {
      // Remove .is-tilting so the CSS transition animates the reset smoothly
      card.classList.remove('is-tilting');
      card.style.transform = '';
    });
  });
}


/* --------------------------------------------------------------------------
   7. COPY-TO-CLIPBOARD ON EMAIL

   Intercepts click on the .email-copy link, copies the email address from
   the data-email attribute to the clipboard, and shows a "Copied!" toast.
   Falls back to selecting the text if the Clipboard API is unavailable.
   -------------------------------------------------------------------------- */
function initEmailCopy() {
  const emailLink = document.getElementById('email-copy');
  const toast = document.getElementById('copy-toast');
  if (!emailLink || !toast) return;

  emailLink.addEventListener('click', (e) => {
    e.preventDefault();
    const email = emailLink.dataset.email;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      // Modern Clipboard API — works in secure contexts (HTTPS / localhost)
      navigator.clipboard.writeText(email).then(() => {
        showCopyToast(toast);
      }).catch(() => {
        // Clipboard API rejected — fall back to selection
        fallbackCopyText(email);
        showCopyToast(toast);
      });
    } else {
      // Fallback for browsers without Clipboard API:
      // Create a temporary <textarea>, select its contents, and use
      // the legacy document.execCommand('copy').
      fallbackCopyText(email);
      showCopyToast(toast);
    }
  });
}

/* Show the "Copied!" toast for ~1.5 seconds then fade out */
function showCopyToast(toast) {
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 1500);
}

/* Fallback copy: create a hidden textarea, select, and execCommand */
function fallbackCopyText(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } catch (err) {
    // Silently fail — the mailto: link is still functional
  }
  document.body.removeChild(textarea);
}


/* --------------------------------------------------------------------------
   8. LIGHT/DARK THEME TOGGLE
   -------------------------------------------------------------------------- */
function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle');
  if (!toggleBtn) return;

  // Initial state logic matches the inline script in index.html <head>
  const savedTheme = localStorage.getItem('theme');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let currentTheme = savedTheme || 'dark';

  updateThemeIcon(currentTheme, toggleBtn);

  toggleBtn.addEventListener('click', (e) => {
    const isDark = currentTheme === 'dark';
    const nextTheme = isDark ? 'light' : 'dark';

    // Fallback for browsers without View Transitions API
    if (!document.startViewTransition) {
      currentTheme = nextTheme;
      document.documentElement.setAttribute('data-theme', currentTheme);
      localStorage.setItem('theme', currentTheme);
      updateThemeIcon(currentTheme, toggleBtn);
      return;
    }

    // Get click position for the ripple origin
    const x = e.clientX;
    const y = e.clientY;
    const endRadius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y)
    );

    // Disable CSS transitions temporarily so the view transition snapshot is clean
    const style = document.createElement('style');
    style.innerHTML = '*, *::before, *::after { transition: none !important; }';
    document.head.appendChild(style);

    const transition = document.startViewTransition(() => {
      currentTheme = nextTheme;
      document.documentElement.setAttribute('data-theme', currentTheme);
      localStorage.setItem('theme', currentTheme);
      updateThemeIcon(currentTheme, toggleBtn);
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`
      ];

      document.documentElement.animate(
        {
          clipPath: isDark ? clipPath : [...clipPath].reverse()
        },
        {
          duration: 500,
          easing: 'ease-in-out',
          pseudoElement: isDark
            ? '::view-transition-new(root)'
            : '::view-transition-old(root)'
        }
      );
    });

    transition.finished.then(() => {
      document.head.removeChild(style);
    });
  });
}

function updateThemeIcon(theme, btn) {
  if (theme === 'dark') {
    // Sun icon for switching to light mode
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    btn.setAttribute('aria-label', 'Switch to light mode');
  } else {
    // Moon icon for switching to dark mode
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    btn.setAttribute('aria-label', 'Switch to dark mode');
  }
}


/* --------------------------------------------------------------------------
   INITIALIZE EVERYTHING when the DOM is ready
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initTypingEffect();
  initScrollAnimations();
  initNavScroll();
  initMobileNav();
  initSmoothScroll();
  initMagneticCards();
  initEmailCopy();
  initThemeToggle();
});
