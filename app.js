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

const LOCAL_SKANE_DESTINATIONS = new Set(["ystad", "skanor-falsterbo"]);
const AIRPORT_CODES = {
  amsterdam: "ams",
  barcelona: "bcn",
  berlin: "ber",
  budapest: "bud",
  gdansk: "gdn",
  gothenburg: "got",
  hamburg: "ham",
  krakow: "krk",
  lisbon: "lis",
  nice: "nce",
  paris: "par",
  porto: "opo",
  prague: "prg",
  riga: "rix",
  rome: "rom",
  tallinn: "tll",
  vienna: "vie",
  warsaw: "waw",
};

const els = {
  refreshButton: document.getElementById("refreshButton"),
  lastUpdated: document.getElementById("lastUpdated"),
  bestValue: document.getElementById("bestValue"),
  dogCount: document.getElementById("dogCount"),
  upcomingDeals: document.getElementById("upcomingDeals"),
  deals: document.getElementById("deals"),
  dealBoard: document.getElementById("dealBoard"),
  accommodations: document.getElementById("accommodations"),
  activities: document.getElementById("activities"),
  hiddenGems: document.getElementById("hiddenGems"),
  skaneItinerary: document.getElementById("skaneItinerary"),
  savedTrips: document.getElementById("savedTrips"),
  itinerary: document.getElementById("itinerary"),
  dealSort: document.getElementById("dealSort"),
  dealSearch: document.getElementById("dealSearch"),
  origin: document.getElementById("origin"),
  travelDate: document.getElementById("travelDate"),
  tripLength: document.getElementById("tripLength"),
  tripMood: document.getElementById("tripMood"),
  numTravelers: document.getElementById("numTravelers"),
  maxPrice: document.getElementById("maxPrice"),
  priceValue: document.getElementById("priceValue"),
  minRating: document.getElementById("minRating"),
  ratingValue: document.getElementById("ratingValue"),
  dogFriendly: document.getElementById("dogFriendly"),
  hiddenGemMode: document.getElementById("hiddenGemMode"),
  buildItinerary: document.getElementById("buildItinerary"),
  plannerSnapshot: document.getElementById("plannerSnapshot"),
  recommendationTitle: document.getElementById("recommendationTitle"),
  recommendationCopy: document.getElementById("recommendationCopy"),
  tripWindow: document.getElementById("tripWindow"),
  instantTotal: document.getElementById("instantTotal"),
  nextAction: document.getElementById("nextAction"),
  decisionPack: document.getElementById("decisionPack"),
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

function moneySek(value) {
  if (Number.isNaN(Number(value))) return "Check provider";
  return `SEK ${Number(value).toFixed(0)}`;
}

function urlWithParams(base, params) {
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });
  return url.toString();
}

function accommodationBookingLinks(stay) {
  const destination = state.destinations.find((item) => item.id === String(stay.destination || "").toLowerCase()) || {};
  const city = destination.name || stay.destination || "";
  const checkin = els.travelDate.value || todayIso();
  const checkout = addDays(checkin, Math.max(1, Number(els.tripLength.value || 3) - 1));
  const adults = String(Math.max(1, Number(els.numTravelers.value || 2)));
  const dogFilter = els.dogFriendly.checked || stay.dogFriendly ? "hotelfacility=4" : "";
  const staySearch = [stay.name, stay.address, city].filter(Boolean).join(", ");
  const citySearch = [city, destination.country].filter(Boolean).join(", ");

  return [
    {
      label: "Booking.com",
      url: urlWithParams("https://www.booking.com/searchresults.html", {
        ss: staySearch || citySearch,
        checkin,
        checkout,
        group_adults: adults,
        no_rooms: "1",
        selected_currency: "EUR",
        nflt: dogFilter,
      }),
    },
    {
      label: "Lastminute",
      url: urlWithParams("https://www.lastminute.com/search", {
        "search.destination": citySearch || staySearch,
        "search.departureDate": checkin,
        "search.returnDate": checkout,
        "search.rooms[0].adults": adults,
      }),
    },
    {
      label: "Google Hotels",
      url: urlWithParams("https://www.google.com/travel/hotels", {
        q: staySearch || citySearch,
        checkin,
        checkout,
        adults,
      }),
    },
    {
      label: "Map",
      url: `https://www.google.com/maps/search/${encodeURIComponent(staySearch || citySearch)}`,
    },
  ];
}

function compactFlightDate(value) {
  return String(value || "").replaceAll("-", "").slice(2);
}

function effectiveDealDates(deal) {
  const departure = els.travelDate.value || deal.recommendedDate || deal.validFrom || todayIso();
  const fallbackReturn = addDays(departure, Math.max(1, Number(els.tripLength.value || 3) - 1));
  return {
    departure,
    returnDate: deal.recommendedReturnDate || deal.validTo || fallbackReturn,
  };
}

function routeParts(deal, destination) {
  const route = String(deal.route || "");
  const pieces = route.split("->").map((item) => item.trim()).filter(Boolean);
  return {
    from: pieces[0] || deal.origin || els.origin.value || "Lund",
    to: pieces[pieces.length - 1] || destination?.name || deal.destination || "",
  };
}

