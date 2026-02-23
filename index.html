<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reelio — Adaptive Latent State Engine</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@300;400;500;600&family=Crimson+Pro:ital,wght@0,300;0,400;1,300&display=swap" rel="stylesheet">
<style>
  :root {
    --doom: #ff2d2d;
    --doom-glow: rgba(255,45,45,0.25);
    --doom-dim: rgba(255,45,45,0.08);
    --casual: #00e5ff;
    --casual-glow: rgba(0,229,255,0.2);
    --casual-dim: rgba(0,229,255,0.06);
    --amber: #ffaa00;
    --amber-glow: rgba(255,170,0,0.2);
    --bg: #05050a;
    --bg2: #0b0b14;
    --bg3: #10101e;
    --border: rgba(255,255,255,0.06);
    --border-bright: rgba(255,255,255,0.12);
    --text: #e0e0ee;
    --text-dim: #6b6b88;
    --text-muted: #3a3a55;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html { scroll-behavior: smooth; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 14px;
    line-height: 1.7;
    overflow-x: hidden;
  }

  /* ─── CANVAS BACKGROUND ─────────────────── */
  #neural-canvas {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 0;
    pointer-events: none;
    opacity: 0.35;
  }

  /* ─── SCANLINES ─────────────────────────── */
  body::before {
    content: '';
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.15) 2px,
      rgba(0,0,0,0.15) 4px
    );
    pointer-events: none;
    z-index: 1;
  }

  /* ─── LAYOUT ────────────────────────────── */
  .wrapper {
    position: relative;
    z-index: 2;
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 32px;
  }

  /* ─── NAV ───────────────────────────────── */
  nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 100;
    background: rgba(5,5,10,0.85);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
  }

  .nav-inner {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 32px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .nav-logo {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 22px;
    letter-spacing: 3px;
    color: var(--casual);
    text-shadow: 0 0 20px var(--casual-glow);
  }

  .nav-links {
    display: flex;
    gap: 28px;
    list-style: none;
  }

  .nav-links a {
    color: var(--text-dim);
    text-decoration: none;
    font-size: 11px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    transition: color 0.2s;
  }

  .nav-links a:hover { color: var(--casual); }

  /* ─── HERO ──────────────────────────────── */
  .hero {
    min-height: 100vh;
    display: flex;
    align-items: center;
    padding-top: 80px;
    position: relative;
  }

  .hero-content {
    max-width: 900px;
  }

  .hero-eyebrow {
    font-size: 11px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--doom);
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .hero-eyebrow::before {
    content: '';
    display: inline-block;
    width: 32px; height: 1px;
    background: var(--doom);
    box-shadow: 0 0 8px var(--doom);
  }

  .hero-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(72px, 12vw, 140px);
    line-height: 0.9;
    letter-spacing: 4px;
    margin-bottom: 8px;
    color: #fff;
  }

  .hero-title .glitch {
    position: relative;
    display: inline-block;
    color: var(--casual);
    text-shadow: 0 0 40px var(--casual-glow);
    animation: glitch-flicker 6s infinite;
  }

  @keyframes glitch-flicker {
    0%, 94%, 100% { text-shadow: 0 0 40px var(--casual-glow); }
    95% { text-shadow: -3px 0 var(--doom), 3px 0 var(--casual), 0 0 40px var(--casual-glow); transform: skewX(-1deg); }
    96% { text-shadow: 3px 0 var(--doom), -3px 0 var(--casual), 0 0 40px var(--casual-glow); transform: skewX(1deg); }
    97% { text-shadow: 0 0 40px var(--casual-glow); transform: skewX(0); }
  }

  .hero-subtitle {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(28px, 5vw, 56px);
    letter-spacing: 6px;
    color: var(--text-dim);
    margin-bottom: 40px;
  }

  .hero-desc {
    font-family: 'Crimson Pro', serif;
    font-size: 20px;
    line-height: 1.8;
    color: rgba(224, 224, 238, 0.7);
    max-width: 680px;
    margin-bottom: 52px;
    font-weight: 300;
  }

  .hero-desc strong {
    color: var(--casual);
    font-weight: 400;
  }

  /* ─── STAT PILLS ─────────────────────────── */
  .stat-row {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 52px;
  }

  .stat-pill {
    border: 1px solid var(--border-bright);
    background: var(--bg2);
    padding: 14px 24px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    position: relative;
    overflow: hidden;
    transition: border-color 0.3s, transform 0.3s;
  }

  .stat-pill::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
  }

  .stat-pill.doom::before { background: var(--doom); box-shadow: 0 0 12px var(--doom); }
  .stat-pill.casual::before { background: var(--casual); box-shadow: 0 0 12px var(--casual); }
  .stat-pill.amber::before { background: var(--amber); box-shadow: 0 0 12px var(--amber); }

  .stat-pill:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.2); }

  .stat-num {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 36px;
    letter-spacing: 2px;
    line-height: 1;
  }

  .stat-pill.doom .stat-num { color: var(--doom); text-shadow: 0 0 20px var(--doom-glow); }
  .stat-pill.casual .stat-num { color: var(--casual); text-shadow: 0 0 20px var(--casual-glow); }
  .stat-pill.amber .stat-num { color: var(--amber); text-shadow: 0 0 20px var(--amber-glow); }

  .stat-label {
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .hero-cta {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  .btn {
    padding: 14px 32px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-decoration: none;
    cursor: pointer;
    border: none;
    transition: all 0.25s;
    position: relative;
    overflow: hidden;
  }

  .btn-primary {
    background: var(--casual);
    color: #000;
    font-weight: 600;
  }

  .btn-primary:hover {
    background: #fff;
    box-shadow: 0 0 40px var(--casual-glow);
  }

  .btn-ghost {
    background: transparent;
    color: var(--text);
    border: 1px solid var(--border-bright);
  }

  .btn-ghost:hover {
    border-color: var(--casual);
    color: var(--casual);
  }

  /* ─── SECTIONS ──────────────────────────── */
  section {
    padding: 120px 0;
    border-top: 1px solid var(--border);
  }

  .section-label {
    font-size: 10px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .section-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
    max-width: 200px;
  }

  .section-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(42px, 6vw, 72px);
    letter-spacing: 3px;
    color: #fff;
    line-height: 1;
    margin-bottom: 52px;
  }

  .section-title span { color: var(--casual); }

  /* ─── ARCHITECTURE ──────────────────────── */
  .arch-flow {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .arch-node {
    background: var(--bg2);
    border: 1px solid var(--border);
    padding: 24px 28px;
    position: relative;
    transition: border-color 0.3s, background 0.3s;
    cursor: default;
  }

  .arch-node:hover {
    border-color: var(--casual);
    background: rgba(0,229,255,0.03);
  }

  .arch-node .node-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;
  }

  .node-icon {
    width: 36px; height: 36px;
    border: 1px solid var(--border-bright);
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
  }

  .node-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--casual);
    letter-spacing: 1px;
  }

  .node-desc {
    font-size: 12px;
    color: var(--text-dim);
    line-height: 1.6;
  }

  .node-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }

  .tag {
    font-size: 10px;
    padding: 3px 10px;
    letter-spacing: 1px;
    border: 1px solid var(--border);
    color: var(--text-dim);
  }

  .tag.doom { border-color: rgba(255,45,45,0.3); color: var(--doom); background: var(--doom-dim); }
  .tag.casual { border-color: rgba(0,229,255,0.3); color: var(--casual); background: var(--casual-dim); }
  .tag.amber { border-color: rgba(255,170,0,0.3); color: var(--amber); background: rgba(255,170,0,0.07); }

  .arch-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 0;
    color: var(--text-muted);
    font-size: 20px;
  }

  /* ─── FEATURE LAYERS ────────────────────── */
  .layers-grid {
    display: grid;
    gap: 2px;
  }

  .layer-item {
    background: var(--bg2);
    border: 1px solid var(--border);
    overflow: hidden;
    transition: border-color 0.3s;
  }

  .layer-item.open { border-color: rgba(0,229,255,0.25); }

  .layer-header {
    padding: 20px 24px;
    display: flex;
    align-items: center;
    gap: 20px;
    cursor: pointer;
    user-select: none;
    transition: background 0.2s;
  }

  .layer-header:hover { background: rgba(255,255,255,0.02); }

  .layer-num {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 32px;
    letter-spacing: 2px;
    color: var(--text-muted);
    width: 36px;
    flex-shrink: 0;
    line-height: 1;
  }

  .layer-item.open .layer-num { color: var(--casual); text-shadow: 0 0 20px var(--casual-glow); }

  .layer-info { flex: 1; }

  .layer-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }

  .layer-item.open .layer-name { color: var(--casual); }

  .layer-meta { font-size: 11px; color: var(--text-dim); }

  .layer-chevron {
    color: var(--text-muted);
    font-size: 12px;
    transition: transform 0.3s;
  }

  .layer-item.open .layer-chevron { transform: rotate(180deg); color: var(--casual); }

  .layer-body {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.4s ease;
  }

  .layer-item.open .layer-body { max-height: 1200px; }

  .feature-table {
    width: 100%;
    border-collapse: collapse;
    margin: 0;
    font-size: 12px;
  }

  .feature-table tr {
    border-top: 1px solid var(--border);
  }

  .feature-table tr:first-child { border-top: 1px solid rgba(0,229,255,0.15); }

  .feature-table td {
    padding: 12px 24px;
    vertical-align: top;
  }

  .feature-table td:first-child {
    font-weight: 600;
    color: var(--amber);
    white-space: nowrap;
    width: 40%;
    font-size: 11px;
  }

  .feature-table td:last-child { color: var(--text-dim); }

  /* ─── MODEL PILLARS ─────────────────────── */
  .pillars-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2px;
  }

  @media (max-width: 768px) {
    .pillars-grid { grid-template-columns: 1fr; }
    .nav-links { display: none; }
  }

  .pillar-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    padding: 28px 24px;
    position: relative;
    overflow: hidden;
    transition: all 0.3s;
  }

  .pillar-card::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: radial-gradient(circle at 50% 0%, rgba(0,229,255,0.05), transparent 70%);
    opacity: 0;
    transition: opacity 0.3s;
  }

  .pillar-card:hover::after { opacity: 1; }
  .pillar-card:hover { border-color: rgba(0,229,255,0.2); transform: translateY(-2px); }

  .pillar-num {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 48px;
    letter-spacing: 2px;
    line-height: 1;
    color: var(--text-muted);
    margin-bottom: 12px;
    transition: color 0.3s;
  }

  .pillar-card:hover .pillar-num { color: var(--casual); text-shadow: 0 0 20px var(--casual-glow); }

  .pillar-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: 1px;
    margin-bottom: 10px;
    text-transform: uppercase;
  }

  .pillar-desc {
    font-size: 12px;
    color: var(--text-dim);
    line-height: 1.7;
  }

  /* ─── DOOM SCORE TABLE ───────────────────── */
  .doom-table {
    width: 100%;
    border-collapse: collapse;
  }

  .doom-table thead tr {
    border-bottom: 1px solid rgba(255,45,45,0.3);
  }

  .doom-table th {
    padding: 12px 16px;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--doom);
    text-align: left;
    font-weight: 500;
  }

  .doom-table tbody tr {
    border-bottom: 1px solid var(--border);
    transition: background 0.2s;
  }

  .doom-table tbody tr:hover { background: var(--doom-dim); }

  .doom-table td {
    padding: 14px 16px;
    font-size: 12px;
    vertical-align: middle;
  }

  .doom-table td:first-child { color: var(--text); font-weight: 500; }
  .doom-table td:nth-child(2) { color: var(--amber); font-size: 11px; }

  .weight-bar-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .weight-bar {
    height: 4px;
    background: var(--bg3);
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .weight-bar-fill {
    height: 100%;
    background: var(--doom);
    box-shadow: 0 0 8px var(--doom-glow);
    width: 0;
    transition: width 1.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .weight-pct {
    font-size: 11px;
    color: var(--doom);
    width: 32px;
    text-align: right;
    flex-shrink: 0;
  }

  /* ─── HMM DIAGRAM ───────────────────────── */
  .hmm-diagram-wrap {
    background: var(--bg2);
    border: 1px solid var(--border);
    padding: 60px 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 40px;
    position: relative;
    overflow: hidden;
  }

  .hmm-states {
    display: flex;
    align-items: center;
    gap: 100px;
    position: relative;
    z-index: 2;
  }

  .hmm-state {
    width: 140px; height: 140px;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    cursor: default;
  }

  .hmm-state.casual-node {
    border: 2px solid var(--casual);
    box-shadow: 0 0 40px var(--casual-glow), inset 0 0 40px rgba(0,229,255,0.05);
    animation: pulse-casual 3s ease-in-out infinite;
  }

  .hmm-state.doom-node {
    border: 2px solid var(--doom);
    box-shadow: 0 0 40px var(--doom-glow), inset 0 0 40px rgba(255,45,45,0.05);
    animation: pulse-doom 3s ease-in-out infinite 1.5s;
  }

  @keyframes pulse-casual {
    0%, 100% { box-shadow: 0 0 30px var(--casual-glow), inset 0 0 30px rgba(0,229,255,0.05); }
    50% { box-shadow: 0 0 60px rgba(0,229,255,0.4), inset 0 0 40px rgba(0,229,255,0.08); }
  }

  @keyframes pulse-doom {
    0%, 100% { box-shadow: 0 0 30px var(--doom-glow), inset 0 0 30px rgba(255,45,45,0.05); }
    50% { box-shadow: 0 0 60px rgba(255,45,45,0.45), inset 0 0 40px rgba(255,45,45,0.1); }
  }

  .hmm-state-name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 20px;
    letter-spacing: 3px;
  }

  .casual-node .hmm-state-name { color: var(--casual); }
  .doom-node .hmm-state-name { color: var(--doom); }

  .hmm-state-desc {
    font-size: 10px;
    color: var(--text-dim);
    letter-spacing: 1px;
    margin-top: 4px;
  }

  .hmm-arrows {
    position: absolute;
    left: 140px; right: 140px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
  }

  .hmm-arrow-svg { width: 100%; height: 80px; overflow: visible; }

  .transition-label {
    font-size: 11px;
    fill: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
  }

  /* ─── TECH STACK ────────────────────────── */
  .tech-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 2px;
  }

  .tech-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    padding: 24px;
    transition: all 0.3s;
    position: relative;
    overflow: hidden;
  }

  .tech-card:hover {
    border-color: rgba(0,229,255,0.25);
    background: rgba(0,229,255,0.02);
  }

  .tech-layer {
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 8px;
  }

  .tech-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 6px;
    letter-spacing: 0.5px;
  }

  .tech-detail { font-size: 11px; color: var(--text-dim); }

  /* ─── TERMINAL BLOCK ─────────────────────── */
  .terminal {
    background: #000;
    border: 1px solid var(--border-bright);
    font-size: 13px;
    position: relative;
    overflow: hidden;
  }

  .terminal-bar {
    background: #111;
    border-bottom: 1px solid var(--border);
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .terminal-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
  }

  .terminal-dot:nth-child(1) { background: #ff5f57; }
  .terminal-dot:nth-child(2) { background: #ffbd2e; }
  .terminal-dot:nth-child(3) { background: #28c940; }

  .terminal-title {
    font-size: 11px;
    color: var(--text-dim);
    letter-spacing: 1px;
    margin-left: 8px;
  }

  .terminal-body {
    padding: 24px;
    color: #ccc;
    line-height: 1.8;
  }

  .terminal-body .cmd { color: var(--casual); }
  .terminal-body .comment { color: #555; }
  .terminal-body .str { color: var(--amber); }
  .terminal-body .prompt { color: var(--text-muted); user-select: none; }

  /* ─── ROADMAP ───────────────────────────── */
  .roadmap-track {
    display: flex;
    flex-direction: column;
    gap: 0;
    position: relative;
  }

  .roadmap-track::before {
    content: '';
    position: absolute;
    left: 15px; top: 0; bottom: 0;
    width: 1px;
    background: linear-gradient(to bottom, var(--casual), var(--doom), var(--text-muted));
  }

  .roadmap-group { margin-bottom: 40px; }

  .roadmap-horizon {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 22px;
    letter-spacing: 3px;
    padding: 8px 0 16px 48px;
    position: relative;
  }

  .roadmap-horizon::before {
    content: '';
    position: absolute;
    left: 8px; top: 14px;
    width: 16px; height: 16px;
    border-radius: 50%;
    border: 2px solid currentColor;
    background: var(--bg);
  }

  .roadmap-group:nth-child(1) .roadmap-horizon { color: var(--casual); }
  .roadmap-group:nth-child(2) .roadmap-horizon { color: var(--amber); }
  .roadmap-group:nth-child(3) .roadmap-horizon { color: var(--doom); }

  .roadmap-item {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 12px 16px 12px 48px;
    margin-bottom: 4px;
    border: 1px solid transparent;
    transition: all 0.2s;
    cursor: default;
    position: relative;
  }

  .roadmap-item::before {
    content: '';
    position: absolute;
    left: 11px; top: 18px;
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--bg3);
    border: 1px solid var(--border-bright);
  }

  .roadmap-item:hover {
    background: var(--bg2);
    border-color: var(--border);
  }

  .roadmap-item:hover::before { background: var(--casual); border-color: var(--casual); }

  .roadmap-checkbox {
    width: 16px; height: 16px;
    border: 1px solid var(--border-bright);
    flex-shrink: 0;
    margin-top: 2px;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px;
  }

  .roadmap-text {
    font-size: 13px;
    color: var(--text-dim);
    line-height: 1.5;
  }

  /* ─── PRIVACY PANEL ─────────────────────── */
  .privacy-panel {
    background: var(--bg2);
    border: 1px solid rgba(0,229,255,0.2);
    padding: 48px;
    position: relative;
    overflow: hidden;
  }

  .privacy-panel::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--casual), transparent);
  }

  .privacy-headline {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 52px;
    letter-spacing: 3px;
    color: var(--casual);
    text-shadow: 0 0 40px var(--casual-glow);
    margin-bottom: 24px;
    line-height: 1;
  }

  .privacy-items {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: 32px;
  }

  @media (max-width: 600px) {
    .privacy-items { grid-template-columns: 1fr; }
    .pillars-grid { grid-template-columns: 1fr; }
    .tech-grid { grid-template-columns: 1fr; }
  }

  .privacy-item {
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }

  .privacy-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--casual);
    box-shadow: 0 0 8px var(--casual);
    flex-shrink: 0;
    margin-top: 6px;
  }

  .privacy-text { font-size: 12px; color: var(--text-dim); line-height: 1.7; }

  /* ─── FOOTER ────────────────────────────── */
  footer {
    border-top: 1px solid var(--border);
    padding: 48px 0;
  }

  .footer-inner {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 24px;
  }

  .footer-logo {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 48px;
    letter-spacing: 6px;
    color: var(--text-muted);
  }

  .footer-tagline {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 18px;
    color: var(--text-dim);
  }

  .footer-meta {
    text-align: right;
  }

  .footer-license {
    font-size: 11px;
    color: var(--text-muted);
    letter-spacing: 1px;
    margin-bottom: 4px;
  }

  .footer-made {
    font-size: 10px;
    color: var(--text-muted);
  }

  /* ─── SCROLL REVEAL ─────────────────────── */
  .reveal {
    opacity: 0;
    transform: translateY(28px);
    transition: opacity 0.7s ease, transform 0.7s ease;
  }

  .reveal.visible {
    opacity: 1;
    transform: translateY(0);
  }

  /* ─── PERMISSION TABLE ───────────────────── */
  .perm-table { width: 100%; border-collapse: collapse; }

  .perm-table tr { border-bottom: 1px solid var(--border); transition: background 0.2s; }
  .perm-table tr:hover { background: rgba(255,255,255,0.01); }

  .perm-table th {
    font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
    color: var(--text-muted); padding: 10px 16px; text-align: left;
    border-bottom: 1px solid var(--border-bright);
    font-weight: 500;
  }

  .perm-table td { padding: 12px 16px; font-size: 12px; }
  .perm-table td:first-child { color: var(--amber); font-weight: 600; font-size: 11px; }
  .perm-table td:last-child { color: var(--text-dim); }

  /* ─── LIMITATIONS ───────────────────────── */
  .limits-list { list-style: none; display: flex; flex-direction: column; gap: 2px; }

  .limit-item {
    background: var(--bg2);
    border: 1px solid var(--border);
    padding: 20px 24px;
    display: flex;
    gap: 20px;
    align-items: flex-start;
    transition: border-color 0.2s;
  }

  .limit-item:hover { border-color: rgba(255,170,0,0.2); }

  .limit-icon { color: var(--amber); font-size: 16px; flex-shrink: 0; margin-top: 1px; }

  .limit-text b { display: block; font-size: 12px; color: var(--text); margin-bottom: 4px; font-weight: 600; }

  .limit-text span { font-size: 12px; color: var(--text-dim); line-height: 1.6; }

  /* ─── PROJECT TREE ──────────────────────── */
  .tree-wrap {
    background: #000;
    border: 1px solid var(--border-bright);
    padding: 32px;
    font-size: 12px;
    line-height: 2;
    color: var(--text-dim);
  }

  .tree-wrap .folder { color: var(--casual); }
  .tree-wrap .file { color: var(--text-dim); }
  .tree-wrap .comment { color: var(--text-muted); }
  .tree-wrap .core { color: var(--amber); font-weight: 600; }

