/* ---------------- header scroll state ---------------- */
const header = document.getElementById('siteHeader');
if (header) {
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

/* ---------------- close mobile nav on link click ---------------- */
document.querySelectorAll('nav a').forEach(a => {
  a.addEventListener('click', () => {
    const toggle = document.getElementById('navToggle');
    if (toggle) toggle.checked = false;
  });
});

/* ---------------- scroll reveal ---------------- */
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
revealEls.forEach(el => io.observe(el));

const archEls = document.querySelectorAll('[data-reveal-arch]');
const archIo = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      archIo.unobserve(e.target);
    }
  });
}, { threshold: 0.4 });
archEls.forEach(el => archIo.observe(el));

/* ---------------- Three.js-free ambient particle / light-streak hero ---------------- */
(function () {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, dpr;
  let particles = [];
  let streaks = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth = canvas.offsetWidth;
    h = canvas.clientHeight = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function init() {
    resize();
    particles = [];
    const count = Math.min(70, Math.floor(w / 16));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.6 + 0.4,
        vy: -(Math.random() * 0.35 + 0.08),
        vx: (Math.random() - 0.5) * 0.15,
        alpha: Math.random() * 0.5 + 0.15,
        hue: Math.random() > 0.5 ? 'gold' : 'blue'
      });
    }
    streaks = [];
    for (let i = 0; i < 5; i++) {
      streaks.push({
        y: h * (0.15 + i * 0.15) + (Math.random() * 40 - 20),
        x: Math.random() * w,
        len: w * 0.18 + Math.random() * w * 0.12,
        speed: 0.25 + Math.random() * 0.35,
        alpha: 0.05 + Math.random() * 0.06
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    streaks.forEach(s => {
      const grad = ctx.createLinearGradient(s.x, s.y, s.x + s.len, s.y);
      grad.addColorStop(0, 'rgba(212,175,55,0)');
      grad.addColorStop(0.5, `rgba(212,175,55,${s.alpha})`);
      grad.addColorStop(1, 'rgba(212,175,55,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + s.len, s.y);
      ctx.stroke();
      s.x += s.speed;
      if (s.x > w) s.x = -s.len;
    });

    particles.forEach(p => {
      const color = p.hue === 'gold' ? `rgba(233,205,122,${p.alpha})` : `rgba(120,150,230,${p.alpha * 0.7})`;
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      p.y += p.vy;
      p.x += p.vx;
      if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
    });

    requestAnimationFrame(draw);
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 200);
  });

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  init();
  if (!reduceMotion) requestAnimationFrame(draw); else draw();
})();

/* ---------------- subtle parallax on hero bg (home page only) ---------------- */
const heroBg = document.querySelector('.hero-bg-img');
if (heroBg) {
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y < window.innerHeight) heroBg.style.transform = `translateY(${y * 0.25}px)`;
  }, { passive: true });
}
