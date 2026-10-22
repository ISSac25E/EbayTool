/**
 * EbayTool Assistant - Universal eBay Listing Bookmarklet
 * Engine Version: 1.1.0
 * Protocol Version: 1.0
 * Name: ⭐️ Fill eBay Listing v1.1.0
 *
 * Lightweight, CSP-compliant, mission-ready auto-fill runner for eBay listings.
 * - Native eBay Seller Hub fake-menu-button / dropdown support with custom option commit
 * - Fallback standard combobox / input chip support for other eBay forms
 * - Deep multi-layer duplicate detection & pre-flight filtering (never touches DOM if up to date)
 * - Safe screen-reader (.clipped) text stripping to prevent false mismatch
 * - Post-flight verification confirming values actually committed
 * - Non-intrusive status toast
 */
(function () {
  'use strict';

  const ENGINE_VERSION = '1.1.0';
  const TOAST_ID = '__ebay_assistant_toast__';

  // 1. Minimal Notification Toast
  function showToast(title, message, type = 'info', autoCloseMs = 0) {
    let toast = document.getElementById(TOAST_ID);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = TOAST_ID;
      toast.style.cssText = [
        'position: fixed',
        'top: 16px',
        'right: 16px',
        'width: 340px',
        'max-width: calc(100vw - 32px)',
        'background: #111827',
        'color: #ffffff',
        'border-radius: 8px',
        'box-shadow: 0 10px 25px rgba(0,0,0,0.35)',
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

  // 2. Normalization & Matching Logic
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

  function cleanEbayItemText(el) {
    if (!el) return '';
    try {
      const clone = el.cloneNode(true);
      clone.querySelectorAll('.clipped, svg, button').forEach(x => x.remove());
      return (clone.textContent || '').trim();
    } catch (e) {
      return (el.textContent || '').trim();
    }
  }

  function createValueTracker() {
    const exactSet = new Set();
    const cleanSet = new Set();
    let containerCleanText = '';

    function add(str) {
      if (!str) return;
      // Strip eBay multi-item counter badge like "(+1)" or "(+2)" from button text
      const stripped = String(str).replace(/\s*\(\+\d+\)\s*$/g, '').trim();
      const norm = normalize(stripped);
      if (!norm) return;

      exactSet.add(norm);
      const cl = normalizeClean(norm);
      if (cl) cleanSet.add(cl);

      // If string contains separators (/ or ; or |), index individual components
      if (/[\/;|]/.test(norm)) {
        norm.split(/[\/;|]/).map(s => s.trim()).filter(Boolean).forEach(part => {
          exactSet.add(part);
          const cp = normalizeClean(part);
          if (cp) cleanSet.add(cp);
        });
      }
    }

    function setContainerRawText(txt) {
      if (txt) {
        containerCleanText = normalizeClean(txt);
      }
    }

    function has(val) {
      if (!val) return false;
      const norm = normalize(val);
      if (!norm) return false;

      // 1. Direct exact normalized match
      if (exactSet.has(norm)) return true;

      // 2. Clean alphanumeric match (ignores spaces, dots, dashes, case)
      const cl = normalizeClean(norm);
      if (cl && cleanSet.has(cl)) return true;

      // 3. Multi-segment match: if incoming val has multiple variations
      if (/[\/;|]/.test(norm)) {
        const parts = norm.split(/[\/;|]/).map(s => s.trim()).filter(Boolean);
        for (const p of parts) {
          if (exactSet.has(p)) return true;
          const cp = normalizeClean(p);
          if (cp && cleanSet.has(cp)) return true;
          if (cp && cp.length >= 4 && containerCleanText.includes(cp)) return true;
        }
      }

      // 4. Container visible text safety net (if string is substantial)
      if (cl && cl.length >= 4 && containerCleanText.includes(cl)) {
        return true;
      }

      // 5. Truncation match (... at end)
      for (const item of exactSet) {
        if (item.endsWith('...') && norm.startsWith(item.slice(0, -3))) return true;
        if (norm.endsWith('...') && item.startsWith(norm.slice(0, -3))) return true;
      }

      return false;
    }

    return {
      add,
      has,
      setContainerRawText,
      size: () => exactSet.size,
      getAll: () => Array.from(exactSet)
    };
  }

  // 3. Page Verification
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

  // 4. Robust Target Field Locator (Handles both fake-menu-button and standard inputs)
  function locateTargetField(targetConfig) {
    const aliases = (targetConfig && targetConfig.aliases) || ['Manufacturer Part Number', 'MPN', 'Part Number'];
    const customSelectors = (targetConfig && targetConfig.selectors) || [];

    // Helper: inspect button
    function isMenuButton(btn) {
      if (!btn) return false;
      const controls = btn.getAttribute('aria-controls');
      const cls = btn.className || '';
      return !!(controls || cls.includes('fake-menu-button') || cls.includes('se-expand-button'));
    }

    function resolveMenu(btn) {
      const controlsId = btn.getAttribute('aria-controls');
      if (controlsId) {
        const m = document.getElementById(controlsId);
        if (m) return m;
      }
      return btn.parentElement?.querySelector('.fake-menu-button__menu') ||
             btn.closest('.fake-menu-button')?.querySelector('.fake-menu-button__menu') ||
             btn.parentElement?.parentElement?.querySelector('.fake-menu-button__menu');
    }

    // Strategy 1: Direct button[name="attributes.Manufacturer Part Number"] or name matching aliases
    for (const a of aliases) {
      const btnByName = document.querySelector(`button[name="attributes.${a}" i]`) ||
                        document.querySelector(`button[name*="${a}" i]`);
      if (btnByName && btnByName.isConnected) {
        const row = btnByName.closest('[data-testid="attribute"], .summary__attributes--fields, .summary__attributes--field, tr, fieldset') || btnByName.parentElement;
        return {
          type: 'menu',
          button: btnByName,
          menu: resolveMenu(btnByName),
          container: row,
          label: a
        };
      }
    }

    // Strategy 2: Proximity search by label / aspect name
    const labelCandidates = Array.from(document.querySelectorAll('label, button.fake-link, [data-aspect-name], [data-name], span.field__label, .summary__attributes--label'));
    for (const node of labelCandidates) {
      const text = (node.innerText || node.textContent || '').trim();
      const aspectAttr = (node.getAttribute('data-aspect-name') || node.getAttribute('data-name') || '').trim();

      for (const a of aliases) {
        const al = a.toLowerCase();
        const matchesAspect = aspectAttr.toLowerCase() === al || aspectAttr.toLowerCase().includes(al);
        const matchesText = text.toLowerCase() === al || (text.toLowerCase().includes(al) && text.length < al.length + 18);

        if (matchesAspect || matchesText) {
          const row = node.closest('[data-testid="attribute"], .summary__attributes--fields, .summary__attributes--field, [class*="aspect"], [class*="specific"], tr, fieldset') || node.parentElement?.parentElement;
          if (row) {
            // Check for menu button inside row
            const btn = row.querySelector('button.fake-menu-button__button, button.se-expand-button__button, button[aria-controls], button[name^="attributes."]');
            if (btn && isMenuButton(btn)) {
              return {
                type: 'menu',
                button: btn,
                menu: resolveMenu(btn),
                container: row,
                label: a
              };
            }
            // Check for standard input inside row
            const inp = row.querySelector('input[type="text"], input:not([type]), [role="combobox"]');
            if (inp && inp.isConnected) {
              return {
                type: 'input',
                input: inp,
                container: row,
                label: a
              };
            }
          }
        }
      }
    }

    // Strategy 3: Custom selectors from payload
    for (const sel of customSelectors) {
      try {
        const el = document.querySelector(sel);
        if (el && el.isConnected) {
          if (el.tagName === 'BUTTON' && isMenuButton(el)) {
            const row = el.closest('[data-testid="attribute"], .summary__attributes--fields') || el.parentElement;
            return { type: 'menu', button: el, menu: resolveMenu(el), container: row, label: 'Custom Selector' };
          }
          const inp = el.tagName === 'INPUT' ? el : el.querySelector('input');
          if (inp && inp.isConnected) {
            const row = inp.closest('[data-testid="attribute"], .summary__attributes--fields') || inp.parentElement;
            return { type: 'input', input: inp, container: row, label: 'Custom Selector' };
          }
        }
      } catch (e) {}
    }

    // Strategy 4: Fallback to input with aria-label or placeholder
    const allInputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type]), [role="combobox"]'));
    for (const inp of allInputs) {
      const aria = (inp.getAttribute('aria-label') || '').toLowerCase();
      const ph = (inp.placeholder || '').toLowerCase();
      const name = (inp.name || '').toLowerCase();
      for (const a of aliases) {
        const al = a.toLowerCase();
        if (aria.includes(al) || ph.includes(al) || name.includes(al)) {
          const row = inp.closest('[data-testid="attribute"], .summary__attributes--fields') || inp.parentElement;
          return { type: 'input', input: inp, container: row, label: a };
        }
      }
    }

    return null;
  }

  // 5. Existing Values Extractor (Multi-layer)
  function extractExistingValues(target) {
    const tracker = createValueTracker();

    if (target.container) {
      tracker.setContainerRawText(target.container.innerText || target.container.textContent || '');
    }

    if (target.type === 'menu' && target.button) {
      // Layer A: Trigger button text
      const btnText = target.button.innerText || target.button.textContent || '';
      // Strip count badges like "(+1)" or "(+2)"
      const cleanBtnText = btnText.replace(/\s*\(\+\d+\)\s*$/g, '').trim();
      if (cleanBtnText && !/^(select|enter your own|- select -)$/i.test(cleanBtnText)) {
        tracker.add(cleanBtnText);
      }

      // Layer B: Dropdown menu selected options (if rendered)
      const menu = target.menu || resolveMenu(target.button);
      if (menu) {
        const selectedItems = Array.from(menu.querySelectorAll(
          '[name^="selectedOptions-"] [role="menuitemcheckbox"][aria-checked="true"], .selectedOptions [role="menuitemcheckbox"][aria-checked="true"], [role="menuitemcheckbox"][aria-checked="true"]'
        ));
        selectedItems.forEach(item => {
          const textEl = item.querySelector('.filter-menu__text') || item;
          const txt = cleanEbayItemText(textEl);
          if (txt) tracker.add(txt);
        });
      }
    } else if (target.type === 'input' && target.container) {
      // Standard chips / pills extraction
      const chipElements = Array.from(target.container.querySelectorAll(
        '.chip, [class*="chip"], .pill, [class*="pill"], .token, [class*="token"], .tag, [class*="tag"], [class*="chips-combobox__item"], li[role="listitem"]'
      ));
      chipElements.forEach(el => {
        if (el === target.input || (el.contains && el.contains(target.input))) return;
        const txt = cleanEbayItemText(el);
        if (txt) tracker.add(txt);
      });

      const removeButtons = Array.from(target.container.querySelectorAll(
        'button[aria-label*="remove" i], button[aria-label*="delete" i], [aria-label*="remove" i]'
      ));
      removeButtons.forEach(btn => {
        const aria = btn.getAttribute('aria-label') || '';
        const m = aria.match(/(?:remove|delete|close|clear)\s+(.+)/i);
        if (m && m[1]) tracker.add(m[1]);
      });

      if (target.input && target.input.value) {
        tracker.add(target.input.value);
      }
    }

    return tracker;
  }

  // 6. Native Setter with React _valueTracker update
  function setNativeValue(input, value) {
    const lastValue = input.value;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (setter) {
      setter.call(input, value);
    } else {
      input.value = value;
    }
    if (input._valueTracker) {
      try {
        input._valueTracker.setValue(lastValue);
      } catch (e) {}
    }
  }

  // 7. eBay Menu Add Runner (The real Seller Hub mechanism)
  async function addViaEbayMenu(target, toAdd) {
    const btn = target.button;
    let menu = target.menu || resolveMenu(btn);

    // Step 1: Open menu if not already open
    if (btn.getAttribute('aria-expanded') !== 'true') {
      btn.click();
      await sleep(350);
      menu = menu || resolveMenu(btn);
    }

    if (!menu) {
      throw new Error('eBay menu container could not be opened.');
    }

    // Step 2: Locate search box
    const searchInput = menu.querySelector(
      'input[name*="search-box-"], input[placeholder*="Enter your own" i], input[aria-label*="Enter your own" i], .se-search-box input, input[type="text"]'
    );

    if (!searchInput) {
      throw new Error('Could not find "Enter your own" input inside eBay dropdown.');
    }

    let addedCount = 0;

    for (let i = 0; i < toAdd.length; i++) {
      const val = toAdd[i];
      showToast('⭐️ Adding Part Numbers', `[${i + 1}/${toAdd.length}] Typing: "${val.slice(0, 22)}${val.length > 22 ? '...' : ''}"`);

      // 1. Focus search input and clear it
      searchInput.focus();
      setNativeValue(searchInput, '');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(100);

      // 2. Type value and trigger input event
      setNativeValue(searchInput, val);
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(400);

      // 3. Find custom option checkbox
      let customOption = menu.querySelector(
        '[name^="customOptions-"] [role="menuitemcheckbox"], .customOptions [role="menuitemcheckbox"]'
      );

      // If not found by customOptions class, find by matching text
      if (!customOption) {
        const allItems = Array.from(menu.querySelectorAll('[role="menuitemcheckbox"]'));
        customOption = allItems.find(it => {
          const txt = cleanEbayItemText(it);
          return normalizeClean(txt) === normalizeClean(val);
        });
      }

      if (customOption) {
        customOption.click();
        addedCount++;
        await sleep(350);
      } else {
        // Fallback: try pressing Enter on searchInput
        const ev = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
        searchInput.dispatchEvent(ev);
        await sleep(300);
      }

      // Clear search box after commit
      setNativeValue(searchInput, '');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(150);
    }

    // Step 3: Cleanly close the menu
    if (btn.getAttribute('aria-expanded') === 'true') {
      btn.click();
      await sleep(250);
    }

    return addedCount;
  }

  // 8. Standard Combobox / Input Fallback Runner
  async function addViaStandardInput(target, toAdd) {
    const input = target.input;
    let addedCount = 0;

    for (let i = 0; i < toAdd.length; i++) {
      const val = toAdd[i];
      showToast('⭐️ Adding Part Numbers', `[${i + 1}/${toAdd.length}] Entering: "${val.slice(0, 22)}..."`);

      input.focus();
      await sleep(60);
      setNativeValue(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      await sleep(120);

      // Check for suggestion popup item
      const options = Array.from(document.querySelectorAll('[role="option"], .combobox__option, li[role="option"]'));
      const matched = options.find(opt => {
        const t = (opt.innerText || opt.textContent || '').trim().toLowerCase();
        return t === val.toLowerCase();
      });

      if (matched && typeof matched.click === 'function') {
        matched.click();
        addedCount++;
        await sleep(150);
      } else {
        // Dispatch Enter
        ['keydown', 'keypress', 'keyup'].forEach(type => {
          const ev = new KeyboardEvent(type, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true });
          input.dispatchEvent(ev);
        });
        addedCount++;
        await sleep(150);
      }

      if (typeof input.blur === 'function') input.blur();
      await sleep(120);
    }

    return addedCount;
  }

  // 9. Main Workflow Runner
  async function run() {
    showToast('⭐️ eBay Assistant', 'Reading clipboard content...');

    let text = '';
    try {
      text = await navigator.clipboard.readText();
    } catch (e) {
      showToast('Clipboard Access Denied', 'Please click the bookmarklet again to allow clipboard access.', 'error', 5000);
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
      showToast('No Data', 'The copied content contains no part numbers to add.', 'warn', 4000);
      return;
    }

    showToast('⭐️ eBay Assistant', 'Checking existing part numbers...');
    const targetConfig = payload.target || {};
    const target = locateTargetField(targetConfig);

    if (!target) {
      showToast('Field Not Found', 'Could not locate Manufacturer Part Number field. Make sure Item Specifics is visible.', 'error', 6000);
      return;
    }

    // Step 1: Scan existing values on eBay page
    const existingBefore = extractExistingValues(target);
    const initialCount = existingBefore.size();

    // Step 2: Pre-filter rows into already-existing vs to-add
    const toAdd = [];
    const alreadyPresent = [];

    for (const val of rows) {
      if (existingBefore.has(val)) {
        alreadyPresent.push(val);
      } else {
        toAdd.push(val);
        // Track intra-batch duplicates so same row isn't added twice in 1 run
        existingBefore.add(val);
      }
    }

    // Step 3: CRITICAL PRE-FLIGHT CHECK - If ALL items already exist, STOP IMMEDIATELY!
    if (toAdd.length === 0) {
      showToast(
        'Already Up to Date',
        `All <b>${alreadyPresent.length}</b> part number${alreadyPresent.length > 1 ? 's' : ''} already exist in this listing. (0 added)`,
        'info',
        4500
      );
      return;
    }

    // Step 4: Add new items
    showToast('⭐️ eBay Assistant', `Adding ${toAdd.length} new part number(s)... (${alreadyPresent.length} duplicate${alreadyPresent.length > 1 ? 's' : ''} skipped)`);

    let committedCount = 0;
    if (target.type === 'menu') {
      committedCount = await addViaEbayMenu(target, toAdd);
    } else {
      committedCount = await addViaStandardInput(target, toAdd);
    }

    // Step 5: Post-Flight Verification
    await sleep(300);
    const existingAfter = extractExistingValues(target);

    let verifiedAdded = 0;
    let failedToCommit = 0;

    for (const val of toAdd) {
      if (existingAfter.has(val)) {
        verifiedAdded++;
      } else {
        failedToCommit++;
      }
    }

    // Step 6: Honest, informative user feedback
    const skipText = alreadyPresent.length > 0 ? ` (${alreadyPresent.length} duplicate${alreadyPresent.length > 1 ? 's' : ''} skipped)` : '';

    if (verifiedAdded > 0 && failedToCommit === 0) {
      showToast(
        'Success',
        `Added <b>${verifiedAdded}</b> part number${verifiedAdded > 1 ? 's' : ''} to listing!${skipText}`,
        'success',
        5000
      );
    } else if (verifiedAdded > 0 && failedToCommit > 0) {
      showToast(
        'Partial Success',
        `Added <b>${verifiedAdded}</b>, but <b>${failedToCommit}</b> could not be committed by eBay.${skipText}`,
        'warn',
        6000
      );
    } else if (verifiedAdded === 0 && failedToCommit > 0) {
      showToast(
        'eBay Did Not Commit',
        `Could not commit ${failedToCommit} part number(s). Check eBay 65-character limit or format.${skipText}`,
        'error',
        7000
      );
    } else {
      showToast('Already Up to Date', `All items already present in listing.${skipText}`, 'info', 4000);
    }
  }

  run().catch(err => {
    showToast('Error', (err && err.message) ? err.message : String(err), 'error', 6000);
  });
})();