</style>
</head>
<body>

<canvas id="neural-canvas"></canvas>

<!-- NAV -->
<nav>
  <div class="nav-inner">
    <div class="nav-logo">REELIO</div>
    <ul class="nav-links">
      <li><a href="#what">What it does</a></li>
      <li><a href="#architecture">Architecture</a></li>
      <li><a href="#model">ALSE Model</a></li>
      <li><a href="#privacy">Privacy</a></li>
      <li><a href="#build">Build</a></li>
      <li><a href="#roadmap">Roadmap</a></li>
    </ul>
  </div>
</nav>

<!-- HERO -->
<div class="wrapper">
  <div class="hero">
    <div class="hero-content">
      <div class="hero-eyebrow">On-device behavioral intelligence · Android</div>
      <div class="hero-title">
        <div class="glitch">REELIO</div>
      </div>
      <div class="hero-subtitle">Adaptive Latent State Engine</div>
      <p class="hero-desc">
        Reelio runs silently in the background, capturing <strong>80+ behavioral signals</strong> per reel — then models your doomscrolling probability using a <strong>Hidden Markov Model</strong> that learns your personal baseline. Every inference happens on-device. <strong>Zero data leaves your phone.</strong>
      </p>

      <div class="stat-row">
        <div class="stat-pill doom">
          <div class="stat-num">80+</div>
          <div class="stat-label">Behavioral signals / reel</div>
        </div>
        <div class="stat-pill casual">
          <div class="stat-num">9</div>
          <div class="stat-label">HMM architectural pillars</div>
        </div>
        <div class="stat-pill amber">
          <div class="stat-num">8</div>
          <div class="stat-label">Sensor & context layers</div>
        </div>
        <div class="stat-pill doom">
          <div class="stat-num">0</div>
          <div class="stat-label">Bytes sent to any server</div>
        </div>
      </div>

      <div class="hero-cta">
        <a href="#build" class="btn btn-primary">Build it →</a>
        <a href="#model" class="btn btn-ghost">ALSE Model docs</a>
      </div>
    </div>
  </div>
