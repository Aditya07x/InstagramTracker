"""
build_bundle.py — Concatenates JSX files into a single IIFE and transpiles with esbuild.

Usage: python build_bundle.py
Run from:  app/src/main/assets/www/
Output:    app.bundle.js
"""
import re, subprocess, os, sys

BASE = os.path.dirname(os.path.abspath(__file__))

FILES = [
    'shared.jsx',
    'screens/MonitorScreen.jsx',
    'screens/DashboardScreen.jsx',
    'screens/CalendarScreen.jsx',
    'screens/SettingsScreen.jsx',
    'app.jsx',
]

def strip_module_syntax(src):
    """Remove ES import/export statements (including multi-line) from source.
    
    Uses a simple state machine with two skip types:
      - 'import': skip lines until we see the closing '} from ...'
      - 'export': skip lines until we see a line containing '}'
    """
    lines = src.split('\n')
    out = []
    skip_type = None  # None, 'import', or 'export'
    for line in lines:
        stripped = line.strip()
        # Inside a multi-line block — skip until terminator
        if skip_type == 'import':
            if re.search(r"from\s+['\"]", stripped):
                skip_type = None
            continue
        if skip_type == 'export':
            if '}' in stripped:
                skip_type = None
            continue
        # Start of multi-line import { ... } from '...'
        if re.match(r'^import\s+\{', stripped) and 'from' not in stripped:
            skip_type = 'import'
            continue
        # Single-line import
        if re.match(r'^import\s+', stripped):
            continue
        # export { ... } — might be multi-line
        if re.match(r'^export\s+\{', stripped):
            if '}' not in stripped:
                skip_type = 'export'
            continue
        # export default — keep the rest of the line
        if re.match(r'^export\s+default\s+', stripped):
            line = re.sub(r'^\s*export\s+default\s+', '', line)
        out.append(line)
    return '\n'.join(out)


combined = []
for relpath in FILES:
    fpath = os.path.join(BASE, relpath.replace('/', os.sep))
    with open(fpath, 'r', encoding='utf-8') as f:
        raw = f.read()
    cleaned = strip_module_syntax(raw)
    combined.append(f'\n  // {relpath}\n')
    combined.append(cleaned)

wrapped = '(() => {\n' + '\n'.join(combined) + '\n})();\n'

tmp = os.path.join(BASE, '_combined.jsx')
out = os.path.join(BASE, 'app.bundle.js')

with open(tmp, 'w', encoding='utf-8') as f:
    f.write(wrapped)

try:
    result = subprocess.run(
        ['npx', '-y', 'esbuild', tmp,
         '--outfile=' + out,
         '--jsx=transform',
         '--target=es2020',
         '--platform=browser'],
        capture_output=True, text=True, cwd=BASE, shell=True,
    )
    if result.returncode != 0:
        print('esbuild FAILED:', result.stderr, file=sys.stderr)
        sys.exit(1)
    print(result.stdout or result.stderr)
    print('✓ app.bundle.js rebuilt')
finally:
    if os.path.exists(tmp):
        os.remove(tmp)
