/* Property listings client — reads from /properties.json (no backend required).
   Used by /properties.html, /fr/properties.html, /ar/properties.html. */
(function () {
  'use strict';

  const lang = (document.documentElement.lang || 'en').toLowerCase().slice(0, 2);

  const I18N = {
    en: {
      results: (n) => `${n} ${n === 1 ? 'property' : 'properties'}`,
      bd: 'bd', ba: 'ba', sqm: 'm²',
      featured: 'Featured', offplan: 'Off-plan', ready: 'Ready', sold: 'Sold', rented: 'Rented',
      details: 'View details', loading: 'Loading…',
      error: 'Could not load properties. Please refresh.',
    },
    fr: {
      results: (n) => `${n} ${n === 1 ? 'bien' : 'biens'}`,
      bd: 'ch', ba: 'sdb', sqm: 'm²',
      featured: 'En vedette', offplan: 'Sur plan', ready: 'Prêt', sold: 'Vendu', rented: 'Loué',
      details: 'Voir le détail', loading: 'Chargement…',
      error: 'Impossible de charger les biens. Rafraîchissez la page.',
    },
    ar: {
      results: (n) => `${n} ${n === 1 ? 'عقار' : 'عقارات'}`,
      bd: 'غرف', ba: 'حمام', sqm: 'م²',
      featured: 'مميّز', offplan: 'قيد الإنشاء', ready: 'جاهز', sold: 'مباع', rented: 'مؤجر',
      details: 'عرض التفاصيل', loading: 'جارٍ التحميل…',
      error: 'تعذّر تحميل العقارات. حدّث الصفحة.',
    },
  };
  const t = I18N[lang] || I18N.en;

  const localeTag = lang === 'ar' ? 'ar-MA' : (lang === 'fr' ? 'fr-MA' : 'en-US');
  const fmtPrice = new Intl.NumberFormat(localeTag, { maximumFractionDigits: 0 });

  const grid = document.getElementById('listings-grid');
  const empty = document.getElementById('empty-state');
  const resultsCount = document.getElementById('results-count');
  const filtersForm = document.getElementById('filters');
  const resetBtn = document.getElementById('reset-filters');

  const detailHref = 'property.html';

  // Resolve /properties.json correctly whether the page lives at /, /fr/ or /ar/
  const isLocalized = /\/(fr|ar)\//.test(window.location.pathname);
  const dataUrl = (isLocalized ? '../' : '') + 'properties.json';

  resultsCount.textContent = t.loading;

  let allProps = [];

  function statusLabel(s) {
    if (s === 'off-plan') return t.offplan;
    if (s === 'ready') return t.ready;
    if (s === 'sold') return t.sold;
    if (s === 'rented') return t.rented;
    return s;
  }
  function pickTitle(p) {
    if (lang === 'fr' && p.titleFr) return p.titleFr;
    if (lang === 'ar' && p.titleAr) return p.titleAr;
    return p.title;
  }

  function applyFilters() {
    const fd = new FormData(filtersForm);
    const city = (fd.get('city') || '').toString();
    const propertyType = (fd.get('propertyType') || '').toString();
    const status = (fd.get('status') || '').toString();
    const minBd = Number(fd.get('minBedrooms')) || 0;
    const minPrice = Number(fd.get('minPrice')) || 0;
    const maxPrice = Number(fd.get('maxPrice')) || 0;

    return allProps.filter((p) => {
      if (!p.published) return false;
      if (city && p.city !== city) return false;
      if (propertyType && p.propertyType !== propertyType) return false;
      if (status && p.status !== status) return false;
      if (minBd && (p.bedrooms || 0) < minBd) return false;
      if (minPrice && (p.price || 0) < minPrice) return false;
      if (maxPrice && (p.price || 0) > maxPrice) return false;
      return true;
    });
  }

  function render() {
    const rows = applyFilters();
    grid.innerHTML = '';
    if (!rows.length) {
      empty.hidden = false;
      resultsCount.textContent = t.results(0);
      return;
    }
    empty.hidden = true;
    resultsCount.textContent = t.results(rows.length);

    const frag = document.createDocumentFragment();
    rows.forEach((p) => {
      const card = document.createElement('article');
      card.className = 'property-card';

      const link = document.createElement('a');
      link.className = 'card-link';
      link.href = `${detailHref}?slug=${encodeURIComponent(p.slug)}`;
      link.setAttribute('aria-label', `${pickTitle(p)} — ${t.details}`);

      const imgWrap = document.createElement('div');
      imgWrap.className = 'img-wrap';
      const firstImg = Array.isArray(p.images) && p.images[0] ? p.images[0] : null;
      if (firstImg) {
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.decoding = 'async';
        img.alt = pickTitle(p);
        img.src = firstImg;
        imgWrap.appendChild(img);
      }
      if (p.featured) {
        const b = document.createElement('span');
        b.className = 'badge featured';
        b.textContent = t.featured;
        imgWrap.appendChild(b);
      } else if (p.status && p.status !== 'ready') {
        const b = document.createElement('span');
        b.className = 'badge';
        b.textContent = statusLabel(p.status);
        imgWrap.appendChild(b);
      }
      link.appendChild(imgWrap);

      const body = document.createElement('div');
      body.className = 'body';
      const cityLine = [p.city, p.neighborhood].filter(Boolean).join(' · ');
      body.innerHTML = `
        <div class="city">${cityLine}</div>
        <h3>${pickTitle(p)}</h3>
        <div class="price">${fmtPrice.format(p.price)} <span style="font-size:.7em;opacity:.6;">MAD</span></div>
        <div class="specs">
          ${p.bedrooms ? `<span><strong>${p.bedrooms}</strong> ${t.bd}</span>` : ''}
          ${p.bathrooms ? `<span><strong>${p.bathrooms}</strong> ${t.ba}</span>` : ''}
          ${p.areaSqm ? `<span><strong>${p.areaSqm}</strong> ${t.sqm}</span>` : ''}
        </div>
      `;
      link.appendChild(body);
      card.appendChild(link);
      frag.appendChild(card);
    });
    grid.appendChild(frag);
  }

  function populateFacets() {
    const cityEl = document.getElementById('f-city');
    const typeEl = document.getElementById('f-type');
    const cities = Array.from(new Set(allProps.filter((p) => p.published && p.city).map((p) => p.city))).sort();
    const types = Array.from(new Set(allProps.filter((p) => p.published && p.propertyType).map((p) => p.propertyType))).sort();
    cities.forEach((c) => {
      const o = document.createElement('option');
      o.value = c; o.textContent = c;
      cityEl.appendChild(o);
    });
    types.forEach((c) => {
      const o = document.createElement('option');
      o.value = c; o.textContent = c;
      typeEl.appendChild(o);
    });
  }

  filtersForm.addEventListener('change', render);
  filtersForm.addEventListener('input', (e) => {
    if (e.target.tagName === 'INPUT') {
      clearTimeout(window.__listingsDebounce);
      window.__listingsDebounce = setTimeout(render, 200);
    }
  });
  resetBtn.addEventListener('click', () => {
    filtersForm.reset();
    render();
  });

  fetch(dataUrl, { cache: 'no-cache' })
    .then((r) => {
      if (!r.ok) throw new Error('Failed to load ' + dataUrl);
      return r.json();
    })
    .then((data) => {
      allProps = Array.isArray(data) ? data : [];
      populateFacets();
      render();
    })
    .catch(() => {
      resultsCount.textContent = t.error;
    });
})();
