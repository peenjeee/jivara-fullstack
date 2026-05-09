# -*- coding: utf-8 -*-
"""
=======================================================
SCRAPER RESEP 55 KELAS MAKANAN YANG BELUM TERCAKUP
=======================================================
Install:
    pip install requests beautifulsoup4 pandas lxml

Jalankan:
    python scraper_resep_55_kelas.py
=======================================================
Mengambil data resep makanan dari MULTI sumber:
  1. Cookpad Indonesia (cookpad.com/id)
  2. MasakApaHariIni (masakapahariini.com)

Target: 55 kelas makanan dari YOLO dataset yang belum
        ada di data Cookpad sebelumnya.
=======================================================
"""

import os
import sys
import time
import random
import re
import requests
import pandas as pd
from bs4 import BeautifulSoup
from datetime import datetime
from urllib.parse import quote, urljoin
from pathlib import Path

os.environ['PYTHONIOENCODING'] = 'utf-8'

# Force UTF-8 stdout on Windows to avoid UnicodeEncodeError
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# ===================== CONFIG =====================
BASE_URL_COOKPAD = "https://cookpad.com"
SEARCH_URL_COOKPAD = "https://cookpad.com/id/cari/{keyword}"

OUTPUT_DIR = Path(__file__).parent
OUTPUT_CSV = str(OUTPUT_DIR / "resep_55_kelas_makanan.csv")

DELAY_MIN = 2.0
DELAY_MAX = 4.0
MAX_RETRIES = 3
MAX_PAGES_PER_KEYWORD = 2
MAX_RECIPES_PER_KEYWORD = 10   # Target 10 resep per kelas

# 55 kelas makanan yang BELUM tercakup di data Cookpad sebelumnya
# (6 kelas sudah ada: nasi goreng, rendang, bakso, gado-gado, soto ayam, mie goreng)
#
# Dikelompokkan berdasarkan sumber terbaik

