# Feedr Budget Helper

A Chrome extension for [feedr.co](https://feedr.co) canteen pages that marks meal cards exceeding your available balance and shows affordability statistics per restaurant.

## Features

- **Automatic balance detection** — reads your paid balance and free subsidy directly from the page; no manual input required
- **"Too expensive" overlay** — meal cards above your budget get a semi-transparent overlay so they stay visible but clearly marked
- **Per-restaurant breakdown** — affordability count and progress bar per vendor, sorted best-to-worst
- **Toggle overlays** — show all meals without overlays, then re-apply with one click; preference persists across page loads
- **Share as image** — copies a clean PNG stats card to your clipboard, ready to paste into Slack, Notion, email, etc.
- **Order detection** — if you have already placed an order for the day, the extension steps aside and the popup confirms your order is placed

## Installation

1. Clone or download this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the `feedr-hider` folder
5. Pin the extension from the toolbar puzzle-piece menu for quick access

## How to use

Navigate to your Feedr canteen page. Meal cards above your budget are automatically overlaid with **"Too expensive"**.

Click the extension icon to open the popup:

| Element | Description |
|---|---|
| **Available** | Your total budget (paid balance + free subsidy) |
| **Affordable** | Number and percentage of meals within budget |
| Per-vendor rows | Affordability breakdown per restaurant |
| **Show all meals** | Removes all overlays temporarily |
| **Re-apply budget overlays** | Puts overlays back |
| **Share** | Copies a PNG stats image to the clipboard |
