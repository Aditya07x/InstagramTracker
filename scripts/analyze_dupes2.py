import csv, io

f = open("insta_data.csv", "r", encoding="utf-8-sig")
lines = f.readlines()
data = "".join(lines[1:])  # skip SCHEMA_VERSION line
rows = list(csv.DictReader(io.StringIO(data)))

# Sessions 3,4,6,10,11,13,15,16 all have 2x duplication of early reels
# Check if the duplicates are from retroactivelyUpdateCsv or from processPreviousReel

# For session 3: reels 1-27 appear 2x. Are they identical?
s3 = [r for r in rows if r["SessionNum"] == "3"]
print("Session 3:", len(s3), "rows")
r1_copies = [r for r in s3 if r["CumulativeReels"] == "1"]
print(f"  Reel 1 copies: {len(r1_copies)}")
if len(r1_copies) >= 2:
    a, b = r1_copies[0], r1_copies[1]
    diffs = []
    same = []
    for k in a.keys():
        if a[k] != b[k]:
            diffs.append((k, a[k], b[k]))
        else:
            same.append(k)
    print(f"  Differences between 2 copies of reel 1: {len(diffs)}")
    for k, v1, v2 in diffs:
        print(f"    {k}: '{v1}' -> '{v2}'")
    if not diffs:
        print("  Copies are IDENTICAL")

print()
# For session 10
s10 = [r for r in rows if r["SessionNum"] == "10"]
print("Session 10:", len(s10), "rows")
r1_10 = [r for r in s10 if r["CumulativeReels"] == "1"]
print(f"  Reel 1 copies: {len(r1_10)}")
if len(r1_10) >= 2:
    a, b = r1_10[0], r1_10[1]
    diffs = []
    for k in a.keys():
        if a[k] != b[k]:
            diffs.append((k, a[k], b[k]))
    print(f"  Differences: {len(diffs)}")
    for k, v1, v2 in diffs:
        print(f"    {k}: '{v1}' -> '{v2}'")
    if not diffs:
        print("  Copies are IDENTICAL")

# Check: are the 2x sessions the ones that had surveys?
print("\n--- Survey columns for duplicated sessions ---")
survey_cols = ["PostSessionRating", "IntendedAction", "ActualVsIntendedMatch", 
               "RegretScore", "MoodBefore", "MoodAfter", "ComparativeRating"]
for sess_num in ["3", "4", "6", "10", "11", "13", "15", "16"]:
    sr = [r for r in rows if r["SessionNum"] == sess_num]
    if sr:
        first = sr[0]
        vals = {c: first.get(c, "N/A") for c in survey_cols}
        print(f"  Session {sess_num}: {vals}")

# Check non-duplicated sessions
print("\n--- Survey columns for NON-duplicated sessions ---")
for sess_num in ["1", "5", "7", "8", "9", "12", "14", "17"]:
    sr = [r for r in rows if r["SessionNum"] == sess_num]
    if sr:
        first = sr[0]
        vals = {c: first.get(c, "N/A") for c in survey_cols}
        print(f"  Session {sess_num}: {vals}")