function transportBookingLinks(deal, destination = {}) {
  const destinationId = String(deal.destination || "").toLowerCase();
  const destinationName = destination.name || deal.destination || "";
  const { departure: travelDate, returnDate } = effectiveDealDates(deal);
  const travelers = String(Math.max(1, Number(els.numTravelers.value || 2)));
  const { from, to } = routeParts(deal, destination);
  const isTrain = /train|bus/i.test(`${deal.mode || ""} ${deal.provider || ""}`);
  const destCode = AIRPORT_CODES[destinationId] || destinationId.slice(0, 3);
  const priceText = Number.isNaN(Number(deal.price)) ? "shown price" : money(deal.price);

  if (isTrain) {
    return [
      {
        label: `Check ${priceText}`,
        url: deal.bookingUrl || "https://www.sj.se/en",
      },
      {
        label: "SJ",
        url: urlWithParams("https://www.sj.se/en/search-journey", {
          from,
          to,
          departureDate: travelDate,
        }),
      },
      {
        label: "DB",
        url: urlWithParams("https://int.bahn.de/en/buchung/fahrplan/suche", {
          so: from,
          zo: to,
          hd: `${travelDate}T08:00:00`,
          r: travelers,
        }),
      },
      {
        label: "Trainline",
        url: urlWithParams("https://www.thetrainline.com/search", {
          origin: from,
          destination: to,
          outwardDate: `${travelDate}T08:00:00`,
          returnDate: `${returnDate}T16:00:00`,
          journeySearchType: "return",
        }),
      },
      {
        label: "Omio",
        url: urlWithParams("https://www.omio.com/search-frontend/results", {
          departure_fk: from,
          arrival_fk: to,
          departure_date: travelDate,
          return_date: returnDate,
          passengers: travelers,
        }),
      },
    ];
  }

  return [
    {
      label: `Check ${priceText}`,
      url: `https://www.skyscanner.com/transport/flights/cph/${destCode}/${compactFlightDate(travelDate)}/${compactFlightDate(returnDate)}/?adultsv2=${encodeURIComponent(travelers)}&adults=${encodeURIComponent(travelers)}&currency=EUR&locale=en-GB&market=SE`,
    },
    {
      label: "Google Flights",
      url: `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights from Copenhagen to ${destinationName} on ${travelDate} returning ${returnDate} for ${travelers} adults`)}`,
    },
    {
      label: "Lastminute flights",
      url: urlWithParams("https://www.lastminute.com/search", {
        "search.departureAirport": "CPH",
        "search.destination": destinationName,
        "search.departureDate": travelDate,
        "search.returnDate": returnDate,
        "search.rooms[0].adults": travelers,
      }),
    },
    {
      label: "Kayak",
      url: `https://www.kayak.com/flights/CPH-${destCode}/${travelDate}/${returnDate}/${travelers}adults?sort=bestflight_a`,
    },
    {
      label: "Momondo",
      url: `https://www.momondo.com/flight-search/CPH-${destCode}/${travelDate}/${returnDate}/${travelers}adults?sort=bestflight_a`,
    },
    {
      label: "Kiwi",
      url: urlWithParams("https://www.kiwi.com/en/search/results/copenhagen-denmark/" + encodeURIComponent(destinationName.toLowerCase().replaceAll(" ", "-")), {
        dateFrom: travelDate,
        dateTo: travelDate,
        returnFrom: returnDate,
        returnTo: returnDate,
        adults: travelers,
      }),
    },
    {
      label: "Airline rules",
      url: deal.petPolicyUrl || `https://www.google.com/search?q=${encodeURIComponent(`${destinationName} flight small dog cabin rules Copenhagen`)}`,
    },
  ];
}

function compactDateTime(value) {
  if (!value) return "Latest committed data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
  let deals = state.deals.filter((deal) => !LOCAL_SKANE_DESTINATIONS.has(String(deal.destination)));

  if (dogOnly) {
    deals = deals.filter((deal) => deal.dogFriendly || /dog|pet|small dog|cabin/i.test(deal.description || ""));
  }

  if (sort === "price") deals.sort((a, b) => Number(a.price || 9999) - Number(b.price || 9999));
  if (sort === "dog") deals.sort((a, b) => Number(Boolean(b.dogFriendly)) - Number(Boolean(a.dogFriendly)) || scoreDeal(b) - scoreDeal(a));
  if (sort === "duration") deals.sort((a, b) => durationMinutes(a) - durationMinutes(b));
  if (sort === "score") deals.sort((a, b) => scoreDeal(b) - scoreDeal(a));

  if (preferHidden) {
    const hiddenIds = new Set(["gothenburg", "krakow"]);
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
  const bookingLinks = transportBookingLinks(deal, destination);
  const fareLabel = deal.fareStatus === "verified" ? "Verified fare" : "Target fare";
  const dealDates = effectiveDealDates(deal);
  return `
    <article class="deal-card${selected}" data-deal-id="${escapeHtml(deal.id)}">
      ${cardImage(deal.image || destination?.image, deal.title, [deal.mode || "Deal", dogText])}
      <div class="card-body">
        <div>
          <h3>${escapeHtml(deal.title)}</h3>
          <p class="muted">${escapeHtml(deal.route || "Route to confirm")} - ${escapeHtml(deal.duration || "Duration to confirm")}</p>
        </div>
        <div class="meta-grid">
          <div><span>${fareLabel}</span><strong>${money(deal.price)}</strong></div>
          <div><span>Score</span><strong>${score}/100</strong></div>
        </div>
        <p>${escapeHtml(deal.description || "Provider-linked deal. Confirm live fare before booking.")}</p>
        ${deal.travelWindow ? `<p class="muted"><strong>Best window:</strong> ${escapeHtml(deal.travelWindow)}</p>` : ""}
        <p class="muted"><strong>Fare search date:</strong> ${escapeHtml(formatDate(dealDates.departure))} to ${escapeHtml(formatDate(dealDates.returnDate))}</p>
        <p class="muted"><strong>Price source:</strong> ${escapeHtml(deal.priceConfidence || "Lead price; verify before booking")} - ${escapeHtml(compactDateTime(deal.lastChecked))}</p>
        ${deal.petNote ? `<p class="muted"><strong>Dog note:</strong> ${escapeHtml(deal.petNote)}</p>` : ""}
        ${compact ? "" : `<p class="muted">Book by: ${escapeHtml(deal.expires || "Flexible")}</p>`}
        <div class="card-actions">
          <button class="secondary-button compact-action" type="button" data-action="details">Details</button>
          <button class="primary-button compact-action" type="button" data-action="select-deal">Select</button>
          ${bookingLinks.slice(0, compact ? 4 : 6).map((link) => `<a class="link-button" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`).join("")}
          <a class="link-button" href="https://www.google.com/maps/search/${encodeURIComponent(destination?.name || deal.destination || deal.title)}" target="_blank" rel="noreferrer">Map</a>
        </div>
      </div>
    </article>
  `;
}

function chooseDeal(dealId, options = {}) {
  state.selectedDealId = dealId;
  state.selectedAccommodationId = null;
  state.selectedActivityIds.clear();
  if (options.closeModal) els.modal.classList.add("hidden");
  renderAll();
  if (options.scroll) {
    document.getElementById("planner-tab").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function hydrateDealCards(container) {
  container.querySelectorAll(".deal-card").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest("a")) return;
      const actionButton = event.target.closest("[data-action]");
      if (actionButton?.dataset.action === "details") {
        openDestinationDetail(card.dataset.dealId);
        return;
      }
      chooseDeal(card.dataset.dealId);
    });
  });
}

