// syrus.com.bd — interactions

(() => {
  "use strict";

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ------------------ Year ------------------
  $("#footer-year").textContent = new Date().getFullYear();

  // ------------------ Cursor glow ------------------
  const glow = $(".cursor-glow");
  if (glow && window.matchMedia("(hover: hover) and (pointer: fine)").matches && !prefersReducedMotion) {
    let tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    let cx = tx, cy = ty;
    window.addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    const tick = () => {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      glow.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(tick);
    };
    tick();
  }

  // ------------------ Project card tilt-glow ------------------
  // Tracks pointer position on each card so the ::before radial highlight follows the cursor.
  document.addEventListener("pointermove", (e) => {
    const card = e.target.closest(".project-card");
    if (!card || card.classList.contains("skeleton")) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, { passive: true });

  // ------------------ Nav scrolled state + mobile menu ------------------
  const nav = $(".nav");
  const onScroll = () => {
    nav.classList.toggle("scrolled", window.scrollY > 10);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const navToggle = $(".nav-toggle");
  const mobileMenu = $("#mobile-menu");
  if (navToggle && mobileMenu) {
    const setOpen = (open) => {
      navToggle.setAttribute("aria-expanded", String(open));
      mobileMenu.hidden = !open;
    };
    navToggle.addEventListener("click", () => {
      setOpen(navToggle.getAttribute("aria-expanded") !== "true");
    });
    mobileMenu.addEventListener("click", (e) => {
      if (e.target.tagName === "A") setOpen(false);
    });
  }

  // ------------------ Scroll spy ------------------
  const navLinks = $$(".nav-links a");
  const sectionIds = navLinks.map(a => a.getAttribute("href")).filter(h => h && h.startsWith("#"));
  const sections = sectionIds.map(id => $(id)).filter(Boolean);
  if (sections.length && "IntersectionObserver" in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = `#${entry.target.id}`;
          navLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === id));
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px", threshold: 0 });
    sections.forEach(s => spy.observe(s));
  }

  // ------------------ Reveal on scroll ------------------
  const revealTargets = $$(".section, .hero-title, .hero-sub, .hero-cta, .socials, .about-facts");
  revealTargets.forEach(el => el.classList.add("reveal"));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    revealTargets.forEach(el => io.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add("is-visible"));
  }

  // ------------------ Typewriter (hero) ------------------
  const heroTypes = [
    "reliable backend systems",
    "developer tooling",
    "boring, dependable software",
    "things in Go",
    "stuff that doesn't page at 3am",
  ];
  const twTarget = $(".tw-target");
  if (twTarget) runTypewriter(twTarget, heroTypes, { type: 55, erase: 28, hold: 1800 });

  // ------------------ Typewriter (writing section) ------------------
  const writingTypes = [
    "# coming soon",
    "> git init ~/thoughts",
    "> draft: what I learned shipping Go at scale",
    "# stay tuned",
  ];
  const tw2 = $(".tw-target-2");
  if (tw2) runTypewriter(tw2, writingTypes, { type: 45, erase: 22, hold: 2200 });

  function runTypewriter(el, items, { type, erase, hold }) {
    if (prefersReducedMotion) { el.textContent = items[0]; return; }
    let i = 0, ch = 0, erasing = false;
    const step = () => {
      const phrase = items[i];
      if (!erasing) {
        ch++;
        el.textContent = phrase.slice(0, ch);
        if (ch >= phrase.length) { erasing = true; return setTimeout(step, hold); }
        return setTimeout(step, type + Math.random() * 40);
      }
      ch--;
      el.textContent = phrase.slice(0, ch);
      if (ch <= 0) { erasing = false; i = (i + 1) % items.length; return setTimeout(step, 300); }
      setTimeout(step, erase);
    };
    step();
  }

  // ------------------ Copy email ------------------
  const copyBtn = $(".copy-email");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const email = copyBtn.dataset.email;
      const label = copyBtn.querySelector(".copy-label");
      try {
        await navigator.clipboard.writeText(email);
        const original = label.textContent;
        label.textContent = "copied!";
        copyBtn.classList.add("copied");
        toast(`Copied ${email}`);
        setTimeout(() => {
          label.textContent = original;
          copyBtn.classList.remove("copied");
        }, 1800);
      } catch {
        window.location.href = `mailto:${email}`;
      }
    });
  }

  const toastEl = $("#toast");
  let toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  // ------------------ GitHub projects ------------------
  const langColor = {
    Go: "#00ADD8",
    TypeScript: "#3178C6",
    JavaScript: "#F7DF1E",
    HTML: "#E34F26",
    Java: "#b07219",
    Shell: "#89e051",
    Python: "#3572A5",
    CSS: "#563d7c",
    CoffeeScript: "#244776",
  };

  const grid = $("#projects-grid");
  if (grid) loadProjects(grid);

  async function loadProjects(container) {
    const cacheKey = "msyrus:repos:v2";
    const cacheTTL = 6 * 60 * 60 * 1000; // 6h
    const now = Date.now();

    // Try cache first for snappier loads
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (cached && (now - cached.at) < cacheTTL) {
        return render(cached.data);
      }
    } catch {}

    // Curated pin order — these lead, regardless of star count. Tweak freely.
    const FEATURED = ["vscode-go-doc", "ipwatcher", "bioscope-downloader", "deployments", "http-echo", "rpi-fan"];

    try {
      const res = await fetch("https://api.github.com/users/msyrus/repos?per_page=100&sort=updated");
      if (!res.ok) throw new Error(`GitHub API ${res.status}`);
      const repos = await res.json();

      const byName = new Map(repos.map(r => [r.name, r]));
      const seen = new Set();
      const ordered = [];

      // 1. Pinned, in curated order
      for (const name of FEATURED) {
        const r = byName.get(name);
        if (r && !r.fork && !r.archived) { ordered.push(r); seen.add(r.name); }
      }
      // 2. Fill the rest by stars, then recency
      const rest = repos
        .filter(r => !seen.has(r.name) && !r.fork && !r.archived && r.name !== "msyrus" && r.name !== "msyrus.github.io")
        .sort((a, b) => (b.stargazers_count - a.stargazers_count) || (new Date(b.pushed_at) - new Date(a.pushed_at)));
      ordered.push(...rest);

      const filtered = ordered.slice(0, 6);

      try { localStorage.setItem(cacheKey, JSON.stringify({ at: now, data: filtered })); } catch {}
      render(filtered);
    } catch (err) {
      console.warn("[projects]", err);
      container.innerHTML = `
        <div class="projects-error">
          Couldn't reach GitHub right now.
          <a class="inline-link" href="https://github.com/msyrus?tab=repositories" target="_blank" rel="noopener">
            Browse repos directly →
          </a>
        </div>`;
    }

    function render(list) {
      if (!list.length) {
        container.innerHTML = `<div class="projects-error">No projects to show.</div>`;
        return;
      }
      container.innerHTML = "";
      list.forEach((r) => container.appendChild(cardFor(r)));

      // Re-apply reveal for freshly-inserted cards
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver((entries) => {
          entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); } });
        }, { threshold: 0.1 });
        $$(".project-card", container).forEach((c, idx) => {
          c.classList.add("reveal");
          c.style.transitionDelay = `${Math.min(idx * 60, 360)}ms`;
          io.observe(c);
        });
      }
    }
  }

  function cardFor(r) {
    const a = document.createElement("a");
    a.className = "project-card";
    a.href = r.html_url;
    a.target = "_blank";
    a.rel = "noopener";

    const color = langColor[r.language] || "#8a8fa3";
    const desc = r.description || "—";
    const stars = r.stargazers_count || 0;
    const updated = new Date(r.pushed_at).toLocaleDateString(undefined, { year: "numeric", month: "short" });

    a.innerHTML = `
      <div class="project-header">
        <span class="project-name">${escapeHtml(r.name)}</span>
        <span class="project-link-arrow" aria-hidden="true">↗</span>
      </div>
      <p class="project-desc">${escapeHtml(desc)}</p>
      <div class="project-meta">
        ${r.language ? `<span class="lang"><span class="dot" style="background:${color}"></span>${escapeHtml(r.language)}</span>` : ""}
        ${stars > 0 ? `<span class="stars">${stars}</span>` : ""}
        <span class="updated">updated ${updated}</span>
      </div>
    `;
    return a;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }
})();
