import os
from twilio.rest import Client


def send_sms_notification(message: str) -> None:
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    from_number = os.getenv('TWILIO_FROM_NUMBER')
    notification_phone = os.getenv('NOTIFICATION_PHONE')

    if not all([account_sid, auth_token, from_number, notification_phone]):
        print('SMS notification environment variables are not fully configured.')
        return

    client = Client(account_sid, auth_token)
    try:
        message_obj = client.messages.create(
            body=message,
            from_=from_number,
            to=notification_phone,
        )
        print(f'SMS sent: {message_obj.sid}')
    except Exception as exc:
        print(f'Failed to send SMS: {exc}')
