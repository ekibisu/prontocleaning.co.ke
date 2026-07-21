// ProntoCleaning Solutions — shared site behaviour
document.addEventListener('DOMContentLoaded', () => {

  /* Mobile nav toggle */
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }));
  }

  /* Animated counters (Intersection Observer) */
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        const decimals = el.dataset.count.includes('.') ? 1 : 0;
        let start = 0;
        const duration = 1400;
        const startTime = performance.now();
        function tick(now) {
          const p = Math.min((now - startTime) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          const val = start + (target - start) * eased;
          el.textContent = val.toFixed(decimals) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        io.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(c => io.observe(c));
  }

  /* Fade-in on scroll */
  const fadeEls = document.querySelectorAll('.fade-in');
  if (fadeEls.length) {
    const fio = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); fio.unobserve(e.target); } });
    }, { threshold: 0.15 });
    fadeEls.forEach(el => fio.observe(el));
  }

  /* Gallery filter */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item');
  if (filterBtns.length) {
    filterBtns.forEach(btn => btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.filter;
      galleryItems.forEach(item => {
        const show = cat === 'all' || item.dataset.category === cat;
        item.style.display = show ? '' : 'none';
      });
    }));
  }

  /* Lightbox */
  const lightbox = document.querySelector('.lightbox');
  if (lightbox) {
    const lightboxBody = lightbox.querySelector('.lightbox-body');
    document.querySelectorAll('.gallery-item').forEach(item => {
      item.addEventListener('click', () => {
        const title = item.dataset.title || '';
        const desc = item.dataset.desc || '';
        const art = item.querySelector('.art-block');
        const isPhoto = art && art.classList.contains('gallery-photo');
        lightboxBody.innerHTML = `
          <div class="art-block${isPhoto ? ' gallery-photo' : ''}" style="aspect-ratio:16/10; border-radius:0;">${art ? art.innerHTML : ''}</div>
          <div style="padding:24px;">
            <h3 style="margin-bottom:6px;">${title}</h3>
            <p class="muted" style="margin:0;">${desc}</p>
          </div>`;
        lightbox.classList.add('open');
        lightbox.setAttribute('aria-hidden', 'false');
      });
    });
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.closest('.lightbox-close')) {
        lightbox.classList.remove('open');
        lightbox.setAttribute('aria-hidden', 'true');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { lightbox.classList.remove('open'); lightbox.setAttribute('aria-hidden', 'true'); }
    });
  }

  /* Scroll to top */
  const toTop = document.querySelector('.to-top');
  if (toTop) {
    window.addEventListener('scroll', () => {
      toTop.classList.toggle('show', window.scrollY > 500);
    });
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* Quote request form -> Cloudflare Worker (/api/quote) -> Resend email */
  const quoteForm = document.querySelector('#quote-form');
  if (quoteForm) {
    quoteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = quoteForm.querySelector('button[type="submit"]');
      const successNote = quoteForm.querySelector('.form-success');
      const errorNote = quoteForm.querySelector('.form-error');
      const originalBtnText = submitBtn.textContent;

      if (successNote) successNote.hidden = true;
      if (errorNote) errorNote.hidden = true;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      try {
        const formData = new FormData(quoteForm);
        const res = await fetch('/api/quote', { method: 'POST', body: formData });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Something went wrong. Please try again or call us directly.');
        }

        if (successNote) {
          successNote.hidden = false;
          successNote.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        quoteForm.reset();
      } catch (err) {
        if (errorNote) {
          errorNote.hidden = false;
          errorNote.textContent = '⚠ ' + (err.message || 'Something went wrong. Please try again or call us directly.');
          errorNote.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  }

  /* Basic form handling for remaining demo forms (e.g. newsletter) — no backend wired up */
  document.querySelectorAll('form[data-demo-form]').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const note = form.querySelector('.form-success');
      if (note) {
        note.hidden = false;
        form.querySelectorAll('input,select,textarea').forEach(f => f.value = '');
        note.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });

  /* Newsletter form */
  document.querySelectorAll('.newsletter').forEach(nf => {
    nf.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = nf.querySelector('button');
      const original = btn.textContent;
      btn.textContent = 'Subscribed ✓';
      setTimeout(() => { btn.textContent = original; nf.reset(); }, 2500);
    });
  });
});