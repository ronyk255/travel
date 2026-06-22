# Lincy & Rony Travel Diaries

A GitHub Pages travel planner for trips from Lund and Copenhagen Airport. The site combines committed deal data, destination notes, dog-aware filters, accommodation choices, activity planning, printable itineraries, and a local browser diary for planned and completed trips.

## What the site does

- Shows flight, train, accommodation, and Skane day-trip deal cards with provider links.
- Scores and sorts trips by price, route convenience, dog friendliness, and source quality.
- Builds a detailed itinerary for a selected date, number of people, stay, and activities.
- Estimates total cost and cost per person for two travelers by default.
- Saves approved itineraries in the browser diary.
- Lets saved trips be reopened, marked as done, deleted, or exported.
- Includes a refresh button that reloads the latest committed JSON data from GitHub Pages.

## How data freshness works

GitHub Pages is static, so the browser cannot safely hold private API keys or scrape booking sites directly. Fresh data should be collected by GitHub Actions and committed into `data/*.json`.

The workflow in `.github/workflows/update-deals.yml` runs:

- daily at 08:00 UTC
- manually through GitHub Actions
- after pushes to `main`

The current script includes curated fallback deals and optional flight API support through `SKYSCANNER_RAPIDAPI_KEY`. Final fares can change quickly, so cards always link to providers such as SJ, Skanetrafiken, Skyscanner, and Booking.com for confirmation.

## Setup

1. Enable GitHub Pages for the repository root on the `main` branch.
2. Optional: add repository secrets for live refreshes and alerts:
   - `SKYSCANNER_RAPIDAPI_KEY`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_FROM_NUMBER`
   - `NOTIFICATION_PHONE`
3. Open the site at `https://ronyk255.github.io/travel`.

## Files

- `index.html` - app shell and page sections.
- `styles.css` - dashboard styling and print layout.
- `app.js` - planner logic, scoring, itinerary generation, diary storage.
- `data/deals.json` - travel deal cards.
- `data/destinations.json` - destination summaries and images.
- `data/accommodations_full.json` - stay options.
- `data/activities_full.json` - activity options.
- `data/hidden_gems.json` - Skane hidden-gem ideas.
- `scripts/deal_scraper.py` - scheduled deal refresh logic.
- `scripts/fetch_deals.py` - writes refreshed deal data and sends optional SMS.

## Next best upgrades

- Connect a paid travel API for verified flight fares, baggage rules, and pet-in-cabin fields.
- Add a hotel API with pet policy, distance to arrival station/airport, rating, and total stay price.
- Add a public transport source for live Skane and European rail prices.
- Add GitHub issue or gist sync if the diary should follow you across browsers instead of staying in local browser storage.
