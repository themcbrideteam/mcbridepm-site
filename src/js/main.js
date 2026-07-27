// McBride PM — Site Scripts

// Mobile nav toggle
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      const open = navLinks.classList.toggle('active');
      hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Mobile dropdowns
  document.querySelectorAll('.dropdown > a').forEach(link => {
    link.addEventListener('click', (e) => {
      if (window.innerWidth <= 1024) {
        e.preventDefault();
        link.parentElement.classList.toggle('open');
      }
    });
  });

  // Close mobile nav on link click
  document.querySelectorAll('.nav-links a:not(.dropdown > a)').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 1024) {
        navLinks.classList.remove('active');
      }
    });
  });

  // FAQ accordion
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const wasOpen = item.classList.contains('open');

      // Close all
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      document.querySelectorAll('.faq-question').forEach(b => b.setAttribute('aria-expanded', 'false'));

      // Open clicked (if it wasn't already open)
      if (!wasOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // Netlify form submission + GA4 lead event
  document.querySelectorAll('form[data-netlify]').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Sending...';

      const data = new FormData(form);
      if (!data.get('form-name')) {
        data.set('form-name', form.getAttribute('name') || '');
      }

      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(data).toString()
      })
        .then((res) => {
          if (!res.ok) throw new Error('Form submit failed: ' + res.status);
          if (typeof gtag === 'function') {
            gtag('event', 'generate_lead', {
              form_name: form.getAttribute('name') || 'unknown',
              page_location: window.location.href
            });
          }
          btn.textContent = "Submitted! We'll be in touch.";
          btn.style.background = '#060644';
          form.reset();
          setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
            btn.disabled = false;
          }, 5000);
        })
        .catch(() => {
          btn.textContent = 'Something went wrong — please call (706) 339-2874';
          btn.disabled = false;
          setTimeout(() => {
            btn.textContent = originalText;
          }, 6000);
        });
    });
  });

  // GA4 phone-call click tracking
  document.querySelectorAll('a[href^="tel:"]').forEach(link => {
    link.addEventListener('click', () => {
      if (typeof gtag === 'function') {
        gtag('event', 'phone_call_click', {
          phone_number: link.getAttribute('href').replace('tel:', ''),
          page_location: window.location.href
        });
      }
    });
  });

  // Sticky nav shadow
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 10) {
        navbar.style.boxShadow = '0 2px 16px rgba(0,0,0,.1)';
      } else {
        navbar.style.boxShadow = '0 2px 12px rgba(0,0,0,.06)';
      }
    }, { passive: true });
  }
});
