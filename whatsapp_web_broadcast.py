import os
import time
import urllib.parse
import pandas as pd
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# ==============================================================================
# CONFIGURATION
# ==============================================================================
CSV_OR_EXCEL_FILE = "sample-contacts-import.csv"  # Put your Excel or CSV filename here
DELAY_BETWEEN_MESSAGES = 4  # Seconds to wait between each message (safe: 3-5 sec)

def clean_phone_number(phone_raw) -> str:
    """Removes scientific notation (e.g. 9.19E+11), non-digits, and formats country code."""
    if isinstance(phone_raw, float):
        phone_str = "{:.0f}".format(phone_raw)
    else:
        phone_str = str(phone_raw)

    # Handle scientific notation string like 9.19804E+11
    if "e+" in phone_str.lower():
        try:
            phone_str = "{:.0f}".format(float(phone_str))
        except Exception:
            pass

    phone = "".join(filter(str.isdigit, phone_str))
    if len(phone) == 10:
        phone = "91" + phone
    return phone

def start_whatsapp_broadcast():
    print("=" * 60)
    print("🚀 WHATSAPP BULK BROADCASTER (Direct Chrome Automation)")
    print("=" * 60)

    # 1. Load contacts from file
    if not os.path.exists(CSV_OR_EXCEL_FILE):
        print(f"❌ Error: File '{CSV_OR_EXCEL_FILE}' not found in the current folder!")
        return

    if CSV_OR_EXCEL_FILE.endswith(".csv"):
        df = pd.read_csv(CSV_OR_EXCEL_FILE)
    else:
        df = pd.read_excel(CSV_OR_EXCEL_FILE)

    total_contacts = len(df)
    print(f"📋 Loaded {total_contacts} contacts from '{CSV_OR_EXCEL_FILE}'\n")

    # 2. Launch Chrome Browser
    print("🌐 Launching Google Chrome...")
    options = webdriver.ChromeOptions()
    options.add_argument("--start-maximized")
    # Save Chrome session so you don't have to scan every time
    user_data_dir = os.path.join(os.getcwd(), "chrome_whatsapp_session")
    options.add_argument(f"--user-data-dir={user_data_dir}")

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

    # 3. Open WhatsApp Web
    print("📱 Opening WhatsApp Web...")
    driver.get("https://web.whatsapp.com")

    print("\n" + "*" * 60)
    print("👉 ACTION REQUIRED: SCAN THE QR CODE ON YOUR SCREEN")
    print("   (Wait until your chats appear in Chrome, then the broadcast will start)")
    print("*" * 60 + "\n")

    # Wait until WhatsApp Web is logged in (search bar or chat list appears)
    try:
        WebDriverWait(driver, 120).until(
            EC.presence_of_element_located((By.XPATH, '//div[@contenteditable="true"][@data-tab="3"] | //div[@id="side"]'))
        )
        print("✅ Logged in successfully! Starting broadcast in 3 seconds...\n")
        time.sleep(3)
    except Exception:
        print("❌ Login timeout. Please restart and scan the QR code within 2 minutes.")
        driver.quit()
        return

    success_count = 0
    fail_count = 0

    # 4. Iterate over each contact and send message
    for index, row in df.iterrows():
        name = str(row.get("firstName", row.get("name", "Friend")))
        if name == "nan":
            name = "Friend"
        phone = clean_phone_number(str(row.get("phoneNumber", row.get("phone", ""))))

        if not phone or len(phone) < 10:
            print(f"[{index + 1}/{total_contacts}] ⚠️ Skipping invalid number: {row.get('phoneNumber')}")
            fail_count += 1
            continue

        # -------------------------------------------------------------
        # CUSTOMIZE YOUR MESSAGE HERE
        # -------------------------------------------------------------
        message = (
            f"Hello {name}! 👋\n\n"
            f"You are invited to our exclusive annual event!\n"
            f"📍 Venue: Grand Convention Center\n"
            f"🗓 Date: Upcoming Weekend\n\n"
            f"Please reply with 'YES' to confirm your seat."
        )

        encoded_message = urllib.parse.quote(message)
        send_url = f"https://web.whatsapp.com/send?phone={phone}&text={encoded_message}"

        print(f"[{index + 1}/{total_contacts}] Sending to {name} (+{phone})...")

        try:
            driver.get(send_url)

            # Wait for the Send button to become clickable (or press Enter in message box)
            send_btn = WebDriverWait(driver, 20).until(
                EC.element_to_be_clickable((By.XPATH, '//button[@data-tab="11"] | //span[@data-icon="send"]/parent::button | //button[contains(@aria-label, "Send")]'))
            )
            time.sleep(1)
            send_btn.click()
            time.sleep(2)

            print(f"   ✓ Message sent successfully to +{phone}")
            success_count += 1
        except Exception as e:
            # Try fallback: finding text input and hitting ENTER
            try:
                msg_box = driver.find_element(By.XPATH, '//div[@contenteditable="true"][@data-tab="10"]')
                msg_box.send_keys(Keys.ENTER)
                time.sleep(2)
                print(f"   ✓ Message sent via Enter key to +{phone}")
                success_count += 1
            except Exception:
                print(f"   ❌ Could not send to +{phone} (Number may not be on WhatsApp)")
                fail_count += 1

        time.sleep(DELAY_BETWEEN_MESSAGES)

    print("\n" + "=" * 60)
    print(f"🎉 BROADCAST COMPLETE!")
    print(f"   ✅ Sent successfully: {success_count}")
    print(f"   ❌ Failed / Skipped:  {fail_count}")
    print("=" * 60)
    print("\nKeep Chrome open or close it when done.")

if __name__ == "__main__":
    start_whatsapp_broadcast()
