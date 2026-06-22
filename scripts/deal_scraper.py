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
    "amsterdam": "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=900&q=80",
    "budapest": "https://images.unsplash.com/photo-1549877452-9c387954fbc2?auto=format&fit=crop&w=900&q=80",
    "vienna": "https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=900&q=80",
    "lisbon": "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=900&q=80",
    "porto": "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=900&q=80",
    "barcelona": "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=900&q=80",
    "rome": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=900&q=80",
    "nice": "https://images.unsplash.com/photo-1533614767277-8785f8a4ee6b?auto=format&fit=crop&w=900&q=80",
    "paris": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80",
    "warsaw": "https://images.unsplash.com/photo-1519197924294-4ba991a11128?auto=format&fit=crop&w=900&q=80",
    "gdansk": "https://images.unsplash.com/photo-1519540635785-7d367d74c8f2?auto=format&fit=crop&w=900&q=80",
    "riga": "https://images.unsplash.com/photo-1569505827657-3f6b4212e9c9?auto=format&fit=crop&w=900&q=80",
    "tallinn": "https://images.unsplash.com/photo-1607681000065-428fb4d0d97e?auto=format&fit=crop&w=900&q=80",
    "hamburg": "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=900&q=80",
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
    recommended_dates = {
        "gothenburg": ("2026-09-12", "2026-09-14"),
        "berlin": ("2026-10-10", "2026-10-13"),
        "prague": ("2026-10-17", "2026-10-20"),
        "krakow": ("2026-09-19", "2026-09-22"),
        "amsterdam": ("2026-11-07", "2026-11-10"),
        "budapest": ("2026-10-24", "2026-10-28"),
        "vienna": ("2026-11-14", "2026-11-17"),
        "lisbon": ("2027-02-07", "2027-02-12"),
        "porto": ("2027-03-07", "2027-03-11"),
        "barcelona": ("2026-10-31", "2026-11-04"),
        "rome": ("2027-01-17", "2027-01-21"),
        "nice": ("2027-03-20", "2027-03-24"),
        "paris": ("2027-01-24", "2027-01-27"),
        "warsaw": ("2026-09-26", "2026-09-29"),
        "gdansk": ("2026-09-12", "2026-09-15"),
        "riga": ("2026-10-03", "2026-10-06"),
        "tallinn": ("2027-02-21", "2027-02-25"),
        "hamburg": ("2026-09-05", "2026-09-08"),
        "ystad": ("2026-07-11", "2026-07-11"),
        "skanor-falsterbo": ("2026-07-18", "2026-07-18"),
    }

    def deal(id_, title, mode, route, destination, duration, price, window, description, provider="Skyscanner", dog=False, booking=None):
        recommended_date, recommended_return = recommended_dates.get(destination, ("2026-10-10", "2026-10-13"))
        return {
            "id": id_,
            "title": title,
            "mode": mode,
            "route": route,
            "origin": "Lund" if "train" in mode.lower() else "Copenhagen Airport",
            "destination": destination,
            "duration": duration,
            "price": price,
            "travelWindow": window,
            "recommendedDate": recommended_date,
            "recommendedReturnDate": recommended_return,
            "validFrom": recommended_date,
            "validTo": recommended_return,
            "fareStatus": "target",
            "description": description,
            "expires": "Rolling next 12 months",
            "bookingUrl": booking or f"https://www.skyscanner.com/transport/flights/cph/{slug(destination)}/",
            "provider": provider,
            "dogFriendly": dog,
        }

    return [
        deal("train-gothenburg", "Fast Train Weekend to Gothenburg", "Train", "Lund -> Gothenburg", "gothenburg", "2h 15m", 35, "All year, best value outside holidays", "Direct train-friendly weekend with pet areas available on many services.", "SJ", True, "https://www.sj.se/en"),
        deal("flight-berlin", "Copenhagen to Berlin City Break", "Flight", "Copenhagen Airport -> Berlin", "berlin", "1h 25m", 49, "Sep-Nov and Jan-Mar", "Short CPH flight; strong weekend value and also reachable by night train.", "Skyscanner", True),
        deal("train-berlin-night", "Night Train Toward Berlin", "Train", "Lund -> Berlin", "berlin", "11h 30m", 89, "All year when booked early", "No-airport route for a longer weekend. Check sleeper and pet conditions before booking.", "SJ", True, "https://www.sj.se/en"),
        deal("flight-prague", "Romantic Prague Escape", "Flight", "Copenhagen Airport -> Prague", "prague", "2h 05m", 52, "Oct-Nov, Jan-Mar, May", "Good-value couple trip with castle views and walkable neighborhoods.", "Skyscanner", True),
        deal("flight-krakow", "Budget Culture Trip to Krakow", "Flight", "Copenhagen Airport -> Krakow", "krakow", "1h 35m", 59, "Sep-Nov and Feb-Apr", "Strong value for food, old-town walks, and history.", "Skyscanner", False),
        deal("flight-amsterdam", "Canals and Museums in Amsterdam", "Flight", "Copenhagen Airport -> Amsterdam", "amsterdam", "1h 30m", 74, "Nov-Mar and shoulder-season weekdays", "Compact flight for museums, canals, markets, and easy long-weekend planning.", "Skyscanner", True),
        deal("flight-budapest", "Thermal Bath Weekend in Budapest", "Flight", "Copenhagen Airport -> Budapest", "budapest", "1h 50m", 62, "Oct-Mar, excluding Christmas/New Year", "Excellent value for thermal baths, grand cafes, and river walks.", "Skyscanner", False),
        deal("flight-vienna", "Vienna Culture Weekend", "Flight", "Copenhagen Airport -> Vienna", "vienna", "1h 45m", 69, "Nov-Mar and May weekdays", "Museums, palaces, coffeehouses, and easy public transport for a refined trip.", "Skyscanner", True),
        deal("flight-lisbon", "Lisbon Sun Break", "Flight", "Copenhagen Airport -> Lisbon", "lisbon", "3h 50m", 98, "Nov-Mar and late spring", "Longer flight but good off-season sun, viewpoints, trams, and food.", "Skyscanner", True),
        deal("flight-porto", "Porto Riverside Escape", "Flight", "Copenhagen Airport -> Porto", "porto", "3h 30m", 92, "Oct-Apr", "Often cheaper than Lisbon, with river views, wine cellars, and compact neighborhoods.", "Skyscanner", True),
        deal("flight-barcelona", "Barcelona Shoulder-Season Trip", "Flight", "Copenhagen Airport -> Barcelona", "barcelona", "2h 50m", 85, "Oct-Nov and Feb-Apr", "Architecture, beach walks, food markets, and best value outside peak summer.", "Skyscanner", False),
        deal("flight-rome", "Rome Ancient City Break", "Flight", "Copenhagen Airport -> Rome", "rome", "2h 35m", 88, "Nov-Mar and late autumn", "Historic sites, walkable neighborhoods, and better prices outside summer heat.", "Skyscanner", False),
        deal("flight-nice", "Nice and Riviera Base", "Flight", "Copenhagen Airport -> Nice", "nice", "2h 25m", 83, "Sep-Oct and Mar-May", "Sea views, old town, easy rail day trips along the Riviera.", "Skyscanner", True),
        deal("flight-paris", "Paris Off-Season Deal", "Flight", "Copenhagen Airport -> Paris", "paris", "2h 00m", 79, "Nov-Mar weekdays", "Museums, food, parks, and lower prices outside peak weekends.", "Skyscanner", True),
        deal("flight-warsaw", "Warsaw Budget Weekend", "Flight", "Copenhagen Airport -> Warsaw", "warsaw", "1h 25m", 45, "Sep-Nov and Jan-Apr", "One of the best value city breaks for food, museums, and modern hotels.", "Skyscanner", False),
        deal("flight-gdansk", "Gdansk Baltic Weekend", "Flight", "Copenhagen Airport -> Gdansk", "gdansk", "1h 05m", 39, "Sep-Nov and Mar-May", "Short flight, colorful old town, harbor walks, and good accommodation value.", "Skyscanner", False),
        deal("flight-riga", "Riga Old Town and Art Nouveau", "Flight", "Copenhagen Airport -> Riga", "riga", "1h 25m", 55, "Sep-Nov and Feb-May", "Low-cost Baltic weekend with old town, markets, and architecture.", "Skyscanner", False),
        deal("flight-tallinn", "Tallinn Medieval Weekend", "Flight", "Copenhagen Airport -> Tallinn", "tallinn", "1h 30m", 64, "Sep-Nov and Feb-Apr", "Medieval old town, saunas, design shops, and good winter atmosphere.", "Skyscanner", False),
        deal("train-hamburg", "Train Weekend to Hamburg", "Train", "Lund -> Copenhagen -> Hamburg", "hamburg", "5h 30m", 59, "All year when booked early", "Dog-friendly rail route with harbor walks, Speicherstadt, and food halls.", "DB/SJ", True, "https://int.bahn.de/en"),
        deal("skane-summer-ystad", "Skane Summer Ticket Day Trip to Ystad", "Train", "Lund -> Ystad", "ystad", "1h 05m", 14, "Summer/local Skane only", "Regional-ticket day trip for beaches, old town streets, and Sandskogen.", "Skanetrafiken", True, "https://www.skanetrafiken.se/"),
        deal("skane-summer-falsterbo", "Quiet Coast Escape to Skanor-Falsterbo", "Train + Bus", "Lund -> Malmo -> Skanor-Falsterbo", "skanor-falsterbo", "1h 20m", 12, "Summer/local Skane only", "Beach, village atmosphere, birdlife, and slower summer walking.", "Skanetrafiken", True, "https://www.skanetrafiken.se/"),
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
    return sorted(normalized, key=lambda deal: float(deal.get("price") or 9999))[:30]
