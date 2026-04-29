"""
update_data.py — обновляет main_dashboard/data.json из Google Sheets.

Требования:
  pip install gspread

Настройка (однократно):
  1. Создай Service Account в Google Cloud Console
     https://console.cloud.google.com/iam-admin/serviceaccounts
  2. Включи Google Sheets API в проекте
  3. Скачай JSON-ключ сервис-аккаунта
  4. Поделись обеими ДДС-таблицами с email сервис-аккаунта (View)
  5. В GitHub: Settings → Secrets → Actions → добавь секрет GOOGLE_CREDENTIALS
     (значение = содержимое JSON-файла ключа)

Локальный запуск:
  export GOOGLE_CREDENTIALS="$(cat path/to/key.json)"
  python scripts/update_data.py
"""

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

import gspread
from google.oauth2.service_account import Credentials

# ── Config ───────────────────────────────────────────────────────
SHEET_IDS = {
    "ilya":     "1x-q_WK0fLkr1lwFMQE3bqViCfkQRb5vU8QCwkp4OjpU",
    "kristina": "1uhh60Ab5WrXOEizKUXhCK41XWSG6KLbOuuPgvw3XvoI",
}
SHEET_NAME = "Все деньги"   # имя листа внутри каждой таблицы
OUTPUT_PATH = Path(__file__).parent.parent / "main_dashboard" / "data.json"

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
]

# ── Auth ─────────────────────────────────────────────────────────
def get_client() -> gspread.Client:
    creds_json = os.environ.get("GOOGLE_CREDENTIALS")
    if not creds_json:
        raise EnvironmentError("GOOGLE_CREDENTIALS не задан")
    info = json.loads(creds_json)
    creds = Credentials.from_service_account_info(info, scopes=SCOPES)
    return gspread.authorize(creds)


# ── Parsing ──────────────────────────────────────────────────────
def get_balance_h1(ws: gspread.Worksheet) -> str:
    """Читает ячейку H1 — итоговый баланс."""
    val = ws.acell("H1").value or ""
    return val.strip()


def get_last_date(ws: gspread.Worksheet) -> str:
    """
    Ищет последнее непустое значение в столбце C (дата),
    пропуская заголовок в строке 2.
    """
    col_c = ws.col_values(3)  # 1-based: C = 3
    last = ""
    for cell in col_c:
        v = (cell or "").strip()
        if v and v not in ("дата", "???", "##"):
            last = v
    return last


# ── Main ─────────────────────────────────────────────────────────
def main():
    print("🔑  Авторизация...")
    gc = get_client()

    result = {
        "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "sheets": {}
    }

    for key, sheet_id in SHEET_IDS.items():
        print(f"📊  Читаю ДДС {key} ({sheet_id})...")
        try:
            spreadsheet = gc.open_by_key(sheet_id)
            ws = spreadsheet.worksheet(SHEET_NAME)

            balance   = get_balance_h1(ws)
            last_date = get_last_date(ws)

            result["sheets"][key] = {
                "balance":   balance,
                "last_date": last_date,
                "url": f"https://docs.google.com/spreadsheets/d/{sheet_id}"
            }
            print(f"   ✓ balance={balance!r}  last_date={last_date!r}")
        except Exception as e:
            print(f"   ✗ Ошибка: {e}")
            result["sheets"][key] = {
                "balance":   None,
                "last_date": None,
                "url": f"https://docs.google.com/spreadsheets/d/{sheet_id}",
                "error": str(e)
            }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(f"\n✅  Записано в {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
