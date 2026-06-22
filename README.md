# Travel Deal Dashboard

This repository contains a GitHub Pages static site for travel deals, itinerary planning, and hidden-gem discovery across Europe.

## What is included

- `index.html`: a static site experience for current travel deals, hidden gems, and itinerary generation.
- `styles.css`: page styling for a friendly layout and print-ready itinerary cards.
- `app.js`: client-side logic for loading deals, generating itineraries, and filtering destinations.
- `data/`: JSON data files for sample deals, hidden gems, and itineraries.
- `scripts/fetch_deals.py`: automation scaffold to refresh deal data and generate new itineraries.
- `.github/workflows/update-deals.yml`: GitHub Actions workflow that updates the data weekly and on push.

## Deployment

1. Enable GitHub Pages in the repository settings.
2. Use the `main` branch and `/` root directory.
3. Push the repository and the site will be available at `https://ronyk255.github.io/travel`.

## Customization

- Add API keys or web scrapers in `scripts/deal_scraper.py` and `scripts/fetch_deals.py`.
- Configure GitHub Secrets for SMS alerting: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `NOTIFICATION_PHONE`.
- Set `NOTIFICATION_PHONE` to your cell number (e.g. `+46761426313`) in GitHub Secrets. Do not commit phone numbers or tokens to the repo.
- Update `data/deals.json` with real flight/train/hotel offers for Sweden and wider Europe.
- Adjust the hidden gems in `data/hidden_gems.json`.

## Notification setup

To receive notifications when new deals are refreshed:

1. Create a Twilio account and buy a Twilio phone number.
2. Add the following repository secrets in GitHub:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_FROM_NUMBER`
   - `NOTIFICATION_PHONE`
3. The update workflow will run daily and send an SMS to the configured number when a fresh deal is found.

## How to use

- Open `index.html` in a browser or via GitHub Pages.
- Select travel dates and destination preferences to generate a printable itinerary.
- Use the built-in filter to find deals near Copenhagen, Lund, or train-friendly routes.
