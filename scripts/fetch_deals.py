import json
import os
from datetime import datetime

from deal_scraper import fetch_latest_deals
from notify import send_sms_notification

DEALS_FILE = 'data/deals.json'
GEMS_FILE = 'data/hidden_gems.json'


def dump_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def get_current_deals():
    try:
        deals = fetch_latest_deals()
        return deals
    except Exception as exc:
        print(f'Failed to fetch latest deals: {exc}')
        return []


def main():
    deals = get_current_deals()
    if deals:
        dump_json(DEALS_FILE, deals)
        print(f'Refreshed {len(deals)} deals at {datetime.utcnow().isoformat()}Z')

        latest_offer = deals[0]
        message = (
            f"New travel deal: {latest_offer['title']} for €{latest_offer['price']} "
            f"({latest_offer['route']}). Book by {latest_offer['expires']}"
        )
        send_sms_notification(message)
    else:
        print('No deals refreshed.')


if __name__ == '__main__':
    main()