KELAS_MAKANAN_TARGETS = {
    # === GRUP B: Makanan Indonesia spesifik (dari Merge Pipeline) ===
    "asinan-jakarta": ["asinan jakarta", "asinan betawi"],
    "ayam-betutu": ["ayam betutu", "betutu ayam bali"],
    "ayam-bumbu-rujak": ["ayam bumbu rujak"],
    "ayam-goreng-lengkuas": ["ayam goreng lengkuas", "ayam goreng laos"],
    "bika-ambon": ["bika ambon", "kue bika ambon"],
    "bir-pletok": ["bir pletok", "bir pletok betawi"],
    "bubur-manado": ["bubur manado", "tinutuan"],
    "cendol": ["cendol", "es cendol", "dawet"],
    "es-dawet": ["es dawet", "dawet ayu"],
    "gudeg": ["gudeg", "gudeg jogja"],
    "gulai-ikan-mas": ["gulai ikan mas", "gulai ikan"],
    "kerak-telor": ["kerak telor", "kerak telor betawi"],
    "klappertart": ["klappertart", "klapertart"],
    "kolak": ["kolak", "kolak pisang"],
    "kue-lumpur": ["kue lumpur", "kue lumpur kentang"],
    "kunyit-asam": ["kunyit asam", "jamu kunyit asam"],
    "laksa-bogor": ["laksa bogor", "laksa"],
    "lumpia-semarang": ["lumpia semarang", "lumpia"],
    "mie-aceh": ["mie aceh", "mi aceh"],
    "nagasari": ["nagasari", "kue nagasari"],
    "papeda": ["papeda", "papeda maluku"],
    "rawon-surabaya": ["rawon surabaya", "rawon"],
    "rujak-cingur": ["rujak cingur", "rujak cingur surabaya"],
    "sate-ayam-madura": ["sate ayam madura", "sate madura"],
    "sate-lilit": ["sate lilit", "sate lilit bali"],
    "sate-maranggi": ["sate maranggi", "sate maranggi purwakarta"],
    "soerabi": ["serabi", "surabi", "soerabi"],
    "soto-banjar": ["soto banjar", "soto banjar asli"],
    "tahu-telur": ["tahu telur", "tahu telor surabaya"],

    # === GRUP C: Makanan umum/sederhana (dari Roboflow) ===
    "ayam-goreng": ["ayam goreng", "ayam goreng crispy"],
    "capcay": ["capcay", "cap cay"],
    "ikan-goreng": ["ikan goreng", "ikan goreng tepung"],
    "kentang-goreng": ["kentang goreng", "french fries"],
    "nasi-putih": ["nasi putih"],  # sederhana, tapi ambil untuk referensi
    "nugget": ["nugget ayam", "nugget homemade"],
    "pempek": ["pempek", "pempek palembang"],
    "sate-umum": ["sate ayam", "sate kambing"],
    "spaghetti": ["spaghetti", "spaghetti bolognese"],
    "steak": ["steak sapi", "steak daging"],
    "tahu-goreng": ["tahu goreng", "tahu goreng crispy"],
    "telur-goreng": ["telur goreng", "telur dadar"],
    "telur-rebus": ["telur rebus", "telur rebus bumbu"],
    "tempe-goreng": ["tempe goreng", "tempe goreng tepung"],
    "terong-balado": ["terong balado", "balado terong"],
    "tumis-kangkung": ["tumis kangkung", "cah kangkung"],

    # === GRUP D: Makanan spesifik lainnya ===
    "apel": ["salad apel", "jus apel"],
    "biskuit-choco-chips": ["cookies choco chips", "biskuit coklat"],
    "burger": ["burger", "burger daging sapi"],
    "donat": ["donat", "donut"],
    "keladi": ["keladi goreng", "talas"],
    "kiwi": ["jus kiwi", "salad kiwi"],
    "nanas": ["jus nanas", "sambal nanas"],
    "pisang": ["pisang goreng", "kolak pisang"],
    "pizza": ["pizza", "pizza homemade"],
    "stroberi": ["jus stroberi", "puding stroberi"],
}

# ==================================================


def get_session() -> requests.Session:
    """Buat session dengan headers browser."""
    session = requests.Session()
    session.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/125.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
    })

    try:
        session.headers["Referer"] = "https://cookpad.com/id"
        resp = session.get(f"{BASE_URL_COOKPAD}/id", timeout=30)
        resp.raise_for_status()
        print(f"  [OK] Cookpad session siap")
    except Exception as e:
        print(f"  [!] Warning saat akses Cookpad: {e}")

    return session


def delay_random():
    """Random delay agar tidak terdeteksi sebagai bot."""
    wait = random.uniform(DELAY_MIN, DELAY_MAX)
    time.sleep(wait)


def fetch_page(session: requests.Session, url: str) -> BeautifulSoup | None:
    """Fetch halaman dan return BeautifulSoup object."""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = session.get(url, timeout=30)
            if resp.status_code == 429:
                print(f"      [!] Rate limited (429), tunggu 15 detik...")
                time.sleep(15)
                continue
            if resp.status_code == 403:
                print(f"      [!] Forbidden (403), tunggu 10 detik...")
                time.sleep(10)
                continue
            resp.raise_for_status()
            return BeautifulSoup(resp.text, "lxml")
        except requests.exceptions.HTTPError as e:
            print(f"      [!] HTTP Error (attempt {attempt}): {e}")
            if attempt < MAX_RETRIES:
                time.sleep(DELAY_MAX * 2)
        except requests.exceptions.ConnectionError as e:
            print(f"      [!] Connection Error (attempt {attempt}): {e}")
            if attempt < MAX_RETRIES:
                time.sleep(DELAY_MAX * 3)
        except Exception as e:
            print(f"      [!] Error (attempt {attempt}): {e}")
            if attempt < MAX_RETRIES:
                time.sleep(DELAY_MAX * 2)
    return None


