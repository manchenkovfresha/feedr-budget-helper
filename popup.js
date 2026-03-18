(() => {
  'use strict';

  const contentEl = document.getElementById('content');

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatBudget(budget) {
    return (budget !== null && budget !== undefined)
      ? `£${budget.toFixed(2)}`
      : 'Not detected';
  }

  // Compute affordable count from provider data — correct regardless of showAll state.
  function totalAffordable(providers) {
    return Object.values(providers).reduce((sum, p) => sum + p.affordable, 0);
  }

  let currentSort = 'price-asc';

  // ---------------------------------------------------------------------------
  // Canvas image export
  // ---------------------------------------------------------------------------

  function drawStatsImage(budget, affordable, totalCount, providers, sections) {
    const SCALE = 2;
    const W = 300;
    const PAD = 18;
    const GREEN = '#2d9e5f';
    const HEADER_H = 48;
    const font = (size, weight = '400') =>
      `${weight} ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

    const entries = Object.entries(providers).sort(([a], [b]) => a.localeCompare(b));
    const SECTION_ORDER = ['Mains', 'Sides', 'Drinks'];
    const sectionEntries = SECTION_ORDER.filter(s => sections && sections[s]).map(s => [s, sections[s]]);
    const overallPct = totalCount > 0 ? Math.round((affordable / totalCount) * 100) : 0;

    // Calculate canvas height by tracing the draw path
    let H = HEADER_H + 16 + 14 + 22; // header + stat lines
    if (sectionEntries.length) {
      H += 14 + 14;                        // divider padding
      H += sectionEntries.length * 30;     // per section: label + bar
    }
    if (entries.length) {
      H += 14 + 14;                    // divider padding
      H += entries.length * 30;        // per provider: label + bar
    }
    H += 16;                           // bottom padding

    const canvas = document.createElement('canvas');
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);

    // Border
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(0.5, 0.5, W - 1, H - 1, 10);
    ctx.stroke();

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, 10);
    ctx.fill();

    // Green header
    ctx.fillStyle = GREEN;
    ctx.beginPath();
    ctx.roundRect(0, 0, W, HEADER_H, [10, 10, 0, 0]);
    ctx.fill();

    // Header: "£" circle
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(PAD + 11, HEADER_H / 2, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = font(14, 'bold');
    ctx.textAlign = 'center';
    ctx.fillText('£', PAD + 11, HEADER_H / 2 + 5);

    ctx.textAlign = 'left';
    ctx.font = font(13, '600');
    ctx.fillText('Feedr Budget Helper', PAD + 30, HEADER_H / 2 + 5);

    // Stats
    let y = HEADER_H + 16;
    const budgetStr = formatBudget(budget);
    const affStr = `${affordable} / ${totalCount}  ${overallPct}%`;

    ctx.font = font(12);
    ctx.fillStyle = '#666666';
    ctx.fillText('Available', PAD, y);
    ctx.font = font(12, 'bold');
    ctx.fillStyle = GREEN;
    ctx.fillText(budgetStr, W - PAD - ctx.measureText(budgetStr).width, y);

    y += 22;
    ctx.font = font(12);
    ctx.fillStyle = '#666666';
    ctx.fillText('Affordable', PAD, y);
    ctx.font = font(12, 'bold');
    ctx.fillStyle = GREEN;
    ctx.fillText(affStr, W - PAD - ctx.measureText(affStr).width, y);

    // Section rows
    if (sectionEntries.length) {
      y += 14;
      ctx.strokeStyle = '#eeeeee';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, y);
      ctx.lineTo(W - PAD, y);
      ctx.stroke();
      y += 14;

      for (const [name, { total, affordable: aff }] of sectionEntries) {
        const pct = total > 0 ? Math.round((aff / total) * 100) : 0;
        const pctStr = `${aff}/${total}  ${pct}%`;

        ctx.font = font(12, '500');
        ctx.fillStyle = '#333333';
        ctx.fillText(name, PAD, y);

        ctx.font = font(12, 'bold');
        ctx.fillStyle = GREEN;
        ctx.fillText(pctStr, W - PAD - ctx.measureText(pctStr).width, y);

        y += 8;
        const barW = W - PAD * 2;
        ctx.fillStyle = '#eeeeee';
        ctx.beginPath();
        ctx.roundRect(PAD, y, barW, 5, 2.5);
        ctx.fill();
        if (pct > 0) {
          ctx.fillStyle = GREEN;
          ctx.beginPath();
          ctx.roundRect(PAD, y, barW * pct / 100, 5, 2.5);
          ctx.fill();
        }
        y += 22;
      }
    }

    // Provider rows
    if (entries.length) {
      y += 14;
      ctx.strokeStyle = '#eeeeee';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, y);
      ctx.lineTo(W - PAD, y);
      ctx.stroke();
      y += 14;

      for (const [name, { total, affordable: aff }] of entries) {
        const pct = total > 0 ? Math.round((aff / total) * 100) : 0;
        const pctStr = `${aff}/${total}  ${pct}%`;

        ctx.font = font(12, '500');
        ctx.fillStyle = '#333333';
        ctx.fillText(name, PAD, y);

        ctx.font = font(12, 'bold');
        ctx.fillStyle = GREEN;
        ctx.fillText(pctStr, W - PAD - ctx.measureText(pctStr).width, y);

        y += 8;
        const barW = W - PAD * 2;
        ctx.fillStyle = '#eeeeee';
        ctx.beginPath();
        ctx.roundRect(PAD, y, barW, 5, 2.5);
        ctx.fill();
        if (pct > 0) {
          ctx.fillStyle = GREEN;
          ctx.beginPath();
          ctx.roundRect(PAD, y, barW * pct / 100, 5, 2.5);
          ctx.fill();
        }
        y += 22;
      }
    }

    return canvas;
  }

  function copyStatsImage(budget, affordable, totalCount, providers, sections) {
    const canvas = drawStatsImage(budget, affordable, totalCount, providers, sections);
    canvas.toBlob((blob) => {
      navigator.clipboard
        .write([new ClipboardItem({ 'image/png': blob })])
        .then(() => {
          const btn = document.getElementById('shareBtn');
          if (!btn) return;
          btn.textContent = 'Image copied!';
          setTimeout(() => { btn.textContent = 'Share'; }, 1500);
        })
        .catch(() => {
          const btn = document.getElementById('shareBtn');
          if (!btn) return;
          btn.textContent = 'Failed — try again';
          setTimeout(() => { btn.textContent = 'Share'; }, 2000);
        });
    }, 'image/png');
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  function renderProviderRows(providers) {
    const entries = Object.entries(providers).sort(([a], [b]) => a.localeCompare(b));
    if (!entries.length) return '';

    return entries.map(([name, { total, affordable: aff }]) => {
      const pct = total > 0 ? Math.round((aff / total) * 100) : 0;
      return `
        <div class="provider">
          <div class="provider-row">
            <span class="provider-name">${escHtml(name)}</span>
            <span class="provider-pct">${aff}/${total}&nbsp;&nbsp;<strong>${pct}%</strong></span>
          </div>
          <div class="provider-bar">
            <div class="provider-bar-fill" style="width:${pct}%"></div>
          </div>
        </div>`;
    }).join('');
  }

  function sendToTab(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, message, () => {
        if (chrome.runtime.lastError) return;
        queryStatus();
      });
    });
  }

  function sendSetIncludePaid(value) {
    chrome.storage.local.set({ feedrIncludePaid: value });
    sendToTab({ action: 'setIncludePaid', includePaid: value });
  }

  function sendSetCategoryEnabled(categoryEnabled) {
    chrome.storage.local.set({ feedrCategoryEnabled: categoryEnabled });
    sendToTab({ action: 'setCategoryEnabled', categoryEnabled });
  }

  function renderSectionToggles(sections, categoryEnabled) {
    const knownSections = ['Mains', 'Sides', 'Drinks'];
    const activeSections = knownSections.filter(s => sections && sections[s]);
    if (!activeSections.length) return '';

    const rows = activeSections.map(name => {
      const { total = 0, affordable = 0 } = (sections && sections[name]) || {};
      const enabled = categoryEnabled[name] !== false;
      return `
        <label class="section-toggle">
          <input type="checkbox" data-section="${escHtml(name)}"${enabled ? ' checked' : ''} />
          <span class="section-name">${escHtml(name)}</span>
          <span class="section-stat">${affordable}/${total}</span>
        </label>`;
    }).join('');

    return `<hr class="divider" /><div class="section-label">Apply budget per section</div>${rows}`;
  }

  function render(status) {
    if (!contentEl) return;

    const { budget, totalCount, providers = {}, sections = {}, categoryEnabled = {}, showAll, orderPlaced, includePaid = true, paidBudget = 0, currentSort: sortFromPage } = status;
    if (sortFromPage) currentSort = sortFromPage;

    if (orderPlaced) {
      contentEl.innerHTML = '<p class="order-placed">✅ Your order has been placed.<br>Select another day to see the options.</p>';
      return;
    }

    // Derive affordable from price data — correct even when showAll hides the overlays.
    // Subtract disabled sections so the overall stat reflects only what is being filtered.
    const KNOWN_SECTIONS = ['Mains', 'Sides', 'Drinks'];
    let effectiveTotal = totalCount;
    let effectiveAffordable = totalAffordable(providers);
    for (const s of KNOWN_SECTIONS) {
      if (sections[s] && categoryEnabled[s] === false) {
        effectiveTotal -= sections[s].total;
        effectiveAffordable -= sections[s].affordable;
      }
    }
    effectiveTotal = Math.max(0, effectiveTotal);
    effectiveAffordable = Math.max(0, effectiveAffordable);
    const overallPct = effectiveTotal > 0 ? Math.round((effectiveAffordable / effectiveTotal) * 100) : 0;
    const providerRows = renderProviderRows(providers);
    const btnClass = showAll ? 'hide' : 'show';
    const btnLabel = showAll ? 'Re-apply budget overlays' : 'Show all meals';

    const paidToggle = paidBudget > 0
      ? `<label class="option"><input type="checkbox" id="includePaidCb"${includePaid ? ' checked' : ''} /> Include paid balance (£${paidBudget.toFixed(2)})</label>`
      : '';

    const sectionToggles = renderSectionToggles(sections, categoryEnabled);

    contentEl.innerHTML = `
      <p class="stat">Available: <strong>${escHtml(formatBudget(budget))}</strong></p>
      <p class="stat">Affordable: <strong>${effectiveAffordable} / ${effectiveTotal} (${overallPct}%)</strong></p>
      ${paidToggle}
      ${sectionToggles}
      ${providerRows ? `<hr class="divider" />
        <div class="sort-row">
          <label for="sortSelect">Sort</label>
          <select id="sortSelect">
            <option value="price-asc"${currentSort === 'price-asc' ? ' selected' : ''}>Price: low → high</option>
            <option value="price-desc"${currentSort === 'price-desc' ? ' selected' : ''}>Price: high → low</option>
            <option value="name-asc"${currentSort === 'name-asc' ? ' selected' : ''}>Name: A → Z</option>
            <option value="name-desc"${currentSort === 'name-desc' ? ' selected' : ''}>Name: Z → A</option>
          </select>
        </div>
        ${providerRows}` : ''}
      <hr class="divider" />
      <div class="actions">
        <button class="${btnClass}" id="toggleBtn">${btnLabel}</button>
        <button class="share" id="shareBtn">Share</button>
      </div>
    `;

    const includePaidCb = document.getElementById('includePaidCb');
    if (includePaidCb) {
      includePaidCb.addEventListener('change', () => {
        sendSetIncludePaid(includePaidCb.checked);
      });
    }

    for (const cb of contentEl.querySelectorAll('input[data-section]')) {
      cb.addEventListener('change', () => {
        const section = cb.dataset.section;
        const updated = { ...categoryEnabled, [section]: cb.checked };
        sendSetCategoryEnabled(updated);
      });
    }

    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        currentSort = sortSelect.value;
        chrome.storage.local.set({ feedrSort: currentSort });
        sendToTab({ action: 'sortCards', sort: currentSort });
      });
    }

    document.getElementById('toggleBtn').addEventListener('click', () => {
      sendToggle(!showAll);
    });

    document.getElementById('shareBtn').addEventListener('click', () => {
      copyStatsImage(budget, effectiveAffordable, effectiveTotal, providers, sections);
    });
  }

  // ---------------------------------------------------------------------------
  // Messaging
  // ---------------------------------------------------------------------------

  function sendToggle(newShowAll) {
    chrome.storage.local.set({ feedrShowAll: newShowAll });
    sendToTab({ action: 'toggle', showAll: newShowAll });
  }

  function queryStatus(retries = 5, delay = 500) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0] || !contentEl) return;

      chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          if (contentEl) {
            contentEl.innerHTML = '<p class="no-page">Content script not ready — reload the Feedr page.</p>';
          }
          return;
        }
        if (response.totalCount === 0 && retries > 0) {
          setTimeout(() => queryStatus(retries - 1, delay), delay);
          return;
        }
        render(response);
      });
    });
  }

  queryStatus();
})();
