const dealsContainer = document.getElementById('deals');
const gemsContainer = document.getElementById('gems');
const itineraryContainer = document.getElementById('itinerary');
const buildButton = document.getElementById('buildItinerary');
const printButton = document.getElementById('printItinerary');

async function loadData(filename) {
  const response = await fetch(filename);
  return response.json();
}

function renderDeals(deals) {
  dealsContainer.innerHTML = deals.map((deal) => `
    <article class="deal-card">
      <h3>${deal.title}</h3>
      <p class="deal-meta">${deal.mode} • ${deal.route} • ${deal.duration}</p>
      <p>${deal.description}</p>
      <p class="deal-meta">Price: ${deal.price} • Book by: ${deal.expires}</p>
    </article>
  `).join('');
}

function renderGems(gems) {
  gemsContainer.innerHTML = gems.map((gem) => `
    <article class="gem-card">
      <h3>${gem.name}</h3>
      <p class="gem-meta">${gem.region} • ${gem.type}</p>
      <p>${gem.description}</p>
      <p class="gem-meta">Best for: ${gem.bestFor} • Travel tip: ${gem.tip}</p>
    </article>
  `).join('');
}

function formatPrice(value) {
  return typeof value === 'number' ? `€${value.toFixed(0)}` : value;
}

function buildItinerary(deals, gems) {
  const origin = document.getElementById('origin').value;
  const date = document.getElementById('travelDate').value;
  const length = Number(document.getElementById('tripLength').value);
  const style = document.getElementById('travelStyle').value;

  const matchingDeals = deals.filter((deal) => deal.origin === origin || deal.origin === 'Copenhagen Airport');
  const selectedDeal = matchingDeals[0] || deals[0];

  const destinationGems = gems.filter((gem) => selectedDeal.destination.includes(gem.region) || gem.bestFor.includes('day trip')).slice(0, 2);
  const accomodationCost = selectedDeal.price * 0.4;
  const activityBudget = selectedDeal.price * 0.25;

  const plan = [
    {
      title: `Travel to ${selectedDeal.destination}`,
      detail: `${selectedDeal.mode} from ${selectedDeal.origin} to ${selectedDeal.destination}`,
      cost: formatPrice(selectedDeal.price),
    },
    {
      title: `Stay in ${selectedDeal.destination}`,
      detail: `Local accommodation with pet-friendly option and breakfast included`,
      cost: formatPrice(accomodationCost),
    },
    {
      title: `Activities & hidden gems`,
      detail: destinationGems.map((gem) => `${gem.name} — ${gem.description}`).join('. '),
      cost: formatPrice(activityBudget),
    },
  ];

  itineraryContainer.innerHTML = plan.map((activity, index) => `
    <section class="itinerary-card">
      <h3>Day ${index + 1}: ${activity.title}</h3>
      <p>${activity.detail}</p>
      <p class="itinerary-meta">Estimated cost: ${activity.cost}</p>
    </section>
  `).join('');

  const summary = document.createElement('div');
  summary.className = 'itinerary-card';
  summary.innerHTML = `
    <h3>Trip Summary</h3>
    <p>Origin: ${origin}</p>
    <p>Date: ${date || 'Flexible'}</p>
    <p>Duration: ${length} days</p>
    <p>Travel style: ${style}</p>
  `;
  itineraryContainer.prepend(summary);
}

printButton.addEventListener('click', () => window.print());

buildButton.addEventListener('click', async () => {
  const [deals, gems] = await Promise.all([loadData('data/deals.json'), loadData('data/hidden_gems.json')]);
  buildItinerary(deals, gems);
});

(async function init() {
  const [deals, gems] = await Promise.all([loadData('data/deals.json'), loadData('data/hidden_gems.json')]);
  renderDeals(deals);
  renderGems(gems);
})();
