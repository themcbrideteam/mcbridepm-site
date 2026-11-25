/* McBride PM — homepage walkthrough
   GSAP 3 + ScrollTrigger. Reduced-motion visitors get the static page,
   with the room behind each chapter still changing as they read. */

gsap.registerPlugin(ScrollTrigger);

const mm = gsap.matchMedia();

/* ============================================================
   THE TOUR — seven photographs of one home, one per chapter
   ============================================================
   Each .tour-scene is named for its chapter (data-scene="office" sits
   behind #office), so the room on screen always matches the chapter being
   read, however tall that chapter is on a given screen. */
const tour = document.querySelector(".tour");
const scenes = [...document.querySelectorAll(".tour-scene")];
const chapterOf = (scene) => document.getElementById(scene.dataset.scene);

/* Only the first scene ships with the page. The rest are filled in here:
   in order once the page has loaded, and at once if the visitor gets near
   one before its turn. */
function loadScene(scene) {
  if (!scene || scene.dataset.asked) return Promise.resolve();
  scene.dataset.asked = "1";
  const img = scene.querySelector("img");
  scene.querySelectorAll("source[data-srcset]").forEach((source) => {
    source.srcset = source.dataset.srcset;
  });
  if (img.dataset.src) img.src = img.dataset.src;
  const ready = img.decode
    ? img.decode().catch(() => {})
    : new Promise((done) => (img.onload = img.onerror = done));
  return ready.then(() => scene.classList.add("is-loaded"));
}
function loadRest(i) {
  if (i >= scenes.length) return;
  loadScene(scenes[i]).then(() => setTimeout(() => loadRest(i + 1), 120));
}
const saveData = !!(navigator.connection && navigator.connection.saveData);

/* How the camera moves through a room while its chapter is on screen.
   Every move keeps the picture larger than the screen, so no edge shows. */
const DRIFT = {
  in: [{ scale: 1.06, xPercent: 0, yPercent: 0 }, { scale: 1.17, xPercent: 0, yPercent: 0 }],
  out: [{ scale: 1.17, xPercent: 0, yPercent: 0 }, { scale: 1.06, xPercent: 0, yPercent: 0 }],
  left: [{ scale: 1.1, xPercent: -2.2, yPercent: 0 }, { scale: 1.1, xPercent: 2.2, yPercent: 0 }],
  right: [{ scale: 1.1, xPercent: 2.2, yPercent: 0 }, { scale: 1.1, xPercent: -2.2, yPercent: 0 }],
};

/* ============================================================
   FULL EXPERIENCE — motion allowed
   ============================================================ */
