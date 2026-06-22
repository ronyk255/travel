const state = {
  deals: [],
  destinations: [],
  accommodations: [],
  activities: [],
  gems: [],
  selectedDealId: null,
  selectedAccommodationId: null,
  selectedActivityIds: new Set(),
  currentItinerary: null,
};

const els = {
  refreshButton: document.getElementById("refreshButton"),
  lastUpdated: document.getElementById("lastUpdated"),
  bestValue: document.getElementById("bestValue"),
  dogCount: document.getElementById("dogCount"),
  deals: document.getElementById("deals"),
  dealBoard: document.getElementById("dealBoard"),
  accommodations: document.getElementById("accommodations"),
  activities: document.getElementById("activities"),
  hiddenGems: document.getElementById("hiddenGems"),
  savedTrips: document.getElementById("savedTrips"),
  itinerary: document.getElementById("itinerary"),
  dealSort: document.getElementById("dealSort"),
  dealSearch: document.getElementById("dealSearch"),
  origin: document.getElementById("origin"),
  travelDate: document.getElementById("travelDate"),
  tripLength: document.getElementById("tripLength"),
  numTravelers: document.getElementById("numTravelers"),
  maxPrice: document.getElementById("maxPrice"),
  priceValue: document.getElementById("priceValue"),
  minRating: document.getElementById("minRating"),
  ratingValue: document.getElementById("ratingValue"),
  dogFriendly: document.getElementById("dogFriendly"),
  hiddenGemMode: document.getElementById("hiddenGemMode"),
  buildItinerary: document.getElementById("buildItinerary"),
  exportDiary: document.getElementById("exportDiary"),
  modal: document.getElementById("tripModal"),
  modalBody: document.getElementById("tripModalBody"),
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  if (Number.isNaN(Number(value))) return "Check provider";
  return `EUR ${Number(value).toFixed(0)}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "Flexible dates";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function cacheBusted(path) {
  return `${path}?v=${Date.now()}`;
}

async function loadJson(path, fallback = []) {
  try {
    const response = await fetch(cacheBusted(path));
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.warn(`Could not load ${path}`, error);
    return fallback;
  }
}

function destinationFor(deal) {
  const destinationId = String(deal.destination || "").toLowerCase();
  return state.destinations.find((item) => item.id === destinationId || item.name.toLowerCase() === destinationId);
}

function scoreDeal(deal) {
  const price = Number(deal.price || 999);
  const dogBonus = deal.dogFriendly || /dog|pet/i.test(deal.description || "") ? 16 : 0;
  const trainBonus = deal.mode === "Train" ? 10 : 0;
  const sourceBonus = deal.bookingUrl ? 8 : 0;
  const priceScore = Math.max(0, 100 - price);
  return Math.round(priceScore + dogBonus + trainBonus + sourceBonus);
}

function durationMinutes(deal) {
  const duration = String(deal.duration || "");
  const hours = Number((duration.match(/(\d+)\s*h/) || [0, 0])[1]);
  const minutes = Number((duration.match(/(\d+)\s*m/) || [0, 0])[1]);
  return hours * 60 + minutes || 9999;
}

function sortedDeals() {
  const sort = els.dealSort.value;
  const dogOnly = els.dogFriendly.checked;
  const preferHidden = els.hiddenGemMode.checked;
  let deals = [...state.deals];

  if (dogOnly) {
    deals = deals.filter((deal) => deal.dogFriendly || /dog|pet|small dog|cabin/i.test(deal.description || ""));
  }

  if (sort === "price") deals.sort((a, b) => Number(a.price || 9999) - Number(b.price || 9999));
  if (sort === "dog") deals.sort((a, b) => Number(Boolean(b.dogFriendly)) - Number(Boolean(a.dogFriendly)) || scoreDeal(b) - scoreDeal(a));
  if (sort === "duration") deals.sort((a, b) => durationMinutes(a) - durationMinutes(b));
  if (sort === "score") deals.sort((a, b) => scoreDeal(b) - scoreDeal(a));

  if (preferHidden) {
    const hiddenIds = new Set(["ystad", "skanor-falsterbo", "gothenburg"]);
    deals.sort((a, b) => Number(hiddenIds.has(String(b.destination))) - Number(hiddenIds.has(String(a.destination))));
  }

  return deals;
}

function cardImage(src, alt, badges) {
  return `
    <div class="card-image">
      <img src="${escapeHtml(src || "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80")}" alt="${escapeHtml(alt)}" loading="lazy" />
      <div class="badge-row">${badges.map((badge) => `<span class="badge">${escapeHtml(badge)}</span>`).join("")}</div>
    </div>
  `;
}

function dealCard(deal, compact = false) {
  const destination = destinationFor(deal);
  const selected = state.selectedDealId === deal.id ? " selected" : "";
  const score = scoreDeal(deal);
  const dogText = deal.dogFriendly ? "Small dog possible" : "Check pet rules";
  return `
    <article class="deal-card${selected}" data-deal-id="${escapeHtml(deal.id)}">
      ${cardImage(deal.image || destination?.image, deal.title, [deal.mode || "Deal", dogText])}
      <div class="card-body">
        <div>
          <h3>${escapeHtml(deal.title)}</h3>
          <p class="muted">${escapeHtml(deal.route || "Route to confirm")} - ${escapeHtml(deal.duration || "Duration to confirm")}</p>
        </div>
        <div class="meta-grid">
          <div><span>From</span><strong>${money(deal.price)}</strong></div>
          <div><span>Score</span><strong>${score}/100</strong></div>
        </div>
        <p>${escapeHtml(deal.description || "Provider-linked deal. Confirm live fare before booking.")}</p>
        ${compact ? "" : `<p class="muted">Book by: ${escapeHtml(deal.expires || "Flexible")}</p>`}
        <div class="card-actions">
          ${deal.bookingUrl ? `<a class="link-button" href="${escapeHtml(deal.bookingUrl)}" target="_blank" rel="noreferrer">Open ${escapeHtml(deal.provider || "provider")}</a>` : ""}
          <a class="link-button" href="https://www.google.com/maps/search/${encodeURIComponent(destination?.name || deal.destination || deal.title)}" target="_blank" rel="noreferrer">Map</a>
        </div>
      </div>
    </article>
  `;
}

function renderDeals() {
  const deals = sortedDeals();
  els.deals.innerHTML = deals.map((deal) => dealCard(deal)).join("");
  els.deals.querySelectorAll(".deal-card").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest("a")) return;
      state.selectedDealId = card.dataset.dealId;
      state.selectedAccommodationId = null;
      state.selectedActivityIds.clear();
      renderAll();
    });
  });
}

function renderDealBoard() {
  const query = (els.dealSearch.value || "").toLowerCase();
  const deals = state.deals.filter((deal) => JSON.stringify(deal).toLowerCase().includes(query));
  els.dealBoard.innerHTML = deals.map((deal) => dealCard(deal, true)).join("");
}

function selectedDeal() {
  const visible = sortedDeals();
  return visible.find((deal) => deal.id === state.selectedDealId) || visible[0] || state.deals[0];
}

function renderAccommodations() {
  const deal = selectedDeal();
  if (!deal) {
    els.accommodations.innerHTML = `<p class="muted">Choose a deal first.</p>`;
    return;
  }

  const maxPrice = Number(els.maxPrice.value);
  const minRating = Number(els.minRating.value);
  const dogOnly = els.dogFriendly.checked;
  const destinationId = String(deal.destination || "").toLowerCase();
  const stays = state.accommodations
    .filter((stay) => String(stay.destination).toLowerCase() === destinationId)
    .filter((stay) => Number(stay.price) <= maxPrice && Number(stay.rating) >= minRating)
    .filter((stay) => !dogOnly || stay.dogFriendly)
    .sort((a, b) => Number(b.rating) - Number(a.rating) || Number(a.price) - Number(b.price));

  if (!state.selectedAccommodationId && stays[0]) state.selectedAccommodationId = stays[0].id;

  els.accommodations.innerHTML = stays.length
    ? stays.map((stay) => `
      <article class="option-card${state.selectedAccommodationId === stay.id ? " selected" : ""}" data-stay-id="${escapeHtml(stay.id)}">
        ${cardImage(stay.image, stay.name, [`${stay.rating}/5`, stay.dogFriendly ? "Dog-friendly" : "No dog note"])}
        <div class="card-body">
          <h3>${escapeHtml(stay.name)}</h3>
          <p class="muted">${escapeHtml(stay.address || "Area to confirm")}</p>
          <p>${escapeHtml((stay.features || []).join(", "))}</p>
          <div class="meta-grid">
            <div><span>Night</span><strong>${money(stay.price)}</strong></div>
            <div><span>Rating</span><strong>${escapeHtml(stay.rating)}</strong></div>
          </div>
          ${stay.bookingUrl ? `<a class="link-button" href="${escapeHtml(stay.bookingUrl)}" target="_blank" rel="noreferrer">Check rooms</a>` : ""}
        </div>
      </article>
    `).join("")
    : `<p class="muted">No stays match these filters. Raise the budget or turn off dog-only mode.</p>`;

  els.accommodations.querySelectorAll(".option-card").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest("a")) return;
      state.selectedAccommodationId = card.dataset.stayId;
      renderAccommodations();
    });
  });
}

function renderActivities() {
  const deal = selectedDeal();
  if (!deal) {
    els.activities.innerHTML = `<p class="muted">Choose a deal first.</p>`;
    return;
  }

  const destinationId = String(deal.destination || "").toLowerCase();
  const dogOnly = els.dogFriendly.checked;
  const activities = state.activities
    .filter((activity) => String(activity.destination).toLowerCase() === destinationId)
    .filter((activity) => !dogOnly || activity.dogFriendly)
    .sort((a, b) => Number(b.rating) - Number(a.rating));

  if (state.selectedActivityIds.size === 0) {
    activities.slice(0, 4).forEach((activity) => state.selectedActivityIds.add(activity.id));
  }

  els.activities.innerHTML = activities.length
    ? activities.map((activity) => `
      <article class="option-card${state.selectedActivityIds.has(activity.id) ? " selected" : ""}" data-activity-id="${escapeHtml(activity.id)}">
        <div class="card-body">
          <span class="score-pill">${escapeHtml(activity.category || "Activity")}</span>
          <h3>${escapeHtml(activity.name)}</h3>
          <p class="muted">${escapeHtml(activity.duration || "Flexible")} - ${escapeHtml(activity.rating || "New")}/5</p>
          <p>${escapeHtml(activity.description)}</p>
          <div class="meta-grid">
            <div><span>Cost</span><strong>${money(activity.price)}</strong></div>
            <div><span>Dog</span><strong>${activity.dogFriendly ? "Yes" : "Check"}</strong></div>
          </div>
        </div>
      </article>
    `).join("")
    : `<p class="muted">No activities match the current dog filter for this destination.</p>`;

  els.activities.querySelectorAll(".option-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.activityId;
      if (state.selectedActivityIds.has(id)) state.selectedActivityIds.delete(id);
      else state.selectedActivityIds.add(id);
      renderActivities();
    });
  });
}

function renderGems() {
  els.hiddenGems.innerHTML = state.gems.map((gem) => `
    <article class="gem-card">
      ${cardImage(gem.image, gem.name, [gem.region || "Skane", gem.type || "Hidden gem"])}
      <div class="card-body">
        <h3>${escapeHtml(gem.name)}</h3>
        <p>${escapeHtml(gem.description)}</p>
        <p class="muted"><strong>Best for:</strong> ${escapeHtml(gem.bestFor || "day trip")}</p>
        <p class="muted"><strong>Tip:</strong> ${escapeHtml(gem.tip || "Check transit before you go.")}</p>
        <a class="link-button" href="https://www.google.com/maps/search/${encodeURIComponent(gem.name + " " + (gem.region || ""))}" target="_blank" rel="noreferrer">Open map</a>
      </div>
    </article>
  `).join("");
}

function buildDays({ deal, destination, stay, activities, length, travelers, travelDate }) {
  const days = [];
  days.push({
    title: "Travel and arrival",
    body: `${deal.mode || "Travel"} from ${deal.route || els.origin.value} taking ${deal.duration || "time to confirm"}. Check in near ${stay?.address || destination?.name || deal.destination}.`,
    cost: Number(deal.price || 0) * travelers,
    links: [{ label: `Book ${deal.mode || "travel"}`, url: deal.bookingUrl }],
  });

  const pool = activities.length ? activities : [{
    name: `Self-guided walk in ${destination?.name || deal.destination}`,
    duration: "2 hours",
    price: 0,
    category: "Explore",
    description: "Use the map link, local transit, and saved destination notes to keep the day flexible.",
  }];

  for (let index = 2; index <= length; index += 1) {
    const morning = pool[(index - 2) % pool.length];
    const afternoon = pool[(index - 1) % pool.length] || morning;
    const isLast = index === length;
    days.push({
      title: isLast ? "Last look and return" : `Explore ${destination?.name || deal.destination}`,
      body: `${morning.name} in the morning (${morning.duration}). ${afternoon && afternoon.id !== morning.id ? `${afternoon.name} later in the day.` : "Leave space for a slow lunch and neighborhood wandering."}`,
      cost: (Number(morning.price || 0) + (afternoon && afternoon.id !== morning.id ? Number(afternoon.price || 0) : 0)) * travelers,
      links: [{ label: "Map day area", url: `https://www.google.com/maps/search/${encodeURIComponent(destination?.name || deal.destination)}` }],
    });
  }

  return days.map((day, index) => ({ ...day, date: travelDate ? formatDate(addDays(travelDate, index)) : `Day ${index + 1}` }));
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildItinerary() {
  const deal = selectedDeal();
  if (!deal) {
    alert("Choose a deal first.");
    return;
  }
  state.selectedDealId = deal.id;

  const destination = destinationFor(deal);
  const stay = state.accommodations.find((item) => item.id === state.selectedAccommodationId);
  const activities = [...state.selectedActivityIds]
    .map((id) => state.activities.find((activity) => activity.id === id))
    .filter(Boolean);
  const travelers = Number(els.numTravelers.value || 2);
  const length = Number(els.tripLength.value || 3);
  const nights = Math.max(0, length - 1);
  const travelDate = els.travelDate.value;
  const travelCost = Number(deal.price || 0) * travelers;
  const stayCost = stay ? Number(stay.price || 0) * nights : 0;
  const days = buildDays({ deal, destination, stay, activities, length, travelers, travelDate });
  const activityCost = days.reduce((sum, day, index) => sum + (index === 0 ? 0 : day.cost), 0);
  const total = travelCost + stayCost + activityCost;
  const perPerson = total / travelers;

  const itinerary = {
    id: Date.now(),
    status: "planned",
    destination: destination?.name || deal.destination,
    country: destination?.country || "",
    title: `${destination?.name || deal.destination} ${length}-day plan`,
    createdAt: new Date().toISOString(),
    travelDate,
    length,
    nights,
    travelers,
    deal,
    stay,
    activities,
    days,
    costs: { travelCost, stayCost, activityCost, total, perPerson },
    dogNote: els.dogFriendly.checked
      ? "Small dog mode is on. Confirm airline cabin weight/carrier limits and hotel pet fees before booking."
      : "Dog filter is off for this plan.",
  };

  state.currentItinerary = itinerary;
  renderItinerary(itinerary);
  els.itinerary.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderItinerary(plan) {
  const destination = destinationFor(plan.deal) || {};
  els.itinerary.classList.add("has-content");
  els.itinerary.innerHTML = `
    <div class="itinerary-hero">
      <div>
        <p class="eyebrow">Generated plan</p>
        <h2>${escapeHtml(plan.title)}</h2>
        <p class="muted">${escapeHtml(formatDate(plan.travelDate))} - ${plan.length} days - ${plan.travelers} people</p>
        <p>${escapeHtml(destination.description || "A provider-linked itinerary built from selected deals, stays, and activities.")}</p>
        <p class="muted">${escapeHtml(plan.dogNote)}</p>
        <div class="trip-actions">
          <button class="secondary-button" type="button" data-action="print">Print</button>
          <button class="primary-button" type="button" data-action="save">Approve and save</button>
          <button class="danger-button" type="button" data-action="reject">Delete draft</button>
        </div>
      </div>
      <div>
        <img class="itinerary-photo" src="${escapeHtml(destination.image || plan.deal.image || "")}" alt="${escapeHtml(plan.destination)}" />
        <div class="cost-grid">
          <div><span>Travel</span><strong>${money(plan.costs.travelCost)}</strong></div>
          <div><span>Stay</span><strong>${money(plan.costs.stayCost)}</strong></div>
          <div><span>Activities</span><strong>${money(plan.costs.activityCost)}</strong></div>
          <div class="total-line"><span>Total</span>${money(plan.costs.total)} / ${money(plan.costs.perPerson)} pp</div>
        </div>
      </div>
    </div>
    <div class="day-list">
      ${plan.days.map((day, index) => `
        <article class="day-card">
          <p class="eyebrow">${escapeHtml(day.date)}</p>
          <h3>Day ${index + 1}: ${escapeHtml(day.title)}</h3>
          <p>${escapeHtml(day.body)}</p>
          <p class="muted">Estimated day cost for ${plan.travelers}: ${money(day.cost)}</p>
          <div class="card-actions">
            ${(day.links || []).filter((link) => link.url).map((link) => `<a class="link-button" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`).join("")}
          </div>
        </article>
      `).join("")}
    </div>
  `;

  els.itinerary.querySelector('[data-action="print"]').addEventListener("click", () => window.print());
  els.itinerary.querySelector('[data-action="save"]').addEventListener("click", saveCurrentItinerary);
  els.itinerary.querySelector('[data-action="reject"]').addEventListener("click", () => {
    state.currentItinerary = null;
    els.itinerary.classList.remove("has-content");
    els.itinerary.innerHTML = "";
  });
}

function savedTrips() {
  return JSON.parse(localStorage.getItem("travelDiary") || "[]");
}

function writeSavedTrips(trips) {
  localStorage.setItem("travelDiary", JSON.stringify(trips));
}

function saveCurrentItinerary() {
  if (!state.currentItinerary) {
    alert("Build an itinerary first.");
    return;
  }
  const trips = savedTrips();
  trips.unshift(state.currentItinerary);
  writeSavedTrips(trips);
  renderDiary();
  alert("Trip saved to Travel Diary.");
}

function renderDiary() {
  const trips = savedTrips();
  if (!trips.length) {
    els.savedTrips.innerHTML = `<p class="muted">No saved trips yet. Build an itinerary, approve it, and it will appear here.</p>`;
    return;
  }

  els.savedTrips.innerHTML = trips.map((trip) => `
    <article class="trip-card" data-trip-id="${trip.id}">
      <span class="status-pill ${trip.status === "done" ? "done" : "pending"}">${trip.status === "done" ? "Done" : "Planned"}</span>
      <h3>${escapeHtml(trip.title || trip.destination)}</h3>
      <p class="muted">${escapeHtml(formatDate(trip.travelDate))} - ${trip.length} days - ${trip.travelers} people</p>
      <p class="price">${money(trip.costs?.total || 0)} total</p>
      <p>${escapeHtml(trip.deal?.title || "Saved itinerary")}</p>
      <div class="trip-actions">
        <button class="secondary-button" type="button" data-action="open">Open</button>
        <button class="secondary-button" type="button" data-action="done">${trip.status === "done" ? "Undo done" : "Mark done"}</button>
        <button class="danger-button" type="button" data-action="delete">Delete</button>
      </div>
    </article>
  `).join("");

  els.savedTrips.querySelectorAll(".trip-card").forEach((card) => {
    card.addEventListener("click", (event) => {
      const action = event.target.dataset.action || "open";
      const id = Number(card.dataset.tripId);
      if (action === "open") openTrip(id);
      if (action === "done") toggleDone(id);
      if (action === "delete") deleteTrip(id);
    });
  });
}

function openTrip(id) {
  const trip = savedTrips().find((item) => item.id === id);
  if (!trip) return;
  els.modalBody.innerHTML = `<div id="modalItinerary"></div>`;
  els.modal.classList.remove("hidden");
  const previous = els.itinerary;
  const modalTarget = document.getElementById("modalItinerary");
  modalTarget.innerHTML = `
    <h2>${escapeHtml(trip.title || trip.destination)}</h2>
    <p class="muted">${escapeHtml(trip.status === "done" ? `Completed ${formatDate(trip.completedAt)}` : "Planned trip")}</p>
    <div class="cost-grid">
      <div><span>Total</span><strong>${money(trip.costs?.total || 0)}</strong></div>
      <div><span>Per person</span><strong>${money(trip.costs?.perPerson || 0)}</strong></div>
    </div>
    <div class="day-list">
      ${(trip.days || []).map((day, index) => `
        <article class="day-card">
          <p class="eyebrow">${escapeHtml(day.date)}</p>
          <h3>Day ${index + 1}: ${escapeHtml(day.title)}</h3>
          <p>${escapeHtml(day.body)}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function toggleDone(id) {
  const trips = savedTrips().map((trip) => {
    if (trip.id !== id) return trip;
    const done = trip.status !== "done";
    return { ...trip, status: done ? "done" : "planned", completedAt: done ? todayIso() : null };
  });
  writeSavedTrips(trips);
  renderDiary();
}

function deleteTrip(id) {
  if (!confirm("Delete this trip from the diary?")) return;
  writeSavedTrips(savedTrips().filter((trip) => trip.id !== id));
  renderDiary();
}

function exportDiary() {
  const payload = JSON.stringify(savedTrips(), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lincy-rony-travel-diary-${todayIso()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function updateStats() {
  const best = [...state.deals].sort((a, b) => Number(a.price || 9999) - Number(b.price || 9999))[0];
  const dogCount = state.deals.filter((deal) => deal.dogFriendly || /dog|pet/i.test(deal.description || "")).length;
  els.bestValue.textContent = best ? `${best.title} from ${money(best.price)}` : "No deals loaded";
  els.dogCount.textContent = `${dogCount} current deal options`;
  els.lastUpdated.textContent = `Loaded ${new Date().toLocaleString("en-GB")}`;
}

function renderAll() {
  renderDeals();
  renderDealBoard();
  renderAccommodations();
  renderActivities();
  renderGems();
  renderDiary();
  updateStats();
}

function bindEvents() {
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".nav-tab").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`${tab.dataset.tab}-tab`).classList.add("active");
    });
  });

  els.refreshButton.addEventListener("click", () => {
    const url = new URL(window.location.href);
    url.searchParams.set("refresh", Date.now());
    window.location.href = url.toString();
  });

  [els.dealSort, els.dogFriendly, els.hiddenGemMode].forEach((el) => el.addEventListener("change", renderAll));
  els.dealSearch.addEventListener("input", renderDealBoard);
  els.maxPrice.addEventListener("input", () => {
    els.priceValue.textContent = money(els.maxPrice.value);
    renderAccommodations();
  });
  els.minRating.addEventListener("input", () => {
    els.ratingValue.textContent = els.minRating.value;
    renderAccommodations();
  });
  els.buildItinerary.addEventListener("click", buildItinerary);
  els.exportDiary.addEventListener("click", exportDiary);
  document.querySelector(".modal-close").addEventListener("click", () => els.modal.classList.add("hidden"));
  els.modal.addEventListener("click", (event) => {
    if (event.target === els.modal) els.modal.classList.add("hidden");
  });
}

async function init() {
  bindEvents();
  els.travelDate.value = todayIso();
  els.priceValue.textContent = money(els.maxPrice.value);
  els.ratingValue.textContent = els.minRating.value;

  const [deals, destinations, accommodations, activities, gems] = await Promise.all([
    loadJson("data/deals.json"),
    loadJson("data/destinations.json"),
    loadJson("data/accommodations_full.json"),
    loadJson("data/activities_full.json"),
    loadJson("data/hidden_gems.json"),
  ]);

  state.deals = deals.map((deal, index) => ({
    id: deal.id || `${String(deal.mode || "deal").toLowerCase()}-${index}`,
    ...deal,
    destination: String(deal.destination || "").toLowerCase().replaceAll(" ", "-"),
  }));
  state.destinations = destinations;
  state.accommodations = accommodations;
  state.activities = activities;
  state.gems = gems;
  state.selectedDealId = sortedDeals()[0]?.id || null;
  renderAll();
}

init();
