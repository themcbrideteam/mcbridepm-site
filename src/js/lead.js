/* McBride PM — lead capture + conversion tracking (every page).
   Netlify strips data-netlify from published HTML, so forms are found by
   their hidden form-name input, never by [data-netlify]. */
(function () {
  "use strict";

  var track = function (name, params) {
    if (typeof gtag === "function") gtag("event", name, params || {});
  };
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

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

  /* ---------- Inline validation (forms marked novalidate) ----------
     Checks the visible required fields, shows the message tied to each by
     aria-describedby, and focuses the first problem. */
  var fieldError = function (el) {
    var id = el.getAttribute("aria-describedby");
    return id ? document.getElementById(id) : null;
  };
  var setInvalid = function (el, bad) {
    var msg = fieldError(el);
    if (bad) el.setAttribute("aria-invalid", "true");
    else el.removeAttribute("aria-invalid");
    if (msg) msg.hidden = !bad;
  };
  var isValid = function (el) {
    var value = el.value.trim();
    if (el.required && !value) return false;
    if (el.minLength > 0 && value && value.length < el.minLength) return false;
    if (el.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return false;
    return true;
  };
  var validate = function (scope) {
    var first = null;
    each(scope.querySelectorAll("input[required]"), function (el) {
      if (el.closest("[hidden]")) return;
      var ok = isValid(el);
      setInvalid(el, !ok);
      if (!ok && !first) first = el;
    });
    if (first) first.focus();
    return !first;
  };
  each(document.querySelectorAll("form[novalidate] input[required]"), function (el) {
    el.addEventListener("input", function () {
      if (el.getAttribute("aria-invalid") && isValid(el)) setInvalid(el, false);
    });
  });

  /* ---------- Netlify forms: AJAX submit with an on-page success state ---------- */
  var forms = document.querySelectorAll('form input[name="form-name"]');
  each(forms, function (marker) {
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
      if (form.noValidate && !validate(form)) return;
      var btn = form.querySelector('[type="submit"]');
      var label = btn ? btn.innerHTML : "";
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
            cta: form.dataset.cta || "",
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
            form.dispatchEvent(new CustomEvent("lead:success", { bubbles: true }));
          } else if (form.getAttribute("action")) {
            location.href = form.getAttribute("action");
          } else if (btn) {
            btn.textContent = "Sent — we'll be in touch.";
          }
        })
        .catch(function () {
          if (btn) { btn.disabled = false; btn.innerHTML = label; }
          if (error) error.hidden = false;
          else alert("Something went wrong. Please call (706) 339-2874.");
        });
    });
  });

  /* ---------- Homepage: two-step rental-analysis dialog ----------
     Step 1 asks for the address, step 2 for contact details. The hero and
     Handoff address boxes skip straight to step 2; every other "Free Rental
     Analysis" button ([data-open-lead]) starts at step 1. */
  var dialog = document.getElementById("lead-dialog");
  if (dialog && typeof dialog.showModal === "function") {
    var dForm = dialog.querySelector(".lead-form");
    var steps = dialog.querySelectorAll(".ld-step");
    var progress = dialog.querySelectorAll(".ld-progress li");
    var address = dForm.querySelector('[name="address"]');
    var sourceInput = dForm.querySelector('[name="source"]');
    var echo = dialog.querySelector("[data-address-echo]");
    var opener = null;

    var showStep = function (n) {
      each(steps, function (s) { s.hidden = +s.dataset.step !== n; });
      each(progress, function (li, i) { li.classList.toggle("is-on", i < n); });
      if (n === 2) echo.textContent = address.value.trim();
      var target = n === 1 ? address : dForm.querySelector('[name="fullName"]');
      // Wait a frame so the step is visible before moving focus into it
      requestAnimationFrame(function () { target.focus(); });
    };

    var open = function (cta, value) {
      if (value) address.value = value;
      dForm.dataset.cta = cta;
      sourceInput.value = sourceText + " | cta=" + cta;
      opener = document.activeElement;
      document.documentElement.classList.add("dialog-open");
      dialog.showModal();
      if (!dForm.hidden) showStep(address.value.trim() && isValid(address) ? 2 : 1);
      track("lead_dialog_open", { cta: cta });
    };

    dialog.addEventListener("close", function () {
      document.documentElement.classList.remove("dialog-open");
      if (opener && opener.focus) opener.focus({ preventScroll: true });
    });
    each(dialog.querySelectorAll("[data-dialog-close]"), function (b) {
      b.addEventListener("click", function () { dialog.close(); });
    });
    // A click on the backdrop lands on the <dialog> itself, not its contents
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });

    var next = function () {
      if (!validate(dialog.querySelector('.ld-step[data-step="1"]'))) return;
      track("lead_step_complete", { step: 1, cta: dForm.dataset.cta || "" });
      showStep(2);
    };
    dialog.querySelector("[data-next]").addEventListener("click", next);
    address.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); next(); }
    });
    dialog.querySelector("[data-back]").addEventListener("click", function () { showStep(1); });
    dForm.addEventListener("lead:success", function () {
      each(progress, function (li) { li.classList.add("is-on"); });
    });

    // Inner pages' own "…Rental Analysis" buttons link to /contact/; they open
    // the dialog too, so no visitor has to load another page to ask
    each(document.querySelectorAll('main a[href="/contact/"]'), function (a) {
      if (!a.hasAttribute("data-open-lead") && /rental analysis/i.test(a.textContent)) a.dataset.openLead = "inline";
    });
    each(document.querySelectorAll("[data-open-lead]"), function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        open(el.dataset.openLead);
      });
    });
    each(document.querySelectorAll("[data-address-start]"), function (start) {
      start.addEventListener("submit", function (e) {
        e.preventDefault();
        var value = start.querySelector('[name="address"]').value.trim();
        if (value) track("lead_start", { cta: start.dataset.addressStart });
        open(start.dataset.addressStart, value);
      });
    });
    // Ads and emails can link straight to the form: mcbride-pm.com/#rental-analysis
    if (location.hash === "#rental-analysis") open("link");
  } else {
    // /contact/ has the form inline instead of the dialog: the header and
    // menu buttons bring the visitor to it rather than reloading the page
    var marker = document.querySelector('form input[name="form-name"][value="rental-analysis"]');
    if (marker) {
      each(document.querySelectorAll("[data-open-lead]"), function (el) {
        el.addEventListener("click", function (e) {
          e.preventDefault();
          var first = marker.form.querySelector('input:not([type="hidden"]):not([name="bot-field"])');
          marker.form.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
          if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 500);
        });
      });
    }
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