# =============================================================
# COOKPAD SCRAPER (reuse logic dari scraper_Cookpad.py)
# =============================================================

def cookpad_get_recipe_links(session, keyword, max_pages=MAX_PAGES_PER_KEYWORD):
    """Ambil link resep dari pencarian Cookpad."""
    recipe_links = []
    encoded_keyword = quote(keyword)

    for page in range(1, max_pages + 1):
        if page == 1:
            url = SEARCH_URL_COOKPAD.format(keyword=encoded_keyword)
        else:
            url = SEARCH_URL_COOKPAD.format(keyword=encoded_keyword) + f"?page={page}"

        soup = fetch_page(session, url)
        if not soup:
            break

        found = 0
        seen = {r["url"] for r in recipe_links}
        for a_tag in soup.find_all("a", href=True):
            href = a_tag.get("href", "")
            if "/id/resep/" in href and "/resep/baru" not in href:
                title = a_tag.get_text(strip=True)
                if not title or len(title) < 3:
                    continue
                if title.lower() in ("cetak", "edit resep", "hapus", "laporkan resep",
                                     "bagikan", "kirim cooksnap", "tulis resep",
                                     "lebih banyak", "tersimpan", "tambahkan ke folder",
                                     "lihat detail statistik"):
                    continue
                full_url = urljoin(BASE_URL_COOKPAD, href).split("?")[0]
                if full_url not in seen:
                    recipe_links.append({"url": full_url, "title_preview": title})
                    seen.add(full_url)
                    found += 1

        if found == 0:
            break
        delay_random()

    return recipe_links


def cookpad_parse_recipe(session, url, kelas, kategori_search):
    """Parse detail resep Cookpad."""
    soup = fetch_page(session, url)
    if not soup:
        return None

    recipe = {
        "Nama Resep": "", "Deskripsi": "", "Bahan-bahan": "", "Jumlah Bahan": 0,
        "Langkah Memasak": "", "Jumlah Langkah": 0, "Waktu Memasak": "",
        "Jumlah Porsi": "", "Penulis": "", "Lokasi Penulis": "",
        "Kelas_YOLO": kelas, "Kategori_Search": kategori_search,
        "Sumber": "cookpad", "URL": url,
    }

    try:
        # Nama Resep
        title_tag = soup.find("title")
        if title_tag:
            title_text = title_tag.get_text(strip=True)
            if " oleh " in title_text:
                recipe["Nama Resep"] = title_text.split(" oleh ")[0].replace("Resep ", "", 1).strip()
            elif " - Cookpad" in title_text:
                recipe["Nama Resep"] = title_text.replace(" - Cookpad", "").replace("Resep ", "", 1).strip()
        if not recipe["Nama Resep"]:
            h1 = soup.find("h1")
            if h1:
                recipe["Nama Resep"] = h1.get_text(strip=True)

        # Deskripsi
        og_desc = soup.find("meta", attrs={"property": "og:description"})
        if og_desc and og_desc.get("content"):
            desc_text = og_desc["content"]
            if ". " in desc_text and desc_text.startswith("Resep "):
                desc_text = desc_text.split(". ", 1)[1]
            recipe["Deskripsi"] = desc_text.strip()

        # Bahan-bahan
        ingredients = []
        ingredient_section = None
        for header in soup.find_all(["h2", "h3"]):
            if "Bahan" in header.get_text():
                ingredient_section = header
                break
        if ingredient_section:
            next_list = ingredient_section.find_next(["ol", "ul"])
            if next_list:
                for li in next_list.find_all("li"):
                    text = li.get_text(separator=" ", strip=True)
                    if text and len(text) > 1:
                        ingredients.append(text)
        if not ingredients:
            for ol in soup.find_all("ol"):
                items = ol.find_all("li")
                if len(items) >= 3:
                    texts = [li.get_text(separator=" ", strip=True) for li in items if li.get_text(strip=True)]
                    avg_len = sum(len(t) for t in texts) / max(len(texts), 1)
                    if avg_len < 80 and len(texts) >= 3:
                        ingredients = texts
                        break

        recipe["Bahan-bahan"] = " | ".join(ingredients) if ingredients else ""
        recipe["Jumlah Bahan"] = len(ingredients)

        # Langkah Memasak
        steps = []
        step_section = None
        for header in soup.find_all(["h2", "h3"]):
            if "Cara Membuat" in header.get_text() or "Langkah" in header.get_text():
                step_section = header
                break
        if step_section:
            next_list = step_section.find_next(["ol", "ul"])
            if next_list:
                for li in next_list.find_all("li"):
                    text = li.get_text(separator=" ", strip=True)
                    if text and len(text) > 5 and not text.isdigit():
                        cleaned = re.sub(r'^\d+\s+', '', text).strip()
                        if cleaned and len(cleaned) > 5:
                            steps.append(cleaned)

        recipe["Langkah Memasak"] = " || ".join(steps) if steps else ""
        recipe["Jumlah Langkah"] = len(steps)

        # Penulis
        for a_tag in soup.find_all("a", href=True):
            if "/id/pengguna/" in a_tag.get("href", ""):
                author_text = a_tag.get_text(separator=" ", strip=True)
                if author_text and len(author_text) > 1:
                    recipe["Penulis"] = author_text.strip()
                    break

        # Waktu & Porsi
        page_text = soup.get_text()
        time_match = re.search(r'(\d+\s*(?:menit|jam|hari))', page_text, re.IGNORECASE)
        if time_match:
            recipe["Waktu Memasak"] = time_match.group(1).strip()
        porsi_match = re.search(r'(\d+\s*porsi)', page_text, re.IGNORECASE)
        if porsi_match:
            recipe["Jumlah Porsi"] = porsi_match.group(1).strip()

    except Exception as e:
        print(f"      [!] Error parsing: {e}")
        return None

    if not recipe["Nama Resep"]:
        return None
    return recipe


