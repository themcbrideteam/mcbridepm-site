/* McBride PM — cinematic walkthrough prototype
   GSAP 3 + ScrollTrigger. Reduced-motion visitors get the static page. */

gsap.registerPlugin(ScrollTrigger);

const mm = gsap.matchMedia();

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

    /* ---------- Hero entrance ---------- */
    gsap.from(".hero .reveal-line", {
      y: 60,
      opacity: 0,
      duration: 1.1,
      ease: "power3.out",
      stagger: 0.12,
      delay: 0.2,
    });

    /* ---------- The walkthrough: one video, the whole page ----------
       A fixed full-screen video sits behind every chapter. On desktop,
       total page scroll drives video.currentTime — the visitor walks the
       condensed Rosewood tour from the hero to the final CTA. On mobile
       (or if the scrub encode fails) it plays as a gentle loop instead. */
    const stageVideo = document.querySelector(".video-stage video");
    const FULL_SRC = "assets/video/rosewood-tour.mp4";
    const MOBILE_SRC = "assets/video/rosewood-tour-mobile.mp4";

    function initGlobalScrub(video) {
      video.pause();
      const proxy = { t: 0 };
      gsap.to(proxy, {
        t: () => video.duration || 0,
        ease: "none",
        scrollTrigger: {
          trigger: "main",
          start: "top top",
          end: "max", // full document scroll, pin spacers included
          scrub: 1.2, // heavier easing so the playhead glides instead of stepping
          invalidateOnRefresh: true,
        },
        onUpdate: () => {
          if (video.readyState >= 2) video.currentTime = proxy.t;
        },
      });
    }

    function playAsLoop(video, src) {
      const source = video.querySelector("source");
      if (src) {
        source.addEventListener(
          "error",
          () => {
            source.src = FULL_SRC;
            video.load();
            video.play().catch(() => {});
          },
          { once: true }
        );
        source.src = src;
        video.load();
      }
      video.loop = true;
      video.play().catch(() => {});
    }

    if (stageVideo) {
      // Every device scrubs. Phones load the light 720p dense-keyframe
      // encode; scrubbing avoids mobile autoplay policies entirely.
      const source = stageVideo.querySelector("source");
      let fellBack = false;
      const fallBack = () => {
        if (fellBack) return;
        fellBack = true;
        playAsLoop(stageVideo, FULL_SRC);
      };
      stageVideo.addEventListener("error", fallBack, { once: true });
      source.addEventListener("error", fallBack, { once: true });
      stageVideo.addEventListener(
        "loadedmetadata",
        () => !fellBack && initGlobalScrub(stageVideo),
        { once: true }
      );
      if (!desktop) {
        source.src = MOBILE_SRC;
        stageVideo.load();
        // iOS won't paint seeked frames until the video has "played" once:
        // a muted play/pause on first touch unlocks frame rendering.
        window.addEventListener(
          "touchstart",
          () => {
            if (fellBack) return;
            const t = stageVideo.currentTime;
            stageVideo
              .play()
              .then(() => {
                stageVideo.pause();
                stageVideo.currentTime = t;
              })
              .catch(() => {});
          },
          { once: true, passive: true }
        );
      } else if (stageVideo.readyState >= 1 && !fellBack) {
        initGlobalScrub(stageVideo);
      }
    }

    // Hero copy dissolves as the visitor starts walking
    gsap.to(".hero .chapter-content, .scroll-cue", {
      opacity: 0,
      y: -60,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "60% top", scrub: true },
    });

    /* ---------- Chapter walk-in effect (Ken Burns scrub per room) ---------- */
    document.querySelectorAll(".chapter:not(.hero)").forEach((chapter) => {
      const bg = chapter.querySelector(".chapter-bg img, .chapter-bg video");
      if (bg) {
        gsap.fromTo(
          bg,
          { scale: 1.22, yPercent: -4 },
          {
            scale: 1,
            yPercent: 0,
            ease: "none",
            scrollTrigger: {
              trigger: chapter,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.6,
            },
          }
        );
      }

      const content = chapter.querySelectorAll(
        ".chapter-num, h2, .chapter-copy, .quote, .hero-ctas, .closer, .journal-grid, .chapter-content > .link-arrow"
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

    /* ---------- Horizontal services track (desktop only) ---------- */
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

    /* ---------- Journey rail ---------- */
    const rooms = ["curb", "door", "living", "office", "study", "handoff"];
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

    /* ---------- Nav: hide on scroll down, show on scroll up ---------- */
    const nav = document.getElementById("nav");
    ScrollTrigger.create({
      start: "top -80",
      end: "max",
      onUpdate: (self) => {
        nav.classList.toggle("nav-hidden", self.direction === 1);
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

      window.addEventListener("mousemove", (e) => {
        dotX(e.clientX);
        dotY(e.clientY);
        ringX(e.clientX);
        ringY(e.clientY);
      });

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
  }
);

/* ============================================================
   REDUCED MOTION — everything visible, no scroll effects
   ============================================================ */
mm.add("(prefers-reduced-motion: reduce)", () => {
  // Stop the hero video; its poster frame (Rosewood at twilight) shows instead
  document.querySelectorAll("video[autoplay]").forEach((v) => {
    v.pause();
    v.removeAttribute("autoplay");
  });
  gsap.set(
    ".reveal-line, .chapter-num, .chapter h2, .chapter-copy, .quote, .hero-ctas, .closer, .stats",
    { clearProps: "all", opacity: 1 }
  );
  // Show final counter values immediately
  document.querySelectorAll("[data-count]").forEach((el) => {
    el.textContent = el.dataset.count + (el.dataset.suffix || "");
  });
});

/* ============================================================
   MOBILE MENU — plain JS, runs regardless of motion preference
   ============================================================ */
const burger = document.querySelector(".nav-burger");
if (burger) {
  const setMenu = (open) => {
    document.documentElement.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  burger.addEventListener("click", () =>
    setMenu(!document.documentElement.classList.contains("menu-open"))
  );
  document
    .querySelectorAll(".mobile-menu a")
    .forEach((a) => a.addEventListener("click", () => setMenu(false)));
}

/* Recalculate positions once images have loaded (they change layout) */
window.addEventListener("load", () => ScrollTrigger.refresh());