function renderDeals() {
  const deals = sortedDeals();
  els.deals.innerHTML = deals.map((deal) => dealCard(deal)).join("");
  hydrateDealCards(els.deals);
}

function renderDealBoard() {
  const query = (els.dealSearch.value || "").toLowerCase();
  const deals = state.deals
    .filter((deal) => !LOCAL_SKANE_DESTINATIONS.has(String(deal.destination)))
    .filter((deal) => JSON.stringify(deal).toLowerCase().includes(query));
  els.dealBoard.innerHTML = deals.map((deal) => dealCard(deal, true)).join("");
  hydrateDealCards(els.dealBoard);
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

  if (!stays.some((stay) => stay.id === state.selectedAccommodationId)) {
    state.selectedAccommodationId = stays[0]?.id || null;
  }

  els.accommodations.innerHTML = stays.length
    ? stays.map((stay) => {
      const bookingLinks = accommodationBookingLinks(stay);
      return `
      <article class="option-card${state.selectedAccommodationId === stay.id ? " selected" : ""}" data-stay-id="${escapeHtml(stay.id)}">
        ${cardImage(stay.image, stay.name, [`${stay.rating}/5`, stay.dogFriendly ? "Dog-friendly" : "No dog note"])}
        <div class="card-body">
          <h3>${escapeHtml(stay.name)}</h3>
          <p class="muted">${escapeHtml(stay.address || "Area to confirm")}</p>
          <p>${escapeHtml((stay.features || []).join(", "))}</p>
          <p class="muted"><strong>Price source:</strong> ${escapeHtml(stay.priceConfidence || "Indicative nightly price")} ${stay.lastChecked ? `- ${escapeHtml(compactDateTime(stay.lastChecked))}` : ""}</p>
          ${stay.petNote ? `<p class="muted"><strong>Dog note:</strong> ${escapeHtml(stay.petNote)}</p>` : ""}
          <div class="meta-grid">
            <div><span>Night</span><strong>${money(stay.price)}</strong></div>
            <div><span>Rating</span><strong>${escapeHtml(stay.rating)}</strong></div>
          </div>
          <div class="card-actions">
            ${bookingLinks.map((link) => `<a class="link-button" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`).join("")}
            ${stay.petPolicyUrl ? `<a class="link-button" href="${escapeHtml(stay.petPolicyUrl)}" target="_blank" rel="noreferrer">Pet policy</a>` : ""}
          </div>
        </div>
      </article>
    `;
    }).join("")
    : `<p class="muted">No stays match these filters. Raise the budget or turn off dog-only mode.</p>`;

  els.accommodations.querySelectorAll(".option-card").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest("a")) return;
      state.selectedAccommodationId = card.dataset.stayId;
      renderAccommodations();
      refreshPlannerInsights();
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
      refreshPlannerInsights();
    });
  });
}

function renderGems() {
  els.hiddenGems.innerHTML = state.gems.map((gem) => `
    <article class="gem-card" data-gem-id="${escapeHtml(gem.id || gem.name)}">
      ${cardImage(gem.image, gem.name, [gem.region || "Skane", gem.type || "Quiet place"])}
      <div class="card-body">
        <h3>${escapeHtml(gem.name)}</h3>
        <p>${escapeHtml(gem.description)}</p>
        <div class="meta-grid">
          <div><span>Entrance</span><strong>${escapeHtml(gem.entranceCost || "Free")}</strong></div>
          <div><span>Public transport</span><strong>${escapeHtml(gem.publicTransportTime || gem.fromLund || "Check route")}</strong></div>
          <div><span>Summer ticket</span><strong>${escapeHtml(gem.summerTicketEligible ? "Best value" : "Check coverage")}</strong></div>
          <div><span>Stay pick</span><strong>${escapeHtml(gem.bestAccommodation?.name || "Optional")}</strong></div>
        </div>
        <p class="muted"><strong>Best route:</strong> ${escapeHtml((gem.bestRoute || []).map((leg) => `${leg.mode}: ${leg.detail}`).join(" | ") || "Open Skånetrafiken planner for exact departure.")}</p>
        <p class="muted"><strong>Travel cost:</strong> ${escapeHtml(gem.summerTicketNote || "With active summer ticket: SEK 0 extra. Without it, check single fares.")}</p>
        <p class="muted"><strong>Best for:</strong> ${escapeHtml(gem.bestFor || "day trip")}</p>
        <p class="muted"><strong>Tip:</strong> ${escapeHtml(gem.tip || "Check transit before you go.")}</p>
        <div class="card-actions">
          <button type="button" class="primary-button" data-action="build-skane">Generate Skane plan</button>
          ${gem.travelPlannerUrl ? `<a class="link-button" href="${escapeHtml(gem.travelPlannerUrl)}" target="_blank" rel="noreferrer">Skånetrafiken route</a>` : ""}
          <a class="link-button" href="https://www.google.com/maps/search/${encodeURIComponent(gem.name + " " + (gem.region || ""))}" target="_blank" rel="noreferrer">Open map</a>
          ${gem.sourceUrl ? `<a class="link-button" href="${escapeHtml(gem.sourceUrl)}" target="_blank" rel="noreferrer">Official info</a>` : ""}
        </div>
      </div>
    </article>
  `).join("");

  els.hiddenGems.querySelectorAll("[data-action='build-skane']").forEach((button) => {
    button.addEventListener("click", (event) => {
      const card = event.target.closest(".gem-card");
      const gem = state.gems.find((item) => String(item.id || item.name) === card.dataset.gemId);
      if (gem) buildSkaneItinerary(gem);
    });
  });
}

