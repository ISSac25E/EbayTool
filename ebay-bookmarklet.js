/**
 * EbayTool Assistant - Universal eBay Listing Bookmarklet
 * Engine Version: 1.2.0
 * Protocol Version: 1.2
 * Name: Fill eBay Listing v1.2.0
 *
 * Lightweight, CSP-compliant, mission-ready auto-fill runner for eBay listings.
 * - Multi-field execution: Listing Title + Manufacturer Part Number (MPN)
 * - Master payload & individual payload support (Title only, MPN only, or Both)
 * - Native eBay Seller Hub fake-menu-button / dropdown support with custom option commit
 * - React _valueTracker bypass + prototype setters for controlled inputs
 * - Deep multi-layer duplicate detection & pre-flight filtering (never touches DOM if up to date)
 * - Safe screen-reader (.clipped) text stripping to prevent false mismatch
 * - Post-flight verification confirming values actually committed
 * - Non-intrusive status toast
 */
(function () {
  'use strict';

  const ENGINE_VERSION = '1.2.0';
  const REQUIRED_PROTOCOL = 'EBAY_TOOL_PAYLOAD';
  const REQUIRED_VERSION = '1.2';
  const SUPPORTED_VERSIONS = ['1.0', '1.1', '1.2'];
  const TOAST_ID = '__ebay_assistant_toast__';

  // 1. Minimal Notification Toast
  let toastTimer = null;

  function showToast(title, message, type = 'info', autoCloseMs = 0) {
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }

    let toast = document.getElementById(TOAST_ID);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = TOAST_ID;
      toast.style.cssText = [
        'position: fixed',
        'top: 16px',
        'right: 16px',
        'width: 360px',
        'max-width: calc(100vw - 32px)',
        'background: #111827',
        'color: #ffffff',
        'border-radius: 8px',
        'border: 1px solid rgba(255, 255, 255, 0.14)',
        'box-shadow: 0 12px 30px rgba(0,0,0,0.45)',
        'z-index: 2147483647',
        'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        'font-size: 13px',
        'line-height: 1.4',
        'padding: 12px 14px',
        'box-sizing: border-box',
        'display: flex',
        'flex-direction: column',
        'gap: 6px',
        'transition: opacity 0.25s ease, transform 0.25s ease'
      ].join(';');

      const topRow = document.createElement('div');
      topRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 13px;';
      
      const titleSpan = document.createElement('span');
      titleSpan.id = TOAST_ID + '_title';
      
      const closeBtn = document.createElement('button');
      closeBtn.innerText = '✕';
      closeBtn.setAttribute('title', 'Dismiss notification');
      closeBtn.style.cssText = 'background: none; border: none; color: #9ca3af; cursor: pointer; padding: 0 4px; font-size: 15px; line-height: 1; border-radius: 4px; transition: color 0.15s;';
      closeBtn.onmouseenter = () => closeBtn.style.color = '#ffffff';
      closeBtn.onmouseleave = () => closeBtn.style.color = '#9ca3af';
      closeBtn.onclick = () => removeToast();

      topRow.appendChild(titleSpan);
      topRow.appendChild(closeBtn);

      const msgDiv = document.createElement('div');
      msgDiv.id = TOAST_ID + '_msg';
      msgDiv.style.cssText = 'color: #d1d5db; font-size: 12px; white-space: normal; line-height: 1.4;';

      toast.appendChild(topRow);
      toast.appendChild(msgDiv);
      document.body.appendChild(toast);

      // Hover-to-freeze: pause timer while mouse is inside toast
      toast.addEventListener('mouseenter', () => {
        if (toastTimer) {
          clearTimeout(toastTimer);
          toastTimer = null;
        }
      });
      toast.addEventListener('mouseleave', () => {
        if (toast._autoCloseMs > 0) {
          toastTimer = setTimeout(removeToast, Math.max(toast._autoCloseMs, 10000));
        }
      });
    }

    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

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

    // Attach click handler to any dismiss button inside message
    const dismissBtn = toast.querySelector('[data-action="dismiss"]');
    if (dismissBtn) {
      dismissBtn.onclick = () => removeToast();
    }

    toast._autoCloseMs = autoCloseMs;
    if (autoCloseMs > 0) {
      toastTimer = setTimeout(removeToast, autoCloseMs);
    }
  }

  function removeToast() {
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
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
      const stripped = String(str).replace(/\s*\(\+\d+\)\s*$/g, '').trim();
      const norm = normalize(stripped);
      if (!norm) return;

      exactSet.add(norm);
      const cl = normalizeClean(norm);
      if (cl) cleanSet.add(cl);

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

      if (exactSet.has(norm)) return true;
      const cl = normalizeClean(norm);
      if (cl && cleanSet.has(cl)) return true;

      if (/[\/;|]/.test(norm)) {
        const parts = norm.split(/[\/;|]/).map(s => s.trim()).filter(Boolean);
        for (const p of parts) {
          if (exactSet.has(p)) return true;
          const cp = normalizeClean(p);
          if (cp && cleanSet.has(cp)) return true;
          if (cp && cp.length >= 4 && containerCleanText.includes(cp)) return true;
        }
      }

      if (cl && cl.length >= 4 && containerCleanText.includes(cl)) {
        return true;
      }

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

  // 4. Native Setter with React _valueTracker update
  function setNativeValue(el, value) {
    const lastValue = el.value;
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) {
      setter.call(el, value);
    } else {
      el.value = value;
    }
    if (el._valueTracker) {
      try {
        el._valueTracker.setValue(lastValue);
      } catch (e) {}
    }
  }

  // 5. Title Section: Locator & Updater
  function locateTitleField(titleConfig) {
    const customSelectors = (titleConfig && titleConfig.selectors) || [
      'input[name="title"]',
      'textarea[name="title"]',
      'input[data-testid="title"]',
      'textarea[data-testid="title"]',
      'input[aria-label*="Title" i]',
      'textarea[aria-label*="Title" i]',
      'input[placeholder*="Title" i]',
      'textarea[placeholder*="Title" i]',
      'div[class*="title" i] input',
      'div[class*="title" i] textarea'
    ];

    for (const sel of customSelectors) {
      try {
        const el = document.querySelector(sel);
        if (el && el.isConnected) {
          return el;
        }
      } catch (e) {}
    }

    const labels = Array.from(document.querySelectorAll('label, [class*="label"], span, h3, h4'));
    for (const lbl of labels) {
      const txt = (lbl.innerText || lbl.textContent || '').trim().toLowerCase();
      if (txt === 'title' || txt === 'listing title' || (txt.includes('title') && txt.length < 18)) {
        const container = lbl.closest('[class*="field"], [class*="row"], [class*="title"], div') || lbl.parentElement;
        if (container) {
          const inp = container.querySelector('input[type="text"], input:not([type]), textarea');
          if (inp && inp.isConnected) return inp;
        }
        const forAttr = lbl.getAttribute('for');
        if (forAttr) {
          const el = document.getElementById(forAttr);
          if (el && el.isConnected) return el;
        }
      }
    }

    return null;
  }

  async function updateEbayTitle(titleConfig, newTitle) {
    if (!newTitle || !String(newTitle).trim()) {
      return { success: true, skipped: true, reason: 'Empty title' };
    }

    const cleanTitle = String(newTitle).trim().slice(0, 80);
    const titleEl = locateTitleField(titleConfig);

    if (!titleEl) {
      return { success: false, reason: 'Title field not found' };
    }

    const currentVal = (titleEl.value || '').trim();
    if (currentVal === cleanTitle) {
      return { success: true, updated: false, alreadyUpToDate: true, value: cleanTitle };
    }

    titleEl.focus();
    await sleep(60);

    setNativeValue(titleEl, cleanTitle);
    titleEl.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    titleEl.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    await sleep(150);

    if (typeof titleEl.blur === 'function') {
      titleEl.blur();
    }
    await sleep(150);

    const verified = (titleEl.value || '').trim();
    const success = verified === cleanTitle;

    return {
      success: success,
      updated: success,
      value: verified,
      reason: success ? null : `Value mismatch (got "${verified.slice(0, 20)}...")`
    };
  }

  // 6. MPN Section: Locator, Existing Values & Updaters
  function locateTargetField(targetConfig) {
    const aliases = (targetConfig && targetConfig.aliases) || ['Manufacturer Part Number', 'MPN', 'Part Number'];
    const customSelectors = (targetConfig && targetConfig.selectors) || [];

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

  function extractExistingValues(target) {
    const tracker = createValueTracker();

    if (target.container) {
      tracker.setContainerRawText(target.container.innerText || target.container.textContent || '');
    }

    if (target.type === 'menu' && target.button) {
      const btnText = target.button.innerText || target.button.textContent || '';
      const cleanBtnText = btnText.replace(/\s*\(\+\d+\)\s*$/g, '').trim();
      if (cleanBtnText && !/^(select|enter your own|- select -)$/i.test(cleanBtnText)) {
        tracker.add(cleanBtnText);
      }

      const menu = target.menu || (target.button.getAttribute('aria-controls') ? document.getElementById(target.button.getAttribute('aria-controls')) : null);
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

  async function addViaEbayMenu(target, toAdd) {
    const btn = target.button;
    let menu = target.menu || (btn.getAttribute('aria-controls') ? document.getElementById(btn.getAttribute('aria-controls')) : null);

    if (btn.getAttribute('aria-expanded') !== 'true') {
      btn.click();
      await sleep(350);
      menu = menu || (btn.getAttribute('aria-controls') ? document.getElementById(btn.getAttribute('aria-controls')) : null);
    }

    if (!menu) {
      throw new Error('eBay menu container could not be opened.');
    }

    const searchInput = menu.querySelector(
      'input[name*="search-box-"], input[placeholder*="Enter your own" i], input[aria-label*="Enter your own" i], .se-search-box input, input[type="text"]'
    );

    if (!searchInput) {
      throw new Error('Could not find search input inside eBay dropdown.');
    }

    let addedCount = 0;

    for (let i = 0; i < toAdd.length; i++) {
      const val = toAdd[i];
      showToast('Adding Part Numbers', `[${i + 1}/${toAdd.length}] Typing: "${val.slice(0, 22)}${val.length > 22 ? '...' : ''}"`);

      searchInput.focus();
      setNativeValue(searchInput, '');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(100);

      setNativeValue(searchInput, val);
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(400);

      let customOption = menu.querySelector(
        '[name^="customOptions-"] [role="menuitemcheckbox"], .customOptions [role="menuitemcheckbox"]'
      );

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
        const ev = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
        searchInput.dispatchEvent(ev);
        await sleep(300);
      }

      setNativeValue(searchInput, '');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(150);
    }

    if (btn.getAttribute('aria-expanded') === 'true') {
      btn.click();
      await sleep(250);
    }

    return addedCount;
  }

  async function addViaStandardInput(target, toAdd) {
    const input = target.input;
    let addedCount = 0;

    for (let i = 0; i < toAdd.length; i++) {
      const val = toAdd[i];
      showToast('Adding Part Numbers', `[${i + 1}/${toAdd.length}] Entering: "${val.slice(0, 22)}..."`);

      input.focus();
      await sleep(60);
      setNativeValue(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      await sleep(120);

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

  async function updateEbayMpn(mpnConfig, rows) {
    const target = locateTargetField(mpnConfig);
    if (!target) {
      return { success: false, reason: 'MPN field not found' };
    }

    const existingBefore = extractExistingValues(target);
    const toAdd = [];
    const alreadyPresent = [];

    for (const val of rows) {
      if (existingBefore.has(val)) {
        alreadyPresent.push(val);
      } else {
        toAdd.push(val);
        existingBefore.add(val);
      }
    }

    if (toAdd.length === 0) {
      return {
        success: true,
        alreadyUpToDate: true,
        added: 0,
        duplicatesSkipped: alreadyPresent.length
      };
    }

    let committedCount = 0;
    try {
      if (target.type === 'menu') {
        committedCount = await addViaEbayMenu(target, toAdd);
      } else {
        committedCount = await addViaStandardInput(target, toAdd);
      }
    } catch (err) {
      return { success: false, reason: err.message || String(err) };
    }

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

    return {
      success: true,
      alreadyUpToDate: false,
      added: verifiedAdded,
      failed: failedToCommit,
      duplicatesSkipped: alreadyPresent.length
    };
  }

  // 7. Master Orchestrator
  async function run() {
    showToast('eBay Assistant', 'Reading clipboard content...');

    let text = '';
    try {
      text = await navigator.clipboard.readText();
    } catch (e) {
      showToast('Clipboard Access Denied', 'Please click the bookmarklet again to allow clipboard access.', 'error', 12000);
      return;
    }

    if (!text || !text.trim()) {
      showToast('Clipboard Empty', 'Click a "Copy for eBay" button in the tool first, then click this bookmark.', 'warn', 12000);
      return;
    }

    let payload;
    try {
      payload = JSON.parse(text);
    } catch (e) {
      payload = null;
    }

    if (!payload || typeof payload !== 'object' || payload.__protocol !== REQUIRED_PROTOCOL) {
      showToast(
        'Invalid Data',
        'Clipboard does not contain valid eBay Assistant data. Click <b>Copy for eBay</b> or <b>Master Copy</b> in the tool first.',
        'error',
        15000
      );
      return;
    }

    const payloadVersion = String(payload.version || 'unknown');
    if (!SUPPORTED_VERSIONS.includes(payloadVersion)) {
      showToast(
        'Version Mismatch',
        `Copied data is <b>v${payloadVersion}</b>, but Bookmarklet supports <b>v1.0 - v1.2</b>.<br>Please drag the new bookmarklet from the tool bar.`,
        'error',
        18000
      );
      return;
    }

    if (!checkEbayPage(payload)) return;

    const isMaster = payload.action === 'MASTER_UPDATE';
    const isTitleOnly = payload.action === 'UPDATE_TITLE';
    const isMpnOnly = payload.action === 'UPDATE_MPN';

    // Title resolution
    const hasTitle = isTitleOnly
      ? Boolean(payload.value)
      : (isMaster && payload.title && Boolean(payload.title.value || (typeof payload.title === 'string' && payload.title)));
    const titleVal = isTitleOnly
      ? (payload.value || '')
      : (payload.title ? (payload.title.value || (typeof payload.title === 'string' ? payload.title : '')) : '');
    const titleConfig = (payload.title && payload.title.target) || (isTitleOnly ? payload.target : null) || {};

    // MPN resolution
    const hasMpn = isMpnOnly
      ? (Array.isArray(payload.rows) && payload.rows.length > 0)
      : (isMaster && payload.mpn && Array.isArray(payload.mpn.rows) && payload.mpn.rows.length > 0);
    const mpnRows = isMpnOnly
      ? (payload.rows || [])
      : (payload.mpn && Array.isArray(payload.mpn.rows) ? payload.mpn.rows : []);
    const mpnConfig = (payload.mpn && payload.mpn.target) || (isMpnOnly ? payload.target : null) || {};

    if (!hasTitle && !hasMpn) {
      showToast('No Data', 'Copied content contains neither title nor part numbers to update.', 'warn', 12000);
      return;
    }

    let titleResult = null;
    let mpnResult = null;

    // Announce staged payload components
    const stagedOverview = [];
    if (hasTitle && titleVal) stagedOverview.push(`Title ("${truncate(titleVal, 24)}")`);
    if (hasMpn && mpnRows.length > 0) stagedOverview.push(`${mpnRows.length} MPN${mpnRows.length > 1 ? 's' : ''}`);
    showToast('eBay Assistant', `Applying staged data: <b>${stagedOverview.join(' + ')}</b>...`);
    await sleep(250);

    // Step 1: Update Title if present
    if (hasTitle && titleVal) {
      showToast('eBay Assistant', 'Writing listing Title...');
      titleResult = await updateEbayTitle(titleConfig, titleVal);
    }

    // Step 2: Update MPN if present
    if (hasMpn && mpnRows.length > 0) {
      showToast('eBay Assistant', 'Checking Manufacturer Part Numbers...');
      mpnResult = await updateEbayMpn(mpnConfig, mpnRows);
    }

    // Step 3: Multi-row Structured Reporting Toast
    function truncate(str, max = 34) {
      if (!str) return '';
      return str.length > max ? str.slice(0, max - 1) + '…' : str;
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function renderRow(icon, label, statusText, statusColor, extraText) {
      const extraHtml = extraText
        ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px;word-break:break-word;">${extraText}</div>`
        : '';
      return `
        <div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
          <span style="font-size:14px;line-height:1.2;flex-shrink:0;">${icon}</span>
          <div style="flex:1;min-width:0;line-height:1.35;">
            <span style="font-weight:600;color:#f9fafb;">${label}:</span>
            <span style="color:${statusColor};margin-left:4px;font-weight:500;">${statusText}</span>
            ${extraHtml}
          </div>
        </div>
      `;
    }

    const rowsHtml = [];
    let hasChanges = false;
    let hasRealError = false;
    let allUpToDate = true;

    if (titleResult) {
      if (titleResult.success) {
        if (titleResult.alreadyUpToDate) {
          rowsHtml.push(renderRow('⚡', 'Title', 'Already up to date', '#38bdf8', `"${escapeHtml(truncate(titleVal, 38))}"`));
        } else {
          rowsHtml.push(renderRow('✅', 'Title', 'Updated', '#22c55e', `"${escapeHtml(truncate(titleVal, 38))}"`));
          hasChanges = true;
          allUpToDate = false;
        }
      } else {
        rowsHtml.push(renderRow('❌', 'Title', 'Failed', '#ef4444', escapeHtml(titleResult.reason || 'Field not found')));
        hasRealError = true;
        allUpToDate = false;
      }
    }

    if (mpnResult) {
      if (mpnResult.success) {
        const mpnPreview = mpnRows.slice(0, 3).join(', ') + (mpnRows.length > 3 ? ' (+ ' + (mpnRows.length - 3) + ' more)' : '');
        if (mpnResult.alreadyUpToDate) {
          const count = mpnResult.duplicatesSkipped || mpnRows.length;
          rowsHtml.push(renderRow('⚡', 'MPN', 'All part numbers already present', '#38bdf8', `${count} verified on listing: [${escapeHtml(mpnPreview)}]`));
        } else {
          const skipTxt = mpnResult.duplicatesSkipped > 0 ? ` (${mpnResult.duplicatesSkipped} duplicate(s) existed)` : '';
          const addedCount = mpnResult.added;
          rowsHtml.push(renderRow('✅', 'MPN', `Added ${addedCount} part number${addedCount > 1 ? 's' : ''}${skipTxt}`, '#22c55e', `Staged: [${escapeHtml(mpnPreview)}]`));
          hasChanges = true;
          allUpToDate = false;
        }
      } else {
        rowsHtml.push(renderRow('❌', 'MPN', 'Failed', '#ef4444', escapeHtml(mpnResult.reason || 'Field not found')));
        hasRealError = true;
        allUpToDate = false;
      }
    }

    const summaryContent = `
      <div style="display:flex;flex-direction:column;gap:2px;margin-top:4px;">${rowsHtml.join('')}</div>
      <div style="display:flex;justify-content:flex-end;margin-top:8px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.08);">
        <button data-action="dismiss" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#d1d5db;font-size:11px;padding:3px 10px;border-radius:4px;cursor:pointer;font-weight:500;">Dismiss</button>
      </div>`;

    if (hasRealError && hasChanges) {
      showToast('Partial Success', summaryContent, 'warn', 30000);
    } else if (hasRealError && !hasChanges) {
      showToast('Update Failed', summaryContent, 'error', 30000);
    } else if (allUpToDate) {
      showToast('Listing Up to Date', summaryContent, 'info', 25000);
    } else {
      showToast('Update Complete', summaryContent, 'success', 30000);
    }
  }


  run().catch(err => {
    showToast('Error', (err && err.message) ? err.message : String(err), 'error', 25000);
  });
})();
