const cards = [...document.querySelectorAll('.place-card')];
const filters = [...document.querySelectorAll('.filter')];
const searchInput = document.querySelector('#search-input');
const count = document.querySelector('#result-count');
const emptyState = document.querySelector('#empty-state');
let activeCity = 'all';

function updatePlaces() {
  const query = searchInput.value.trim().toLocaleLowerCase('ru');
  let visible = 0;
  cards.forEach((card) => {
    const cityMatch = activeCity === 'all' || card.dataset.city === activeCity;
    const queryMatch = `${card.dataset.name} ${card.dataset.city}`.toLocaleLowerCase('ru').includes(query);
    const show = cityMatch && queryMatch;
    card.hidden = !show;
    if (show) visible += 1;
  });
  count.textContent = String(visible).padStart(2, '0');
  emptyState.hidden = visible !== 0;
}

filters.forEach((button) => button.addEventListener('click', () => {
  filters.forEach((filter) => filter.classList.remove('active'));
  button.classList.add('active');
  activeCity = button.dataset.city;
  updatePlaces();
}));
searchInput.addEventListener('input', updatePlaces);

document.querySelectorAll('.read-more').forEach((button) => button.addEventListener('click', () => {
  const card = button.closest('.place-card');
  const expanded = card.classList.toggle('expanded');
  button.firstChild.textContent = expanded ? 'Свернуть историю ' : 'Открыть историю ';
  button.setAttribute('aria-expanded', String(expanded));
}));

document.querySelectorAll('.save').forEach((button) => button.addEventListener('click', () => {
  const saved = button.classList.toggle('saved');
  button.setAttribute('aria-pressed', String(saved));
  button.textContent = saved ? '♥' : '♡';
}));

const observer = new IntersectionObserver((entries, currentObserver) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      currentObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
