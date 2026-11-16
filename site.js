const places = window.PLACES || [];
const savedKey = 'belarus-saved-places';
const readSaved = () => {
  try { return JSON.parse(localStorage.getItem(savedKey) || '[]'); }
  catch { return []; }
};
const savedPlaces = new Set(readSaved());
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function photoCredit(place) {
  return `<a href="${place.photoUrl}" target="_blank" rel="noreferrer">${escapeHtml(place.author)} · ${escapeHtml(place.license)} · Wikimedia Commons</a>`;
}

function saveState(id, button) {
  if (savedPlaces.has(id)) savedPlaces.delete(id); else savedPlaces.add(id);
  localStorage.setItem(savedKey, JSON.stringify([...savedPlaces]));
  if (button) {
    const active = savedPlaces.has(id);
    button.classList.toggle('is-saved', active);
    button.setAttribute('aria-pressed', String(active));
    button.querySelector('.save-label').textContent = active ? 'В сохранённых' : 'Сохранить место';
    button.querySelector('.save-heart').textContent = active ? '♥' : '♡';
  }
}

function cardMarkup(place) {
  return `<article class="destination-card reveal" data-city="${escapeHtml(place.city)}" data-search="${escapeHtml(`${place.city} ${place.title} ${place.subtitle}`.toLocaleLowerCase('ru'))}">
    <a class="destination-image photo-frame" href="${place.id}.html"><img src="${place.image}" alt="${escapeHtml(place.title)} в городе ${escapeHtml(place.city)}" loading="lazy"><span class="image-label">${escapeHtml(place.kind)}</span><span class="image-number">${place.number} / 06</span><span class="image-arrow">↗</span></a>
    <div class="destination-card-copy"><div class="card-meta"><span>${escapeHtml(place.city)}</span><span>${escapeHtml(place.year)}</span></div><h3><a href="${place.id}.html">${escapeHtml(place.title)}</a></h3><p>${escapeHtml(place.short)}</p><a class="text-link" href="${place.id}.html">Читать историю <span>↗</span></a></div>
  </article>`;
}

function initHome() {
  const grid = document.querySelector('#place-grid');
  if (!grid) return;
  grid.innerHTML = places.map(cardMarkup).join('');
  const filters = [...document.querySelectorAll('.city-filter')];
  const input = document.querySelector('#place-search');
  const noResults = document.querySelector('#no-results');
  let activeCity = 'all';
  const update = () => {
    const query = input.value.trim().toLocaleLowerCase('ru');
    let shown = 0;
    grid.querySelectorAll('.destination-card').forEach((card) => {
      const visible = (activeCity === 'all' || card.dataset.city === activeCity) && card.dataset.search.includes(query);
      card.hidden = !visible;
      if (visible) shown++;
    });
    noResults.hidden = shown > 0;
  };
  filters.forEach((button) => button.addEventListener('click', () => {
    filters.forEach((item) => item.classList.remove('selected'));
    button.classList.add('selected');
    activeCity = button.dataset.filter;
    update();
  }));
  input.addEventListener('input', update);
  observeReveals();
  initMap(document.querySelector('#belarus-map'));
}