</div>

<!-- WHAT IT DOES -->
<section id="what">
  <div class="wrapper">
    <div class="section-label reveal">01 · Overview</div>
    <div class="section-title reveal">What it <span>does</span></div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:2px;" class="reveal">
      <div style="background:var(--bg2); border:1px solid var(--border); padding:32px;">
        <div style="font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--casual); margin-bottom:16px;">While you scroll</div>
        <p style="font-family:'Crimson Pro',serif; font-size:17px; line-height:1.9; color:rgba(224,224,238,0.7); font-weight:300;">
          Reelio's Accessibility Service silently captures scroll velocity, dwell time, swipe completion ratios, back-scroll rewatches, exit attempts, ambient light, accelerometer variance, audio routing, previous app context, and dozens more signals — all in real-time, per reel.
        </p>
      </div>
      <div style="background:var(--bg2); border:1px solid var(--border); padding:32px;">
        <div style="font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--doom); margin-bottom:16px;">After you close Instagram</div>
        <p style="font-family:'Crimson Pro',serif; font-size:17px; line-height:1.9; color:rgba(224,224,238,0.7); font-weight:300;">
          The ALSE model runs on-device via Chaquopy, classifying each reel as <strong style="color:var(--casual)">CASUAL</strong> (passive browsing) or <strong style="color:var(--doom)">DOOM</strong> (compulsive capture). The model learns your personal baseline over time, growing more accurate with each session.
        </p>
      </div>
    </div>

    <!-- HMM Diagram -->
    <div class="hmm-diagram-wrap reveal" style="margin-top:2px;">
      <div style="font-size:10px; letter-spacing:3px; text-transform:uppercase; color:var(--text-muted); align-self:flex-start;">HMM Latent State Space</div>
      <div class="hmm-states">
        <div class="hmm-state casual-node">
          <div class="hmm-state-name">CASUAL</div>
          <div class="hmm-state-desc">passive</div>
        </div>
        <div style="position:relative; flex:1; height:80px;">
          <svg class="hmm-arrow-svg" viewBox="0 0 200 80" preserveAspectRatio="none">
            <!-- top arrow: CASUAL → DOOM -->
            <defs>
              <marker id="arrC" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="rgba(255,45,45,0.6)"/>
              </marker>
              <marker id="arrD" markerWidth="8" markerHeight="8" refX="2" refY="3" orient="auto">
                <path d="M8,0 L8,6 L0,3 z" fill="rgba(0,229,255,0.6)"/>
              </marker>
            </defs>
            <path d="M10,30 Q100,5 190,30" stroke="rgba(255,45,45,0.5)" stroke-width="1.5" fill="none" marker-end="url(#arrC)" stroke-dasharray="4,3">
              <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1.5s" repeatCount="indefinite"/>
            </path>
            <path d="M190,50 Q100,75 10,50" stroke="rgba(0,229,255,0.5)" stroke-width="1.5" fill="none" marker-end="url(#arrD)" stroke-dasharray="4,3">
              <animate attributeName="stroke-dashoffset" from="0" to="14" dur="1.5s" repeatCount="indefinite"/>
            </path>
            <text x="100" y="18" text-anchor="middle" class="transition-label" font-size="9" fill="rgba(255,45,45,0.7)">P(doom | casual)</text>
            <text x="100" y="72" text-anchor="middle" class="transition-label" font-size="9" fill="rgba(0,229,255,0.7)">P(casual | doom)</text>
          </svg>
        </div>
        <div class="hmm-state doom-node">
          <div class="hmm-state-name">DOOM</div>
          <div class="hmm-state-desc">captured</div>
        </div>
      </div>
      <div style="display:flex; gap:40px; font-size:11px; color:var(--text-muted);">
        <span>Emission features: <span style="color:var(--casual)">log_dwell · log_speed · rhythm_dissociation · rewatch_flag · exit_flag · swipe_incomplete</span></span>
      </div>
    </div>
  </div>
