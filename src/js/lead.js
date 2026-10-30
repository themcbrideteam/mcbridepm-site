/* McBride PM — lead capture + conversion tracking (every page).
   Netlify strips data-netlify from published HTML, so forms are found by
   their hidden form-name input, never by [data-netlify]. */
(function () {
  "use strict";

  var track = function (name, params) {
    if (typeof gtag === "function") gtag("event", name, params || {});
  };

  /* ---------- Lead source: first touch per session + latest UTM ---------- */
  var qs = new URLSearchParams(location.search);
  var source = {};
  try { source = JSON.parse(sessionStorage.getItem("mpm_source") || "{}"); } catch (e) {}
  if (!source.landing) {
    source.landing = location.pathname;
    var ref = document.referrer;
    source.referrer = ref && ref.indexOf(location.host) === -1 ? ref : "direct";
  }
  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"].forEach(function (k) {
    if (qs.get(k)) source[k] = qs.get(k);
  });
  try { sessionStorage.setItem("mpm_source", JSON.stringify(source)); } catch (e) {}
  var sourceText = Object.keys(source).map(function (k) { return k + "=" + source[k]; }).join(" | ");

  /* ---------- Netlify forms: AJAX submit with an on-page success state ---------- */
  var forms = document.querySelectorAll('form input[name="form-name"]');
  Array.prototype.forEach.call(forms, function (marker) {
    var form = marker.form;
    var set = function (name, value) {
      var el = form.querySelector('[name="' + name + '"]');
      if (el && !el.value) el.value = value;
    };
    set("page", location.pathname);
    set("source", sourceText);
    if (qs.get("address")) set("address", qs.get("address"));

    var started = false;
    form.addEventListener("input", function () {
      if (started) return;
      started = true;
      track("form_start", { form_name: form.getAttribute("name") });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = form.querySelector('[type="submit"]');
      var label = btn ? btn.textContent : "";
      var error = form.querySelector(".lead-error, [data-error]");
      if (error) error.hidden = true;
      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }

      var data = new FormData(form);
      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(data).toString(),
      })
        .then(function (res) {
          if (!res.ok) throw new Error("Form submit failed: " + res.status);
          track("generate_lead", {
            form_name: form.getAttribute("name"),
            lead_situation: data.get("situation") || "",
            page_location: location.href,
          });
          var success = form.parentElement.querySelector("[data-success]");
          if (success) {
            var first = (data.get("fullName") || data.get("agentName") || "").trim().split(/\s+/)[0];
            var slot = success.querySelector("[data-first-name]");
            if (slot && first) slot.textContent = ", " + first;
            form.hidden = true;
            success.hidden = false;
            success.focus();
          } else if (form.getAttribute("action")) {
            location.href = form.getAttribute("action");
          } else if (btn) {
            btn.textContent = "Sent — we'll be in touch.";
          }
        })
        .catch(function () {
          if (btn) { btn.disabled = false; btn.textContent = label; }
          if (error) error.hidden = false;
          else alert("Something went wrong. Please call (706) 339-2874.");
        });
    });
  });

  /* ---------- Homepage hero: one field, then the full form ---------- */
  var start = document.querySelector("[data-address-start]");
  var handoff = document.getElementById("handoff");
  if (start && handoff) {
    start.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = start.querySelector('[name="address"]').value.trim();
      var target = handoff.querySelector('.lead-form [name="address"]');
      if (target && value) target.value = value;
      track("lead_start", { form_name: "hero-address" });
      handoff.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      var next = handoff.querySelector('.lead-form [name="fullName"]');
      if (next) setTimeout(function () { next.focus({ preventScroll: true }); }, 900);
    });
  }

  /* ---------- Click conversions ---------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    var href = a.getAttribute("href");
    if (href.indexOf("tel:") === 0) {
      track("phone_call_click", { phone_number: href.slice(4), page_location: location.href });
    } else if (href.indexOf("mailto:") === 0) {
      track("email_click", { email: href.slice(7), page_location: location.href });
    } else if (/\/rentals\/?$|appfolio\.com\/listings/.test(href)) {
      track("rentals_click", { link_url: href, page_location: location.href });
    } else if (/appfolio\.com\/(oportal|connect)/.test(href)) {
      track("portal_click", { portal: href.indexOf("oportal") > -1 ? "owner" : "resident" });
    }
  });
})();
