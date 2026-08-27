import os
import time
import pandas as pd
import requests
from dotenv import load_dotenv

load_dotenv()

# ==============================================================================
# CONFIGURATION
# ==============================================================================
META_PHONE_NUMBER_ID = os.getenv("META_PHONE_NUMBER_ID", "YOUR_PHONE_NUMBER_ID")
META_ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "YOUR_ACCESS_TOKEN")
EXCEL_FILE = "sample-contacts-import.csv"  # or .xlsx file
DELAY_SECONDS = 1  # Safe delay between broadcasts

def send_whatsapp_message(to_phone: str, message: str) -> bool:
    """
    Sends a WhatsApp message using Meta Cloud API.
    """
    # Clean and normalize phone number
    clean_phone = "".join(filter(str.isdigit, str(to_phone)))
    
    url = f"https://graph.facebook.com/v20.0/{META_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {META_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": clean_phone,
        "type": "text",
        "text": {
            "preview_url": False,
            "body": message
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        if response.status_code in [200, 201]:
            print(f"✅ Successfully sent to: +{clean_phone}")
            return True
        else:
            print(f"❌ Failed for +{clean_phone}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error sending to +{clean_phone}: {e}")
        return False

def broadcast_from_file(file_path: str):
    """
    Reads an Excel or CSV file and broadcasts personalized WhatsApp messages.
    """
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' not found.")
        return

    # Read CSV or Excel
    if file_path.endswith(".csv"):
        df = pd.read_csv(file_path)
    else:
        df = pd.read_excel(file_path)

    print(f"\n🚀 Loaded {len(df)} contacts from {file_path}")
    print("-" * 50)

    success_count = 0
    fail_count = 0

    for index, row in df.iterrows():
        name = str(row.get("firstName", row.get("name", "Friend")))
        phone = str(row.get("phoneNumber", row.get("phone", "")))

        if not phone or phone == "nan":
            continue

        # Personalized Message Template
        message = (
            f"Hello {name}! 👋\n\n"
            f"You are cordially invited to our exclusive annual event!\n"
            f"📍 Venue: Grand Ballroom\n"
            f"🗓 Date: Sept 15, 2026\n\n"
            f"Reply 'YES' to confirm your attendance."
        )

        print(f"[{index + 1}/{len(df)}] Sending to {name} ({phone})...")
        if send_whatsapp_message(phone, message):
            success_count += 1
        else:
            fail_count += 1

        time.sleep(DELAY_SECONDS)

    print("-" * 50)
    print(f"🎉 Broadcast finished! Sent: {success_count} | Failed: {fail_count}\n")

if __name__ == "__main__":
    broadcast_from_file(EXCEL_FILE)