</section>

<!-- ARCHITECTURE -->
<section id="architecture">
  <div class="wrapper">
    <div class="section-label reveal">02 · System Design</div>
    <div class="section-title reveal">Architecture</div>

    <div class="arch-flow reveal">
      <div class="arch-node">
        <div class="node-header">
          <div class="node-icon">📱</div>
          <div class="node-name">Instagram App (foreground)</div>
        </div>
        <div class="node-desc">User-facing surface. Reelio reads its accessibility event tree — never its content.</div>
      </div>

      <div class="arch-arrow">↓</div>

      <div class="arch-node">
        <div class="node-header">
          <div class="node-icon" style="color:var(--casual);">⚡</div>
          <div class="node-name">InstaAccessibilityService.kt</div>
        </div>
        <div class="node-desc">The core tracking engine. Subscribes to all window content change events from Instagram. Extracts per-reel features across all 8 layers, manages session lifecycle with a 20s timeout handler, fuses accelerometer + light sensor data, writes append-only CSV rows, and triggers Python inference via the Chaquopy bridge.</div>
        <div class="node-tags">
          <span class="tag casual">Kotlin</span>
          <span class="tag">AccessibilityService</span>
          <span class="tag">SensorEventListener</span>
          <span class="tag">Room DB</span>
          <span class="tag casual">Schema v4</span>
          <span class="tag">80+ signals</span>
        </div>
      </div>

      <div class="arch-arrow">↓</div>

      <div class="arch-node">
        <div class="node-header">
          <div class="node-icon" style="color:var(--amber);">🧠</div>
          <div class="node-name">reelio_alse.py — on-device via Chaquopy</div>
        </div>
        <div class="node-desc">The full ML pipeline. Parses and validates the session CSV, preprocesses 6 HMM emission features, runs the ReelioCLSE Hidden Markov Model with 9 architectural pillars, persists learned state to <code style="color:var(--amber); font-size:11px;">alse_model_state.json</code>, and returns a JSON payload of doom probabilities and insight data to the Kotlin layer.</div>
        <div class="node-tags">
          <span class="tag amber">Python 3.11</span>
          <span class="tag">NumPy</span>
          <span class="tag">pandas</span>
          <span class="tag">scipy.optimize</span>
          <span class="tag amber">Chaquopy 15.0</span>
          <span class="tag doom">HMM · CTMC · KL-divergence</span>
        </div>
      </div>

      <div class="arch-arrow">↓</div>

      <div class="arch-node">
        <div class="node-header">
          <div class="node-icon" style="color:var(--doom);">📊</div>
          <div class="node-name">MainActivity.kt + React WebView Dashboard</div>
        </div>
        <div class="node-desc">A React 18 app served from <code style="color:var(--amber); font-size:11px;">assets/www/</code> inside a WebView. Receives a JSON payload via <code style="color:var(--amber); font-size:11px;">window.injectedJsonData</code> on every load. Renders the Cognitive Stability Index, HMM State Dynamics, 14-Day Risk Heatmap, Doom Score Anatomy, and Capture Timeline — all from local data, no network calls.</div>
        <div class="node-tags">
          <span class="tag">React 18 UMD</span>
          <span class="tag">Recharts</span>
          <span class="tag">Lucide React</span>
          <span class="tag doom">JavascriptInterface bridge</span>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- FEATURE LAYERS -->
