import os
import re
from datetime import date, datetime, timezone

import requests

RAPIDAPI_FLIGHT_URL = (
    "https://skyscanner89.p.rapidapi.com/flights/one-way/list"
)
RAPIDAPI_HOST = "skyscanner89.p.rapidapi.com"


DESTINATION_IMAGES = {
    "berlin": "https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=900&q=80",
    "gothenburg": "https://images.unsplash.com/photo-1535628805416-f3a0b3627d23?auto=format&fit=crop&w=900&q=80",
    "krakow": "https://images.unsplash.com/photo-1541849546-216549ae216d?auto=format&fit=crop&w=900&q=80",
    "prague": "https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=900&q=80",
    "ystad": "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80",
    "skanor-falsterbo": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80",
}

PET_POLICY_URLS = {
    "SAS": "https://www.flysas.com/en/travel-info/baggage/pets/",
    "Norwegian": "https://www.norwegian.com/en/travel-info/baggage/travelling-with-pets/",
    "SJ": "https://www.sj.se/en/about-the-journey/before-the-journey/travelling-with-animals",
    "Skanetrafiken": "https://www.skanetrafiken.se/",
    "Skyscanner": "https://www.skyscanner.com/news/tips/flying-with-pets",
}


def slug(value):
    value = (value or "deal").lower()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "deal"


def source_links(destination, mode):
    destination_slug = slug(destination)
    destination_query = destination_slug.replace("-", "%20")
    links = [
        {
            "label": "Lastminute",
            "url": f"https://www.lastminute.com/search?search.destination={destination_query}",
        },
        {
            "label": "Skyscanner",
            "url": f"https://www.skyscanner.com/transport/flights/cph/{destination_slug}/",
        },
        {
            "label": "Booking.com",
            "url": f"https://www.booking.com/searchresults.html?ss={destination_query}&nflt=hotelfacility%3D4",
        },
        {
            "label": "Google Hotels",
            "url": f"https://www.google.com/travel/hotels/{destination_query}",
        },
    ]
    if "train" in str(mode).lower():
        links.insert(0, {"label": "SJ", "url": "https://www.sj.se/en"})
    return links


def pet_note(provider, mode):
    if "train" in str(mode).lower():
        return "Train is usually the easiest option with a small dog, but book animal/pet area where required."
    if provider in {"SAS", "Norwegian"}:
        return "Small dog may be possible in cabin if airline carrier, weight, and route rules are met."
    return "Pet-in-cabin depends on the selected airline; verify before paying."


def curated_deals():
    return [
        {
            "id": "train-gothenburg",
            "title": "Fast Train Weekend to Gothenburg",
            "mode": "Train",
            "route": "Lund -> Gothenburg",
            "origin": "Lund",
            "destination": "gothenburg",
            "duration": "2h 15m",
            "price": 35,
            "description": "Direct train-friendly weekend with pet areas available on many services.",
            "expires": "Flexible",
            "bookingUrl": "https://www.sj.se/en",
            "provider": "SJ",
            "dogFriendly": True,
        },
        {
            "id": "flight-berlin",
            "title": "Copenhagen to Berlin City Break",
            "mode": "Flight",
            "route": "Copenhagen Airport -> Berlin",
            "origin": "Copenhagen Airport",
            "destination": "berlin",
            "duration": "1h 25m",
            "price": 49,
            "description": "Short CPH flight. Confirm pet-in-cabin availability with the selected airline.",
            "expires": "Flexible",
            "bookingUrl": "https://www.skyscanner.com/transport/flights/cph/ber/",
            "provider": "Skyscanner",
            "dogFriendly": True,
        },
        {
            "id": "flight-prague",
            "title": "Romantic Prague Escape",
            "mode": "Flight",
            "route": "Copenhagen Airport -> Prague",
            "origin": "Copenhagen Airport",
            "destination": "prague",
            "duration": "2h 05m",
            "price": 52,
            "description": "Good-value couple trip with castle views and walkable neighborhoods.",
            "expires": "Flexible",
            "bookingUrl": "https://www.skyscanner.com/transport/flights/cph/prg/",
            "provider": "Skyscanner",
            "dogFriendly": True,
        },
        {
            "id": "flight-krakow",
            "title": "Budget Culture Trip to Krakow",
            "mode": "Flight",
            "route": "Copenhagen Airport -> Krakow",
            "origin": "Copenhagen Airport",
            "destination": "krakow",
            "duration": "1h 35m",
            "price": 59,
            "description": "Strong value for food, old-town walks, and history.",
            "expires": "Flexible",
            "bookingUrl": "https://www.skyscanner.com/transport/flights/cph/krk/",
            "provider": "Skyscanner",
            "dogFriendly": False,
        },
        {
            "id": "train-berlin-night",
            "title": "Night Train Route Toward Berlin",
            "mode": "Train",
            "route": "Lund -> Berlin",
            "origin": "Lund",
            "destination": "berlin",
            "duration": "11h 30m",
            "price": 89,
            "description": "No-airport route for a longer weekend. Check sleeper and pet conditions before booking.",
            "expires": "Flexible",
            "bookingUrl": "https://www.sj.se/en",
            "provider": "SJ",
            "dogFriendly": True,
        },
        {
            "id": "skane-summer-ystad",
            "title": "Skane Summer Ticket Day Trip to Ystad",
            "mode": "Train",
            "route": "Lund -> Ystad",
            "origin": "Lund",
            "destination": "ystad",
            "duration": "1h 05m",
            "price": 14,
            "description": "Regional-ticket day trip for beaches, old town streets, and Sandskogen.",
            "expires": "Seasonal",
            "bookingUrl": "https://www.skanetrafiken.se/",
            "provider": "Skanetrafiken",
            "dogFriendly": True,
        },
        {
            "id": "skane-summer-falsterbo",
            "title": "Quiet Coast Escape to Skanor-Falsterbo",
            "mode": "Train + Bus",
            "route": "Lund -> Malmo -> Skanor-Falsterbo",
            "origin": "Lund",
            "destination": "skanor-falsterbo",
            "duration": "1h 20m",
            "price": 12,
            "description": "Beach, village atmosphere, birdlife, and slower summer walking.",
            "expires": "Seasonal",
            "bookingUrl": "https://www.skanetrafiken.se/",
            "provider": "Skanetrafiken",
            "dogFriendly": True,
        },
    ]


