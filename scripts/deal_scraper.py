import os
import requests

RAPIDAPI_FLIGHT_URL = (
    "https://skyscanner-skyscanner-flight-search-v1.p.rapidapi.com/apiservices/browseroutes/v1.0/SE/EUR/en-GB/CPH-sky/anywhere/anytime"
)
RAPIDAPI_HOST = "skyscanner-skyscanner-flight-search-v1.p.rapidapi.com"


def extract_place_name(place_id, places):
    for place in places:
        if place.get('PlaceId') == place_id:
            return place.get('Name') or place.get('CityName') or place.get('CountryName')
    return place_id


def fetch_skyscanner_flight_deals():
    api_key = os.getenv('SKYSCANNER_RAPIDAPI_KEY')
    if not api_key:
        raise ValueError('Missing SKYSCANNER_RAPIDAPI_KEY environment variable.')

    headers = {
        'X-RapidAPI-Key': api_key,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
    }

    response = requests.get(RAPIDAPI_FLIGHT_URL, headers=headers, timeout=15)
    response.raise_for_status()
    data = response.json()

    places = data.get('Places', [])
    quotes = data.get('Quotes', [])

    deals = []
    for quote in quotes[:10]:
        min_price = quote.get('MinPrice')
        outbound = quote.get('OutboundLeg', {})
        origin_id = outbound.get('OriginId')
        destination_id = outbound.get('DestinationId')
        origin = extract_place_name(origin_id, places)
        destination = extract_place_name(destination_id, places)

        deals.append({
            'title': f'Flight deal to {destination}',
            'mode': 'Flight',
            'route': f'{origin} → {destination}',
            'origin': origin,
            'destination': destination,
            'duration': 'N/A',
            'price': min_price,
            'description': 'Found via Skyscanner API: cheap flight from Copenhagen.',
            'expires': 'Flexible',
        })

    return deals


def fetch_train_deals():
    # For real train deals, integrate with a Swedish train API or use a public transport partner API.
    return [
        {
            'title': 'Train escape to Gothenburg',
            'mode': 'Train',
            'route': 'Lund → Gothenburg',
            'origin': 'Lund',
            'destination': 'Gothenburg',
            'duration': '2h 15m',
            'price': 35,
            'description': 'SJ regional train with flexible ticket and pet-friendly carriage.',
            'expires': '2026-07-15',
        },
        {
            'title': 'Train weekend to Malmö',
            'mode': 'Train',
            'route': 'Lund → Malmö',
            'origin': 'Lund',
            'destination': 'Malmö',
            'duration': '30m',
            'price': 29,
            'description': 'Quick Öresundståg ride with dog-friendly seating.',
            'expires': '2026-07-14',
        },
    ]


def fetch_hotel_deals():
    # For real hotel deals, integrate with a hotel or lodging API such as Booking.com, Expedia, or Hotels.com.
    return [
        {
            'title': 'Pet-friendly stay in Berlin',
            'mode': 'Accommodation',
            'route': 'Berlin center',
            'origin': 'N/A',
            'destination': 'Berlin',
            'duration': '3 nights',
            'price': 180,
            'description': 'Affordable hotel with dog-friendly rooms and breakfast included.',
            'expires': '2026-07-12',
        }
    ]


def fetch_latest_deals():
    deals = []
    try:
        flight_deals = fetch_skyscanner_flight_deals()
        deals.extend(flight_deals)
    except Exception as exc:
        print(f'Flight API unavailable: {exc}')

    deals.extend(fetch_train_deals())
    deals.extend(fetch_hotel_deals())

    if not deals:
        deals = [
            {
                'title': 'Train Escape to Gothenburg',
                'mode': 'Train',
                'route': 'Lund → Gothenburg',
                'origin': 'Lund',
                'destination': 'Gothenburg',
                'duration': '2h 15m',
                'price': 35,
                'description': 'SJ regional train with flexible ticket and pet-friendly carriage.',
                'expires': '2026-07-15',
            }
        ]

    return sorted(deals, key=lambda deal: deal.get('price', 9999))[:12]
