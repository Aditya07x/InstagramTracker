"""Download Google Fonts for offline bundling in the WebView."""
import urllib.request
import os

DEST = r"c:\Android Projects\InstagramTracker\app\src\main\assets\www\fonts"
os.makedirs(DEST, exist_ok=True)

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Google Fonts CSS API gives per-subset files. We only need latin subset.
# URLs extracted from: fonts.googleapis.com/css2?family=...&display=swap
FONTS = {
    # Space Grotesk — latin (variable font serves same file for all weights)
    "SpaceGrotesk-Latin.woff2": "https://fonts.gstatic.com/s/spacegrotesk/v22/V8mDoQDjQSkFtoMM3T6r8E7mPbF4Cw.woff2",
    # Nunito — latin  
    "Nunito-Latin-600.woff2": "https://fonts.gstatic.com/s/nunito/v26/XRXI3I6Li01BKofiOc5wtlZ2di8HDFshRTY9jo7eTWk.woff2",
    "Nunito-Latin-700.woff2": "https://fonts.gstatic.com/s/nunito/v26/XRXI3I6Li01BKofiOc5wtlZ2di8HDGkhRTY9jo7eTWk.woff2",
    "Nunito-Latin-800.woff2": "https://fonts.gstatic.com/s/nunito/v26/XRXI3I6Li01BKofiOc5wtlZ2di8HDDkhRTY9jo7eTWk.woff2",
    # Space Mono — latin
    "SpaceMono-Regular.woff2": "https://fonts.gstatic.com/s/spacemono/v13/i7dPIFZifjKcF5UAWdDRYEF8RQ.woff2",
    "SpaceMono-Bold.woff2": "https://fonts.gstatic.com/s/spacemono/v13/i7dMIFZifjKcF5UAWdDRaPpZUFqaHg.woff2",
}

for name, url in FONTS.items():
    path = os.path.join(DEST, name)
    if os.path.exists(path) and os.path.getsize(path) > 1000:
        print(f"SKIP (exists): {name}")
        continue
    print(f"Downloading {name}...")
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
            with open(path, "wb") as f:
                f.write(data)
            print(f"  OK: {len(data)} bytes")
    except Exception as e:
        print(f"  FAIL: {e}")

# Also need Nunito latin from the CSS API - let's get them fresh
import re
for family, weights in [("Nunito", "600;700;800;900"), ("Space+Grotesk", "400;500;700;800")]:
    css_url = f"https://fonts.googleapis.com/css2?family={family}:wght@{weights}&display=swap"
    req = urllib.request.Request(css_url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req) as resp:
            css = resp.read().decode()
        # Parse latin blocks
        blocks = css.split("/*")
        for block in blocks:
            if "latin */" not in block or "latin-ext" in block or "vietnamese" in block or "cyrillic" in block:
                continue
            weight_m = re.search(r"font-weight:\s*(\d+)", block)
            url_m = re.search(r"url\((https://[^)]+\.woff2)\)", block)
            if weight_m and url_m:
                w = weight_m.group(1)
                u = url_m.group(1)
                fname = f"{family.replace('+','')}-{w}.woff2"
                fpath = os.path.join(DEST, fname)
                print(f"Downloading {fname} from CSS...")
                req2 = urllib.request.Request(u, headers={"User-Agent": UA})
                with urllib.request.urlopen(req2) as resp2:
                    data = resp2.read()
                    with open(fpath, "wb") as f:
                        f.write(data)
                    print(f"  OK: {len(data)} bytes")
    except Exception as e:
        print(f"  CSS fetch FAIL for {family}: {e}")

# List final contents
print("\n=== Font files ===")
for f in sorted(os.listdir(DEST)):
    size = os.path.getsize(os.path.join(DEST, f))
    print(f"  {f}: {size:,} bytes")