function buildSkaneItinerary(gem) {
  const travelers = Number(els.numTravelers.value || 2);
  const date = els.travelDate.value || todayIso();
  const stay = gem.bestAccommodation || {};
  const useSummerTicket = Boolean(gem.summerTicketEligible);
  const summerTravelCost = useSummerTicket ? 0 : Number(gem.roundTripSek || 0) * travelers;
  const normalTravelCost = Number(gem.roundTripSek || 0) * travelers;
  const entranceCost = Number(gem.entranceCostSek || 0) * travelers;
  const accommodationCost = Number(stay.pricePerNightSek || 0);
  const totalDayTrip = summerTravelCost + entranceCost;
  const totalWithStay = totalDayTrip + accommodationCost;
  const plan = {
    id: Date.now(),
    type: "skane",
    title: `${gem.name} Skane plan`,
    destination: gem.name,
    date,
    travelers,
    gem,
    stay,
    costs: { summerTravelCost, normalTravelCost, entranceCost, accommodationCost, totalDayTrip, totalWithStay },
  };
  renderSkaneItinerary(plan);
}

function renderSkaneItinerary(plan) {
  const { gem, stay, costs } = plan;
  els.skaneItinerary.classList.add("has-content");
  els.skaneItinerary.innerHTML = `
    <div class="itinerary-hero">
      <div>
        <p class="eyebrow">Skane local itinerary</p>
        <h2>${escapeHtml(plan.title)}</h2>
        <p class="muted">${escapeHtml(formatDate(plan.date))} - ${plan.travelers} people - from Lund</p>
        <p>${escapeHtml(gem.description)}</p>
        <p class="muted"><strong>Dog:</strong> ${escapeHtml(gem.dogNote || "Use leash in nature reserves and check indoor access before entering with a dog.")}</p>
        <div class="source-grid">
          ${gem.travelPlannerUrl ? `<a class="decision-link" href="${escapeHtml(gem.travelPlannerUrl)}" target="_blank" rel="noreferrer">Book/check Skånetrafiken</a>` : ""}
          ${stay.bookingUrl ? `<a class="decision-link" href="${escapeHtml(stay.bookingUrl)}" target="_blank" rel="noreferrer">Check accommodation</a>` : ""}
          <a class="decision-link" href="https://www.google.com/maps/search/${encodeURIComponent(gem.name + " " + (gem.region || ""))}" target="_blank" rel="noreferrer">Map destination</a>
          ${gem.sourceUrl ? `<a class="decision-link" href="${escapeHtml(gem.sourceUrl)}" target="_blank" rel="noreferrer">Official place info</a>` : ""}
        </div>
      </div>
      <div>
        <img class="itinerary-photo" src="${escapeHtml(gem.image || "")}" alt="${escapeHtml(gem.name)}" />
        <div class="cost-grid">
          <div><span>Travel with summer ticket</span><strong>${moneySek(costs.summerTravelCost)}</strong></div>
          <div><span>Normal round trip estimate</span><strong>${moneySek(costs.normalTravelCost)}</strong></div>
          <div><span>Entrance</span><strong>${moneySek(costs.entranceCost)}</strong></div>
          <div><span>Best stay option</span><strong>${moneySek(costs.accommodationCost)}</strong></div>
          <div class="total-line"><span>Day trip total</span>${moneySek(costs.totalDayTrip)}</div>
          <div class="total-line"><span>With 1-night stay</span>${moneySek(costs.totalWithStay)}</div>
        </div>
      </div>
    </div>
    <section class="booking-brief">
      <div>
        <span>Best public route</span>
        <strong>${escapeHtml(gem.publicTransportTime || "Check current timetable")}</strong>
        <p>${escapeHtml(gem.summerTicketNote || "Summer ticket gives lowest incremental travel cost if already active.")}</p>
      </div>
      <div>
        <span>Accommodation pick</span>
        <strong>${escapeHtml(stay.name || "Optional day trip")}</strong>
        <p>${escapeHtml(stay.name ? `${stay.area || "Nearby"}, ${moneySek(stay.pricePerNightSek)} / night. ${stay.dogFriendly ? "Dog-friendly filter/link included." : "Confirm dog policy."}` : "No overnight stay needed for this one.")}</p>
      </div>
      <div>
        <span>Dog travel</span>
        <strong>${escapeHtml(gem.dogFriendly ? "Good candidate" : "Check first")}</strong>
        <p>${escapeHtml(gem.dogNote || "Use Skånetrafiken pet rules and destination rules before leaving.")}</p>
      </div>
    </section>
    <div class="day-list">
      <article class="day-card">
        <p class="eyebrow">${escapeHtml(formatDate(plan.date))}</p>
        <h3>Outbound route from Lund</h3>
        <ul class="checklist">
          ${(gem.bestRoute || []).map((leg) => `<li>${escapeHtml(`${leg.mode}: ${leg.detail}`)}</li>`).join("")}
        </ul>
        <p class="muted">Always press the Skånetrafiken route button before leaving because bus numbers and seasonal timetables can change.</p>
      </article>
      <article class="day-card">
        <p class="eyebrow">At destination</p>
        <h3>${escapeHtml(gem.name)}</h3>
        <p>${escapeHtml(gem.onSitePlan || gem.tip || "Walk slowly, keep room for fika, and check opening hours for paid indoor stops.")}</p>
        <ul class="checklist">
          <li>Entrance: ${escapeHtml(gem.entranceCost || "Free")}</li>
          <li>Best for: ${escapeHtml(gem.bestFor || "day trip")}</li>
          <li>Food/fika: ${escapeHtml(gem.foodTip || "Bring picnic or check nearby cafe on map.")}</li>
          <li>Dog: ${escapeHtml(gem.dogNote || "Leash recommended.")}</li>
        </ul>
      </article>
      <article class="day-card">
        <p class="eyebrow">Return or stay</p>
        <h3>Return to Lund or sleep nearby</h3>
        <p>${escapeHtml(stay.name ? `Best overnight pick: ${stay.name} in ${stay.area || gem.region}, estimated ${moneySek(stay.pricePerNightSek)} per night. Book/check with the accommodation link before deciding.` : "Return to Lund the same day; accommodation is optional.")}</p>
      </article>
    </div>
  `;
  els.skaneItinerary.scrollIntoView({ behavior: "smooth", block: "start" });
}