function initMap(element) {
  if (!element) return;
  const isSingle = element.id === 'detail-map';
  const place = isSingle ? places.find((item) => item.id === element.dataset.mapPlace) : null;
  if (!window.L) {
    const center = place?.coords || [53.8,28.0];
    const link = place ? `https://www.openstreetmap.org/?mlat=${center[0]}&mlon=${center[1]}#map=16/${center[0]}/${center[1]}` : 'https://www.openstreetmap.org/#map=7/53.8/28.0';
    element.innerHTML = `<a class="map-fallback" href="${link}" target="_blank" rel="noreferrer">Не удалось загрузить карту · Открыть OpenStreetMap ↗</a>`;
    return;
  }
  const map = L.map(element, {scrollWheelZoom:false, zoomControl:true, attributionControl:true});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom:19,
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
  }).addTo(map);
  const makeIcon = (number) => L.divIcon({className:'map-marker-shell',html:`<span class="map-marker">${number}</span>`,iconSize:[34,34],iconAnchor:[17,17],popupAnchor:[0,-17]});
  if (place) {
    map.setView(place.coords,16);
    L.marker(place.coords,{icon:makeIcon(place.number)}).addTo(map)
      .bindPopup(`<div class="map-popup"><b>${escapeHtml(place.title)}</b><span>${escapeHtml(place.city)} · ${escapeHtml(place.address)}</span><a href="https://www.openstreetmap.org/?mlat=${place.coords[0]}&mlon=${place.coords[1]}#map=18/${place.coords[0]}/${place.coords[1]}" target="_blank" rel="noreferrer">Открыть в OpenStreetMap ↗</a></div>`)
      .openPopup();
  } else {
    const markers = places.map((item) => {
      const marker = L.marker(item.coords,{icon:makeIcon(item.number)}).addTo(map);
      marker.bindPopup(`<div class="map-popup"><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.city)} · ${escapeHtml(item.year)}</span><a href="${item.id}.html">Читать историю ↗</a></div>`);
      return marker;
    });
    map.fitBounds(L.featureGroup(markers).getBounds().pad(.13));
  }
  window.addEventListener('resize', () => map.invalidateSize(), {passive:true});
}

