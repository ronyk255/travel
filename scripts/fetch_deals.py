import json
from datetime import datetime, timezone

from deal_scraper import fetch_latest_deals
from notify import send_sms_notification

DEALS_FILE = "data/deals.json"


def dump_json(path, data):
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=False)
        handle.write("\n")


def get_current_deals():
    try:
        return fetch_latest_deals()
    except Exception as exc:
        print(f"Failed to fetch latest deals: {exc}")
        return []


def main():
    deals = get_current_deals()
    if not deals:
        print("No deals refreshed.")
        return

    dump_json(DEALS_FILE, deals)
    print(f"Refreshed {len(deals)} deals at {datetime.now(timezone.utc).isoformat()}")

    latest_offer = deals[0]
    message = (
        f"New travel deal: {latest_offer['title']} for EUR {latest_offer['price']} "
        f"({latest_offer['route']}). Book by {latest_offer['expires']}"
    )
    send_sms_notification(message)


if __name__ == "__main__":
    main()
