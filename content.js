(() => {
  'use strict';

  let budget = null;
  let showAll = false;
  let observer = null;
  let applyTimer = null;

  // --- Budget detection ---

  function detectBudget() {
    let free = 0;
    let paid = 0;

    for (const el of document.querySelectorAll('.MuiChip-label')) {
      const m = el.textContent.trim().match(/\+\s*([\d.]+)\s*free/i);
      if (m) { free = parseFloat(m[1]); break; }
    }

    for (const el of document.querySelectorAll('.MuiChip-labelSmall')) {
      if (el.textContent.trim() !== '£') continue;
      let chipRoot = el.parentElement;
      while (chipRoot && !chipRoot.classList.contains('MuiChip-root')) {
        chipRoot = chipRoot.parentElement;
      }
      if (!chipRoot) continue;
      const medLabel = chipRoot.querySelector('.MuiChip-labelMedium');
      if (medLabel) {
        const m = medLabel.textContent.trim().match(/^([\d.]+)$/);
        if (m) { paid = parseFloat(m[1]); break; }
      }
    }

    if (free > 0 || paid > 0) budget = paid + free;
    return budget;
  }

  // --- Meal card detection ---

  function getPriceElements() {
    const results = [];
    for (const el of document.querySelectorAll('p.MuiTypography-body1')) {
      const text = el.textContent.trim();
      if (/^\d+\.\d{2}$/.test(text)) {
        results.push({ el, price: parseFloat(text) });
      }
    }
    return results;
  }

  // Only match MuiCard-root — avoids the broader MuiPaper-root hitting outer containers.
  function findCardRoot(priceEl) {
    let el = priceEl;
    for (let i = 0; i < 12; i++) {
      if (!el.parentElement) break;
      el = el.parentElement;
      if (el.classList.contains('MuiCard-root') || el.tagName === 'LI') return el;
    }
    return null;
  }

  function detectOrderPlaced() {
    let count = 0;
    for (const el of document.querySelectorAll('h6')) {
      if (el.textContent.trim() === 'Your Order') count++;
      if (count >= 2) return true;
    }
    return false;
  }

  function getKnownVendors() {
    for (const h6 of document.querySelectorAll('h6.MuiTypography-subtitle3')) {
      if (h6.textContent.trim() !== 'Vendors') continue;
      const vendorSection = h6.closest('.MuiStack-root')?.parentElement;
      if (!vendorSection) continue;
      const names = [];
      for (const p of vendorSection.querySelectorAll(':scope > button p.MuiTypography-body1')) {
        const name = p.textContent.trim();
        if (name) names.push(name);
      }
      if (names.length) return names;
    }
    return [];
  }

  function getProviderName(card, knownVendors) {
    for (const avatar of card.querySelectorAll('.MuiAvatar-root[aria-label]')) {
      const label = avatar.getAttribute('aria-label');
      if (knownVendors.includes(label)) return label;
    }
    return 'Unknown';
  }

  // --- Hide/show logic ---

  function applyHiding() {
    if (budget === null) return;

    // Pause observer so DOM changes we make don't re-trigger this.
    observer.disconnect();

    // Clear all stale markers before recomputing.
    for (const el of document.querySelectorAll('[data-feedr-hidden]')) {
      el.querySelector('.feedr-overlay')?.remove();
      el.removeAttribute('data-feedr-hidden');
    }

    if (!showAll) {
      const seen = new Set();
      for (const { el, price } of getPriceElements()) {
        const card = findCardRoot(el);
        if (!card || seen.has(card)) continue;
        seen.add(card);

        if (price > budget) {
          card.style.position = 'relative';
          const overlay = document.createElement('div');
          overlay.className = 'feedr-overlay';
          overlay.style.cssText = [
            'position:absolute', 'inset:0', 'z-index:9999',
            'background:rgba(0,0,0,0.6)', 'border-radius:inherit',
            'display:flex', 'align-items:center', 'justify-content:center',
            'pointer-events:none',
          ].join(';');
          overlay.innerHTML = '<span style="color:#fff;font-size:14px;font-weight:600;letter-spacing:0.02em">Too expensive</span>';
          card.appendChild(overlay);
          card.setAttribute('data-feedr-hidden', 'true');
        }
      }
    }

    // Resume observer.
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function revealAll() {
    observer.disconnect();
    for (const el of document.querySelectorAll('[data-feedr-hidden]')) {
      el.querySelector('.feedr-overlay')?.remove();
      el.removeAttribute('data-feedr-hidden');
    }
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function getHiddenCount() {
    return document.querySelectorAll('[data-feedr-hidden]').length;
  }

  function scheduleApply() {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(() => {
      detectBudget();
      applyHiding();
    }, 400);
  }

  // --- Toggle ---

  window.__feedrToggle = function (show) {
    showAll = show;
    if (showAll) revealAll();
    else { detectBudget(); applyHiding(); }
  };

  // --- Chrome message listener ---

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'getStatus') {
      detectBudget();
      const allPriceEls = getPriceElements();
      const totalCount = allPriceEls.length;
      const knownVendors = getKnownVendors();
      const providers = {};
      const seen = new Set();
      for (const { el, price } of allPriceEls) {
        const card = findCardRoot(el);
        if (!card || seen.has(card)) continue;
        seen.add(card);
        const name = getProviderName(card, knownVendors);
        if (name === 'Unknown') continue;
        if (!providers[name]) providers[name] = { total: 0, affordable: 0 };
        providers[name].total++;
        if (price <= (budget ?? Infinity)) providers[name].affordable++;
      }
      sendResponse({ budget, hiddenCount: getHiddenCount(), totalCount, providers, showAll, orderPlaced: detectOrderPlaced() });
    } else if (message.action === 'toggle') {
      showAll = message.showAll;
      if (showAll) revealAll();
      else { detectBudget(); applyHiding(); }
      sendResponse({ ok: true });
    }
    return true;
  });

  // --- Initialisation ---

  function init() {
    chrome.storage.local.get(['feedrShowAll'], (result) => {
      showAll = !!result.feedrShowAll;
      detectBudget();
      applyHiding();
    });
  }

  observer = new MutationObserver(scheduleApply);
  observer.observe(document.body, { childList: true, subtree: true });

  init();
})();
