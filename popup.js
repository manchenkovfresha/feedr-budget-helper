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

  function sortedProviderEntries(providers) {
    return Object.entries(providers).sort(([, a], [, b]) => {
      const pA = a.total > 0 ? a.affordable / a.total : 0;
      const pB = b.total > 0 ? b.affordable / b.total : 0;
      return pB - pA;
    });
  }

  // ---------------------------------------------------------------------------
  // Canvas image export
  // ---------------------------------------------------------------------------

  function drawStatsImage(budget, affordable, totalCount, providers) {
    const SCALE = 2;
    const W = 300;
    const PAD = 18;
    const GREEN = '#2d9e5f';
    const HEADER_H = 48;
    const font = (size, weight = '400') =>
      `${weight} ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

    const entries = sortedProviderEntries(providers);
    const overallPct = totalCount > 0 ? Math.round((affordable / totalCount) * 100) : 0;

    // Calculate canvas height by tracing the draw path
    let H = HEADER_H + 16 + 14 + 22; // header + stat lines
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

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.roundRect(0, 0, W, H, 10);
    ctx.fill();

    // Green header
    ctx.fillStyle = GREEN;
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
        ctx.roundRect(PAD, y, barW, 5, 2.5);
        ctx.fill();
        if (pct > 0) {
          ctx.fillStyle = GREEN;
          ctx.roundRect(PAD, y, barW * pct / 100, 5, 2.5);
          ctx.fill();
        }
        y += 22;
      }
    }

    return canvas;
  }

  function copyStatsImage(budget, affordable, totalCount, providers) {
    const canvas = drawStatsImage(budget, affordable, totalCount, providers);
    canvas.toBlob((blob) => {
      navigator.clipboard
        .write([new ClipboardItem({ 'image/png': blob })])
        .then(() => {
          const btn = document.getElementById('shareBtn');
          if (!btn) return;
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = 'Share stats as image'; }, 1500);
        })
        .catch(() => {
          const btn = document.getElementById('shareBtn');
          if (!btn) return;
          btn.textContent = 'Failed — try again';
          setTimeout(() => { btn.textContent = 'Share stats as image'; }, 2000);
        });
    }, 'image/png');
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  function renderProviderRows(providers) {
    const entries = sortedProviderEntries(providers);
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

  function render(status) {
    if (!contentEl) return;

    const { budget, totalCount, providers = {}, showAll, orderPlaced } = status;

    if (orderPlaced) {
      contentEl.innerHTML = '<p class="order-placed">✅ Your order has been placed.<br>Select another day to see the options.</p>';
      return;
    }

    // Derive affordable from price data — correct even when showAll hides the overlays
    const affordable = totalAffordable(providers);
    const overallPct = totalCount > 0 ? Math.round((affordable / totalCount) * 100) : 0;
    const providerRows = renderProviderRows(providers);
    const btnClass = showAll ? 'hide' : 'show';
    const btnLabel = showAll ? 'Re-apply budget overlays' : 'Show all meals';

    contentEl.innerHTML = `
      <p class="stat">Available: <strong>${escHtml(formatBudget(budget))}</strong></p>
      <p class="stat">Affordable: <strong>${affordable} / ${totalCount} (${overallPct}%)</strong></p>
      ${providerRows ? `<hr class="divider" />${providerRows}` : ''}
      <hr class="divider" />
      <div class="actions">
        <button class="${btnClass}" id="toggleBtn">${btnLabel}</button>
        <button class="share" id="shareBtn">Share stats as image</button>
      </div>
    `;

    document.getElementById('toggleBtn').addEventListener('click', () => {
      const newShowAll = !showAll;
      chrome.storage.local.set({ feedrShowAll: newShowAll });
      sendToggle(newShowAll);
    });

    document.getElementById('shareBtn').addEventListener('click', () => {
      copyStatsImage(budget, affordable, totalCount, providers);
    });
  }

  // ---------------------------------------------------------------------------
  // Messaging
  // ---------------------------------------------------------------------------

  function sendToggle(newShowAll) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle', showAll: newShowAll }, () => {
        if (chrome.runtime.lastError) return;
        queryStatus();
      });
    });
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