function detailMarkup(place, index) {
  const milestones = place.moments.map(([year, text], i) => `<button class="timeline-item${i === 0 ? ' active' : ''}" type="button" data-year="${escapeHtml(year)}" data-copy="${escapeHtml(text)}"><span>${escapeHtml(year)}</span><i></i></button>`).join('');
  const firstMoment = place.moments[0];
  const tabs = place.story.map(([title, text], i) => `<button id="story-tab-${i}" class="story-tab${i === 0 ? ' active' : ''}" type="button" role="tab" aria-controls="story-panel-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? '0' : '-1'}" data-tab="${i}">${escapeHtml(title)}</button>`).join('');
  const storyPanel = (i) => `<section id="story-panel-${i}" class="story-panel${i === 0 ? ' active' : ''}" role="tabpanel" aria-labelledby="story-tab-${i}" tabindex="0" data-panel="${i}"><p class="story-kicker">${String(i + 1).padStart(2, '0')} / ИСТОРИЯ МЕСТА</p><h3>${escapeHtml(place.story[i][0])}</h3><p>${escapeHtml(place.story[i][1])}</p></section>`;
  const facts = place.details.map(([value, label]) => `<div class="fact"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join('');
  const previous = places[(index - 1 + places.length) % places.length];
  const next = places[(index + 1) % places.length];
  const isSaved = savedPlaces.has(place.id);
  return `<div class="detail-shell">
    <div class="breadcrumbs"><a href="index.html">Беларусь</a><span>／</span><a href="index.html#places">Места</a><span>／</span><span>${escapeHtml(place.city)}</span></div>
    <section class="detail-hero"><div class="detail-heading reveal"><p class="eyebrow">${escapeHtml(place.city)} <span>·</span> ${escapeHtml(place.kind)}</p><p class="detail-index">${place.number}<span> / 06</span></p><h1>${escapeHtml(place.title)}</h1><p class="detail-subtitle">${escapeHtml(place.subtitle)}</p><p class="detail-lead">${escapeHtml(place.lead)}</p><div class="detail-actions"><button class="save-button${isSaved ? ' is-saved' : ''}" type="button" aria-pressed="${isSaved}"><span class="save-heart">${isSaved ? '♥' : '♡'}</span><span class="save-label">${isSaved ? 'В сохранённых' : 'Сохранить место'}</span></button><button class="share-button" type="button"><span>↗</span> Поделиться</button></div></div>
    <figure class="detail-photo photo-frame reveal"><button class="photo-zoom" type="button" aria-label="Открыть фотографию крупно"><img src="${place.image}" alt="${escapeHtml(place.title)} в городе ${escapeHtml(place.city)}"></button><figcaption><span>${escapeHtml(place.city)} · ${escapeHtml(place.title)}</span><span>${photoCredit(place)}</span></figcaption><span class="photo-counter">${place.number} / 06</span></figure></section>
    <section class="facts-row reveal" aria-label="Краткие факты">${facts}</section>
    <section class="story-section reveal"><div class="section-title"><div><p class="eyebrow">Пройтись по слоям времени</p><h2>История <em>места</em></h2></div><span class="section-note">Читать по главам</span></div><div class="story-layout"><div class="story-reader"><div class="story-tabs" role="tablist">${tabs}</div>${place.story.map((_, i) => storyPanel(i)).join('')}<div class="story-controls"><button class="story-prev" type="button" aria-label="Предыдущая глава">←</button><span><b class="story-current">01</b> / ${String(place.story.length).padStart(2, '0')}</span><button class="story-next" type="button" aria-label="Следующая глава">→</button></div></div><aside class="quote-card"><span class="quote-mark">“</span><p>${escapeHtml(place.short)}</p><span class="quote-city">${escapeHtml(place.city)} · БЕЛАРУСЬ</span><div class="quote-deco">${place.number}</div></aside></div></section>
    <section class="architecture-section reveal"><div class="architecture-plate"><span class="plate-index">${place.number}</span><span class="plate-latin">ARCHITECTURE<br>OF BELARUS</span><span class="plate-symbol" aria-hidden="true">◈</span><span class="plate-city">${escapeHtml(place.city)}<br>${escapeHtml(place.year)}</span></div><div class="architecture-copy"><p class="eyebrow">Архитектурный взгляд</p><h2>Остановитесь<br>и <em>посмотрите.</em></h2><p>${escapeHtml(place.architecture)}</p><div class="architecture-note"><span>✳</span> Маленькая подсказка для прогулки</div></div></section>
    <section class="timeline-section reveal"><div class="section-title"><div><p class="eyebrow">Путь сквозь время</p><h2>Важные <em>даты</em></h2></div><p class="section-note">Листайте ленту и нажмите на год,<br>чтобы увидеть событие.</p></div><div class="timeline-scroll"><div class="timeline-track">${milestones}</div></div><div class="timeline-detail"><span class="timeline-selected-year">${escapeHtml(firstMoment[0])}</span><p class="timeline-selected-copy">${escapeHtml(firstMoment[1])}</p></div></section>
    <section class="visit-section reveal"><div><p class="eyebrow">Добавьте в свой маршрут</p><h2>Найдите это<br><em>место на карте.</em></h2><p class="visit-copy">Карту можно приблизить и перетащить. Нажмите маркер, чтобы открыть место в OpenStreetMap. Перед визитом проверьте актуальный режим работы.</p><div class="address-line"><span>АДРЕС</span><strong>${escapeHtml(place.address)}, ${escapeHtml(place.city)}</strong></div><a class="button button-dark" href="https://www.openstreetmap.org/?mlat=${place.coords[0]}&mlon=${place.coords[1]}#map=17/${place.coords[0]}/${place.coords[1]}" target="_blank" rel="noreferrer">Открыть карту <span>↗</span></a></div><div class="map-card"><div id="detail-map" class="detail-map" data-map-place="${place.id}" role="region" aria-label="Карта: ${escapeHtml(place.title)}"></div></div></section>
    <section class="credits-section reveal"><div><p class="eyebrow">Проверить и узнать больше</p><h2>Источники <em>истории</em></h2></div><div class="source-list">${place.sources.map(([title,url]) => `<a href="${url}" target="_blank" rel="noreferrer">${escapeHtml(title)} <span>↗</span></a>`).join('')}<a href="${place.photoUrl}" target="_blank" rel="noreferrer">Фото: ${escapeHtml(place.author)}, ${escapeHtml(place.license)} <span>↗</span></a></div></section>
    <nav class="place-switcher" aria-label="Переход между достопримечательностями"><a href="${previous.id}.html"><span>← ПРЕДЫДУЩЕЕ</span><b>${escapeHtml(previous.city)} · ${escapeHtml(previous.title)}</b></a><a class="switcher-all" href="index.html#places">Все<br>места</a><a class="switcher-next" href="${next.id}.html"><span>СЛЕДУЮЩЕЕ →</span><b>${escapeHtml(next.city)} · ${escapeHtml(next.title)}</b></a></nav>
  </div>`;
}

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) { toast = document.createElement('div'); toast.className = 'toast'; document.body.append(toast); }
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2400);
}

function initDetail() {
  const root = document.querySelector('#detail-root');
  if (!root) return;
  const placeIndex = places.findIndex((place) => place.id === document.body.dataset.place);
  if (placeIndex < 0) return;
  const place = places[placeIndex];
  document.title = `${place.title} — ${place.city} | Беларусь`;
  document.querySelector('meta[name="description"]').content = place.short;
  root.innerHTML = detailMarkup(place, placeIndex);
  observeReveals();
  initMap(root.querySelector('#detail-map'));

  const saveButton = root.querySelector('.save-button');
  saveButton.addEventListener('click', () => saveState(place.id, saveButton));
  root.querySelector('.share-button').addEventListener('click', async () => {
    try {
      if (navigator.share) await navigator.share({title: `${place.title} — ${place.city}`, text: place.short, url: location.href});
      else { await navigator.clipboard.writeText(location.href); showToast('Ссылка скопирована'); }
    } catch (error) { if (error.name !== 'AbortError') showToast('Не получилось поделиться ссылкой'); }
  });

  const tabButtons = [...root.querySelectorAll('.story-tab')];
  const panels = [...root.querySelectorAll('.story-panel')];
  let currentTab = 0;
  const setTab = (index) => {
    currentTab = (index + tabButtons.length) % tabButtons.length;
    tabButtons.forEach((tab, i) => { const active = i === currentTab; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; });
    panels.forEach((panel, i) => panel.classList.toggle('active', i === currentTab));
    root.querySelector('.story-current').textContent = String(currentTab + 1).padStart(2, '0');
  };
  tabButtons.forEach((tab, i) => tab.addEventListener('click', () => setTab(i)));
  root.querySelector('.story-tabs').addEventListener('keydown', (event) => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? tabButtons.length - 1 : currentTab + (event.key === 'ArrowRight' ? 1 : -1);
    setTab(target);
    tabButtons[currentTab].focus();
  });
  root.querySelector('.story-prev').addEventListener('click', () => setTab(currentTab - 1));
  root.querySelector('.story-next').addEventListener('click', () => setTab(currentTab + 1));

  root.querySelectorAll('.timeline-item').forEach((item) => item.addEventListener('click', () => {
    root.querySelectorAll('.timeline-item').forEach((event) => event.classList.remove('active'));
    item.classList.add('active');
    root.querySelector('.timeline-selected-year').textContent = item.dataset.year;
    root.querySelector('.timeline-selected-copy').textContent = item.dataset.copy;
  }));

  const dialog = document.querySelector('.image-dialog');
  const openImage = () => {
    const img = dialog.querySelector('img');
    img.src = place.image;
    img.alt = `${place.title}, ${place.city}`;
    dialog.querySelector('p').innerHTML = photoCredit(place);
    dialog.showModal();
  };
  root.querySelector('.photo-zoom').addEventListener('click', openImage);
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
}

function observeReveals() {
  const revealElements = document.querySelectorAll('.reveal:not(.observed)');
  if (!('IntersectionObserver' in window)) { revealElements.forEach((element) => element.classList.add('visible')); return; }
  const observer = new IntersectionObserver((entries, activeObserver) => entries.forEach((entry) => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); activeObserver.unobserve(entry.target); }
  }), {threshold:.12});
  revealElements.forEach((element, i) => { element.classList.add('observed'); element.style.transitionDelay = `${(i % 3) * 75}ms`; observer.observe(element); });
}

initHome();
initDetail();
