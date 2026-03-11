(() => {
  'use strict';

  const contentEl = document.getElementById('content');

  function bar(pct) {
    return `<div style="margin-top:4px;height:6px;border-radius:3px;background:#eee;overflow:hidden">
      <div style="height:100%;width:${pct}%;background:#2d9e5f;border-radius:3px"></div>
    </div>`;
  }

  function render(status) {
    const { budget, hiddenCount, totalCount, providers = {}, showAll, orderPlaced } = status;

    if (orderPlaced) {
      contentEl.innerHTML = `
        <p style="font-size:13px;color:#444;text-align:center;padding:8px 0;line-height:1.5">
          ✅ Your order has been placed.<br>
          Select another day to see the options.
        </p>
      `;
      return;
    }

    const budgetStr = budget !== null && budget !== undefined
      ? `£${parseFloat(budget).toFixed(2)}`
      : 'Not detected';

    const affordable = totalCount - hiddenCount;
    const overallPct = totalCount > 0 ? Math.round((affordable / totalCount) * 100) : 0;

    const providerRows = Object.entries(providers)
      .sort((a, b) => {
        const pctA = a[1].total > 0 ? a[1].affordable / a[1].total : 0;
        const pctB = b[1].total > 0 ? b[1].affordable / b[1].total : 0;
        return pctB - pctA;
      })
      .map(([name, { total, affordable: aff }]) => {
        const pct = total > 0 ? Math.round((aff / total) * 100) : 0;
        return `<div class="provider">
          <div class="provider-row">
            <span class="provider-name">${name}</span>
            <span class="provider-pct">${aff}/${total} &nbsp;<strong>${pct}%</strong></span>
          </div>
          ${bar(pct)}
        </div>`;
      }).join('');

    const btnClass = showAll ? 'hide' : 'show';
    const btnLabel = showAll ? 'Mark over-budget meals' : 'Show all meals';

    contentEl.innerHTML = `
      <p class="stat">Available: <strong>${budgetStr}</strong></p>
      <p class="stat">Affordable: <strong>${affordable} / ${totalCount} (${overallPct}%)</strong></p>
      ${providerRows ? `<hr class="divider" />${providerRows}` : ''}
      <hr class="divider" />
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="${btnClass}" id="toggleBtn">${btnLabel}</button>
        <button class="share" id="shareBtn">Share</button>
      </div>
    `;

    document.getElementById('toggleBtn').addEventListener('click', () => {
      const newShowAll = !showAll;
      chrome.storage.local.set({ feedrShowAll: newShowAll });
      sendToggle(newShowAll);
    });

    document.getElementById('shareBtn').addEventListener('click', () => {
      copyScreenshot({ budget, hiddenCount, totalCount, providers, affordable, overallPct });
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function copyScreenshot({ budget, hiddenCount, totalCount, providers, affordable, overallPct }) {
    const budgetStr = budget !== null && budget !== undefined
      ? `£${parseFloat(budget).toFixed(2)}` : 'Not detected';

    const entries = Object.entries(providers).sort((a, b) => {
      const pA = a[1].total > 0 ? a[1].affordable / a[1].total : 0;
      const pB = b[1].total > 0 ? b[1].affordable / b[1].total : 0;
      return pB - pA;
    });

    const SCALE = 2;
    const W = 300;
    const PAD = 18;
    const GREEN = '#2d9e5f';
    const HEADER_H = 48;

    // Derive height by tracing the same y positions used when drawing
    let H = HEADER_H + 16; // top of first stat line
    H += 14;               // first stat baseline
    H += 22;               // second stat baseline
    if (entries.length) {
      H += 14;             // gap before divider
      H += 14;             // gap after divider
      H += entries.length * 30; // 8px gap + 5px bar + 17px gap per provider
    }
    H += 14;               // bottom padding

    const canvas = document.createElement('canvas');
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);

    const font = (size, weight = '400') =>
      `${weight} ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

    // White background with rounded corners
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 0, 0, W, H, 10);
    ctx.fill();

    // Green header
    ctx.fillStyle = GREEN;
    roundRect(ctx, 0, 0, W, HEADER_H, 10);
    ctx.fill();
    // Square off bottom corners of header
    ctx.fillRect(0, HEADER_H - 10, W, 10);

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
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Feedr Budget Helper', PAD + 30, HEADER_H / 2 + 5);

    // Stats section
    let y = HEADER_H + 16;
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
    const affStr = `${affordable} / ${totalCount}  ${overallPct}%`;
    ctx.font = font(12, 'bold');
    ctx.fillStyle = GREEN;
    ctx.fillText(affStr, W - PAD - ctx.measureText(affStr).width, y);

    // Providers
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
        roundRect(ctx, PAD, y, barW, 5, 2.5);
        ctx.fill();
        if (pct > 0) {
          ctx.fillStyle = GREEN;
          roundRect(ctx, PAD, y, barW * pct / 100, 5, 2.5);
          ctx.fill();
        }
        y += 22;
      }
    }

    canvas.toBlob(blob => {
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => {
        const btn = document.getElementById('shareBtn');
        if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Share'; }, 1500); }
      });
    });
  }

  function sendToggle(newShowAll) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle', showAll: newShowAll }, (response) => {
        if (chrome.runtime.lastError) return;
        // Re-query status to refresh UI
        queryStatus();
      });
    });
  }

  function queryStatus(retries = 8, delay = 400) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;

      chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          contentEl.innerHTML = '<p class="no-page">Content script not ready — reload the page.</p>';
          return;
        }
        // If page hasn't rendered cards yet, retry
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