<section id="features">
  <div class="wrapper">
    <div class="section-label reveal">03 · Signal Engineering</div>
    <div class="section-title reveal">Feature <span>layers</span></div>

    <div class="layers-grid reveal">

      <!-- Layer 1 -->
      <div class="layer-item" onclick="toggleLayer(this)">
        <div class="layer-header">
          <div class="layer-num">01</div>
          <div class="layer-info">
            <div class="layer-name">Interaction Signals</div>
            <div class="layer-meta">per reel · 15 signals</div>
          </div>
          <div class="layer-chevron">▼</div>
        </div>
        <div class="layer-body">
          <table class="feature-table">
            <tr><td>DwellTime</td><td>Seconds spent on this reel</td></tr>
            <tr><td>AvgScrollSpeed / MaxScrollSpeed</td><td>Swipe velocity (events/sec)</td></tr>
            <tr><td>ScrollPauseCount / ScrollPauseDurationMs</td><td>Mid-reel hesitations</td></tr>
            <tr><td>SwipeCompletionRatio</td><td>Ratio of clean swipes vs. aborted swipes</td></tr>
            <tr><td>BackScrollCount</td><td>How many times the user scrolled back (rewatch)</td></tr>
            <tr><td>Liked / Commented / Shared / Saved</td><td>Engagement flags</td></tr>
            <tr><td>LikeLatency / CommentLatency</td><td>Time from reel start to interaction</td></tr>
            <tr><td>AppExitAttempts</td><td>Rapid exits + re-entries within 20 seconds</td></tr>
            <tr><td>ProfileVisits / HashtagTaps</td><td>Deep engagement indicators</td></tr>
            <tr><td>HasCaption / CaptionExpanded / HasAudio / IsAd</td><td>Content metadata flags</td></tr>
          </table>
        </div>
      </div>

      <!-- Layer 2 -->
      <div class="layer-item" onclick="toggleLayer(this)">
        <div class="layer-header">
          <div class="layer-num">02</div>
          <div class="layer-info">
            <div class="layer-name">Physical Context</div>
            <div class="layer-meta">per session · sensor fusion</div>
          </div>
          <div class="layer-chevron">▼</div>
        </div>
        <div class="layer-body">
          <table class="feature-table">
            <tr><td>AccelVariance / PostureShiftCount</td><td>Motion from accelerometer</td></tr>
            <tr><td>IsStationary</td><td>Low-movement detection</td></tr>
            <tr><td>DeviceOrientation</td><td>Portrait vs. Landscape</td></tr>
            <tr><td>AmbientLuxStart / AmbientLuxEnd / IsScreenInDarkRoom</td><td>Light sensor readings</td></tr>
            <tr><td>BatteryStart / BatteryDeltaPerSession / IsCharging</td><td>Power state</td></tr>
            <tr><td>Headphones / AudioOutputType</td><td>Audio device (SPEAKER / WIRED / BLUETOOTH)</td></tr>
          </table>
        </div>
      </div>

      <!-- Layer 3 -->
      <div class="layer-item" onclick="toggleLayer(this)">
        <div class="layer-header">
          <div class="layer-num">03</div>
          <div class="layer-info">
            <div class="layer-name">System Context</div>
            <div class="layer-meta">per session start · behavioral history</div>
          </div>
          <div class="layer-chevron">▼</div>
        </div>
        <div class="layer-body">
          <table class="feature-table">
            <tr><td>PreviousApp / PreviousAppDuration / PreviousAppCategory</td><td>What you were doing before opening Instagram</td></tr>
            <tr><td>DirectLaunch</td><td>Whether Instagram was opened from the home screen</td></tr>
            <tr><td>TimeSinceLastSessionMin</td><td>Gap since last session</td></tr>
            <tr><td>DayOfWeek / IsHoliday / IsWeekend</td><td>Calendar context</td></tr>
            <tr><td>ScreenOnCount1hr / ScreenOnDuration1hr</td><td>Phone usage in prior hour</td></tr>
            <tr><td>NightMode / DND</td><td>UI mode and Do Not Disturb state</td></tr>
            <tr><td>SessionTriggeredByNotif</td><td>Whether an Instagram notification triggered the session</td></tr>
          </table>
        </div>
      </div>

      <!-- Layer 4 -->
      <div class="layer-item" onclick="toggleLayer(this)">
        <div class="layer-header">
          <div class="layer-num">04</div>
          <div class="layer-info">
            <div class="layer-name">Within-Session Derived Features</div>
            <div class="layer-meta">per reel · real-time computation</div>
          </div>
          <div class="layer-chevron">▼</div>
        </div>
        <div class="layer-body">
          <table class="feature-table">
            <tr><td>DwellTimeZscore / DwellTimePctile</td><td>Dwell relative to your own session baseline</td></tr>
            <tr><td>DwellAcceleration / SessionDwellTrend</td><td>Is attention increasing or collapsing over the session?</td></tr>
            <tr><td>EarlyVsLateRatio</td><td>Dwell in first vs. second half of session</td></tr>
            <tr><td>InteractionRate / InteractionBurstiness / InteractionDropoff</td><td>Engagement dynamics over time</td></tr>
            <tr><td>LikeStreakLength</td><td>Consecutive likes — proxy for mindless engagement</td></tr>
            <tr><td>ScrollIntervalCV / ScrollRhythmEntropy</td><td>Variability and randomness of scroll cadence</td></tr>
            <tr><td>ScrollBurstDuration / InterBurstRestDuration</td><td>Burst-rest cycle analysis</td></tr>
            <tr><td>SavedWithoutLike / CommentAbandoned</td><td>Behavioral inconsistency signals</td></tr>
          </table>
        </div>
      </div>

      <!-- Layer 5 -->
      <div class="layer-item" onclick="toggleLayer(this)">
        <div class="layer-header">
          <div class="layer-num">05</div>
          <div class="layer-info">
            <div class="layer-name">Cross-Session Memory</div>
            <div class="layer-meta">per session start · longitudinal tracking</div>
          </div>
          <div class="layer-chevron">▼</div>
        </div>
        <div class="layer-body">
          <table class="feature-table">
            <tr><td>SessionsToday / TotalDwellTodayMin</td><td>Daily usage counters</td></tr>
            <tr><td>LongestSessionTodayReels</td><td>Peak session size today</td></tr>
            <tr><td>DoomStreakLength</td><td>Consecutive doom-labeled sessions</td></tr>
            <tr><td>MorningSessionExists</td><td>First-thing-in-morning usage flag</td></tr>
          </table>
        </div>
      </div>

      <!-- Layer 6 -->
      <div class="layer-item" onclick="toggleLayer(this)">
        <div class="layer-header">
          <div class="layer-num">06</div>
          <div class="layer-info">
            <div class="layer-name">Circadian & Physiological Proxies</div>
            <div class="layer-meta">per session · inferred biology</div>
          </div>
          <div class="layer-chevron">▼</div>
        </div>
        <div class="layer-body">
          <table class="feature-table">
            <tr><td>CircadianPhase</td><td>Normalized time of day [0.0–1.0] from midnight</td></tr>
            <tr><td>SleepProxyScore</td><td>Heuristic: first session before 6am = low sleep</td></tr>
            <tr><td>EstimatedSleepDurationH</td><td>Inferred from prior session end time</td></tr>
            <tr><td>ConsistencyScore</td><td>Variance of first daily session times over last 7 days</td></tr>
          </table>
        </div>
      </div>

      <!-- Layer 7 -->
      <div class="layer-item" onclick="toggleLayer(this)">
        <div class="layer-header">
          <div class="layer-num">07</div>
          <div class="layer-info">
            <div class="layer-name">Content Diversity</div>
            <div class="layer-meta">per session · content analysis</div>
          </div>
          <div class="layer-chevron">▼</div>
        </div>
        <div class="layer-body">
          <table class="feature-table">
            <tr><td>UniqueAudioCount</td><td>Distinct audio tracks (proxy for content variety)</td></tr>
            <tr><td>RepeatContentFlag / ContentRepeatRate</td><td>Content repetition detection (v2 — planned)</td></tr>
          </table>
        </div>
      </div>

      <!-- Layer 8 -->
      <div class="layer-item" onclick="toggleLayer(this)">
        <div class="layer-header">
          <div class="layer-num">08</div>
          <div class="layer-info">
            <div class="layer-name">Self-Report Micro-Probes</div>
            <div class="layer-meta">post-session · subjective ground truth</div>
          </div>
          <div class="layer-chevron">▼</div>
        </div>
        <div class="layer-body">
          <table class="feature-table">
            <tr><td>PostSessionRating</td><td>How drained/refreshed you felt (1–5)</td></tr>
            <tr><td>MoodBefore / MoodAfter / MoodDelta</td><td>Pre- and post-session mood ratings</td></tr>
            <tr><td>RegretScore</td><td>Inverted intentionality score</td></tr>
            <tr><td>IntendedAction</td><td>What you intended when opening the app</td></tr>
            <tr><td>ActualVsIntendedMatch</td><td>Whether you followed through on intent</td></tr>
          </table>
        </div>
      </div>

    </div>
  </div>
</section>

