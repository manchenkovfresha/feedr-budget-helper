# Feedr Budget Helper

A Chrome extension for [feedr.co](https://feedr.co) canteen pages that marks meal cards exceeding your available balance and shows affordability statistics per restaurant.

## Features

- **Automatic balance detection** — reads your paid balance and free subsidy directly from the page; no manual input required
- **"Too expensive" overlay** — a semi-transparent overlay is applied to any meal card whose price exceeds your total budget, leaving the card visible but clearly marked
- **Per-restaurant affordability breakdown** — the popup shows how many meals are within budget for each vendor, with a progress bar, sorted best-to-worst
- **Toggle overlays** — show all meals without overlays, then re-apply with one click; preference is persisted across page loads
- **Share as image** — copies a clean PNG stats card to your clipboard (ready to paste into Slack, Notion, email, etc.)
- **Order detection** — if you have already placed an order for the selected day, the extension does nothing and the popup shows a confirmation message

## Installation

This extension is not on the Chrome Web Store. Install it manually:

1. Clone or download this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the `feedr-hider` folder
5. Pin the extension from the toolbar puzzle-piece menu for quick access

## Usage

1. Navigate to your Feedr canteen page (`feedr.co/*/canteen`)
2. Meal cards above your budget are automatically overlaid with **"Too expensive"**
3. Click the extension icon to open the popup:

| Element | Description |
|---|---|
| **Available** | Your total budget (paid balance + free subsidy) |
| **Affordable** | Number and percentage of meals within budget |
| Per-vendor rows | Affordability count and progress bar per restaurant, sorted best first |
| **Show all meals** | Removes overlays temporarily |
| **Re-apply budget overlays** | Puts overlays back |
| **Share** | Copies a PNG stats image to the clipboard |

## How balance detection works

Feedr displays two balance values in the top navigation bar. The extension reads both and sums them:

| Source | Example text |
|---|---|
| Free subsidy chip | `+ 2.56 free` |
| Paid balance chip | `£` label + `0.01` amount |
| **Total budget** | **£2.57** |

## Files

```
feedr-hider/
├── manifest.json   — MV3 extension config (permissions, matches, icons)
├── content.js      — balance detection, overlay logic, MutationObserver
├── popup.html      — popup markup and styles
├── popup.js        — popup rendering, stats image export
└── icons/          — 16 / 48 / 128 px extension icons
```

## Technical notes

- Built with **Manifest V3**
- Uses `MutationObserver` to react to React SPA navigation and dynamic content loading
- Selectors target stable MUI class names (`MuiCard-root`, `MuiChip-label`, etc.) rather than hashed utility classes that change between deployments
- The observer is disconnected during DOM mutations made by the extension itself to prevent re-entrancy
- Toggle state persists across page loads via `chrome.storage.local`
- The stats image is rendered on an off-screen `<canvas>` at 2× resolution and copied as PNG via the Clipboard API