function buildDays({ deal, destination, stay, activities, length, travelers, travelDate, mood }) {
  const days = [];
  const transportLinks = transportBookingLinks(deal, destination);
  const moodPrompt = {
    balanced: "Keep the day varied but realistic.",
    romantic: "Prioritize slower walks, viewpoints, dinner, and less rushing.",
    budget: "Favor free walks, public transport, and one paid highlight only if it is worth it.",
    nature: "Bias toward parks, coast, islands, lakes, and quiet neighborhoods.",
    culture: "Bias toward museums, food streets, old-town walks, and local history.",
  }[mood] || "Keep the day varied but realistic.";

  days.push({
    title: "Travel and arrival",
    body: `${deal.mode || "Travel"} from ${deal.route || els.origin.value} taking ${deal.duration || "time to confirm"}. Check in near ${stay?.address || destination?.name || deal.destination}. Keep the first evening simple: local dinner, short walk, and confirm tomorrow's first stop.`,
    cost: Number(deal.price || 0) * travelers,
    checklist: ["Confirm final fare and baggage", "Save tickets offline", "Message stay about arrival time", "Confirm pet/carrier rules if dog is travelling"],
    links: transportLinks.slice(0, 3),
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
      body: `${morning.name} in the morning (${morning.duration}). ${afternoon && afternoon.id !== morning.id ? `${afternoon.name} later in the day.` : "Leave space for a slow lunch and neighborhood wandering."} ${moodPrompt}`,
      cost: (Number(morning.price || 0) + (afternoon && afternoon.id !== morning.id ? Number(afternoon.price || 0) : 0)) * travelers,
      checklist: ["Check opening hours", "Save map pins", "Book timed entry if needed", "Check weather before leaving"],
      links: [
        { label: "Map day area", url: `https://www.google.com/maps/search/${encodeURIComponent(destination?.name || deal.destination)}` },
        { label: "Search tickets", url: `https://www.google.com/search?q=${encodeURIComponent(`${morning.name} tickets ${destination?.name || deal.destination}`)}` },
      ],
    });
  }

  return days.map((day, index) => ({ ...day, date: travelDate ? formatDate(addDays(travelDate, index)) : `Day ${index + 1}` }));
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function nextSaturday(from = new Date()) {
  const date = new Date(from);
  const daysUntilSaturday = (6 - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + daysUntilSaturday);
  return date.toISOString().slice(0, 10);
}

function applyDatePreset(preset) {
  if (preset === "weekend") {
    els.travelDate.value = nextSaturday();
    els.tripLength.value = "2";
  }
  if (preset === "next-week") {
    els.travelDate.value = addDays(todayIso(), 7);
    els.tripLength.value = "3";
  }
  if (preset === "month") {
    els.travelDate.value = addDays(todayIso(), 30);
    els.tripLength.value = "5";
  }
  renderAll();
}

function currentStay() {
  return state.accommodations.find((item) => item.id === state.selectedAccommodationId);
}

function selectedActivities() {
  return [...state.selectedActivityIds]
    .map((id) => state.activities.find((activity) => activity.id === id))
    .filter(Boolean);
}

function estimateCurrentTotal() {
  const deal = selectedDeal();
  if (!deal) return { total: 0, perPerson: 0 };
  const travelers = Number(els.numTravelers.value || 2);
  const nights = Math.max(0, Number(els.tripLength.value || 3) - 1);
  const stay = currentStay();
  const activities = selectedActivities();
  const activityTotal = activities.reduce((sum, activity) => sum + Number(activity.price || 0) * travelers, 0);
  const total = Number(deal.price || 0) * travelers + (stay ? Number(stay.price || 0) * nights : 0) + activityTotal;
  return { total, perPerson: total / travelers };
}

function providerLinks(planOrDeal, destination) {
  const deal = planOrDeal.deal || planOrDeal;
  const city = destination?.name || deal.destination || "";
  const encodedCity = encodeURIComponent(city);
  const from = encodeURIComponent(els.origin.value || deal.origin || "Lund");
  return [
    ...transportBookingLinks(deal, destination),
    { label: "Lastminute package", url: `https://www.lastminute.com/search?search.destination=${encodedCity}` },
    { label: "Compare stays", url: `https://www.booking.com/searchresults.html?ss=${encodedCity}&group_adults=${encodeURIComponent(els.numTravelers.value || "2")}&nflt=hotelfacility%3D4` },
    { label: "Google Hotels", url: `https://www.google.com/travel/hotels/${encodedCity}` },
    { label: "Map route", url: `https://www.google.com/maps/dir/${from}/${encodedCity}` },
    { label: "Weather check", url: `https://www.google.com/search?q=${encodedCity}+weather+${encodeURIComponent(formatDate(els.travelDate.value))}` },
    { label: "Dog travel rules", url: `https://www.google.com/search?q=${encodedCity}+small+dog+travel+rules+airline+hotel` },
    { label: "Restaurants nearby", url: `https://www.google.com/maps/search/restaurants+near+${encodedCity}` },
  ].filter((link) => link.url);
}