<!-- ALSE MODEL -->
<section id="model">
  <div class="wrapper">
    <div class="section-label reveal">04 · The Brain</div>
    <div class="section-title reveal"><span>ALSE</span> Model</div>

    <p class="reveal" style="font-family:'Crimson Pro',serif; font-size:18px; color:rgba(224,224,238,0.65); max-width:700px; margin-bottom:64px; line-height:1.9; font-weight:300;">
      The Adaptive Latent State Engine lives in <code style="color:var(--amber); font-size:15px;">reelio_alse.py</code> and runs entirely on-device via Chaquopy. No server dependency. No cold API call. Nine architectural pillars working in concert.
    </p>

    <div class="pillars-grid reveal">
      <div class="pillar-card">
        <div class="pillar-num">01</div>
        <div class="pillar-name">Personalized Bayesian Baseline</div>
        <div class="pillar-desc">HMM emission parameters are initialized from your rolling history, not global defaults. Your personal mean and variance per feature define the prior — making the model yours from session one.</div>
      </div>
      <div class="pillar-card">
        <div class="pillar-num">02</div>
        <div class="pillar-name">Self-Calibrating Emission Weights</div>
        <div class="pillar-desc">After each session, KL-divergence between CASUAL and DOOM emission distributions is computed per feature. Features that better separate the two states gain higher weight. The <code style="color:var(--amber); font-size:11px;">feature_weights</code> vector is persisted and surfaced in the UI.</div>
      </div>
      <div class="pillar-card">
        <div class="pillar-num">03</div>
        <div class="pillar-name">Hierarchical Temporal Memory</div>
        <div class="pillar-desc">Three memory banks: recent (5 sessions), medium (20), long (50). The model interpolates between them based on data density, preventing both short-term overfitting and long-term staleness.</div>
      </div>
      <div class="pillar-card">
        <div class="pillar-num">04</div>
        <div class="pillar-name">Continuous-Time Markov Chain</div>
        <div class="pillar-desc">Session gaps are modeled using a CTMC with matrix exponential. Longer gaps revert the transition matrix toward the stationary distribution — accurately modeling the "cooling off" effect between sessions.</div>
      </div>
      <div class="pillar-card">
        <div class="pillar-num">05</div>
        <div class="pillar-name">Survival Framing</div>
        <div class="pillar-desc">The model fits a geometric hazard rate per state — modeling how likely you are to stop scrolling at each reel. DOOM has a dramatically lower hazard rate. You keep going.</div>
      </div>
      <div class="pillar-card">
        <div class="pillar-num">06</div>
        <div class="pillar-name">Regime Change Detector</div>
        <div class="pillar-desc">Tracks KL-divergence between recent behavior and stored baseline. If it exceeds a threshold (life event, holiday, new phone), the long-term memory bank is frozen — preventing drift corruption.</div>
      </div>
      <div class="pillar-card">
        <div class="pillar-num">07</div>
        <div class="pillar-name">Sparse-Data Guard</div>
        <div class="pillar-desc"><code style="color:var(--amber); font-size:11px;">model_confidence = min(1.0, n_sessions / 20)</code>. Below 20 sessions, inferences are blended with the prior proportionally. The UI shows this value explicitly so you always know how much to trust the model.</div>
      </div>
      <div class="pillar-card">
        <div class="pillar-num">08</div>
        <div class="pillar-name">Contextual State Priors</div>
        <div class="pillar-desc">A lightweight logistic regression runs at session start using 4 physical context features (time of day, charging state, previous app category, ambient light) to set the initial state probability — before any reel evidence is seen.</div>
      </div>
      <div class="pillar-card">
        <div class="pillar-num">09</div>
        <div class="pillar-name">Composite Doom Score</div>
        <div class="pillar-desc">A fully interpretable, model-free heuristic (0–100) with 7 named components. Decoupled from the HMM's latent probability so users can understand exactly why a session was flagged, in plain terms.</div>
      </div>
    </div>

    <!-- Doom Score Table -->
    <div style="margin-top:2px;" class="reveal">
      <div style="background:var(--bg2); border:1px solid rgba(255,45,45,0.2); padding:32px;">
        <div style="font-size:10px; letter-spacing:3px; text-transform:uppercase; color:var(--doom); margin-bottom:24px; display:flex; align-items:center; gap:12px;">
          Pillar 9 · Doom Score Anatomy
          <span style="flex:1; height:1px; background:rgba(255,45,45,0.15); display:block;"></span>
        </div>
        <table class="doom-table" id="doom-score-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>CSV Input</th>
              <th>Weight</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Session Length</td>
              <td>CumulativeReels</td>
              <td><div class="weight-bar-wrap"><div class="weight-bar"><div class="weight-bar-fill" data-w="25"></div></div><div class="weight-pct">25%</div></div></td>
            </tr>
            <tr>
              <td>Exit Conflict</td>
              <td>AppExitAttempts</td>
              <td><div class="weight-bar-wrap"><div class="weight-bar"><div class="weight-bar-fill" data-w="20"></div></div><div class="weight-pct">20%</div></div></td>
            </tr>
            <tr>
              <td>Rapid Re-entry</td>
              <td>TimeSinceLastSessionMin</td>
              <td><div class="weight-bar-wrap"><div class="weight-bar"><div class="weight-bar-fill" data-w="15"></div></div><div class="weight-pct">15%</div></div></td>
            </tr>
            <tr>
              <td>Scroll Automaticity</td>
              <td>ScrollRhythmEntropy</td>
              <td><div class="weight-bar-wrap"><div class="weight-bar"><div class="weight-bar-fill" data-w="15"></div></div><div class="weight-pct">15%</div></div></td>
            </tr>
            <tr>
              <td>Dwell Collapse</td>
              <td>SessionDwellTrend</td>
              <td><div class="weight-bar-wrap"><div class="weight-bar"><div class="weight-bar-fill" data-w="10"></div></div><div class="weight-pct">10%</div></div></td>
            </tr>
            <tr>
              <td>Rewatch Compulsion</td>
              <td>BackScrollCount</td>
              <td><div class="weight-bar-wrap"><div class="weight-bar"><div class="weight-bar-fill" data-w="10"></div></div><div class="weight-pct">10%</div></div></td>
            </tr>
            <tr>
              <td>Environment</td>
              <td>IsScreenInDarkRoom + IsCharging + CircadianPhase</td>
              <td><div class="weight-bar-wrap"><div class="weight-bar"><div class="weight-bar-fill" data-w="5"></div></div><div class="weight-pct">5%</div></div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</section>

<!-- TECH STACK -->
<section id="tech">
  <div class="wrapper">
    <div class="section-label reveal">05 · Stack</div>
    <div class="section-title reveal">Tech <span>stack</span></div>

    <div class="tech-grid reveal">
      <div class="tech-card">
        <div class="tech-layer">Native Layer</div>
        <div class="tech-name">Kotlin + Android SDK 26+</div>
        <div class="tech-detail">Accessibility Service API · Room Database · Coroutines · SensorManager · UsageStatsManager</div>
      </div>
      <div class="tech-card">
        <div class="tech-layer">On-device Python</div>
        <div class="tech-name">Chaquopy 15.0</div>
        <div class="tech-detail">CPython 3.11 running natively on Android. No server. No latency. Full NumPy, pandas, scipy.optimize.</div>
      </div>
      <div class="tech-card">
        <div class="tech-layer">Machine Learning</div>
        <div class="tech-name">NumPy · pandas · scipy</div>
        <div class="tech-detail">HMM inference, KL-divergence, matrix exponential (CTMC), logistic regression, survival analysis — all on-device.</div>
      </div>
      <div class="tech-card">
        <div class="tech-layer">UI Layer</div>
        <div class="tech-name">React 18 (UMD) in WebView</div>
        <div class="tech-detail">Recharts for data visualization · Lucide React for icons · Google Fonts · JavascriptInterface bridge to Kotlin</div>
      </div>
      <div class="tech-card">
        <div class="tech-layer">Storage</div>
        <div class="tech-name">CSV + Room SQLite</div>
        <div class="tech-detail">CSV is the primary append-only log (Schema v4). Room handles structured session queries. Model state persisted as JSON.</div>
      </div>
      <div class="tech-card">
        <div class="tech-layer">Sensors</div>
        <div class="tech-name">Accelerometer + Light</div>
        <div class="tech-detail">Android SensorManager fusing motion data (posture, stationarity) with ambient light for physical context features.</div>
      </div>
    </div>
  </div>
</section>