mm.add(
  {
    noMotionPref: "(prefers-reduced-motion: no-preference)",
    desktop: "(min-width: 900px) and (pointer: fine)",
  },
  (ctx) => {
    const { noMotionPref, desktop } = ctx.conditions;
    if (!noMotionPref) return;
    const undo = [];
    scenes.forEach((scene) => scene.classList.remove("is-covered"));

    /* ---------- Horizontal services track (desktop only) ----------
       Created first: it adds scroll length to the page, and every trigger
       made after it measures the page with that length in place. */
    if (desktop) {
      const track = document.querySelector(".track");
      const pin = document.querySelector(".horizontal-pin");
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
      gsap.to(track, {
        x: () => -distance(),
        ease: "none", // required: keeps scroll and position 1:1
        scrollTrigger: {
          trigger: "#living",
          pin: pin,
          start: "top top",
          end: () => "+=" + distance(),
          scrub: 0.5,
          invalidateOnRefresh: true,
        },
      });
    }

    /* ---------- Hero entrance ---------- */
    gsap.from(".hero .reveal-line", {
      y: 60,
      opacity: 0,
      duration: 1.1,
      ease: "power3.out",
      stagger: 0.12,
      delay: 0.2,
    });
    // The curb settles into frame as the page opens
    gsap.from(scenes[0].querySelector(".tour-cam"), { scale: 1.09, duration: 2.8, ease: "power2.out" });

    /* ---------- The walkthrough ----------
       Three layers per scene, one job each, so no two tweens fight:
         img          the slow camera move while the room is on screen
         .tour-cam    settling into the room on the way in
         .tour-scene  fading in, then pushing toward its doorway on the way out
       A room is walked into as its chapter's top edge crosses the screen. */
    scenes.forEach((scene, i) => {
      const chapter = chapterOf(scene);
      const next = scenes[i + 1] && chapterOf(scenes[i + 1]);
      const [from, to] = DRIFT[scene.dataset.drift] || DRIFT.in;

      gsap.fromTo(scene.querySelector("img"), from, {
        ...to,
        ease: "none",
        scrollTrigger: {
          trigger: chapter,
          start: i ? "top bottom" : "top top",
          endTrigger: next || chapter,
          end: next ? "top 20%" : "max",
          scrub: 0.8,
        },
      });

      if (!i) return;
      const behind = scenes[i - 1];
      const walk = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          id: "walk-" + i,
          trigger: chapter,
          start: "top 88%",
          end: "top 22%",
          scrub: 0.7,
          onToggle: () => {
            loadScene(scene);
            loadScene(scenes[i + 1]);
          },
        },
        // Once this room fully covers the last one, stop drawing the last one
        onUpdate: () => behind.classList.toggle("is-covered", walk.progress() >= 1),
      });
      walk
        .fromTo(behind, { scale: 1 }, { scale: 1.32, ease: "power2.in", duration: 1 }, 0)
        .fromTo(scene, { autoAlpha: 0 }, { autoAlpha: 1, ease: "power1.inOut", duration: 0.5 }, 0.36)
        .fromTo(scene.querySelector(".tour-cam"), { scale: 1.14 }, { scale: 1, ease: "power2.out", duration: 0.64 }, 0.36);
    });
    const syncCovered = () =>
      scenes.forEach((scene, i) => {
        const st = scenes[i + 1] && ScrollTrigger.getById("walk-" + (i + 1));
        if (st) scene.classList.toggle("is-covered", st.progress >= 1);
      });
    ScrollTrigger.addEventListener("refresh", syncCovered);
    undo.push(() => ScrollTrigger.removeEventListener("refresh", syncCovered));

    // Desktop: the house leans a few pixels toward the pointer, for depth
    if (desktop) {
      const rig = document.querySelector(".tour-rig");
      const rigX = gsap.quickTo(rig, "x", { duration: 1.4, ease: "power3" });
      const rigY = gsap.quickTo(rig, "y", { duration: 1.4, ease: "power3" });
      const lean = (e) => {
        rigX((0.5 - e.clientX / window.innerWidth) * 20);
        rigY((0.5 - e.clientY / window.innerHeight) * 12);
      };
      window.addEventListener("mousemove", lean, { passive: true });
      undo.push(() => window.removeEventListener("mousemove", lean));
    }

    // Hero copy dissolves as the visitor starts walking
    gsap.to(".hero .chapter-content, .scroll-cue", {
      opacity: 0,
      y: -60,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "60% top", scrub: true },
    });

    /* ---------- Chapter copy walks in ---------- */
    document.querySelectorAll(".chapter:not(.hero)").forEach((chapter) => {
      const content = chapter.querySelectorAll(
        ".chapter-num, h2, .chapter-copy, .quotes, .hero-ctas, .closer, .journal-grid, .faq-list, .steps-list, .start-card, .chapter-content > .link-arrow, .office-link"
      );
      if (content.length) {
        gsap.from(content, {
          y: 70,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          stagger: 0.1,
          scrollTrigger: {
            trigger: chapter,
            start: "top 62%",
            toggleActions: "play none none reverse",
          },
        });
      }
    });

    /* ---------- Stat counters (real published numbers only) ---------- */
    document.querySelectorAll("[data-count]").forEach((el) => {
      const target = +el.dataset.count;
      const suffix = el.dataset.suffix || "";
      const proxy = { v: 0 };
      gsap.to(proxy, {
        v: target,
        duration: 1.6,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 80%" },
        onUpdate: () => (el.textContent = Math.round(proxy.v) + suffix),
      });
    });

    /* ---------- Journey rail ---------- */
    const rooms = ["curb", "door", "living", "office", "study", "porch", "handoff"];
    rooms.forEach((id) => {
      ScrollTrigger.create({
        trigger: "#" + id,
        start: "top center",
        end: "bottom center",
        onToggle: (self) => {
          document
            .querySelector(`.rail li[data-room="${id}"]`)
            ?.classList.toggle("active", self.isActive);
        },
      });
    });
    gsap.to(".rail-progress", {
      height: "100%",
      ease: "none",
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "max",
        scrub: 0.4,
      },
    });

    /* ---------- Desktop-only pointer physics ---------- */
    if (desktop) {
      document.body.classList.add("cursor-active");

      // Custom cursor: dot follows instantly, ring lags
      const dot = document.querySelector(".cursor-dot");
      const ring = document.querySelector(".cursor-ring");
      const dotX = gsap.quickTo(dot, "x", { duration: 0.08, ease: "power2" });
      const dotY = gsap.quickTo(dot, "y", { duration: 0.08, ease: "power2" });
      const ringX = gsap.quickTo(ring, "x", { duration: 0.38, ease: "power3" });
      const ringY = gsap.quickTo(ring, "y", { duration: 0.38, ease: "power3" });

      // Hidden until the pointer first moves, so it never sits at 0,0
      window.addEventListener("mousemove", (e) => {
        dotX(e.clientX);
        dotY(e.clientY);
        ringX(e.clientX);
        ringY(e.clientY);
        document.body.classList.add("cursor-ready");
      });
      document.documentElement.addEventListener("mouseleave", () =>
        document.body.classList.remove("cursor-ready")
      );

      document.querySelectorAll("a, button, .card").forEach((el) => {
        el.addEventListener("mouseenter", () =>
          document.body.classList.add("cursor-hover")
        );
        el.addEventListener("mouseleave", () =>
          document.body.classList.remove("cursor-hover")
        );
      });

      // Magnetic buttons
      document.querySelectorAll(".magnetic").forEach((btn) => {
        const xTo = gsap.quickTo(btn, "x", { duration: 0.4, ease: "power3" });
        const yTo = gsap.quickTo(btn, "y", { duration: 0.4, ease: "power3" });
        btn.addEventListener("mousemove", (e) => {
          const r = btn.getBoundingClientRect();
          xTo((e.clientX - (r.left + r.width / 2)) * 0.35);
          yTo((e.clientY - (r.top + r.height / 2)) * 0.35);
        });
        btn.addEventListener("mouseleave", () => {
          xTo(0);
          yTo(0);
        });
      });

      // Card / quote tilt toward cursor
      document.querySelectorAll(".tilt").forEach((el) => {
        const rx = gsap.quickTo(el, "rotationX", { duration: 0.5, ease: "power3" });
        const ry = gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power3" });
        gsap.set(el, { transformPerspective: 800 });
        el.addEventListener("mousemove", (e) => {
          const r = el.getBoundingClientRect();
          ry(((e.clientX - r.left) / r.width - 0.5) * 10);
          rx(-((e.clientY - r.top) / r.height - 0.5) * 10);
        });
        el.addEventListener("mouseleave", () => {
          rx(0);
          ry(0);
        });
      });

      // Cursor-following gold glow per chapter
      document.querySelectorAll("[data-glow]").forEach((section) => {
        section.addEventListener("mousemove", (e) => {
          const r = section.getBoundingClientRect();
          const content = section.querySelector(".chapter-content");
          content?.style.setProperty("--mx", e.clientX - r.left + "px");
          content?.style.setProperty("--my", e.clientY - r.top + "px");
        });
      });
    }

    return () => undo.forEach((fn) => fn());
  }
);

