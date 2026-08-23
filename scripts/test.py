import json
with open('python_hmm/debug_results.json', 'r', encoding='utf-16le', errors='ignore') as f:
   d = json.load(f)
print('Sessions:', len(d.get('sessions', [])))
print('Reels:', sum(s.get('nReels', 0) for s in d.get('sessions', [])))
t = d.get('timeline', {})
print('Timeline exact length:', len(t.get('p_capture', [])))
print('Avgs:', [s.get('avgDwell') for s in d.get('sessions', [])[:5]])