<!-- BUILD -->
<section id="build">
  <div class="wrapper">
    <div class="section-label reveal">06 · Setup</div>
    <div class="section-title reveal">Build &amp; <span>run</span></div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:32px;" class="reveal">
      <div>
        <div style="font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--text-muted); margin-bottom:16px;">Prerequisites</div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; gap:12px; align-items:center; padding:10px 14px; background:var(--bg2); border:1px solid var(--border); font-size:12px;"><span style="color:var(--casual)">✓</span> Android Studio Hedgehog or later</div>
          <div style="display:flex; gap:12px; align-items:center; padding:10px 14px; background:var(--bg2); border:1px solid var(--border); font-size:12px;"><span style="color:var(--casual)">✓</span> Android SDK 26+</div>
          <div style="display:flex; gap:12px; align-items:center; padding:10px 14px; background:var(--bg2); border:1px solid var(--border); font-size:12px;"><span style="color:var(--casual)">✓</span> Chaquopy configured in build.gradle</div>
          <div style="display:flex; gap:12px; align-items:center; padding:10px 14px; background:var(--bg2); border:1px solid var(--border); font-size:12px;"><span style="color:var(--casual)">✓</span> Physical Android device (no emulator)</div>
          <div style="display:flex; gap:12px; align-items:center; padding:10px 14px; background:var(--bg2); border:1px solid var(--border); font-size:12px;"><span style="color:var(--casual)">✓</span> numpy · pandas · scipy in pip block</div>
        </div>
      </div>
      <div>
        <div style="font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--text-muted); margin-bottom:16px;">First-launch permissions</div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; gap:12px; align-items:flex-start; padding:10px 14px; background:var(--bg2); border:1px solid var(--border); font-size:12px;"><span style="color:var(--doom)">!</span><div><span style="color:var(--text); font-weight:600;">Accessibility Service</span><br><span style="color:var(--text-dim)">The app will prompt you directly</span></div></div>
          <div style="display:flex; gap:12px; align-items:flex-start; padding:10px 14px; background:var(--bg2); border:1px solid var(--border); font-size:12px;"><span style="color:var(--doom)">!</span><div><span style="color:var(--text); font-weight:600;">Usage Stats Access</span><br><span style="color:var(--text-dim)">Settings → Apps → Special App Access</span></div></div>
          <div style="display:flex; gap:12px; align-items:flex-start; padding:10px 14px; background:var(--bg2); border:1px solid var(--border); font-size:12px;"><span style="color:var(--amber)">·</span><div><span style="color:var(--text); font-weight:600;">Notifications</span><br><span style="color:var(--text-dim)">Android 13+ required for post-session check-ins</span></div></div>
        </div>
      </div>
    </div>

    <div class="terminal reveal">
      <div class="terminal-bar">
        <div class="terminal-dot"></div>
        <div class="terminal-dot"></div>
        <div class="terminal-dot"></div>
        <div class="terminal-title">bash — reelio build</div>
      </div>
      <div class="terminal-body">
        <div><span class="prompt">~ </span><span class="comment"># 1. Clone the repo</span></div>
        <div><span class="prompt">~ </span><span class="cmd">git clone</span> <span class="str">https://github.com/yourhandle/reelio.git</span></div>
        <div><span class="prompt">~ </span><span class="cmd">cd</span> reelio</div>
        <br>
        <div><span class="prompt">~/reelio </span><span class="comment"># 2. Open in Android Studio → Gradle sync</span></div>
        <div><span class="prompt">~/reelio </span><span class="comment">#    Chaquopy downloads Python 3.11 + numpy/pandas/scipy</span></div>
        <div><span class="prompt">~/reelio </span><span class="comment">#    First sync takes ~2-3 min</span></div>
        <br>
        <div><span class="prompt">~/reelio </span><span class="comment"># 3. Connect physical device, then:</span></div>
        <div><span class="prompt">~/reelio </span>Run → Run <span class="str">'app'</span></div>
        <br>
        <div><span class="prompt">~/reelio </span><span class="comment"># 4. Grant permissions on-device, then open Instagram.</span></div>
        <div><span class="prompt">~/reelio </span><span class="comment">#    The service activates automatically. 🎯</span></div>
      </div>
    </div>

    <!-- Project Tree -->
    <div class="tree-wrap reveal" style="margin-top:2px;">
      <div style="margin-bottom:16px; font-size:10px; letter-spacing:2px; color:var(--text-muted); text-transform:uppercase;">Project structure</div>
      <div><span class="folder">InstagramTracker/</span></div>
      <div>└── <span class="folder">app/src/main/</span></div>
      <div>&nbsp;&nbsp;&nbsp;&nbsp;├── <span class="folder">java/com/example/instatracker/</span></div>
      <div>&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├── <span class="core">InstaAccessibilityService.kt</span> <span class="comment">← Core tracking engine</span></div>
      <div>&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├── <span class="file">MainActivity.kt</span> <span class="comment">← WebView host + JS bridge</span></div>
      <div>&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├── <span class="file">MicroProbeActivity.kt</span> <span class="comment">← Post-session survey UI</span></div>
      <div>&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├── <span class="file">IntentionProbeActivity.kt</span> <span class="comment">← Pre-session intent survey</span></div>
      <div>&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├── <span class="file">DatabaseProvider.kt</span></div>
      <div>&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└── <span class="folder">db/</span> <span class="comment">AppDatabase · SessionEntity · SessionDao</span></div>
      <div>&nbsp;&nbsp;&nbsp;&nbsp;├── <span class="folder">python/</span></div>
      <div>&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└── <span class="core">reelio_alse.py</span> <span class="comment">← ALSE model (HMM + heuristics)</span></div>
      <div>&nbsp;&nbsp;&nbsp;&nbsp;├── <span class="folder">assets/www/</span></div>
      <div>&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├── <span class="file">index.html</span></div>
      <div>&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└── <span class="core">app.jsx</span> <span class="comment">← React dashboard</span></div>
      <div>&nbsp;&nbsp;&nbsp;&nbsp;└── <span class="file">AndroidManifest.xml</span></div>
    </div>
  </div>
</section>

<!-- PERMISSIONS -->
<section id="permissions">
  <div class="wrapper">
    <div class="section-label reveal">07 · Permissions</div>
    <div class="section-title reveal">What we <span>ask</span> for</div>

    <table class="perm-table reveal">
      <thead>
        <tr>
          <th>Permission</th>
          <th>Why it's needed</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>BIND_ACCESSIBILITY_SERVICE</td><td>Core tracking — reads UI event tree from Instagram</td></tr>
        <tr><td>PACKAGE_USAGE_STATS</td><td>Previous app detection (which app you came from)</td></tr>
        <tr><td>POST_NOTIFICATIONS</td><td>Post-session check-in notifications</td></tr>
        <tr><td>RECEIVE_BOOT_COMPLETED</td><td>Re-enable service after device restart</td></tr>
        <tr><td>FOREGROUND_SERVICE</td><td>Keep accessibility service alive in background</td></tr>
        <tr><td>WRITE / READ_EXTERNAL_STORAGE</td><td>CSV export — Android &lt; 10 only</td></tr>
        <tr><td>ACCESS_NETWORK_STATE</td><td>WebView font loading only — no data transmission</td></tr>
        <tr><td>REQUEST_INSTALL_PACKAGES</td><td>Chaquopy Python runtime (build-time only)</td></tr>
      </tbody>
    </table>
  </div>
</section>

<!-- PRIVACY -->
<section id="privacy">
  <div class="wrapper">
    <div class="section-label reveal">08 · Privacy</div>
    <div class="privacy-panel reveal">
      <div class="privacy-headline">Zero data<br>leaves your device.</div>
      <p style="font-family:'Crimson Pro',serif; font-size:18px; color:rgba(224,224,238,0.65); max-width:600px; line-height:1.9; font-weight:300;">
        No API calls. No analytics SDKs. No crash reporters. No advertising IDs. The only network permission is for loading WebView fonts — and even that can be removed by bundling fonts locally.
      </p>
      <div class="privacy-items">
        <div class="privacy-item">
          <div class="privacy-dot"></div>
          <div class="privacy-text">All CSV data written to <code style="color:var(--amber)">getExternalFilesDir(null)</code> — app-specific storage, inaccessible without root.</div>
        </div>
        <div class="privacy-item">
          <div class="privacy-dot"></div>
          <div class="privacy-text">Room DB and model state stored in internal storage. Inaccessible to any other app without root.</div>
        </div>
        <div class="privacy-item">
          <div class="privacy-dot"></div>
          <div class="privacy-text">Export raw CSV via the app's Export button. Delete everything with the Clear Data button.</div>
        </div>
        <div class="privacy-item">
          <div class="privacy-dot"></div>
          <div class="privacy-text">Reelio never reads, stores, or transmits the content of any Instagram post, caption, username, or media.</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- LIMITATIONS -->