# =============================================================
# MAIN SCRAPING LOGIC
# =============================================================

def scrape_all_classes():
    """Scrape resep untuk semua 55 kelas makanan yang belum tercakup."""
    print(f"\n{'='*70}")
    print(f"  SCRAPER RESEP 55 KELAS MAKANAN - MULTI SOURCE")
    print(f"  Start: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*70}")
    print(f"  Total kelas target : {len(KELAS_MAKANAN_TARGETS)}")
    print(f"  Max resep/kelas    : {MAX_RECIPES_PER_KEYWORD}")
    print(f"  Max halaman/keyword: {MAX_PAGES_PER_KEYWORD}")
    print(f"{'='*70}\n")

    session = get_session()
    semua_resep = []
    seen_urls = set()

    for idx, (kelas, keywords) in enumerate(KELAS_MAKANAN_TARGETS.items(), 1):
        print(f"\n[{idx}/{len(KELAS_MAKANAN_TARGETS)}] Kelas: {kelas}")
        print(f"  Keywords: {keywords}")

        kelas_resep = []

        for keyword in keywords:
            if len(kelas_resep) >= MAX_RECIPES_PER_KEYWORD:
                break

            print(f"  Searching Cookpad: '{keyword}'...")
            links = cookpad_get_recipe_links(session, keyword)
            print(f"    Ditemukan {len(links)} link")

            for link in links:
                if len(kelas_resep) >= MAX_RECIPES_PER_KEYWORD:
                    break
                if link["url"] in seen_urls:
                    continue

                safe_title = link['title_preview'][:45].encode('ascii', 'replace').decode('ascii')
                print(f"    Parsing: {safe_title}...", end=" ", flush=True)
                recipe = cookpad_parse_recipe(session, link["url"], kelas, keyword)

                if recipe and recipe["Jumlah Bahan"] > 0:
                    kelas_resep.append(recipe)
                    seen_urls.add(link["url"])
                    print(f"[OK] Bahan:{recipe['Jumlah Bahan']}")
                else:
                    print("[SKIP]")

                delay_random()

        semua_resep.extend(kelas_resep)
        print(f"  [OK] {kelas}: {len(kelas_resep)} resep | Total: {len(semua_resep)}")

        # Backup setiap 10 kelas
        if idx % 10 == 0 and semua_resep:
            backup_path = str(OUTPUT_DIR / "resep_55_kelas_backup.csv")
            try:
                df_backup = pd.DataFrame(semua_resep)
                df_backup.to_csv(backup_path, index=False, encoding="utf-8-sig")
                print(f"\n  >>> Backup tersimpan: {backup_path} ({len(semua_resep)} resep)\n")
            except Exception as e:
                print(f"\n  >>> Backup gagal: {e}\n")

    print(f"\n{'='*70}")
    print(f"  SELESAI! Total: {len(semua_resep)} resep dari {len(KELAS_MAKANAN_TARGETS)} kelas")
    print(f"  End: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*70}")

    return semua_resep


