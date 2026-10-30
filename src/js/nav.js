/* McBride PM — site header behavior (every page): dropdowns, the mobile
   menu, hide-on-scroll, and the mobile call bar. Plain JS, no GSAP. */
(function () {
  "use strict";

  var root = document.documentElement;
  var nav = document.getElementById("nav");
  if (!nav) return;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  /* ---------- Dropdowns: hover on desktop (CSS), click/Enter/Escape everywhere ---------- */
  var drops = nav.querySelectorAll("[data-drop]");
  var setDrop = function (drop, open) {
    drop.classList.toggle("is-open", open);
    drop.querySelector(".nav-drop-btn").setAttribute("aria-expanded", String(open));
  };
  var closeDrops = function (except) {
    each(drops, function (d) { if (d !== except) setDrop(d, false); });
  };
  each(drops, function (drop) {
    var btn = drop.querySelector(".nav-drop-btn");
    btn.addEventListener("click", function () {
      var open = !drop.classList.contains("is-open");
      closeDrops(drop);
      setDrop(drop, open);
    });
    // Escape closes it even with the mouse still over it (hover is muted until the pointer leaves)
    drop.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      setDrop(drop, false);
      drop.classList.add("no-hover");
      btn.focus();
    });
    drop.addEventListener("mouseleave", function () { drop.classList.remove("no-hover"); });
    drop.addEventListener("focusout", function (e) {
      if (!drop.contains(e.relatedTarget)) setDrop(drop, false);
    });
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest || !e.target.closest("[data-drop]")) closeDrops();
  });

  /* ---------- Mobile menu ---------- */
  var burger = nav.querySelector(".nav-burger");
  var menu = document.getElementById("mobile-menu");
  var setMenu = function (open) {
    root.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  if (burger && menu) {
    burger.addEventListener("click", function () { setMenu(!root.classList.contains("menu-open")); });
    each(menu.querySelectorAll("a"), function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && root.classList.contains("menu-open")) { setMenu(false); burger.focus(); }
    });
    // Back on a desktop-width screen, the menu has nothing to cover
    matchMedia("(min-width: 1024px)").addEventListener("change", function (m) { if (m.matches) setMenu(false); });
  }

  /* ---------- Header: solid once scrolled, hidden while scrolling down ---------- */
  var lastY = window.scrollY;
  var ticking = false;
  var onScroll = function () {
    var y = window.scrollY;
    nav.classList.toggle("is-solid", y > 10);
    var busy = root.classList.contains("menu-open") || nav.querySelector(".nav-drop.is-open");
    if (!busy) nav.classList.toggle("nav-hidden", y > 80 && y > lastY);
    lastY = y;
    ticking = false;
  };
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  nav.addEventListener("focusin", function () { nav.classList.remove("nav-hidden"); });
  onScroll();

  /* ---------- Mobile call bar ----------
     Shows once the visitor has scrolled half a screen, unless something
     marked data-sticky-hide (a page's own CTA or form) or the footer is on
     screen. */
  var sticky = document.querySelector(".sticky-cta");
  if (sticky && "IntersectionObserver" in window) {
    var onScreen = [];
    var update = function () {
      sticky.classList.toggle("is-visible", window.scrollY > window.innerHeight * 0.5 && onScreen.length === 0);
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var i = onScreen.indexOf(en.target);
        if (en.isIntersecting && i === -1) onScreen.push(en.target);
        if (!en.isIntersecting && i > -1) onScreen.splice(i, 1);
      });
      update();
    });
    each(document.querySelectorAll("[data-sticky-hide], .footer"), function (el) { io.observe(el); });
    window.addEventListener("scroll", update, { passive: true });
  }
})();