function refreshPlannerInsights() {
  const deal = selectedDeal();
  if (!deal) return;
  const destination = destinationFor(deal) || {};
  const stay = currentStay();
  const activities = selectedActivities();
  const estimate = estimateCurrentTotal();
  const length = Number(els.tripLength.value || 3);
  const travelers = Number(els.numTravelers.value || 2);
  const mood = els.tripMood.value;
  const windowEnd = els.travelDate.value ? addDays(els.travelDate.value, Math.max(0, length - 1)) : "";

  els.recommendationTitle.textContent = `${destination.name || deal.destination}: ${deal.title}`;
  els.recommendationCopy.textContent = `${moodLabel(mood)} plan from ${money(deal.price)} transport, ${stay ? `${stay.name} at ${money(stay.price)}/night` : "stay not selected yet"}, and ${activities.length} selected activities.`;
  els.tripWindow.textContent = els.travelDate.value ? `${formatDate(els.travelDate.value)} to ${formatDate(windowEnd)}` : "Flexible";
  els.instantTotal.textContent = `${money(estimate.total)} total / ${money(estimate.perPerson)} pp`;
  els.nextAction.textContent = stay ? "Generate plan" : "Pick stay";
  els.plannerSnapshot.innerHTML = `
    <strong>${escapeHtml(destination.name || deal.destination)}</strong>
    <span>${length} days, ${travelers} people</span>
    <span>${escapeHtml(stay?.name || "No stay selected")}</span>
    <span>${money(estimate.total)} estimate</span>
  `;
  els.decisionPack.innerHTML = providerLinks(deal, destination)
    .map((link) => `<a class="decision-link" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`)
    .join("");
}