def simpan_hasil(data):
    """Simpan hasil scraping ke CSV."""
    if not data:
        print("[!] Tidak ada data untuk disimpan")
        return

    df = pd.DataFrame(data)
    df.insert(0, "No", range(1, len(df) + 1))

    kolom_order = [
        "No", "Nama Resep", "Kelas_YOLO", "Kategori_Search", "Deskripsi",
        "Bahan-bahan", "Jumlah Bahan", "Langkah Memasak", "Jumlah Langkah",
        "Waktu Memasak", "Jumlah Porsi", "Penulis", "Lokasi Penulis",
        "Sumber", "URL",
    ]
    kolom_tersedia = [k for k in kolom_order if k in df.columns]
    df = df[kolom_tersedia]

    df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")
    print(f"\n[OK] CSV tersimpan: {OUTPUT_CSV}")

    # Statistik per kelas
    print(f"\n{'='*70}")
    print("STATISTIK PER KELAS:")
    print("="*70)
    stats = df.groupby("Kelas_YOLO").agg(
        Jumlah_Resep=("No", "count"),
        Rata2_Bahan=("Jumlah Bahan", "mean"),
    ).round(1)
    print(stats.to_string())

    kelas_kosong = set(KELAS_MAKANAN_TARGETS.keys()) - set(df["Kelas_YOLO"].unique())
    if kelas_kosong:
        print(f"\n[!] Kelas TANPA resep ({len(kelas_kosong)}):")
        for k in sorted(kelas_kosong):
            print(f"    - {k}")


# ===================== MAIN =====================
if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("  SCRAPER RESEP 55 KELAS MAKANAN")
    print("  Target: Melengkapi data untuk Ingredient Knowledge Base")
    print("=" * 70)
    print(f"[INFO] Total kelas  : {len(KELAS_MAKANAN_TARGETS)}")
    print(f"[INFO] Max resep    : ~{len(KELAS_MAKANAN_TARGETS) * MAX_RECIPES_PER_KEYWORD}")
    print(f"[INFO] Output       : {OUTPUT_CSV}")
    print(f"[INFO] Delay        : {DELAY_MIN}-{DELAY_MAX} detik\n")

    confirm = input("Mulai scraping? (y/n): ").strip().lower()
    if confirm != 'y':
        print("Dibatalkan.")
        sys.exit(0)

    data = scrape_all_classes()

    if data:
        simpan_hasil(data)
        print(f"\n{'='*70}")
        print(f"  SELESAI!")
        print(f"  File  : {OUTPUT_CSV}")
        print(f"  Total : {len(data)} resep")
        print(f"{'='*70}")
    else:
        print("\n[!] TIDAK ADA DATA YANG BERHASIL DIAMBIL")
