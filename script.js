// Baraniki homepage scripts
(function () {
  'use strict';

  // ---- REVIEWS SETTINGS ----
  // Set this to the address of your reviews backend (see the notes that came with this file).
  //   GET  REVIEWS_API  -> returns the APPROVED reviews: [{ "name": "Jane", "area": "Kikuyu", "rating": 5, "text": "...", "date": "2026-11-15" }]
  //   POST REVIEWS_API  -> receives { rating, name, area, text, order, website } and saves it as PENDING (not public until you approve it)
  var REVIEWS_API = '';

  // ---- Hero photo carousel: arrow buttons, loops at both ends ----
  var track = document.querySelector('[data-hero-scroller]');
  if (track) {
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var behavior = reduceMotion ? 'auto' : 'smooth';

    function go(dir) {
      var atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      var atStart = track.scrollLeft <= 4;

      if (dir > 0 && atEnd) {
        track.scrollTo({ left: 0, behavior: behavior });
      } else if (dir < 0 && atStart) {
        track.scrollTo({ left: track.scrollWidth, behavior: behavior });
      } else {
        track.scrollBy({ left: dir * track.clientWidth, behavior: behavior });
      }
    }

    document.querySelectorAll('[data-hero-dir]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        go(Number(btn.getAttribute('data-hero-dir')));
      });
    });

    // Left/right arrow keys work when the carousel has focus
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
  }

  // ---- Search: don't submit an empty search ----
  var form = document.querySelector('[data-search-form]');
  if (form) {
    form.addEventListener('submit', function (e) {
      var input = form.querySelector('input[type="search"]');
      if (input && !input.value.trim()) {
        e.preventDefault();
        input.focus();
      }
    });
  }

  // ---- Customer reviews (real submissions only, nothing is made up here) ----
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function starRow(rating) {
    var row = document.createElement('span');
    row.className = 'stars';
    row.setAttribute('role', 'img');
    row.setAttribute('aria-label', rating + ' out of 5 stars');
    for (var i = 1; i <= 5; i++) {
      var svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('class', 'star' + (i <= Math.round(rating) ? ' on' : ''));
      svg.setAttribute('aria-hidden', 'true');
      var poly = document.createElementNS(SVG_NS, 'polygon');
      poly.setAttribute('points', '12 2 15.1 8.6 22 9.3 16.8 14 18.2 21 12 17.5 5.8 21 7.2 14 2 9.3 8.9 8.6');
      svg.appendChild(poly);
      row.appendChild(svg);
    }
    return row;
  }

  function renderReviews(reviews) {
    var wrap = document.querySelector('[data-reviews]');
    var list = document.querySelector('[data-review-list]');
    var summary = document.querySelector('[data-review-summary]');
    if (!wrap || !list || !summary || !reviews.length) return;

    list.textContent = '';
    var total = 0;
    reviews.forEach(function (r) {
      var rating = Math.min(5, Math.max(1, Number(r.rating) || 0));
      total += rating;

      var card = document.createElement('article');
      card.className = 'card review-card';

      var text = document.createElement('p');
      text.textContent = String(r.text || '');

      var who = document.createElement('div');
      who.className = 'review-who';
      var name = document.createElement('b');
      name.textContent = String(r.name || 'Customer');
      var where = document.createElement('span');
      where.className = 'muted';
      where.textContent = String(r.area || '');
      who.appendChild(name);
      who.appendChild(where);

      card.appendChild(starRow(rating));
      card.appendChild(text);
      card.appendChild(who);
      list.appendChild(card);
    });

    var avg = total / reviews.length;
    summary.querySelector('[data-review-avg]').textContent = avg.toFixed(1);
    var starsBox = summary.querySelector('[data-review-stars]');
    starsBox.textContent = '';
    starsBox.appendChild(starRow(avg));
    summary.querySelector('[data-review-count]').textContent =
      'Based on ' + reviews.length + (reviews.length === 1 ? ' review' : ' reviews');
    summary.hidden = false;
    wrap.classList.add('has-reviews');
  }

  if (REVIEWS_API) {
    fetch(REVIEWS_API, { headers: { Accept: 'application/json' } })
      .then(function (res) { return res.ok ? res.json() : []; })
      .then(function (data) { renderReviews(Array.isArray(data) ? data : (data.reviews || [])); })
      .catch(function () { /* keep the "No reviews yet" message */ });
  }

  var dialog = document.getElementById('review-dialog');
  var reviewForm = document.querySelector('[data-review-form]');
  var status = document.querySelector('[data-review-status]');

  function setStatus(message, kind) {
    status.textContent = message;
    status.className = 'form-status' + (kind ? ' ' + kind : '');
  }

  if (dialog && reviewForm) {
    document.querySelectorAll('[data-open-review]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setStatus('');
        if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
      });
    });
    document.querySelectorAll('[data-close-review]').forEach(function (btn) {
      btn.addEventListener('click', function () { dialog.close(); });
    });

    reviewForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = new FormData(reviewForm);
      var review = {
        rating: Number(f.get('rating')) || 0,
        name: String(f.get('name') || '').trim(),
        area: String(f.get('area') || '').trim(),
        text: String(f.get('text') || '').trim(),
        order: String(f.get('order') || '').trim(),
        website: String(f.get('website') || '')
      };

      if (!review.rating) { setStatus('Please choose a star rating.', 'error'); return; }
      if (!review.name) { setStatus('Please enter your name.', 'error'); return; }
      if (review.text.length < 10) { setStatus('Please write at least a short sentence about your experience.', 'error'); return; }
      if (review.website) { return; } // spam trap was filled in by a bot
      if (!REVIEWS_API) { setStatus('Reviews are not connected yet, so this could not be sent.', 'error'); return; }

      setStatus('Sending...');
      fetch(REVIEWS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(review)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('bad response');
          reviewForm.reset();
          setStatus('Thank you! Your review will appear after we check it.', 'ok');
        })
        .catch(function () {
          setStatus('Something went wrong and your review was not sent. Please try again.', 'error');
        });
    });
  }

  // ---- Footer year ----
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
