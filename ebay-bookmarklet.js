/**
 * EbayTool Assistant - Universal eBay Listing Bookmarklet
 * Engine Version: 1.0.1
 * Protocol Version: 1.0
 *
 * Lightweight, CSP-compliant, user-friendly auto-fill runner for eBay listings.
 * - Dynamic element retargeting from clipboard payload
 * - Robust duplicate detection across chip variations & formatting
 * - Duplicate skipping; preserves all existing fields
 * - Minimal, non-intrusive notification toast
 */
(function () {
  'use strict';

  const ENGINE_VERSION = '1.0.1';
  const TOAST_ID = '__ebay_assistant_toast__';

  // 1. Sleek Minimal Notification Toast
  function showToast(title, message, type = 'info', autoCloseMs = 0) {
    let toast = document.getElementById(TOAST_ID);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = TOAST_ID;
      toast.style.cssText = [
        'position: fixed',
        'top: 16px',
        'right: 16px',
        'width: 320px',
        'max-width: calc(100vw - 32px)',
        'background: #111827',
        'color: #ffffff',
        'border-radius: 8px',
        'box-shadow: 0 10px 25px rgba(0,0,0,0.25)',
        'z-index: 2147483647',
        'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        'font-size: 13px',
        'line-height: 1.4',
        'padding: 12px 14px',
        'box-sizing: border-box',
        'display: flex',
        'flex-direction: column',
        'gap: 4px',
        'transition: opacity 0.25s ease, transform 0.25s ease'
      ].join(';');

      const topRow = document.createElement('div');
      topRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 13px;';
      
      const titleSpan = document.createElement('span');
      titleSpan.id = TOAST_ID + '_title';
      
      const closeBtn = document.createElement('button');
      closeBtn.innerText = '✕';
      closeBtn.style.cssText = 'background: none; border: none; color: #9ca3af; cursor: pointer; padding: 0 2px; font-size: 14px; line-height: 1;';
      closeBtn.onclick = () => removeToast();

      topRow.appendChild(titleSpan);
      topRow.appendChild(closeBtn);

      const msgDiv = document.createElement('div');
      msgDiv.id = TOAST_ID + '_msg';
      msgDiv.style.cssText = 'color: #d1d5db; font-size: 12px; white-space: normal; line-height: 1.4;';

      toast.appendChild(topRow);
      toast.appendChild(msgDiv);
      document.body.appendChild(toast);
    }

    const titleEl = document.getElementById(TOAST_ID + '_title');
    const msgEl = document.getElementById(TOAST_ID + '_msg');
    
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '⚡';
    const accent = type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : type === 'warn' ? '#f59e0b' : '#38bdf8';
    
    if (titleEl) {
      titleEl.style.color = accent;
      titleEl.innerHTML = icon + ' ' + title;
    }
    if (msgEl) {
      msgEl.innerHTML = message;
    }

    if (autoCloseMs > 0) {
      setTimeout(removeToast, autoCloseMs);
    }
  }

  function removeToast() {
    const toast = document.getElementById(TOAST_ID);
    if (toast && toast.isConnected) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-8px)';
      setTimeout(() => toast.remove(), 250);
    }
  }

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function normalize(str) {
    return (str || '')
      .replace(/[\u00A0\u1680\u2000-\u200B\u2028\u2029\u202F\u205F\u3000\uFEFF]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  function normalizeClean(str) {
    return normalize(str).replace(/[^A-Z0-9]/g, '');
  }

  // 2. Page Verification
  function checkEbayPage(payload) {
    const host = window.location.hostname.toLowerCase();
    const url = window.location.href.toLowerCase();

    if (!host.includes('ebay.')) {
      showToast('Wrong Website', 'Please open your eBay listing page to run this tool.', 'error', 5000);
      return false;
    }

    const matches = (payload && Array.isArray(payload.pageMatch) && payload.pageMatch.length > 0)
      ? payload.pageMatch
      : ['lstng', 'sl/', 'itm', 'draft', 'sell'];

    const isListing = matches.some(m => url.includes(m.toLowerCase()));
    if (!isListing) {
      showToast('Not a Listing Page', 'Please navigate to an active eBay listing draft/edit page.', 'warn', 5000);
      return false;
    }

    return true;
  }

  // 3. Dynamic Field Container Finder
  // Ascends to locate the component or row container that bounds THIS field and its chips
  function findFieldContainer(input) {
    if (!input) return null;
    let best = input.parentElement;
    let curr = input.parentElement;

    while (curr && curr.tagName !== 'BODY') {
      // If container holds multiple distinct input fields, stop ascending to prevent capturing other aspects
      const inputs = curr.querySelectorAll('input[type="text"], input:not([type]), [role="combobox"]');
      if (inputs.length > 1) {
        break;
      }

      const hasChips = curr.querySelector(
        '.chips-combobox__items, [class*="chips-combobox"], [class*="chip"], [class*="pill"], [class*="token"], [class*="tag"], button[aria-label*="remove" i], button[aria-label*="delete" i]'
      );
      const isCombobox = curr.classList && curr.classList.contains('chips-combobox') ||
                         (curr.className && String(curr.className).includes('chips-combobox'));

      if (hasChips || isCombobox) {
        best = curr;
      } else if (best === input.parentElement && curr !== input.parentElement) {
        best = curr;
      }
      curr = curr.parentElement;
    }
    return best;
  }

  // 4. Dynamic Field Locator (Payload-driven)
  function locateTargetField(targetConfig) {
    const customSelectors = (targetConfig && targetConfig.selectors) || [];
    const aliases = (targetConfig && targetConfig.aliases) || ['Manufacturer Part Number', 'MPN', 'Part Number'];
    const inputSelector = (targetConfig && targetConfig.inputSelector) || 'input[type="text"], input:not([type]), [role="combobox"], [contenteditable="true"]';

    // 1. Dynamic retargeting: custom selectors from clipboard payload
    for (const sel of customSelectors) {
      try {
        const found = document.querySelector(sel);
        if (found) {
          const input = found.tagName === 'INPUT' ? found : found.querySelector(inputSelector);
          if (input && input.isConnected) {
            return {
              input: input,
              container: findFieldContainer(input)
            };
          }
        }
      } catch (e) {}
    }

    // 2. Input attributes
    const inputs = Array.from(document.querySelectorAll(inputSelector));
    for (const input of inputs) {
      const aria = (input.getAttribute('aria-label') || '').toLowerCase();
      const ph = (input.placeholder || '').toLowerCase();
      const testId = (input.getAttribute('data-testid') || input.getAttribute('data-test-id') || '').toLowerCase();
      const name = (input.name || '').toLowerCase();

      for (const a of aliases) {
        const al = a.toLowerCase();
        if (aria.includes(al) || ph.includes(al) || testId.includes(al) || name.includes(al)) {
          return {
            input: input,
            container: findFieldContainer(input)
          };
        }
      }
    }

    // 3. Label / text proximity
    const textNodes = Array.from(document.querySelectorAll('label, span, div, h4'));
    for (const node of textNodes) {
      const text = (node.innerText || node.textContent || '').trim().toLowerCase();
      for (const a of aliases) {
        if (text === a.toLowerCase() || (text.includes(a.toLowerCase()) && text.length < a.length + 10)) {
          const forAttr = node.getAttribute('for');
          if (forAttr) {
            const el = document.getElementById(forAttr);
            if (el) return { input: el, container: findFieldContainer(el) };
          }
          const container = node.closest('[data-testid*="specific"], [class*="specific"], [class*="aspect"], tr, div:has(input)') || node.parentElement;
          if (container) {
            const inp = container.querySelector(inputSelector);
            if (inp) return { input: inp, container: findFieldContainer(inp) };
          }
        }
      }
    }

    return null;
  }

  // 5. Clean Text Extraction from Chip Elements
  function extractCleanText(el) {
    if (!el) return '';

    // Check title or data-value attributes (often holds untruncated text)
    const titleAttr = el.getAttribute('title') || el.getAttribute('data-value');
    if (titleAttr && titleAttr.trim()) return titleAttr.trim();

    // Check inner text span (e.g. .chip__text, .chip__title)
    const textSpan = el.querySelector(
      '.chip__text, .chip__title, [class*="chip__text"], [class*="chip__title"], [class*="text"], [class*="title"], [class*="label"], [class*="value"]'
    );
    if (textSpan) {
      const spanTitle = textSpan.getAttribute('title') || textSpan.getAttribute('data-value');
      if (spanTitle && spanTitle.trim()) return spanTitle.trim();
      const st = textSpan.textContent || textSpan.innerText;
      if (st && st.trim()) return st.trim();
    }

    // Check remove button aria-label (e.g. "Remove PART123")
    const rmBtn = el.querySelector(
      'button[aria-label*="remove" i], button[aria-label*="delete" i], [aria-label*="remove" i], [aria-label*="delete" i]'
    );
    if (rmBtn) {
      const aria = rmBtn.getAttribute('aria-label') || '';
      const m = aria.match(/(?:remove|delete|close|clear)\s+(.+)/i);
      if (m && m[1] && m[1].trim()) return m[1].trim();
    }

    // Strip child buttons/svgs from clone and read text
    try {
      const clone = el.cloneNode(true);
      const junk = clone.querySelectorAll(
        'button, svg, [role="button"], [aria-label*="remove" i], [aria-label*="delete" i], [class*="remove"], [class*="close"], [class*="icon"], [class*="btn"]'
      );
      junk.forEach(j => j.remove());
      let txt = clone.textContent || '';
      txt = txt.replace(/[\u2715\u2716\u00D7\u2573\u274C\u274E✕×xX\s]+$/, '').trim();
      if (txt) return txt;
    } catch (e) {}

    return (el.textContent || '').trim();
  }

  // 6. Pill / Chip Tracker with Multi-Variant Matching
  function createPillTracker() {
    const exactSet = new Set();
    const cleanSet = new Set();

    function add(str) {
      if (!str) return;
      const norm = normalize(str);
      if (!norm) return;

      exactSet.add(norm);
      const cl = normalizeClean(norm);
      if (cl) cleanSet.add(cl);

      // If string contains separators (/ or ; or |), add individual components
      if (/[\/;|]/.test(norm)) {
        norm.split(/[\/;|]/).map(s => s.trim()).filter(Boolean).forEach(part => {
          exactSet.add(part);
          const cp = normalizeClean(part);
          if (cp) cleanSet.add(cp);
        });
      }
    }

    function has(val) {
      if (!val) return false;
      const norm = normalize(val);
      if (!norm) return false;

      // 1. Exact normalized match
      if (exactSet.has(norm)) return true;

      // 2. Alphanumeric match (ignores spaces, dots, dashes)
      const cl = normalizeClean(norm);
      if (cl && cleanSet.has(cl)) return true;

      // 3. Segment match: if incoming val has multiple parts, check if any part exists
      if (/[\/;|]/.test(norm)) {
        const parts = norm.split(/[\/;|]/).map(s => s.trim()).filter(Boolean);
        for (const p of parts) {
          if (exactSet.has(p)) return true;
          const cp = normalizeClean(p);
          if (cp && cleanSet.has(cp)) return true;
        }
      }

      // 4. Truncation match
      for (const item of exactSet) {
        if (item.endsWith('...') && norm.startsWith(item.slice(0, -3))) return true;
        if (norm.endsWith('...') && item.startsWith(norm.slice(0, -3))) return true;
      }

      return false;
    }

    return {
      add,
      has,
      size: () => exactSet.size,
      getAll: () => Array.from(exactSet)
    };
  }

  // 7. Extract Existing Values (Skips duplicates & preserves all fields)
  function getExistingPills(container, input, chipSelector) {
    const tracker = createPillTracker();

    if (container) {
      const sel = chipSelector || [
        '.chip',
        '[class*="chip"]',
        '.pill',
        '[class*="pill"]',
        '.token',
        '[class*="token"]',
        '.tag',
        '[class*="tag"]',
        '[class*="chips-combobox__item"]',
        'li[role="listitem"]',
        '[data-testid*="chip"]',
        '[data-testid*="pill"]',
        '[data-testid*="tag"]'
      ].join(', ');

      const chipElements = container.querySelectorAll(sel);
      chipElements.forEach(el => {
        if (el === input || (el.contains && el.contains(input))) return;
        const txt = extractCleanText(el);
        if (txt) tracker.add(txt);
      });

      // Also check any remove buttons directly in container
      const removeButtons = container.querySelectorAll(
        'button[aria-label*="remove" i], button[aria-label*="delete" i], [aria-label*="remove" i], [aria-label*="delete" i], [class*="chip__button"], [class*="chip__remove"]'
      );
      removeButtons.forEach(btn => {
        const aria = btn.getAttribute('aria-label') || '';
        const m = aria.match(/(?:remove|delete|close|clear)\s+(.+)/i);
        if (m && m[1]) tracker.add(m[1]);
        if (btn.parentElement && btn.parentElement !== container) {
          const pt = extractCleanText(btn.parentElement);
          if (pt) tracker.add(pt);
        }
      });
    }

    if (input && input.value) {
      tracker.add(input.value);
    }

    return tracker;
  }

  // 8. Add Value to eBay Field (React/Web Component compatible)
  async function enterChip(input, container, value) {
    input.focus();

    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (setter) {
      setter.call(input, value);
    } else {
      input.value = value;
    }

    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(60);

    const press = (type) => {
      try {
        if (typeof KeyboardEvent === 'function') {
          input.dispatchEvent(new KeyboardEvent(type, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        } else {
          const ev = new Event(type, { bubbles: true });
          ev.key = 'Enter';
          ev.keyCode = 13;
          input.dispatchEvent(ev);
        }
      } catch (e) {}
    };

    press('keydown');
    press('keypress');
    press('keyup');
    await sleep(60);

    if (input.value && container) {
      const addBtn = container.querySelector('button[aria-label*="add" i], button[aria-label*="plus" i], [data-testid*="add" i]');
      if (addBtn && addBtn !== input) {
        addBtn.click();
        await sleep(60);
      }
    }

    await sleep(150);
  }

  // 9. Main Execution
  async function run() {
    showToast('eBay Assistant', 'Reading clipboard content...');

    let text = '';
    try {
      text = await navigator.clipboard.readText();
    } catch (e) {
      showToast('Clipboard Access Denied', 'Please click the bookmarklet again directly to allow clipboard access.', 'error', 5000);
      return;
    }

    if (!text || !text.trim()) {
      showToast('Clipboard Empty', 'Click "Copy for eBay" in the tool first, then click this bookmark.', 'warn', 4500);
      return;
    }

    let payload;
    try {
      payload = JSON.parse(text);
    } catch (e) {
      payload = {
        action: 'UPDATE_MPN',
        rows: text.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
      };
    }

    if (!checkEbayPage(payload)) return;

    const rows = Array.isArray(payload.rows) ? payload.rows.map(r => String(r).trim()).filter(Boolean) : [];
    if (rows.length === 0) {
      showToast('No Data', 'The copied content contains no rows to add.', 'warn', 4000);
      return;
    }

    showToast('eBay Assistant', 'Locating field on page...');
    const targetConfig = payload.target || {};
    const target = locateTargetField(targetConfig);

    if (!target || !target.input) {
      showToast('Field Not Found', 'Could not locate Manufacturer Part Number field. Make sure Item Specifics is visible.', 'error', 6000);
      return;
    }

    const existing = getExistingPills(target.container, target.input, targetConfig.chipSelector);
    let added = 0;
    let skipped = 0;

    const existCount = existing.size();
    const existInfo = existCount > 0 ? ` (${existCount} existing detected)` : '';
    showToast('eBay Assistant', `Processing ${rows.length} item(s)...${existInfo}`);

    for (let i = 0; i < rows.length; i++) {
      const val = rows[i];
      if (existing.has(val)) {
        skipped++;
      } else {
        await enterChip(target.input, target.container, val);
        existing.add(val);
        added++;
      }
    }

    // Friendly Result Summary
    if (added > 0) {
      const skipNote = skipped > 0 ? ` (${skipped} duplicate${skipped > 1 ? 's' : ''} skipped)` : '';
      showToast(
        'Success',
        `Added <b>${added}</b> part number${added > 1 ? 's' : ''} to listing!${skipNote}`,
        'success',
        4000
      );
    } else if (skipped > 0) {
      showToast(
        'Already Up to Date',
        `All <b>${skipped}</b> part number${skipped > 1 ? 's' : ''} are already entered in this listing.`,
        'info',
        4000
      );
    } else {
      showToast('Done', 'No changes were made to the listing.', 'info', 3000);
    }
  }

  run().catch(err => {
    showToast('Error', (err && err.message) ? err.message : String(err), 'error', 6000);
  });
})();