<section id="limitations">
  <div class="wrapper">
    <div class="section-label reveal">09 · Honesty</div>
    <div class="section-title reveal">Known <span>limitations</span></div>

    <ul class="limits-list reveal">
      <li class="limit-item">
        <div class="limit-icon">⚠</div>
        <div class="limit-text">
          <b>Accessibility Service detection drift</b>
          <span>Instagram occasionally updates its UI layout, changing the accessibility event tree. Reel boundary detection (via <code style="color:var(--amber); font-size:11px;">TYPE_WINDOW_CONTENT_CHANGED</code>) may occasionally double-count or miss a reel transition.</span>
        </div>
      </li>
      <li class="limit-item">
        <div class="limit-icon">⚠</div>
        <div class="limit-text">
          <b>Audio track identity is approximate</b>
          <span><code style="color:var(--amber); font-size:11px;">UniqueAudioCount</code> uses accessibility content descriptions as a proxy — not actual audio fingerprinting. It's an estimate.</span>
        </div>
      </li>
      <li class="limit-item">
        <div class="limit-icon">⚠</div>
        <div class="limit-text">
          <b>Repeat content detection is a placeholder</b>
          <span><code style="color:var(--amber); font-size:11px;">RepeatContentFlag</code> and <code style="color:var(--amber); font-size:11px;">ContentRepeatRate</code> are currently zeros. Full implementation requires content fingerprinting, which is on the roadmap.</span>
        </div>
      </li>
      <li class="limit-item">
        <div class="limit-icon">⚠</div>
        <div class="limit-text">
          <b>MicroMovementRms is unimplemented</b>
          <span>Currently logged as <code style="color:var(--amber); font-size:11px;">0f</code>. True RMS micro-movement requires integrating raw accelerometer over reel duration — the performance overhead tradeoff is being evaluated.</span>
        </div>
      </li>
      <li class="limit-item">
        <div class="limit-icon">⚠</div>
        <div class="limit-text">
          <b>Python cold start latency</b>
          <span>The first inference per app session takes 2–4 seconds due to Chaquopy Python initialization. All subsequent inferences in the same session are near-instant.</span>
        </div>
      </li>
    </ul>
  </div>
</section>

<!-- ROADMAP -->
<section id="roadmap">
  <div class="wrapper">
    <div class="section-label reveal">10 · What's next</div>
    <div class="section-title reveal">Road<span>map</span></div>

    <div class="roadmap-track reveal">
      <div class="roadmap-group">
        <div class="roadmap-horizon">Short term</div>
        <div class="roadmap-item"><div class="roadmap-checkbox"></div><div class="roadmap-text">Weekly summary notification — "Your doom rate dropped 12% this week"</div></div>
        <div class="roadmap-item"><div class="roadmap-checkbox"></div><div class="roadmap-text">Daily usage limit with a soft nudge notification at threshold</div></div>
        <div class="roadmap-item"><div class="roadmap-checkbox"></div><div class="roadmap-text">Settings screen — customizable session timeout, notification toggle, theme</div></div>
        <div class="roadmap-item"><div class="roadmap-checkbox"></div><div class="roadmap-text">Offline-capable font bundling — remove Google Fonts CDN dependency</div></div>
      </div>

      <div class="roadmap-group">
        <div class="roadmap-horizon">Medium term</div>
        <div class="roadmap-item"><div class="roadmap-checkbox"></div><div class="roadmap-text">Content fingerprinting for true repeat-content detection</div></div>
        <div class="roadmap-item"><div class="roadmap-checkbox"></div><div class="roadmap-text">Sleep inference from overnight phone inactivity gaps</div></div>
        <div class="roadmap-item"><div class="roadmap-checkbox"></div><div class="roadmap-text">Streak visualization — doom-free days counter</div></div>
        <div class="roadmap-item"><div class="roadmap-checkbox"></div><div class="roadmap-text">Exportable PDF weekly report</div></div>
      </div>

      <div class="roadmap-group">
        <div class="roadmap-horizon">Long term</div>
        <div class="roadmap-item"><div class="roadmap-checkbox"></div><div class="roadmap-text">Multi-app support — TikTok, YouTube Shorts</div></div>
        <div class="roadmap-item"><div class="roadmap-checkbox"></div><div class="roadmap-text">Optional encrypted cloud backup of model state only — no raw behavioral data</div></div>
        <div class="roadmap-item"><div class="roadmap-checkbox"></div><div class="roadmap-text">On-device intervention overlays — gentle friction after doom threshold is crossed</div></div>
      </div>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="wrapper">
    <div class="footer-inner">
      <div>
        <div class="footer-logo">REELIO</div>
        <div class="footer-tagline">Built to understand your attention, not sell it.</div>
      </div>
      <div class="footer-meta">
        <div class="footer-license">MIT License</div>
        <div class="footer-made">Adaptive Latent State Engine · Schema v4</div>
      </div>
    </div>
  </div>
</footer>

<script>
  // ─── NEURAL CANVAS ───────────────────────────────
  const canvas = document.getElementById('neural-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, nodes = [], frame = 0;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function initNodes() {
    nodes = [];
    const count = Math.floor((W * H) / 18000);
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 0.5,
        doom: Math.random() > 0.7
      });
    }
  }

  function drawNeural() {
    ctx.clearRect(0, 0, W, H);
    frame++;

    nodes.forEach(n => {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
    });

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const alpha = (1 - dist / 120) * 0.3;
          const bothDoom = nodes[i].doom && nodes[j].doom;
          const color = bothDoom ? `rgba(255,45,45,${alpha})` : `rgba(0,229,255,${alpha * 0.7})`;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = color;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = n.doom ? 'rgba(255,45,45,0.6)' : 'rgba(0,229,255,0.5)';
      ctx.fill();
    });

    requestAnimationFrame(drawNeural);
  }

  resize();
  initNodes();
  drawNeural();
  window.addEventListener('resize', () => { resize(); initNodes(); });

  // ─── LAYER ACCORDION ─────────────────────────────
  function toggleLayer(el) {
    const isOpen = el.classList.contains('open');
    // Close all
    document.querySelectorAll('.layer-item').forEach(l => l.classList.remove('open'));
    // Open clicked if it was closed
    if (!isOpen) el.classList.add('open');
  }

  // ─── SCROLL REVEAL ───────────────────────────────
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        // Animate doom bars when they come into view
        if (e.target.querySelector && e.target.querySelector('.weight-bar-fill')) {
          setTimeout(() => {
            e.target.querySelectorAll('.weight-bar-fill').forEach(bar => {
              bar.style.width = bar.dataset.w + '%';
            });
          }, 200);
        }
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  // ─── DOOM BARS on section enter ──────────────────
  const tableObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        setTimeout(() => {
          document.querySelectorAll('.weight-bar-fill').forEach(bar => {
            bar.style.width = bar.dataset.w + '%';
          });
        }, 400);
      }
    });
  }, { threshold: 0.3 });

  const doomTable = document.getElementById('doom-score-table');
  if (doomTable) tableObserver.observe(doomTable);

  // ─── SMOOTH NAV ─────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // ─── STAGGERED HERO REVEAL ───────────────────────
  window.addEventListener('load', () => {
    const heroChildren = document.querySelectorAll('.hero-content > *');
    heroChildren.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = `opacity 0.7s ease ${i * 0.12}s, transform 0.7s ease ${i * 0.12}s`;
      setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 100 + i * 120);
    });
  });
</script>
</body>
</html>