function moodLabel(mood) {
  const labels = {
    balanced: "Balanced discovery",
    romantic: "Romantic slow-travel",
    budget: "Cheapest sensible",
    nature: "Nature and quiet places",
    culture: "Culture and food",
  };
  return labels[mood] || "Balanced discovery";
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
  const mood = els.tripMood.value;
  const nights = Math.max(0, length - 1);
  const travelDate = els.travelDate.value;
  const travelCost = Number(deal.price || 0) * travelers;
  const stayCost = stay ? Number(stay.price || 0) * nights : 0;
  const days = buildDays({ deal, destination, stay, activities, length, travelers, travelDate, mood });
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
    mood,
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
  const sourceLinks = providerLinks(plan, destination);
  const stay = plan.stay;
  els.itinerary.classList.add("has-content");
  els.itinerary.innerHTML = `
    <div class="itinerary-hero">
      <div>
        <p class="eyebrow">Generated plan</p>
        <h2>${escapeHtml(plan.title)}</h2>
        <p class="muted">${escapeHtml(formatDate(plan.travelDate))} - ${plan.length} days - ${plan.travelers} people - ${escapeHtml(moodLabel(plan.mood))}</p>
        <p>${escapeHtml(destination.description || "A provider-linked itinerary built from selected deals, stays, and activities.")}</p>
        <p class="muted">${escapeHtml(plan.dogNote)}</p>
        <div class="source-grid">
          ${sourceLinks.map((link) => `<a class="decision-link" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`).join("")}
        </div>
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
    <section class="booking-brief">
      <div>
        <span>Transport</span>
        <strong>${escapeHtml(plan.deal.route || "Route to confirm")}</strong>
        <p>${escapeHtml(plan.deal.provider || "Provider")} - ${escapeHtml(plan.deal.duration || "Duration to confirm")}</p>
      </div>
      <div>
        <span>Stay</span>
        <strong>${escapeHtml(stay?.name || "No stay selected")}</strong>
        <p>${escapeHtml(stay ? `${stay.address}, ${money(stay.price)}/night, ${stay.rating}/5` : "Pick a stay before booking.")}</p>
      </div>
      <div>
        <span>Decision</span>
        <strong>${money(plan.costs.total)} estimated</strong>
        <p>Book transport first when fare is good, then refundable stay, then paid activities.</p>
      </div>
    </section>
    <div class="day-list">
      ${plan.days.map((day, index) => `
        <article class="day-card">
          <p class="eyebrow">${escapeHtml(day.date)}</p>
          <h3>Day ${index + 1}: ${escapeHtml(day.title)}</h3>
          <p>${escapeHtml(day.body)}</p>
          <p class="muted">Estimated day cost for ${plan.travelers}: ${money(day.cost)}</p>
          <ul class="checklist">
            ${(day.checklist || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
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

function itemsForDestination(collection, destinationId) {
  return collection.filter((item) => String(item.destination || "").toLowerCase() === String(destinationId || "").toLowerCase());
}

function bestStaysForDestination(destinationId) {
  return itemsForDestination(state.accommodations, destinationId)
    .sort((a, b) => Number(b.dogFriendly) - Number(a.dogFriendly) || Number(b.rating) - Number(a.rating) || Number(a.price) - Number(b.price));
}

function bestActivitiesForDestination(destinationId) {
  return itemsForDestination(state.activities, destinationId)
    .sort((a, b) => Number(b.dogFriendly) - Number(a.dogFriendly) || Number(b.rating) - Number(a.rating) || Number(a.price) - Number(b.price));
}

function openDestinationDetail(dealId) {
  const deal = state.deals.find((item) => item.id === dealId) || selectedDeal();
  if (!deal) return;

  const destination = destinationFor(deal) || {};
  const destinationId = String(deal.destination || "").toLowerCase();
  const destinationDeals = state.deals
    .filter((item) => String(item.destination || "").toLowerCase() === destinationId)
    .sort((a, b) => scoreDeal(b) - scoreDeal(a));
  const stays = bestStaysForDestination(destinationId).slice(0, 4);
  const activities = bestActivitiesForDestination(destinationId).slice(0, 6);
  const gallery = [
    destination.image,
    deal.image,
    ...destinationDeals.map((item) => item.image),
    ...stays.map((stay) => stay.image),
  ].filter(Boolean).filter((value, index, list) => list.indexOf(value) === index).slice(0, 5);
  const dogIsLikely = Boolean(destination.dogFriendly || deal.dogFriendly || /dog|pet|small dog/i.test(`${deal.description || ""} ${deal.petNote || ""}`));
  const sourceLinks = providerLinks(deal, destination);

  els.modalBody.innerHTML = `
    <article class="destination-detail" data-detail-deal-id="${escapeHtml(deal.id)}">
      <section class="detail-hero">
        <div>
          <p class="eyebrow">Destination details</p>
          <h2>${escapeHtml(destination.name || deal.destination)}${destination.country ? `, ${escapeHtml(destination.country)}` : ""}</h2>
          <p>${escapeHtml(destination.description || deal.description || "Review the destination, booking options, stays, activities, and dog decision before selecting this trip.")}</p>
          <div class="detail-actions">
            <button class="secondary-button" type="button" data-action="back">Back</button>
            <button class="primary-button" type="button" data-action="select-detail">Select this trip</button>
            <button class="primary-button" type="button" data-action="generate-detail">Select and build itinerary</button>
          </div>
        </div>
        <img class="detail-main-photo" src="${escapeHtml(gallery[0] || destination.image || deal.image || "")}" alt="${escapeHtml(destination.name || deal.title)}" />
      </section>

      <section class="detail-gallery" aria-label="Destination pictures">
        ${gallery.map((src, index) => `<img src="${escapeHtml(src)}" alt="${escapeHtml(`${destination.name || deal.destination} picture ${index + 1}`)}" loading="lazy" />`).join("")}
      </section>

      <section class="detail-section">
        <div>
          <p class="eyebrow">Why go</p>
          <h3>What is good there</h3>
        </div>
        <div class="highlight-grid">
          ${(destination.highlights || []).map((item) => `<span>${escapeHtml(item)}</span>`).join("") || `<span>${escapeHtml(deal.description || "Good value route to inspect")}</span>`}
        </div>
      </section>

      <section class="detail-section">
        <div>
          <p class="eyebrow">Dog decision</p>
          <h3>${dogIsLikely ? "Dog can probably travel with checks" : "Dog may be difficult on this trip"}</h3>
        </div>
        <div class="dog-decision-grid">
          <article>
            <strong>Take dog</strong>
            <p>${escapeHtml(dogIsLikely ? (deal.petNote || "Small dog mode is possible, but confirm carrier size, cabin limits, pet fees, and hotel policy before booking.") : "Still possible if a specific airline/hotel allows it, but expect more checks and fewer indoor activity choices.")}</p>
            <button class="secondary-button" type="button" data-action="dog-on">Plan with dog</button>
          </article>
          <article>
            <strong>Leave dog with friend</strong>
            <p>Use this when the best fare, museum-heavy itinerary, or accommodation value is better without pet restrictions. The planner will show more options.</p>
            <button class="secondary-button" type="button" data-action="dog-off">Plan without dog</button>
          </article>
        </div>
      </section>

      <section class="detail-section">
        <div>
          <p class="eyebrow">Booking options</p>
          <h3>Ways to book or compare</h3>
        </div>
        <div class="source-grid">
          ${sourceLinks.map((link) => `<a class="decision-link" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`).join("")}
        </div>
      </section>

      <section class="detail-section">
        <div>
          <p class="eyebrow">Travel choices</p>
          <h3>Compare deal options</h3>
        </div>
        <div class="detail-list">
          ${destinationDeals.map((item) => {
            const itemLinks = transportBookingLinks(item, destination);
            return `
            <article class="detail-row${item.id === deal.id ? " selected-row" : ""}">
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <p class="muted">${escapeHtml(item.route || "Route to confirm")} - ${escapeHtml(item.duration || "Duration to confirm")}</p>
                <p class="muted">${escapeHtml(item.travelWindow || "Flexible dates")} - ${escapeHtml(item.petNote || (item.dogFriendly ? "Small dog possible; confirm rules." : "Check dog rules."))}</p>
              </div>
              <div>
                <strong>${money(item.price)}</strong>
                <button class="secondary-button" type="button" data-action="select-other-deal" data-deal-id="${escapeHtml(item.id)}">Use</button>
                ${itemLinks.slice(0, 4).map((link) => `<a class="link-button" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`).join("")}
              </div>
            </article>
          `;
          }).join("")}
        </div>
      </section>

      <section class="detail-section">
        <div>
          <p class="eyebrow">Accommodation</p>
          <h3>Stay options near arrival</h3>
        </div>
        <div class="detail-card-grid">
          ${stays.map((stay) => {
            const bookingLinks = accommodationBookingLinks(stay);
            return `
            <article class="mini-detail-card">
              ${stay.image ? `<img src="${escapeHtml(stay.image)}" alt="${escapeHtml(stay.name)}" loading="lazy" />` : ""}
              <div>
                <h4>${escapeHtml(stay.name)}</h4>
                <p class="muted">${escapeHtml(stay.address || stay.area || "Area to confirm")}</p>
                <p>${escapeHtml((stay.features || []).join(", ") || "Compare room and cancellation terms before booking.")}</p>
                <div class="meta-grid">
                  <div><span>Night</span><strong>${money(stay.price)}</strong></div>
                  <div><span>Dog</span><strong>${stay.dogFriendly ? "Good" : "Check"}</strong></div>
                </div>
                <div class="card-actions">
                  <button class="secondary-button compact-action" type="button" data-action="select-stay" data-stay-id="${escapeHtml(stay.id)}">Use stay</button>
                  ${bookingLinks.slice(0, 3).map((link) => `<a class="link-button" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`).join("")}
                </div>
              </div>
            </article>
          `;
          }).join("") || `<p class="muted">No accommodation options stored yet for this destination. Use Compare stays in booking links.</p>`}
        </div>
      </section>

      <section class="detail-section">
        <div>
          <p class="eyebrow">Activities</p>
          <h3>What to do with prices</h3>
        </div>
        <div class="detail-card-grid">
          ${activities.map((activity) => `
            <article class="mini-detail-card activity-mini">
              <div>
                <span class="score-pill">${escapeHtml(activity.category || "Activity")}</span>
                <h4>${escapeHtml(activity.name)}</h4>
                <p>${escapeHtml(activity.description || "Activity idea to consider.")}</p>
                <div class="meta-grid">
                  <div><span>Cost</span><strong>${money(activity.price)}</strong></div>
                  <div><span>Dog</span><strong>${activity.dogFriendly ? "Good" : "No/check"}</strong></div>
                </div>
                <button class="secondary-button compact-action" type="button" data-action="toggle-activity" data-activity-id="${escapeHtml(activity.id)}">Add/remove</button>
              </div>
            </article>
          `).join("") || `<p class="muted">No activities stored yet for this destination. Use map and search links above.</p>`}
        </div>
      </section>
    </article>
  `;

  els.modal.classList.remove("hidden");

  els.modalBody.querySelectorAll("[data-action]").forEach((control) => {
    control.addEventListener("click", () => {
      const action = control.dataset.action;
      if (action === "back") els.modal.classList.add("hidden");
      if (action === "dog-on") {
        els.dogFriendly.checked = true;
        chooseDeal(deal.id);
        openDestinationDetail(deal.id);
      }
      if (action === "dog-off") {
        els.dogFriendly.checked = false;
        chooseDeal(deal.id);
        openDestinationDetail(deal.id);
      }
      if (action === "select-detail") chooseDeal(deal.id, { closeModal: true, scroll: true });
      if (action === "generate-detail") {
        chooseDeal(deal.id, { closeModal: true });
        buildItinerary();
      }
      if (action === "select-other-deal") {
        chooseDeal(control.dataset.dealId);
        openDestinationDetail(control.dataset.dealId);
      }
      if (action === "select-stay") {
        state.selectedAccommodationId = control.dataset.stayId;
        renderAll();
        openDestinationDetail(deal.id);
      }
      if (action === "toggle-activity") {
        const id = control.dataset.activityId;
        if (state.selectedActivityIds.has(id)) state.selectedActivityIds.delete(id);
        else state.selectedActivityIds.add(id);
        renderAll();
        openDestinationDetail(deal.id);
      }
    });
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
  const destination = state.destinations.find((item) => item.name === trip.destination || item.id === String(trip.destination || "").toLowerCase());
  const sourceLinks = providerLinks(trip, destination || {});
  els.modalBody.innerHTML = `<div id="modalItinerary"></div>`;
  els.modal.classList.remove("hidden");
  const modalTarget = document.getElementById("modalItinerary");
  modalTarget.innerHTML = `
    <h2>${escapeHtml(trip.title || trip.destination)}</h2>
    <p class="muted">${escapeHtml(trip.status === "done" ? `Completed ${formatDate(trip.completedAt)}` : "Planned trip")} - ${escapeHtml(moodLabel(trip.mood))}</p>
    <div class="source-grid">
      ${sourceLinks.map((link) => `<a class="decision-link" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`).join("")}
    </div>
    <div class="cost-grid">
      <div><span>Total</span><strong>${money(trip.costs?.total || 0)}</strong></div>
      <div><span>Per person</span><strong>${money(trip.costs?.perPerson || 0)}</strong></div>
      <div><span>Stay</span><strong>${escapeHtml(trip.stay?.name || "Not selected")}</strong></div>
      <div><span>Transport</span><strong>${escapeHtml(trip.deal?.route || "Check route")}</strong></div>
    </div>
    <div class="day-list">
      ${(trip.days || []).map((day, index) => `
        <article class="day-card">
          <p class="eyebrow">${escapeHtml(day.date)}</p>
          <h3>Day ${index + 1}: ${escapeHtml(day.title)}</h3>
          <p>${escapeHtml(day.body)}</p>
          <ul class="checklist">
            ${(day.checklist || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
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
  const europeDeals = state.deals.filter((deal) => !LOCAL_SKANE_DESTINATIONS.has(String(deal.destination)));
  const best = [...europeDeals].sort((a, b) => Number(a.price || 9999) - Number(b.price || 9999))[0];
  const dogCount = europeDeals.filter((deal) => deal.dogFriendly || /dog|pet/i.test(deal.description || "")).length;
  els.bestValue.textContent = best ? `${best.title} from ${money(best.price)}` : "No deals loaded";
  els.dogCount.textContent = `${dogCount} current deal options`;
  els.lastUpdated.textContent = `Loaded ${new Date().toLocaleString("en-GB")}`;
}

function renderUpcomingDealRadar() {
  const upcoming = state.deals
    .filter((deal) => !LOCAL_SKANE_DESTINATIONS.has(String(deal.destination)))
    .map((deal) => ({ deal, dates: effectiveDealDates(deal), destination: destinationFor(deal) || {} }))
    .sort((a, b) => new Date(`${a.dates.departure}T12:00:00`) - new Date(`${b.dates.departure}T12:00:00`))
    .slice(0, 6);

  els.upcomingDeals.innerHTML = `
    <div class="section-heading">
      <div>
        <p class="eyebrow">Upcoming deal radar</p>
        <h2>Future fare windows to watch</h2>
      </div>
    </div>
    <div class="radar-grid">
      ${upcoming.map(({ deal, dates, destination }) => {
        const links = transportBookingLinks(deal, destination);
        return `
          <article class="radar-card">
            <div>
              <strong>${escapeHtml(destination.name || deal.destination)}</strong>
              <p class="muted">${escapeHtml(formatDate(dates.departure))} to ${escapeHtml(formatDate(dates.returnDate))}</p>
              <p>${escapeHtml(deal.travelWindow || "Future deal window")}</p>
            </div>
            <div class="radar-actions">
              <span>${money(deal.price)}</span>
              ${links.slice(0, 3).map((link) => `<a class="decision-link" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`).join("")}
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderAll() {
  renderDeals();
  renderDealBoard();
  renderAccommodations();
  renderActivities();
  renderGems();
  renderDiary();
  updateStats();
  renderUpcomingDealRadar();
  refreshPlannerInsights();
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

  [els.dealSort, els.dogFriendly, els.hiddenGemMode, els.tripMood, els.tripLength, els.origin].forEach((el) => el.addEventListener("change", renderAll));
  [els.travelDate, els.numTravelers].forEach((el) => el.addEventListener("input", renderAll));
  document.querySelectorAll("[data-date-preset]").forEach((button) => {
    button.addEventListener("click", () => applyDatePreset(button.dataset.datePreset));
  });
  els.dealSearch.addEventListener("input", renderDealBoard);
  els.maxPrice.addEventListener("input", () => {
    els.priceValue.textContent = money(els.maxPrice.value);
    renderAccommodations();
    refreshPlannerInsights();
  });
  els.minRating.addEventListener("input", () => {
    els.ratingValue.textContent = els.minRating.value;
    renderAccommodations();
    refreshPlannerInsights();
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
