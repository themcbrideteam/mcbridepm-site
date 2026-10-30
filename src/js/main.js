// McBride PM — inner-page scripts
// Header, mobile menu, and call bar: see /js/nav.js. Forms and conversion tracking: see /js/lead.js

document.addEventListener('DOMContentLoaded', () => {
  // FAQ accordion (pages with <button class="faq-question">). Blog posts use
  // plain <div> questions and show every answer, so they're left alone.
  document.querySelectorAll('button.faq-question').forEach(btn => {
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const wasOpen = item.classList.contains('open');

      // Close all
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      document.querySelectorAll('button.faq-question').forEach(b => b.setAttribute('aria-expanded', 'false'));

      // Open clicked (if it wasn't already open)
      if (!wasOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
});
