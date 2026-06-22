// Refresh Button: Clear cache and reload
document.getElementById("refreshButton").addEventListener("click", () => {
  // Clear browser cache for data files
  localStorage.removeItem("cacheVersion");
  
  // Clear application data (but keep saved trips)
  const savedTrips = localStorage.getItem("savedTrips");
  localStorage.clear();
  if (savedTrips) {
    localStorage.setItem("savedTrips", savedTrips);
  }
  
  // Hard refresh with cache busting
  const timestamp = new Date().getTime();
  window.location.href = window.location.href.split("#")[0] + `?_cache=${timestamp}`;
});

// State
let globalDeals = [];
let globalGems = [];
let globalDestinations = [];
let globalAccommodations = [];
let globalActivities = [];

let selectedDealId = null;
let selectedAccommodationIds = new Set();
let selectedActivityIds = new Set();

// Utility Functions
async function loadData(filename) {
  try {
    // Add cache busting parameter
    const timestamp = new Date().getTime();
    const response = await fetch(`${filename}?_cache=${timestamp}`);
    return await response.json();
  } catch (e) {
    console.error(`Failed to load ${filename}:`, e);
    return [];
  }
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatPrice(value) {
  return typeof value === "number" ? `€${value.toFixed(0)}` : value;
}

function formatDate(dateStr) {
  if (!dateStr) return "Flexible";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Tab Switching
document.querySelectorAll(".nav-tab").forEach((tab) => {
  tab.addEventListener("click", (e) => {
    const tabName = e.target.dataset.tab;
    document.querySelectorAll(".nav-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    e.target.classList.add("active");
    document.getElementById(`${tabName}-tab`).classList.add("active");
  });
});

// Render Deals
function renderDeals(deals) {
  const dealsContainer = document.getElementById("deals");
  dealsContainer.innerHTML = deals
    .map(
      (deal) => `
    <article class="deal-card ${selectedDealId === deal.id ? "selected" : ""}" data-deal-id="${deal.id}">
      ${deal.image ? `
        <div class="card-image">
          <img src="${deal.image}" alt="${deal.destination}" />
          <span class="deal-tag-badge">${deal.mode}</span>
          ${selectedDealId === deal.id ? '<span class="selected-badge">✓ Selected</span>' : ""}
        </div>
      ` : ""}
      <div class="deal-body">
        <h3>${deal.title}</h3>
        <p class="deal-meta">${deal.route} • ${deal.duration}</p>
        <p>${deal.description}</p>
        <div class="deal-footer">
          <span class="deal-price">${formatPrice(deal.price)}</span>
          <span class="deal-tag">${deal.expires ? `Book by ${deal.expires}` : "Flexible dates"}</span>
        </div>
      </div>
    </article>
  `
    )
    .join("");

  document.querySelectorAll(".deal-card").forEach((card) => {
    card.addEventListener("click", () => {
      selectedDealId = card.dataset.dealId;
      renderDeals(deals);
      updateSelectedDealSummary();
      updateAccommodations();
      updateActivities();
    });
  });
}

function updateSelectedDealSummary() {
  const deal = globalDeals.find((d) => d.id === selectedDealId);
  const summary = document.getElementById("selectedDeal");
  if (deal) {
    summary.classList.remove("hidden");
    summary.innerHTML = `✓ Deal selected: <strong>${deal.title}</strong> to ${deal.destination} for ${formatPrice(deal.price)}`;
  } else {
    summary.classList.add("hidden");
  }
}

// Render Accommodations
function renderAccommodations(accommodations) {
  const container = document.getElementById("accommodations");
  container.innerHTML = accommodations
    .map(
      (acc) => `
    <article class="accommodation-card ${selectedAccommodationIds.has(acc.id) ? "selected" : ""}" data-acc-id="${acc.id}">
      ${selectedAccommodationIds.has(acc.id) ? '<span class="selected-badge">✓</span>' : ""}
      <div class="accommodation-body">
        <h3>${acc.name}</h3>
        <p class="rating-tag">⭐ ${acc.rating}/5 ${acc.dogFriendly ? "🐶 Dog-friendly" : ""}</p>
        <p style="font-size: 0.95rem;">${acc.address}</p>
        <p style="font-size: 0.9rem; color: #6b7280;">${acc.features.join(", ")}</p>
        <div class="accommodation-footer">
          <span class="accommodation-price">${formatPrice(acc.price)}/night</span>
        </div>
      </div>
    </article>
  `
    )
    .join("");

  document.querySelectorAll(".accommodation-card").forEach((card) => {
    card.addEventListener("click", () => {
      const accId = card.dataset.accId;
      if (selectedAccommodationIds.has(accId)) {
        selectedAccommodationIds.delete(accId);
      } else {
        selectedAccommodationIds.add(accId);
      }
      updateAccommodations();
    });
  });
}

function updateAccommodations() {
  const deal = globalDeals.find((d) => d.id === selectedDealId);
  if (!deal) {
    renderAccommodations([]);
    return;
  }

  const minRating = parseFloat(document.getElementById("minRating").value);
  const maxPrice = parseFloat(document.getElementById("maxPrice").value);
  const dogOnly = document.getElementById("dogFriendly").checked;

  let filtered = globalAccommodations.filter(
    (acc) =>
      acc.destination === deal.id &&
      acc.rating >= minRating &&
      acc.price <= maxPrice &&
      (!dogOnly || acc.dogFriendly)
  );

  renderAccommodations(filtered);
}

// Render Activities
function renderActivities(activities) {
  const container = document.getElementById("activities");
  container.innerHTML = activities
    .map(
      (act) => `
    <article class="activity-card ${selectedActivityIds.has(act.id) ? "selected" : ""}" data-activity-id="${act.id}">
      ${selectedActivityIds.has(act.id) ? '<span class="selected-badge">✓</span>' : ""}
      <div class="activity-body">
        <h3>${act.name}</h3>
        <p class="rating-tag">⭐ ${act.rating}/5 • ${act.duration}</p>
        <p style="font-size: 0.95rem;">${act.description}</p>
        <div class="activity-footer">
          <span>${act.category}</span>
          <span class="deal-price">${formatPrice(act.price)}</span>
          ${act.dogFriendly ? "<span>🐶</span>" : ""}
        </div>
      </div>
    </article>
  `
    )
    .join("");

  document.querySelectorAll(".activity-card").forEach((card) => {
    card.addEventListener("click", () => {
      const actId = card.dataset.activityId;
      if (selectedActivityIds.has(actId)) {
        selectedActivityIds.delete(actId);
      } else {
        selectedActivityIds.add(actId);
      }
      updateActivities();
    });
  });
}

function updateActivities() {
  const deal = globalDeals.find((d) => d.id === selectedDealId);
  if (!deal) {
    renderActivities([]);
    return;
  }

  const filtered = globalActivities.filter((act) => act.destination === deal.id);
  renderActivities(filtered);
}

// Filter Listeners
document.getElementById("minRating").addEventListener("change", (e) => {
  document.getElementById("ratingValue").textContent = e.target.value;
  updateAccommodations();
});

document.getElementById("maxPrice").addEventListener("change", (e) => {
  document.getElementById("priceValue").textContent = e.target.value;
  updateAccommodations();
});

document.getElementById("dogFriendly").addEventListener("change", () => {
  updateAccommodations();
});

// Build Itinerary
document.getElementById("buildItinerary").addEventListener("click", async () => {
  const deal = globalDeals.find((d) => d.id === selectedDealId);
  if (!deal) {
    alert("Please select a deal first.");
    return;
  }

  const origin = document.getElementById("origin").value;
  const date = document.getElementById("travelDate").value;
  const length = Number(document.getElementById("tripLength").value);
  const style = document.getElementById("travelStyle").value;
  const numTravelers = Number(document.getElementById("numTravelers").value);
  const destination = globalDestinations.find((d) => d.id === deal.destination);

  const selectedAccs = Array.from(selectedAccommodationIds)
    .map((id) => globalAccommodations.find((a) => a.id === id))
    .filter(Boolean);

  const selectedActs = Array.from(selectedActivityIds)
    .map((id) => globalActivities.find((a) => a.id === id))
    .filter(Boolean);

  const itineraryContainer = document.getElementById("itinerary");

  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <h2>Your Detailed Itinerary</h2>
      <div style="display: flex; gap: 0.5rem;">
        <button onclick="approveItinerary()" class="success-button" style="margin: 0;">✓ Approve Trip</button>
        <button onclick="document.getElementById('itinerary').innerHTML = ''" class="secondary-button" style="margin: 0;">✕ Reject</button>
      </div>
    </div>
  `;

  // Trip Summary
  html += `
    <div class="itinerary-card">
      <h3>📋 Trip Summary</h3>
      <div class="cost-breakdown">
        <div class="cost-breakdown-row">
          <span><strong>Destination:</strong></span>
          <span>${destination?.name || deal.destination}</span>
        </div>
        <div class="cost-breakdown-row">
          <span><strong>Origin:</strong></span>
          <span>${origin}</span>
        </div>
        <div class="cost-breakdown-row">
          <span><strong>Date:</strong></span>
          <span>${formatDate(date)}</span>
        </div>
        <div class="cost-breakdown-row">
          <span><strong>Duration:</strong></span>
          <span>${length} days</span>
        </div>
        <div class="cost-breakdown-row">
          <span><strong>Number of Travelers:</strong></span>
          <span>${numTravelers} ${numTravelers === 1 ? 'person' : 'people'}</span>
        </div>
        <div class="cost-breakdown-row">
          <span><strong>Travel Style:</strong></span>
          <span>${style}</span>
        </div>
      </div>
    </div>
  `;

  // Day 1: Travel + Accommodation
  const accCost = selectedAccs.length > 0 ? selectedAccs[0].price : deal.price * 0.4;
  const totalAccCost = accCost * length * numTravelers;
  const totalFlightCost = deal.price * numTravelers;

  html += `
    <div class="itinerary-card">
      <h3>✈️ Day 1: Travel & Arrival</h3>
      ${destination?.image ? `<img src="${destination.image}" alt="${destination.name}" class="itinerary-image" />` : ''}
      <p><strong>${deal.mode}:</strong> ${deal.route} (${deal.duration})</p>
      <p>${deal.description}</p>
      <div class="cost-breakdown">
        <div class="cost-breakdown-row">
          <span>Transport (${numTravelers} travelers):</span>
          <span><strong>${formatPrice(totalFlightCost)}</strong></span>
        </div>
      </div>
  `;

  if (deal.bookingUrl) {
    html += `
      <a href="${deal.bookingUrl}" target="_blank" class="booking-link">
        Book ${deal.mode}
        <span class="booking-provider">${deal.provider || 'Booking'}</span>
      </a>
    `;
  }

  if (selectedAccs.length > 0) {
    const acc = selectedAccs[0];
    html += `
      <h4 style="margin-top: 1rem; margin-bottom: 0.5rem;">🏨 Accommodation</h4>
      ${acc.image ? `<img src="${acc.image}" alt="${acc.name}" class="itinerary-image" />` : ''}
      <p><strong>${acc.name}</strong></p>
      <p style="font-size: 0.9rem; color: #6b7280;">${acc.address}</p>
      <p><strong>Rating:</strong> ⭐ ${acc.rating}/5 ${acc.dogFriendly ? '🐶 Dog-friendly' : ''}</p>
      <p><strong>Features:</strong> ${acc.features.join(", ")}</p>
      <div class="cost-breakdown">
        <div class="cost-breakdown-row">
          <span>Accommodation (${length} nights × ${numTravelers} people):</span>
          <span><strong>${formatPrice(totalAccCost)}</strong></span>
        </div>
      </div>
      ${acc.bookingUrl ? `<a href="${acc.bookingUrl}" target="_blank" class="booking-link">Book Accommodation</a>` : ''}
    `;
  }

  html += `</div>`;

  // Days 2 to N: Activities
  let totalActivityCost = 0;
  for (let day = 2; day <= length; day++) {
    const dayActivities = selectedActs.slice((day - 2) % selectedActs.length, (day - 1) % selectedActs.length || selectedActs.length);

    html += `<div class="itinerary-card">
      <h3>🎯 Day ${day}: Explore & Activities</h3>
    `;

    if (dayActivities.length > 0) {
      dayActivities.forEach((act) => {
        const actTotalCost = act.price * numTravelers;
        totalActivityCost += actTotalCost;
        html += `
        <p><strong>${act.name}</strong> (${act.duration}) - ${act.category}</p>
        <p style="font-size: 0.9rem; color: #6b7280;">${act.description}</p>
        <p>⭐ ${act.rating}/5 ${act.dogFriendly ? '🐶' : ''} | Cost: <strong>${formatPrice(actTotalCost)}</strong> (${numTravelers} people)</p>
      `;
      });
    } else {
      html += `<p>Free day to explore ${destination?.name || deal.destination} on your own!</p>`;
    }

    if (day < length && selectedAccs.length > 0) {
      html += `<p><strong>Accommodation:</strong> ${selectedAccs[0]?.name || "Local stay"} - ${formatPrice(accCost * numTravelers)}/night</p>`;
    }

    html += `</div>`;
  }

  // Cost Summary
  const totalCost = totalFlightCost + totalAccCost + totalActivityCost;

  html += `
    <div class="itinerary-card" style="background: #f0fdf4; border-left-color: var(--success);">
      <h3>💰 Cost Summary (${numTravelers} ${numTravelers === 1 ? 'person' : 'people'})</h3>
      <div class="cost-breakdown">
        <div class="cost-breakdown-row">
          <span><strong>Transport:</strong></span>
          <span>${formatPrice(totalFlightCost)}</span>
        </div>
        <div class="cost-breakdown-row">
          <span><strong>Accommodation (${length} nights):</strong></span>
          <span>${formatPrice(totalAccCost)}</span>
        </div>
        <div class="cost-breakdown-row">
          <span><strong>Activities:</strong></span>
          <span>${formatPrice(totalActivityCost)}</span>
        </div>
        <div class="cost-breakdown-row cost-total">
          <span><strong>Total Estimated Cost:</strong></span>
          <span>${formatPrice(totalCost)}</span>
        </div>
        <div class="cost-breakdown-row" style="margin-top: 0.5rem; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 0.5rem;">
          <span><strong>Per Person:</strong></span>
          <span style="color: var(--success);">${formatPrice(totalCost / numTravelers)}</span>
        </div>
      </div>
    </div>
  `;

  itineraryContainer.innerHTML = html;

  // Store current itinerary for approval
  window.currentItinerary = {
    destination: destination?.name || deal.destination,
    date: formatDate(date),
    length: `${length} days`,
    deal: deal.title,
    numTravelers: numTravelers,
    totalCost: totalCost,
    accommodations: Array.from(selectedAccommodationIds)
      .map((id) => globalAccommodations.find((a) => a.id === id)?.name)
      .filter(Boolean),
    activities: Array.from(selectedActivityIds)
      .map((id) => globalActivities.find((a) => a.id === id)?.name)
      .filter(Boolean),
  };

  // Scroll to itinerary
  itineraryContainer.scrollIntoView({ behavior: "smooth" });
});

// Print Itinerary
document.getElementById("printItinerary").addEventListener("click", () => {
  window.print();
});

// Save Trip to Diary (now triggers approval workflow)
document.getElementById("saveTrip").addEventListener("click", () => {
  window.approveItinerary();
});

// Approve Itinerary (new workflow)
window.approveItinerary = function () {
  if (!window.currentItinerary) {
    alert("Please generate an itinerary first.");
    return;
  }

  const trip = {
    id: Date.now(),
    ...window.currentItinerary,
  };

  let approvedTrips = JSON.parse(localStorage.getItem("approvedTrips") || "[]");
  approvedTrips.push(trip);
  localStorage.setItem("approvedTrips", JSON.stringify(approvedTrips));

  alert(`✓ Trip approved and added to your Travel Plans!`);
  document.getElementById("itinerary").innerHTML = "";
  window.currentItinerary = null;
  renderApprovedTrips();
};

// Render Approved Trips (Travel Plans)
function renderApprovedTrips() {
  const trips = JSON.parse(localStorage.getItem("approvedTrips") || "[]");
  const container = document.getElementById("savedTrips");

  if (trips.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #6b7280;">No approved trips yet. Generate and approve an itinerary to add your first travel plan!</p>`;
    return;
  }

  container.innerHTML = trips
    .map(
      (trip) => `
    <div class="trip-card">
      <button class="trip-delete" onclick="deleteApprovedTrip(${trip.id})">Delete</button>
      <h3>🌍 ${trip.destination}</h3>
      <p class="trip-date">${trip.date} • ${trip.length}</p>
      <p><strong>${trip.deal}</strong></p>
      <p style="font-size: 0.9rem; color: #2563eb;"><strong>👥 ${trip.numTravelers} travelers | 💰 Total: €${trip.totalCost.toFixed(0)} (€${(trip.totalCost / trip.numTravelers).toFixed(0)}/person)</strong></p>
      <ul class="trip-highlights">
        ${trip.accommodations.map((acc) => `<li>🏨 ${acc}</li>`).join("")}
        ${trip.activities.map((act) => `<li>🎯 ${act}</li>`).join("")}
      </ul>
    </div>
  `
    )
    .join("");
}

// Delete Approved Trip
window.deleteApprovedTrip = function (tripId) {
  if (confirm("Delete this trip from your Travel Plans?")) {
    let trips = JSON.parse(localStorage.getItem("approvedTrips") || "[]");
    trips = trips.filter((t) => t.id !== tripId);
    localStorage.setItem("approvedTrips", JSON.stringify(trips));
    renderApprovedTrips();
  }
};

// Render Saved Trips (Legacy)
function renderSavedTrips() {
  const trips = JSON.parse(localStorage.getItem("savedTrips") || "[]");
  const container = document.getElementById("savedTrips");

  if (trips.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #6b7280;">No saved trips yet. Plan and save your first adventure!</p>`;
    return;
  }

  container.innerHTML = trips
    .map(
      (trip) => `
    <div class="trip-card">
      <button class="trip-delete" onclick="deleteTrip(${trip.id})">Delete</button>
      <h3>🌍 ${trip.destination}</h3>
      <p class="trip-date">${trip.date} • ${trip.length}</p>
      <p><strong>${trip.deal}</strong></p>
      <ul class="trip-highlights">
        ${trip.accommodations.map((acc) => `<li>🏨 ${acc}</li>`).join("")}
        ${trip.activities.map((act) => `<li>🎯 ${act}</li>`).join("")}
      </ul>
    </div>
  `
    )
    .join("");
}

// Delete Trip
window.deleteTrip = function (tripId) {
  if (confirm("Delete this trip from your diary?")) {
    let trips = JSON.parse(localStorage.getItem("savedTrips") || "[]");
    trips = trips.filter((t) => t.id !== tripId);
    localStorage.setItem("savedTrips", JSON.stringify(trips));
    renderSavedTrips();
  }
};

// Initialize
(async function init() {
  globalDeals = await loadData("data/deals.json");
  globalGems = await loadData("data/hidden_gems.json");
  globalDestinations = await loadData("data/destinations.json");
  globalAccommodations = await loadData("data/accommodations_full.json");
  globalActivities = await loadData("data/activities_full.json");

  renderDeals(globalDeals);
  renderApprovedTrips();
})();