/* ============================================================
   REDUCED MOTION — everything visible, no scroll effects
   ============================================================ */
mm.add("(prefers-reduced-motion: reduce)", () => {
  // The room behind each chapter still changes, as a plain fade with no
  // camera movement. Rooms already passed stay stacked underneath, so the
  // fade never dips to the bare background.
  tour.classList.add("tour--fade");
  scenes.forEach((scene) => scene.classList.remove("is-covered"));
  const show = (upTo) => scenes.forEach((scene, i) => scene.classList.toggle("is-active", i <= upTo));
  scenes.forEach((scene, i) => {
    const next = scenes[i + 1] && chapterOf(scenes[i + 1]);
    ScrollTrigger.create({
      trigger: chapterOf(scene),
      start: i ? "top 60%" : "top bottom",
      endTrigger: next || chapterOf(scene),
      end: next ? "top 60%" : "max",
      onToggle: (self) => {
        if (!self.isActive) return;
        loadScene(scene);
        loadScene(scenes[i + 1]);
        show(i);
      },
    });
  });
  gsap.set(
    ".reveal-line, .chapter-num, .chapter h2, .chapter-copy, .quotes, .hero-ctas, .closer, .stats, .faq-list, .steps-list, .start-card",
    { clearProps: "all", opacity: 1 }
  );
  // Show final counter values immediately
  document.querySelectorAll("[data-count]").forEach((el) => {
    el.textContent = el.dataset.count + (el.dataset.suffix || "");
  });
  return () => {
    tour.classList.remove("tour--fade");
    show(0);
  };
});

/* Header, mobile menu, and call bar: see /js/nav.js */

/* Opening a FAQ changes page height — keep pinned/scrubbed positions true */
document.querySelectorAll(".faq").forEach((d) =>
  d.addEventListener("toggle", () => ScrollTrigger.refresh())
);

/* Once the page has loaded: recalculate positions (images change layout),
   then bring in the rest of the home, one room at a time. On a data-saver
   connection each room waits until the visitor is about to walk into it. */
window.addEventListener("load", () => {
  ScrollTrigger.refresh();
  loadScene(scenes[1]);
  if (!saveData) loadRest(2);
});
