# Feedr Budget Helper

A Chrome extension for [feedr.co](https://feedr.co) canteen pages that helps you stay within your lunch budget.

## What it does

- **Detects your balance automatically** — reads your paid balance and free subsidy from the page, no manual input needed
- **Overlays over-budget meals** — cards you can't afford get a "Too expensive" overlay so they stay visible but clearly marked
- **Shows affordability stats** — the popup displays how many meals are within budget overall and broken down by restaurant
- **Share stats as image** — copies a clean PNG summary to your clipboard, ready to paste into Slack or anywhere else
- **Detects placed orders** — if you've already ordered for the day, shows a confirmation instead of the stats

## Installation

This extension is not on the Chrome Web Store. Install it manually:

1. Clone or download this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the `feedr-hider` folder
5. Pin the extension from the toolbar puzzle-piece menu

## Usage

1. Navigate to your Feedr canteen page (`feedr.co/*/canteen`)
2. Meal cards above your budget are automatically overlaid with "Too expensive"
3. Click the extension icon to open the popup:
   - See your available balance and overall affordability percentage
   - See per-restaurant affordability with progress bars
   - Toggle overlays on/off with the **Show all meals** button
   - Copy a stats image to clipboard with the **Share stats as image** button

## How balance detection works

The extension reads two values from the Feedr nav bar:

| Source | Example |
|---|---|
| Paid balance | `£ 0.01` chip |
| Free subsidy | `+ 2.56 free` chip |
| **Total budget** | **£ 2.57** |

## Files

```
feedr-hider/
├── manifest.json   — MV3 extension config
├── content.js      — balance detection, card overlays, DOM observation
├── popup.html      — popup markup and styles
├── popup.js        — popup logic, stats rendering, image export
└── icons/          — 16 / 48 / 128px extension icons
```

## Technical notes

- Built with **Manifest V3**
- Uses `MutationObserver` to react to React SPA navigation
- Selectors target stable MUI class names (`MuiCard-root`, `MuiChip-label`, etc.) rather than hashed utility classes
- Toggle state persists across page loads via `chrome.storage.local`