def with_defaults(deal):
    destination = slug(deal.get("destination"))
    provider = deal.get("provider", "Provider")
    deal.setdefault("id", f"{slug(deal.get('mode'))}-{destination}")
    deal["destination"] = destination
    deal.setdefault("image", DESTINATION_IMAGES.get(destination))
    deal.setdefault("expires", "Flexible")
    deal.setdefault("provider", provider)
    deal.setdefault("dogFriendly", "train" in str(deal.get("mode", "")).lower())
    deal.setdefault("lastChecked", datetime.now(timezone.utc).isoformat())
    deal.setdefault("priceConfidence", "Indicative lead price; final fare must be confirmed with provider")
    deal.setdefault("sourceLinks", source_links(destination, deal.get("mode")))
    deal.setdefault("petPolicyUrl", PET_POLICY_URLS.get(provider) or PET_POLICY_URLS.get("Skyscanner"))
    deal.setdefault("petNote", pet_note(provider, deal.get("mode")))
    return deal


def fetch_skyscanner_flight_deals():
    api_key = os.getenv("SKYSCANNER_RAPIDAPI_KEY")
    if not api_key:
        return []

    headers = {
        "X-RapidAPI-Key": api_key,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
    }
    params = {
        "origin": "CPH",
        "destination": "anywhere",
        "date": date.today().isoformat(),
        "adults": "2",
        "currency": "EUR",
        "locale": "en-GB",
    }
    response = requests.get(RAPIDAPI_FLIGHT_URL, headers=headers, params=params, timeout=20)
    response.raise_for_status()
    payload = response.json()

    deals = []
    for index, item in enumerate(payload.get("data", [])[:8]):
        city = item.get("city") or item.get("destination") or item.get("name")
        price = item.get("price") or item.get("minPrice")
        if not city or not price:
            continue
        destination = slug(city)
        deals.append(with_defaults({
            "id": f"flight-{destination}-{index}",
            "title": f"Copenhagen to {city}",
            "mode": "Flight",
            "route": f"Copenhagen Airport -> {city}",
            "origin": "Copenhagen Airport",
            "destination": destination,
            "duration": item.get("duration", "Check provider"),
            "price": float(price),
            "description": "Fetched flight lead. Confirm final fare, baggage, and pet-in-cabin rules with provider.",
            "bookingUrl": f"https://www.skyscanner.com/transport/flights/cph/{destination}/",
            "provider": "Skyscanner",
            "dogFriendly": False,
        }))
    return deals


def fetch_latest_deals():
    deals = []
    try:
        deals.extend(fetch_skyscanner_flight_deals())
    except Exception as exc:
        print(f"Flight API unavailable: {exc}")

    if not deals:
        deals = curated_deals()

    normalized = [with_defaults(deal) for deal in deals]
    return sorted(normalized, key=lambda deal: float(deal.get("price") or 9999))[:12]
