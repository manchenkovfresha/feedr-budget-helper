(() => {
  'use strict';

  let budget = null;
  let paidBudget = 0;
  let includePaid = true;
  let showAll = false;
  let currentSort = 'price-asc';
  let categoryEnabled = { Mains: true, Sides: true, Drinks: true };
  let observer = null;
  let applyTimer = null;

  // ---------------------------------------------------------------------------
  // Budget detection
  // ---------------------------------------------------------------------------

  function detectBudget() {
    let free = 0;
    let paid = 0;

    // Free subsidy: a MuiChip label containing "+ 2.56 free"
    for (const el of document.querySelectorAll('.MuiChip-label')) {
      const m = el.textContent.trim().match(/\+\s*([\d.]+)\s*free/i);
      if (m) { free = parseFloat(m[1]); break; }
    }

    // Paid balance: the "£" icon chip is nested inside an outer chip that holds the amount.
    // Structure: outer MuiChip-sizeMedium > [inner MuiChip-sizeSmall > "£", span.MuiChip-labelMedium "0.01"]
    for (const el of document.querySelectorAll('.MuiChip-labelSmall')) {
      if (el.textContent.trim() !== '£') continue;
      // Walk up to the inner chip-root (sizeSmall), then one more step to the outer chip-root
      let innerChip = el.parentElement;
      while (innerChip && !innerChip.classList.contains('MuiChip-root')) {
        innerChip = innerChip.parentElement;
      }
      if (!innerChip) continue;
      const outerChip = innerChip.parentElement;
      if (!outerChip) continue;
      const medLabel = outerChip.querySelector('.MuiChip-labelMedium');
      if (medLabel) {
        const m = medLabel.textContent.trim().match(/^([\d.]+)$/);
        if (m) { paid = parseFloat(m[1]); break; }
      }
    }

    paidBudget = paid;

    // Always overwrite — prevents stale budget persisting across SPA navigation
    const effective = free + (includePaid ? paid : 0);
    budget = effective > 0 ? effective : null;
    return budget;
  }

  // ---------------------------------------------------------------------------
  // Meal card detection
  // ---------------------------------------------------------------------------

  // Prices are rendered as <p class="MuiTypography-body1 …">12.49</p>
  function getPriceElements() {
    const results = [];
    for (const el of document.querySelectorAll('p.MuiTypography-body1')) {
      const text = el.textContent.trim();
      // Allow 1–2 decimal places to handle any rounding variation
      if (/^\d+(\.\d{1,2})?$/.test(text)) {
        results.push({ el, price: parseFloat(text) });
      }
    }
    return results;
  }

  // Walk up from a card to find the nearest preceding section header (Mains/Sides/Drinks).
  // Section headers are h6.MuiTypography-subtitle2 elements inside sibling grid items.
  function getSectionForCard(card) {
    let item = card.parentElement;
    while (item && !item.classList.contains('MuiGrid-item')) {
      item = item.parentElement;
    }
    if (!item) return null;
    let sibling = item.previousElementSibling;
    while (sibling) {
      const h6 = sibling.querySelector('h6.MuiTypography-subtitle2');
      if (h6) return h6.textContent.trim();
      sibling = sibling.previousElementSibling;
    }
    return null;
  }

  // Walk up the DOM until we find the MuiCard-root wrapping this price element.
  // Returns null if no card is found — callers must handle null.
  function findCardRoot(priceEl) {
    let el = priceEl;
    for (let i = 0; i < 12; i++) {
      if (!el.parentElement) break;
      el = el.parentElement;
      if (el.classList.contains('MuiCard-root')) return el;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Vendor detection
  // ---------------------------------------------------------------------------

  // Read the canonical vendor list from the sidebar "Vendors" filter section.
  // "subtitle3" is a Feedr-custom MUI Typography variant, not a standard MUI variant.
  function getKnownVendors() {
    for (const h6 of document.querySelectorAll('h6.MuiTypography-subtitle3')) {
      if (h6.textContent.trim() !== 'Vendors') continue;
      // h6 sits inside a header row stack; its parent is the vendor section container
      const vendorSection = h6.closest('.MuiStack-root')?.parentElement;
      if (!vendorSection) continue;
      const names = [];
      // :scope > button limits to direct children, preventing leaking into sibling sections
      for (const p of vendorSection.querySelectorAll(':scope > button p.MuiTypography-body1')) {
        const name = p.textContent.trim();
        if (name) names.push(name);
      }
      if (names.length) return names;
    }
    return [];
  }

  // Match a card's avatar aria-label against the known vendor list.
  // Iterates all avatars so that allergen avatars (which also carry aria-labels) are skipped.
  function getProviderName(card, knownVendors) {
    for (const avatar of card.querySelectorAll('.MuiAvatar-root[aria-label]')) {
      const label = avatar.getAttribute('aria-label');
      if (knownVendors.includes(label)) return label;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Order detection
  // ---------------------------------------------------------------------------

  // "Your Order" appears once (sidebar) normally and twice when an order has been placed
  // (sidebar + a "Your Order" section at the top of the meal list).
  function detectOrderPlaced() {
    let count = 0;
    for (const el of document.querySelectorAll('h6')) {
      if (el.textContent.trim() === 'Your Order') count++;
      if (count >= 2) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Hide / show logic
  // ---------------------------------------------------------------------------

  function applyHiding() {
    if (budget === null || detectOrderPlaced()) {
      revealAll();
      return;
    }

    // Pause the observer so our own DOM mutations do not re-trigger this function.
    if (observer) observer.disconnect();

    // Clear all stale markers before recomputing to prevent count drift.
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

        const section = getSectionForCard(card);
        const sectionEnabled = section === null || categoryEnabled[section] !== false;
        if (sectionEnabled && price > budget) {
          card.style.position = 'relative';
          const overlay = document.createElement('div');
          overlay.className = 'feedr-overlay';
          overlay.style.cssText = [
            'position:absolute', 'inset:0', 'z-index:9999',
            'background:rgba(0,0,0,0.6)', 'border-radius:inherit',
            'display:flex', 'align-items:center', 'justify-content:center',
            'pointer-events:none',
          ].join(';');
          const label = document.createElement('span');
          label.textContent = 'Too expensive';
          label.style.cssText = 'color:#fff;font-size:14px;font-weight:600;letter-spacing:0.02em';
          overlay.appendChild(label);
          card.appendChild(overlay);
          card.setAttribute('data-feedr-hidden', 'true');
        }
      }
    }

    if (observer) observer.observe(document.body, { childList: true, subtree: true });
  }

  function revealAll() {
    if (observer) observer.disconnect();
    for (const el of document.querySelectorAll('[data-feedr-hidden]')) {
      el.querySelector('.feedr-overlay')?.remove();
      el.removeAttribute('data-feedr-hidden');
    }
    if (observer) observer.observe(document.body, { childList: true, subtree: true });
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

  // ---------------------------------------------------------------------------
  // Card sorting
  // ---------------------------------------------------------------------------

  function sortCards(mode) {
    currentSort = mode;
    if (observer) observer.disconnect();

    const knownVendors = getKnownVendors();
    const priceEls = getPriceElements();
    const seen = new Set();
    const cardData = [];

    for (const { el, price } of priceEls) {
      const card = findCardRoot(el);
      if (!card || seen.has(card)) continue;
      seen.add(card);
      const name = getProviderName(card, knownVendors) || '';
      cardData.push({ card, price, name });
    }

    if (!cardData.length) {
      if (observer) observer.observe(document.body, { childList: true, subtree: true });
      return;
    }

    // Cards may each be wrapped in a Grid item (or similar container).
    // Walk up from each card to find the movable element: the direct child
    // of the shared container that all cards live within.
    function findContainer(cards) {
      // Try the card itself, then walk up through wrapper layers.
      for (let depth = 0; depth < 5; depth++) {
        const elements = cards.map(d => {
          let el = d.card;
          for (let i = 0; i < depth; i++) {
            if (!el.parentElement) return null;
            el = el.parentElement;
          }
          return el;
        });
        if (elements.some(e => e === null)) break;
        const parents = new Set(elements.map(e => e.parentElement));
        if (parents.size === 1) {
          const container = elements[0].parentElement;
          return { container, getMovable: (d) => {
            let el = d.card;
            for (let i = 0; i < depth; i++) el = el.parentElement;
            return el;
          }};
        }
      }
      return null;
    }

    const result = findContainer(cardData);
    if (!result) {
      if (observer) observer.observe(document.body, { childList: true, subtree: true });
      return;
    }

    const { container, getMovable } = result;

    const comparators = {
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      'name-asc': (a, b) => a.name.localeCompare(b.name),
      'name-desc': (a, b) => b.name.localeCompare(a.name),
    };
    const cmp = comparators[mode] || comparators['price-asc'];
    cardData.sort(cmp);

    for (const d of cardData) {
      container.appendChild(getMovable(d));
    }

    if (observer) observer.observe(document.body, { childList: true, subtree: true });
  }

  // ---------------------------------------------------------------------------
  // Chrome message listener
  // ---------------------------------------------------------------------------

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'getStatus') {
      detectBudget();
      const allPriceEls = getPriceElements();
      const totalCount = allPriceEls.length;
      const knownVendors = getKnownVendors();
      const providers = {};
      const sections = {};
      const seen = new Set();

      for (const { el, price } of allPriceEls) {
        const card = findCardRoot(el);
        if (!card || seen.has(card)) continue;
        seen.add(card);
        const name = getProviderName(card, knownVendors);
        if (name) {
          if (!providers[name]) providers[name] = { total: 0, affordable: 0 };
          providers[name].total++;
          if (price <= (budget ?? Infinity)) providers[name].affordable++;
        }
        const section = getSectionForCard(card);
        if (section) {
          if (!sections[section]) sections[section] = { total: 0, affordable: 0 };
          sections[section].total++;
          if (price <= (budget ?? Infinity)) sections[section].affordable++;
        }
      }

      sendResponse({
        budget,
        paidBudget,
        includePaid,
        hiddenCount: getHiddenCount(),
        totalCount,
        providers,
        sections,
        categoryEnabled,
        showAll,
        currentSort,
        orderPlaced: detectOrderPlaced(),
      });
      return true;
    }

    if (message.action === 'toggle') {
      showAll = message.showAll;
      if (showAll) revealAll();
      else { detectBudget(); applyHiding(); }
      sendResponse({ ok: true });
      return true;
    }

    if (message.action === 'sortCards') {
      sortCards(message.sort);
      sendResponse({ ok: true });
      return true;
    }

    if (message.action === 'setIncludePaid') {
      includePaid = message.includePaid;
      detectBudget();
      applyHiding();
      sendResponse({ ok: true });
      return true;
    }

    if (message.action === 'setCategoryEnabled') {
      categoryEnabled = { ...categoryEnabled, ...message.categoryEnabled };
      applyHiding();
      sendResponse({ ok: true });
      return true;
    }
  });

  // ---------------------------------------------------------------------------
  // Initialisation
  // ---------------------------------------------------------------------------

  function init() {
    chrome.storage.local.get(['feedrShowAll', 'feedrIncludePaid', 'feedrSort', 'feedrCategoryEnabled'], (result) => {
      showAll = !!result.feedrShowAll;
      includePaid = result.feedrIncludePaid !== false; // default true
      currentSort = result.feedrSort || 'price-asc';
      if (result.feedrCategoryEnabled) {
        categoryEnabled = { ...categoryEnabled, ...result.feedrCategoryEnabled };
      }
      detectBudget();
      applyHiding();
      sortCards(currentSort);
    });
  }

  observer = new MutationObserver(scheduleApply);
  observer.observe(document.body, { childList: true, subtree: true });

  init();
})();
