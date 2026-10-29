function syncModifiedGroup() {
  const master = document.getElementById("section-two");
  const spaces = document.getElementById("section-two-spaces");
  const dashes = document.getElementById("section-two-dashes");
  const dots = document.getElementById("section-two-dots");

  if (!master) return;

  const disabled = !master.checked;

  if (spaces) spaces.disabled = disabled;
  if (dashes) dashes.disabled = disabled;
  if (dots) dots.disabled = disabled;
}

function getCollapseButtons(selector) {
  return Array.from(document.querySelectorAll(`.btn-toggle[data-target="${selector}"]`));
}

function syncCollapseButtonState(selector) {
  const targets = Array.from(document.querySelectorAll(selector));
  const isOpen = targets.length > 0 && targets.every((target) => target.classList.contains("show"));

  getCollapseButtons(selector).forEach((button) => {
    button.setAttribute("aria-expanded", isOpen ? "true" : "false");
    button.setAttribute("aria-label", isOpen ? "Collapse section" : "Expand section");
    button.title = isOpen ? "Collapse section" : "Expand section";

    const svg = button.querySelector("svg");
    if (svg) {
      svg.style.transformOrigin = "50% 50%";
      svg.style.transform = isOpen ? "rotate(180deg)" : "rotate(0deg)";
    }
  });
}

function syncAllCollapseButtonStates() {
  const seen = new Set();

  document.querySelectorAll(".btn-toggle[data-target]").forEach((button) => {
    const selector = button.getAttribute("data-target");
    if (seen.has(selector)) return;
    seen.add(selector);
    syncCollapseButtonState(selector);
  });

  updateGlobalButtons();
}

function updateGlobalButtons() {
  const collapses = Array.from(document.querySelectorAll(".collapse"));
  const allExpanded = collapses.length > 0 && collapses.every(el => el.classList.contains("show"));
  const allCollapsed = collapses.length > 0 && collapses.every(el => !el.classList.contains("show"));

  document.getElementById("expand-all-modules").disabled = allExpanded;
  document.getElementById("collapse-all-modules").disabled = allCollapsed;
}

function markDuplicateOption(value) {
  const map = {
    " ": "section-two-spaces",
    "-": "section-two-dashes",
    ".": "section-two-dots"
  };

  let id = null;

  if (value.includes(" ")) id = map[" "];
  else if (value.includes("-")) id = map["-"];
  else if (value.includes(".")) id = map["."];

  if (!id) return;

  const label = document.querySelector(`label[for="${id}"]`);
  if (!label) return;

  label.classList.add("duplicate-warning");
}

function normalizePart(str) {
  return str.replace(/[\s.-]+/g, "").toUpperCase();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function syncMpnRowButtons() {
  const mpnInputList = document.getElementById("mpn-input-list");
  if (!mpnInputList) return;
  const rows = mpnInputList.querySelectorAll(".mpn-row");
  rows.forEach(row => {
    let delBtn = row.querySelector(".btn-row-delete");
    if (rows.length <= 1) {
      if (delBtn) delBtn.remove();
    } else {
      if (!delBtn) {
        delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "btn-row-action btn-row-delete";
        delBtn.title = "Delete row";
        delBtn.setAttribute("aria-label", "Delete row");
        delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
        row.appendChild(delBtn);
      }
    }
  });
}

function createMpnRow(initialValue = "") {
  const row = document.createElement("div");
  row.className = "mpn-row";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "mpn-input";
  input.placeholder = "ZSB 5GM.819.203B";
  input.value = initialValue;

  const btnDelete = document.createElement("button");
  btnDelete.type = "button";
  btnDelete.className = "btn-row-action btn-row-delete";
  btnDelete.title = "Delete row";
  btnDelete.setAttribute("aria-label", "Delete row");
  btnDelete.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';

  row.appendChild(input);
  row.appendChild(btnDelete);

  return row;
}

function formatSinglePart(inputStr, sep, options) {
  const outputOriginal = inputStr.replace(/\s+/g, " ");
  const tokens = inputStr.split(/[\s.-]+/).filter(Boolean);

  const outputSpacesOnly = tokens.join(" ");
  const outputDashes = tokens.join("-");
  const outputDots = tokens.join(".");
  const outputNoSpaces = tokens.join("");

  const rawItems = [
    ...(options.original ? [outputOriginal] : []),
    ...(options.modified && options.spaces ? [outputSpacesOnly] : []),
    ...(options.modified && options.dashes ? [outputDashes] : []),
    ...(options.modified && options.dots ? [outputDots] : []),
    ...(options.noSpaces ? [outputNoSpaces] : [])
  ];

  const seen = new Set();
  const finalItems = [];

  rawItems.forEach(item => {
    if (!seen.has(item)) {
      seen.add(item);
      finalItems.push(item);
    }
  });

  return {
    formatted: finalItems.join(sep),
    items: [outputOriginal, outputSpacesOnly, outputDashes, outputDots, outputNoSpaces]
  };
}

function updateOutput01(event) {
  if (event) {
    document.getElementById("reset01").disabled = false;
    document.getElementById("save01").disabled = false;
  }

  syncMpnRowButtons();

  syncModifiedGroup();

  document.querySelectorAll(".duplicate-warning").forEach(el => {
    el.classList.remove("duplicate-warning");
  });

  const sepRadio = document.querySelector('#inputform01 input[name="selector"]:checked');
  const sepVal = sepRadio ? sepRadio.value : "/";
  const sep = " " + sepVal + " ";

  const modifiedEnabled = document.getElementById("section-two")
    ? document.getElementById("section-two").checked
    : true;

  const options = {
    original: document.getElementById("section-one") ? document.getElementById("section-one").checked : true,
    modified: modifiedEnabled,
    spaces: document.getElementById("section-two-spaces") ? document.getElementById("section-two-spaces").checked : true,
    dashes: document.getElementById("section-two-dashes") ? document.getElementById("section-two-dashes").checked : true,
    dots: document.getElementById("section-two-dots") ? document.getElementById("section-two-dots").checked : true,
    noSpaces: document.getElementById("section-three") ? document.getElementById("section-three").checked : true
  };

  const rows = Array.from(document.querySelectorAll("#mpn-input-list .mpn-row"));
  const inputEntries = rows.map((row, index) => {
    const input = row.querySelector(".mpn-input");
    return {
      rowElement: row,
      rowNumber: index + 1,
      value: input ? input.value.trim() : ""
    };
  });

  const hasAnyInput = inputEntries.some(e => e.value.length > 0);
  if (hasAnyInput || rows.length > 1) {
    document.getElementById("reset01").disabled = false;
  }

  const finishedRows = inputEntries
    .filter(e => e.value.length > 0)
    .map(e => {
      const res = formatSinglePart(e.value, sep, options);
      return {
        rowNumber: e.rowNumber,
        formatted: res.formatted,
        items: res.items
      };
    });

  const seenCheck = new Set();
  finishedRows.forEach(row => {
    seenCheck.clear();
    row.items.forEach(item => {
      if (seenCheck.has(item)) {
        markDuplicateOption(item);
      } else {
        seenCheck.add(item);
      }
    });
  });

  const outputContainer = document.getElementById("output01-container");
  const copyStatus = document.getElementById("copy-status01");
  if (!outputContainer) return;

  if (finishedRows.length === 0) {
    outputContainer.innerHTML = '<span class="textarea" id="output01" role="textbox" contenteditable="false" readonly="readonly"></span>';
    if (copyStatus) copyStatus.innerText = "Click Output to copy";
    updateMasterStagingUI();
    return;
  }

  if (finishedRows.length === 1) {
    outputContainer.innerHTML = `<span class="textarea mpn-output-item" id="output01" role="textbox" contenteditable="false" readonly="readonly" data-label="Row 1" title="Click Output to copy">${escapeHtml(finishedRows[0].formatted)}</span>`;
    if (copyStatus) copyStatus.innerText = "Click Output to copy";
    updateMasterStagingUI();
    return;
  }

  outputContainer.innerHTML = "";
  finishedRows.forEach((row, idx) => {
    const card = document.createElement("div");
    card.className = "mpn-output-card";

    const header = document.createElement("div");
    header.className = "mpn-output-header";

    const badge = document.createElement("span");
    badge.className = "mpn-output-badge";
    badge.innerText = `Row ${row.rowNumber}`;

    const hint = document.createElement("span");
    hint.className = "mpn-output-click-hint";
    hint.innerText = "Click to copy";

    header.appendChild(badge);
    header.appendChild(hint);

    const span = document.createElement("span");
    span.className = "textarea mpn-output-item";
    if (idx === 0) span.id = "output01";
    span.setAttribute("role", "textbox");
    span.setAttribute("contenteditable", "false");
    span.setAttribute("readonly", "readonly");
    span.setAttribute("title", `Click to copy Row ${row.rowNumber}`);
    span.setAttribute("data-label", `Row ${row.rowNumber}`);
    span.innerText = row.formatted;

    card.appendChild(header);
    card.appendChild(span);
    outputContainer.appendChild(card);
  });

  if (copyStatus) copyStatus.innerText = "Click any row to copy";
  updateMasterStagingUI();
}

function updateOutput02() {
  document.getElementById("reset02").disabled = false;

  var mainInput = document.getElementById("input02").value;
  var currentYear = new Date().getFullYear();
  var year01 = mainInput.split("-")[0];
  var year02 = mainInput.split("-")[1];
  var yearArray = [];

  if (+year01 >= 1900) {
    year01 = year01;
  } else if (+year01 < 100) {
    if (+year01 > +currentYear - 2000) {
      year01 = "19" + ("0" + year01).slice(-2);
    } else {
      year01 = "20" + ("0" + year01).slice(-2);
    }
  }

  if (+year02 >= 1900) {
    year02 = year02;
  } else if (+year02 < 100) {
    if (+year02 > +currentYear - 2000) {
      year02 = "19" + ("0" + year02).slice(-2);
    } else {
      year02 = "20" + ("0" + year02).slice(-2);
    }
  }

  for (let i = +year01; i <= +year02; i++) {
    var shortyear = ("0" + i).slice(-2);

    yearArray.push(i);
    yearArray.push(shortyear);
  }

  if (yearArray.length == 0 || document.getElementById("input02").value == 0) {
    document.getElementById(
      "SplitOutput"
    ).innerHTML = `<span class="textarea" id="output02" role="textbox" contenteditable="false" readonly="readonly"></span>`;
  } else {
    document.getElementById("SplitOutput").innerHTML = "";
    var text = yearArray.join(" ");
    for (var i = 0; i < text.length; i += 56) {
      const parent = document.getElementById("SplitOutput");
      const span = document.createElement("span");
      span.setAttribute("class", "textarea splitoutputspan");
      span.setAttribute("role", "textbox");
      span.setAttribute("contenteditable", "false");
      span.setAttribute("readonly", "readonly");
      span.innerText = text.slice(i, i + 56).trim();
      span.addEventListener("mousedown", function () {
        const textSplitOutput = this.innerText;
        try {
          navigator.clipboard.writeText(textSplitOutput);
          document.getElementById("copy-status02").innerText =
            "Success! Copied to clipboard";
          document.getElementById("copy-status02").classList.add("success");
          setTimeout(function () {
            document.getElementById("copy-status02").innerText =
              "Click Output to copy";
            document
              .getElementById("copy-status02")
              .classList.remove("success");
            document.getElementById("input02").select();
          }, 1200);
        } catch (err) {
          document.getElementById("copy-status02").innerText =
            "Failed to copy!";
          document.getElementById("copy-status02").classList.add("failed");
          setTimeout(function () {
            document.getElementById("copy-status02").innerText =
              "Click Output to copy";
            document
              .getElementById("copy-status02")
              .classList.remove("failed");
            document.getElementById("input02").select();
          }, 1200);
        }
      });
      parent.appendChild(span);
    }
  }
}

function updateOutput03() {
  document.getElementById("reset03").disabled = false;
  document.getElementById("save03").disabled = false;

  var mainInput = document.getElementById("input3.1").value;
  var secondInput = document.getElementById("input3.2").value;
  var tagInput = document.getElementById("input3.3").value;
  var sep =
    " " +
    document.querySelector('#inputform03 input[name="selector3"]:checked')
      .value +
    " ";
  var Output01 = mainInput.toUpperCase();
  var Output02 = secondInput.toUpperCase();
  var Output03 = tagInput.toUpperCase();

  if (document.getElementById("input3.1").value == 0) {
    document.getElementById("output03").innerText = "";
  } else {
    const items = [
      ...(document.getElementById("section-1").checked ? [Output01] : []),
      ...(document.getElementById("section-2").checked ? [Output02] : []),
      ...(document.getElementById("section-3").checked
        ? Output03.split(/,\s*/)
        : [])
    ];

    console.log(items);
    document.getElementById("output03").innerText = items.join(sep);
  }
}


function clickSelector() {
  document.getElementById("option-four").checked = true;
  document.getElementById("option-four").value = document.getElementById(
    "option-four-custom"
  ).value;
}

function clickSelector2() {
  document.getElementById("option-4").checked = true;
  document.getElementById("option-4").value = document.getElementById(
    "option-4-custom"
  ).value;
}

function copyMpnOutput(text, label) {
  const statusEl = document.getElementById("copy-status01");
  const count = document.querySelectorAll("#output01-container .mpn-output-item").length;
  const defaultText = count > 1 ? "Click any row to copy" : "Click Output to copy";

  const onSuccess = () => {
    if (!statusEl) return;
    statusEl.innerText = label ? `Success! Copied ${label} to clipboard` : "Success! Copied to clipboard";
    statusEl.classList.remove("failed");
    statusEl.classList.add("success");
    setTimeout(() => {
      statusEl.innerText = defaultText;
      statusEl.classList.remove("success");
      const firstInput = document.getElementById("input01") || document.querySelector(".mpn-input");
      if (firstInput) firstInput.select();
    }, 1200);
  };

  const onFailed = () => {
    if (!statusEl) return;
    statusEl.innerText = "Failed to copy!";
    statusEl.classList.remove("success");
    statusEl.classList.add("failed");
    setTimeout(() => {
      statusEl.innerText = defaultText;
      statusEl.classList.remove("failed");
      const firstInput = document.getElementById("input01") || document.querySelector(".mpn-input");
      if (firstInput) firstInput.select();
    }, 1200);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
      fallbackCopy(text, onSuccess, onFailed);
    });
  } else {
    fallbackCopy(text, onSuccess, onFailed);
  }
}

function fallbackCopy(text, onSuccess, onFailed) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(ta);
    if (successful) onSuccess();
    else onFailed();
  } catch (e) {
    onFailed();
  }
}

const output01Container = document.getElementById("output01-container");
if (output01Container) {
  output01Container.addEventListener("mousedown", function (e) {
    const target = e.target.closest(".textarea");
    if (!target) return;
    const text = target.innerText.trim();
    if (!text) return;
    const label = target.getAttribute("data-label") || "";
    copyMpnOutput(text, label);
  });
}

const addMpnBtn = document.getElementById("btn-add-mpn");
if (addMpnBtn) {
  addMpnBtn.addEventListener("click", function () {
    const mpnList = document.getElementById("mpn-input-list");
    if (!mpnList) return;
    const newRow = createMpnRow("");
    mpnList.appendChild(newRow);
    syncMpnRowButtons();
    const newInput = newRow.querySelector(".mpn-input");
    if (newInput) newInput.focus();
    updateOutput01(true);
  });
}

const mpnInputList = document.getElementById("mpn-input-list");
if (mpnInputList) {
  mpnInputList.addEventListener("click", function (e) {
    const deleteBtn = e.target.closest(".btn-row-delete");

    if (deleteBtn) {
      const currentRow = deleteBtn.closest(".mpn-row");
      const allRows = mpnInputList.querySelectorAll(".mpn-row");
      if (allRows.length > 1) {
        const prevRow = currentRow.previousElementSibling || currentRow.nextElementSibling;
        currentRow.remove();
        const remainingInputs = mpnInputList.querySelectorAll(".mpn-input");
        if (remainingInputs.length > 0 && !document.getElementById("input01")) {
          remainingInputs[0].id = "input01";
        }
        if (prevRow) {
          const prevInput = prevRow.querySelector(".mpn-input");
          if (prevInput) prevInput.focus();
        }
        syncMpnRowButtons();
      } else {
        const onlyInput = currentRow.querySelector(".mpn-input");
        if (onlyInput) {
          onlyInput.value = "";
          onlyInput.focus();
        }
      }
      updateOutput01(true);
      return;
    }
  });

  mpnInputList.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.classList.contains("mpn-input")) {
      e.preventDefault();
      const currentRow = e.target.closest(".mpn-row");
      const newRow = createMpnRow("");
      currentRow.after(newRow);
      syncMpnRowButtons();
      const newInput = newRow.querySelector(".mpn-input");
      if (newInput) newInput.focus();
      updateOutput01(true);
    }
  });

  mpnInputList.addEventListener("paste", function (e) {
    if (!e.target.classList.contains("mpn-input")) return;
    const pasteData = (e.clipboardData || window.clipboardData)?.getData("text");
    if (!pasteData) return;
    const lines = pasteData.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (lines.length > 1) {
      e.preventDefault();
      e.target.value = lines[0];
      let currentRow = e.target.closest(".mpn-row");
      for (let i = 1; i < lines.length; i++) {
        const newRow = createMpnRow(lines[i]);
        currentRow.after(newRow);
        currentRow = newRow;
      }
      syncMpnRowButtons();
      updateOutput01(true);
    }
  });
}

document.getElementById("output03").addEventListener(
  "mousedown",
  function () {
    const text = document.getElementById("output03").innerText;
    try {
      navigator.clipboard.writeText(text);
      document.getElementById("copy-status03").innerText =
        "Success! Copied to clipboard";
      document.getElementById("copy-status03").classList.add("success");
      setTimeout(function () {
        document.getElementById("copy-status03").innerText =
          "Click Output to copy";
        document.getElementById("copy-status03").classList.remove("success");
        document.getElementById("input3.1").select();
      }, 1200);
    } catch (err) {
      document.getElementById("copy-status03").innerText =
        "Failed to copy!";
      document.getElementById("copy-status03").classList.add("failed");
      setTimeout(function () {
        document.getElementById("copy-status03").innerText =
          "Click Output to copy";
        document.getElementById("copy-status03").classList.remove("failed");
        document.getElementById("input3.1").select();
      }, 1200);
    }
  },
  false
);


document
  .getElementById("inputform01")
  .addEventListener("change", updateOutput01);
document
  .getElementById("inputform01")
  .addEventListener("input", updateOutput01);
document
  .getElementById("inputform02")
  .addEventListener("change", updateOutput02);
document
  .getElementById("inputform02")
  .addEventListener("input", updateOutput02);
document
  .getElementById("inputform03")
  .addEventListener("change", updateOutput03);
document.getElementById("inputform03").addEventListener("input", updateOutput03);

const form04 = document.getElementById("inputform04");
if (form04) {
  form04.addEventListener("change", updateOutput04);
  form04.addEventListener("input", updateOutput04);
}

const output04El = document.getElementById("output04");
if (output04El) {
  output04El.addEventListener("mousedown", function () {
    const text = (output04El.innerText || "").trim();
    if (!text) return;
    const statusEl = document.getElementById("copy-status04");
    const onDone = function () {
      if (statusEl) {
        statusEl.innerText = "Success! Copied to clipboard";
        statusEl.classList.remove("failed");
        statusEl.classList.add("success");
        setTimeout(function () {
          statusEl.innerText = "Click Output to copy";
          statusEl.classList.remove("success");
        }, 1200);
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onDone).catch(function () {
        fallbackCopy(text, onDone, function () {
          if (statusEl) {
            statusEl.innerText = "Failed to copy!";
            statusEl.classList.add("failed");
          }
        });
      });
    } else {
      fallbackCopy(text, onDone, function () {
        if (statusEl) {
          statusEl.innerText = "Failed to copy!";
          statusEl.classList.add("failed");
        }
      });
    }
  });
}



document.getElementById("option-four-custom").addEventListener("change", () => {
  clickSelector();
  updateOutput01(true);
});
document.getElementById("option-four-custom").addEventListener("input", () => {
  clickSelector();
  updateOutput01(true);
});
document.getElementById("option-four-custom").addEventListener("focus", () => {
  clickSelector();
  updateOutput01(true);
});
document.getElementById("option-4-custom").addEventListener("change", () => {
  clickSelector2();
  updateOutput03();
});
document.getElementById("option-4-custom").addEventListener("input", () => {
  clickSelector2();
  updateOutput03();
});
document.getElementById("option-4-custom").addEventListener("focus", () => {
  clickSelector2();
  updateOutput03();
});

const modifiedMasterToggle = document.getElementById("section-two");
if (modifiedMasterToggle) {
  modifiedMasterToggle.addEventListener("change", function () {
    syncModifiedGroup();
    updateOutput01(true);
  });
}

["section-one", "section-two-spaces", "section-two-dashes", "section-two-dots", "section-three"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("change", updateOutput01);
  }
});

document.querySelectorAll(".header").forEach((header) => {
  header.addEventListener("click", (ev) => {
    if (ev.target.closest("button")) return;
    const toggle = header.querySelector('.btn-toggle[data-toggle="collapse"]');
    if (!toggle) return;
    collapse(toggle.getAttribute("data-target"), "toggle");
  });
});

window.addEventListener(
  "click",
  (ev) => {
    const trigger = ev.target.closest('.btn-toggle[data-toggle="collapse"]');
    if (!trigger) return;
    ev.preventDefault();
    const selector = trigger.getAttribute("data-target");
    collapse(selector, "toggle");
  },
  false
);

const fnmap = {
  toggle: "toggle",
  show: "add",
  hide: "remove"
};

const collapse = (selector, cmd) => {
  const targets = Array.from(document.querySelectorAll(selector));
  targets.forEach((target) => {
    target.classList[fnmap[cmd]]("show");
  });
  syncCollapseButtonState(selector);
  updateGlobalButtons();
};

const desktopMediaQuery = window.matchMedia("(min-width: 795px)");

function handleBreakpointChange(e) {
  const isDesktop = e.matches;
  const boxes = document.querySelectorAll(".collapse");
  if (isDesktop) {
    boxes.forEach((box) => {
      box.classList.add("show");
    });
  } else {
    boxes.forEach((box) => {
      if (document.activeElement && box.contains(document.activeElement)) {
        return;
      }
      box.classList.remove("show");
    });
  }
  syncAllCollapseButtonStates();
}

const initialBoxes = document.querySelectorAll(".collapse");
if (desktopMediaQuery.matches) {
  initialBoxes.forEach((box) => {
    box.classList.add("show");
  });
} else {
  initialBoxes.forEach((box) => {
    box.classList.remove("show");
  });
}
syncAllCollapseButtonStates();

if (desktopMediaQuery.addEventListener) {
  desktopMediaQuery.addEventListener("change", handleBreakpointChange);
} else if (desktopMediaQuery.addListener) {
  desktopMediaQuery.addListener(handleBreakpointChange);
}

document.getElementById("expand-all-modules").addEventListener("click", () => {
  document.querySelectorAll(".collapse").forEach(box => box.classList.add("show"));
  syncAllCollapseButtonStates();
});

document.getElementById("collapse-all-modules").addEventListener("click", () => {
  document.querySelectorAll(".collapse").forEach(box => box.classList.remove("show"));
  syncAllCollapseButtonStates();
});

function resetForm1() {
  setTimeout(updateMasterStagingUI, 50);
  const mpnInputList = document.getElementById("mpn-input-list");
  if (mpnInputList) {
    const rows = mpnInputList.querySelectorAll(".mpn-row");
    rows.forEach((row, idx) => {
      if (idx === 0) {
        const input = row.querySelector(".mpn-input");
        if (input) {
          input.id = "input01";
          input.value = "";
        }
      } else {
        row.remove();
      }
    });
  } else {
    const input = document.getElementById("input01");
    if (input) input.value = "";
  }

  document.getElementById("option-one").checked = true;
  document.getElementById("section-one").checked = true;
  document.getElementById("section-two").checked = true;
  document.getElementById("section-two-spaces").checked = true;
  document.getElementById("section-two-dashes").checked = true;
  document.getElementById("section-two-dots").checked = true;
  document.getElementById("section-three").checked = true;
  document.getElementById("option-four-custom").value = "";

  var arr = [];
  for (var i = 0; i < localStorage.length; i++) {
    if (localStorage.key(i).substring(0, 3) == "PNM") {
      arr.push(localStorage.key(i));
    }
  }

  for (var i = 0; i < arr.length; i++) {
    localStorage.removeItem(arr[i]);
  }

  syncMpnRowButtons();
  syncModifiedGroup();
  updateOutput01();

  document.getElementById("reset01").disabled = true;
  document.getElementById("save01").disabled = true;
}
function resetForm2() {
  document.getElementById("input02").value = "";
  updateOutput02();

  document.getElementById("reset02").disabled = true;
}
function resetForm3() {
  document.getElementById("input3.1").value = "";
  document.getElementById("input3.2").value = "DENSO";
  document.getElementById("input3.3").value = "Oem, Factory, Genuine";
  document.getElementById("option-1").checked = true;
  document.getElementById("section-1").checked = true;
  document.getElementById("section-2").checked = false;
  document.getElementById("section-3").checked = true;
  document.getElementById("option-4-custom").value = "";

  var arr = [];
  for (var i = 0; i < localStorage.length; i++) {
    if (localStorage.key(i).substring(0, 2) == "TG") {
      arr.push(localStorage.key(i));
    }
  }

  for (var i = 0; i < arr.length; i++) {
    localStorage.removeItem(arr[i]);
  }

  updateOutput03();

  document.getElementById("reset03").disabled = true;
  document.getElementById("save03").disabled = true;
}


// ==========================================
// Card 4: Listing Title Creator Functions
// ==========================================

function updateOutput04() {
  const years = (document.getElementById("title-years")?.value || "").trim();
  const make = (document.getElementById("title-make")?.value || "").trim();
  const model = (document.getElementById("title-model")?.value || "").trim();
  const includeOem = document.getElementById("title-include-oem")?.checked;
  const includeGenuine = document.getElementById("title-include-genuine")?.checked;
  const partName = (document.getElementById("title-part-name")?.value || "").trim();
  const partNumber = (document.getElementById("title-part-number")?.value || "").trim();

  const hasContent = Boolean(years || make || model || includeOem || includeGenuine || partName || partNumber);
  const saveBtn = document.getElementById("save04");
  const resetBtn = document.getElementById("reset04");
  if (saveBtn) saveBtn.disabled = !hasContent;
  if (resetBtn) resetBtn.disabled = !hasContent && (localStorage.getItem("LTC.years") === null);

  const oemParts = [];
  if (includeOem) oemParts.push("OEM");
  if (includeGenuine) oemParts.push("Genuine");
  const oemStr = oemParts.join(" ");

  const baseParts = [years, make, model, oemStr, partName].filter(Boolean);
  const baseTitle = baseParts.join(" ");

  let finalTitle = baseTitle;
  let pnOmitted = false;

  if (partNumber) {
    const candidate = baseTitle ? (baseTitle + " " + partNumber) : partNumber;
    if (candidate.length <= 80) {
      finalTitle = candidate;
    } else {
      pnOmitted = true;
      finalTitle = baseTitle;
    }
  }

  if (finalTitle.length > 80) {
    finalTitle = finalTitle.slice(0, 80).trim();
  }

  const outputEl = document.getElementById("output04");
  const countEl = document.getElementById("title-char-count");
  const statusEl = document.getElementById("copy-status04");

  if (outputEl) {
    outputEl.innerText = finalTitle;
  }

  if (countEl) {
    countEl.innerText = finalTitle.length;
    if (finalTitle.length === 80) {
      countEl.style.color = "#d97706";
    } else if (finalTitle.length > 80) {
      countEl.style.color = "#dc2626";
    } else {
      countEl.style.color = "";
    }
  }

  if (statusEl && !statusEl.classList.contains("success") && !statusEl.classList.contains("failed")) {
    if (pnOmitted) {
      statusEl.innerText = "Click Output to copy (Part # omitted: exceeds 80 chars)";
    } else {
      statusEl.innerText = "Click Output to copy";
    }
  }

  updateMasterStagingUI();
  return finalTitle;
}

function resetForm4() {
  setTimeout(updateMasterStagingUI, 50);
  const yearsEl = document.getElementById("title-years");
  const makeEl = document.getElementById("title-make");
  const modelEl = document.getElementById("title-model");
  const oemEl = document.getElementById("title-include-oem");
  const genuineEl = document.getElementById("title-include-genuine");
  const partNameEl = document.getElementById("title-part-name");
  const partNumberEl = document.getElementById("title-part-number");

  if (yearsEl) yearsEl.value = "";
  if (makeEl) makeEl.value = "";
  if (modelEl) modelEl.value = "";
  if (oemEl) oemEl.checked = false;
  if (genuineEl) genuineEl.checked = false;
  if (partNameEl) partNameEl.value = "";
  if (partNumberEl) partNumberEl.value = "";

  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("LTC.")) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));

  updateOutput04();

  const resetBtn = document.getElementById("reset04");
  const saveBtn = document.getElementById("save04");
  if (resetBtn) resetBtn.disabled = true;
  if (saveBtn) saveBtn.disabled = true;
}

function saveDefault04() {
  const Default = {
    years: document.getElementById("title-years")?.value || "",
    make: document.getElementById("title-make")?.value || "",
    model: document.getElementById("title-model")?.value || "",
    oem: document.getElementById("title-include-oem")?.checked,
    genuine: document.getElementById("title-include-genuine")?.checked,
    partName: document.getElementById("title-part-name")?.value || "",
    partNumber: document.getElementById("title-part-number")?.value || ""
  };

  for (const [key, value] of Object.entries(Default)) {
    localStorage.setItem("LTC." + key, value);
  }

  const saveBtn = document.getElementById("save04");
  const resetBtn = document.getElementById("reset04");
  if (saveBtn) saveBtn.disabled = true;
  if (resetBtn) resetBtn.disabled = false;
}

function copyEbayTitlePayload() {
  const statusEl = document.getElementById("copy-status04");
  const titleText = (document.getElementById("output04")?.innerText || "").trim();

  if (!titleText) {
    if (statusEl) {
      statusEl.innerText = "⚠️ Fill in title fields first!";
      statusEl.classList.remove("success");
      statusEl.classList.add("failed");
      setTimeout(function () {
        statusEl.innerText = "Click Output to copy";
        statusEl.classList.remove("failed");
      }, 1500);
    }
    return;
  }

  const payload = {
    __protocol: "EBAY_TOOL_PAYLOAD",
    version: "1.2",
    action: "UPDATE_TITLE",
    generatedAt: new Date().toISOString(),
    pageMatch: ["ebay.com/lstng", "ebay.com/sl/", "ebay.com/itm/"],
    target: DEFAULT_PAYLOAD_CONFIG.title,
    value: titleText
  };

  const jsonStr = JSON.stringify(payload, null, 2);

  const onCopied = function () {
    if (statusEl) {
      statusEl.innerText = "Success! Copied Title for eBay";
      statusEl.classList.remove("failed");
      statusEl.classList.add("success");
      setTimeout(function () {
        statusEl.innerText = "Click Output to copy";
        statusEl.classList.remove("success");
      }, 4500);
    }
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(jsonStr).then(onCopied).catch(function () {
      fallbackCopy(jsonStr, onCopied, function () {
        if (statusEl) statusEl.innerText = "Failed to copy payload!";
      });
    });
  } else {
    fallbackCopy(jsonStr, onCopied, function () {
      if (statusEl) statusEl.innerText = "Failed to copy payload!";
    });
  }
}

function updateMasterStagingUI() {
  const titleText = (document.getElementById("output04")?.innerText || "").trim();
  const mpnRows = Array.from(document.querySelectorAll("#output01-container .mpn-output-item"))
    .map(function (el) { return el.innerText.trim(); })
    .filter(Boolean);

  // Update Top Bar Master Copy Button label
  const masterBtn = document.getElementById("btn-master-copy-ebay");
  if (masterBtn && !masterBtn.classList.contains("btn-copied")) {
    const labelSpan = masterBtn.querySelector("span");
    if (labelSpan) {
      if (titleText && mpnRows.length > 0) {
        labelSpan.textContent = "Master Copy (" + mpnRows.length + " MPN" + (mpnRows.length > 1 ? "s" : "") + " + Title)";
      } else if (titleText) {
        labelSpan.textContent = "Master Copy (Title)";
      } else if (mpnRows.length > 0) {
        labelSpan.textContent = "Master Copy (" + mpnRows.length + " MPN" + (mpnRows.length > 1 ? "s" : "") + ")";
      } else {
        labelSpan.textContent = "Master Copy for eBay";
      }
    }
  }
}

function copyMasterEbayPayload() {
  const mpnRows = Array.from(document.querySelectorAll("#output01-container .mpn-output-item"))
    .map(function (el) { return el.innerText.trim(); })
    .filter(Boolean);

  const titleText = (document.getElementById("output04")?.innerText || "").trim();

  if (!titleText && mpnRows.length === 0) {
    alert("Please enter a Listing Title or Part Numbers first!");
    return;
  }

  const payload = {
    __protocol: "EBAY_TOOL_PAYLOAD",
    version: "1.2",
    action: "MASTER_UPDATE",
    generatedAt: new Date().toISOString(),
    pageMatch: ["ebay.com/lstng", "ebay.com/sl/", "ebay.com/itm/"],
    title: titleText ? {
      value: titleText,
      target: DEFAULT_PAYLOAD_CONFIG.title
    } : null,
    mpn: mpnRows.length > 0 ? {
      rows: mpnRows,
      target: DEFAULT_PAYLOAD_CONFIG.mpn
    } : null
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const masterBtn = document.getElementById("btn-master-copy-ebay");
  const origHtml = masterBtn ? masterBtn.innerHTML : "";

  const onCopied = function () {
    if (masterBtn) {
      masterBtn.classList.add("btn-copied");
      const parts = [];
      if (titleText) parts.push("Title");
      if (mpnRows.length > 0) parts.push(mpnRows.length + " MPN" + (mpnRows.length > 1 ? "s" : ""));
      const label = masterBtn.querySelector("span");
      if (label) label.textContent = "✓ Copied (" + parts.join(" + ") + ")";
      setTimeout(function () {
        masterBtn.classList.remove("btn-copied");
        if (origHtml) masterBtn.innerHTML = origHtml;
      }, 4500);
    }
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(jsonStr).then(onCopied).catch(function () {
      fallbackCopy(jsonStr, onCopied, function () {
        alert("Failed to copy Master payload to clipboard.");
      });
    });
  } else {
    fallbackCopy(jsonStr, onCopied, function () {
      alert("Failed to copy Master payload to clipboard.");
    });
  }
}

function saveDefault01() {
  var Default = {};
  Default.v1 = document.querySelector('#inputform01 input[name="selector"]:checked').id;
  Default.v2 = document.querySelector('#inputform01 input[name="selector"]:checked').value;
  Default.v3 = document.getElementById("section-one").checked;
  Default.v4 = document.getElementById("section-two").checked;
  Default.v5 = document.getElementById("section-two-spaces").checked;
  Default.v6 = document.getElementById("section-two-dashes").checked;
  Default.v7 = document.getElementById("section-two-dots").checked;
  Default.v8 = document.getElementById("section-three").checked;

  for (const [key, value] of Object.entries(Default)) {
    localStorage.setItem("PNM." + key, value);
  }

  document.getElementById("save01").disabled = true;
  document.getElementById("reset01").disabled = false;
}
function saveDefault03() {
  var Default = {};
  Default.v1 = document.getElementById("input3.2").value;
  Default.v2 = document.getElementById("input3.3").value;
  Default.v3 = document.querySelector('#inputform03 input[name="selector3"]:checked').id;
  Default.v4 = document.querySelector('#inputform03 input[name="selector3"]:checked').value;
  Default.v5 = document.getElementById("section-1").checked;
  Default.v6 = document.getElementById("section-2").checked;
  Default.v7 = document.getElementById("section-3").checked;

  for (const [key, value] of Object.entries(Default)) {
    localStorage.setItem("TG." + key, value);
  }

  document.getElementById("save03").disabled = true;
}


function syncEnvironmentTag() {
  const versionLink = document.getElementById("version-link");
  const envBadge = document.getElementById("env-badge");
  const revText = document.getElementById("rev-text");

  if (revText && revText.textContent.includes("__BUILD_REV__")) {
    revText.textContent = "Rev Local";
  }

  if (versionLink) {
    const isDev = /\/dev(\/|$)/i.test(window.location.pathname) ||
                  window.location.hostname === "localhost" ||
                  window.location.hostname === "127.0.0.1" ||
                  window.location.protocol === "file:";

    if (envBadge && (envBadge.textContent === "__ENV_BADGE__" || isDev)) {
      envBadge.textContent = isDev ? "DEV" : "PROD";
      envBadge.className = `env-badge ${isDev ? "env-dev" : "env-prod"}`;
    }

    const currentHref = versionLink.getAttribute("href") || "";
    if (currentHref.includes("__BRANCH__") || isDev) {
      const targetUrl = isDev
        ? "https://github.com/ISSac25E/EbayTool/commits/development"
        : "https://github.com/ISSac25E/EbayTool/commits/main";
      const targetLabel = isDev
        ? "View development commits on GitHub"
        : "View production commits on GitHub";

      versionLink.href = targetUrl;
      versionLink.title = targetLabel;
      versionLink.setAttribute("aria-label", targetLabel);
    }
  }
}
syncEnvironmentTag();

window.onload = function(event) {
  syncEnvironmentTag();

  if (localStorage.getItem("PNM.v1") !== null) {
    document.getElementById("reset01").disabled = false;
    document.getElementById(localStorage.getItem("PNM.v1")).checked = true;

    if (localStorage.getItem("PNM.v1") == "option-four"){
      document.getElementById("option-four-custom").value = localStorage.getItem("PNM.v2");
      document.getElementById(localStorage.getItem("PNM.v1")).value = localStorage.getItem("PNM.v2");
    }

    const hasNewPNM =
      localStorage.getItem("PNM.v6") !== null ||
      localStorage.getItem("PNM.v7") !== null ||
      localStorage.getItem("PNM.v8") !== null;

    document.getElementById("section-one").checked = JSON.parse(localStorage.getItem("PNM.v3"));
    document.getElementById("section-two").checked = JSON.parse(localStorage.getItem("PNM.v4"));

    if (hasNewPNM) {
      document.getElementById("section-two-spaces").checked = JSON.parse(localStorage.getItem("PNM.v5"));
      document.getElementById("section-two-dashes").checked = JSON.parse(localStorage.getItem("PNM.v6"));
      document.getElementById("section-two-dots").checked = JSON.parse(localStorage.getItem("PNM.v7"));
      document.getElementById("section-three").checked = JSON.parse(localStorage.getItem("PNM.v8"));
    } else {
      document.getElementById("section-two-spaces").checked = true;
      document.getElementById("section-two-dashes").checked = true;
      document.getElementById("section-two-dots").checked = true;
      document.getElementById("section-three").checked = JSON.parse(localStorage.getItem("PNM.v5"));
    }

    syncModifiedGroup();
  } else {
    syncModifiedGroup();
  }

  if (localStorage.getItem("TG.v1") !== null) {
    document.getElementById("reset03").disabled = false;
    document.getElementById("input3.2").value = localStorage.getItem("TG.v1");
    document.getElementById("input3.3").value = localStorage.getItem("TG.v2");
    document.getElementById(localStorage.getItem("TG.v3")).checked = true;
    if (localStorage.getItem("TG.v3") == "option-4") {
      document.getElementById("option-4-custom").value = localStorage.getItem("TG.v4");
      document.getElementById(localStorage.getItem("TG.v3")).value = localStorage.getItem("TG.v4");
    }
    document.getElementById("section-1").checked = JSON.parse(localStorage.getItem("TG.v5"));
    document.getElementById("section-2").checked = JSON.parse(localStorage.getItem("TG.v6"));
    document.getElementById("section-3").checked = JSON.parse(localStorage.getItem("TG.v7"));
  }

    let hasLtcSaved = false;
  if (localStorage.getItem("LTC.years") !== null) {
    document.getElementById("title-years").value = localStorage.getItem("LTC.years");
    hasLtcSaved = true;
  }
  if (localStorage.getItem("LTC.make") !== null) {
    document.getElementById("title-make").value = localStorage.getItem("LTC.make");
    hasLtcSaved = true;
  }
  if (localStorage.getItem("LTC.model") !== null) {
    document.getElementById("title-model").value = localStorage.getItem("LTC.model");
    hasLtcSaved = true;
  }
  if (localStorage.getItem("LTC.oem") !== null) {
    document.getElementById("title-include-oem").checked = JSON.parse(localStorage.getItem("LTC.oem"));
    hasLtcSaved = true;
  }
  if (localStorage.getItem("LTC.genuine") !== null) {
    document.getElementById("title-include-genuine").checked = JSON.parse(localStorage.getItem("LTC.genuine"));
    hasLtcSaved = true;
  }
  if (localStorage.getItem("LTC.partName") !== null) {
    document.getElementById("title-part-name").value = localStorage.getItem("LTC.partName");
    hasLtcSaved = true;
  }
  if (localStorage.getItem("LTC.partNumber") !== null) {
    document.getElementById("title-part-number").value = localStorage.getItem("LTC.partNumber");
    hasLtcSaved = true;
  }

  if (hasLtcSaved) {
    const reset04 = document.getElementById("reset04");
    if (reset04) reset04.disabled = false;
  }

  updateOutput04();



  syncMpnRowButtons();
  updateOutput01();
  initBookmarkletLink();
  syncAllCollapseButtonStates();
};

// ==========================================
// eBay Bookmarklet Assistant & Payload Export
// ==========================================

const EBAY_BOOKMARKLET_CODE = "javascript:(function%20()%20%7B%20'use%20strict';%20const%20ENGINE_VERSION%20=%20'1.2.0';%20const%20REQUIRED_PROTOCOL%20=%20'EBAY_TOOL_PAYLOAD';%20const%20REQUIRED_VERSION%20=%20'1.2';%20const%20SUPPORTED_VERSIONS%20=%20%5B'1.0',%20'1.1',%20'1.2'%5D;%20const%20TOAST_ID%20=%20'__ebay_assistant_toast__';%20let%20toastTimer%20=%20null;%20function%20showToast(title,%20message,%20type%20=%20'info',%20autoCloseMs%20=%200)%20%7B%20if%20(toastTimer)%20%7B%20clearTimeout(toastTimer);%20toastTimer%20=%20null;%20%7D%20let%20toast%20=%20document.getElementById(TOAST_ID);%20if%20(!toast)%20%7B%20toast%20=%20document.createElement('div');%20toast.id%20=%20TOAST_ID;%20toast.style.cssText%20=%20%5B%20'position:%20fixed',%20'top:%2016px',%20'right:%2016px',%20'width:%20360px',%20'max-width:%20calc(100vw%20-%2032px)',%20'background:%20#111827',%20'color:%20#ffffff',%20'border-radius:%208px',%20'border:%201px%20solid%20rgba(255,%20255,%20255,%200.14)',%20'box-shadow:%200%2012px%2030px%20rgba(0,0,0,0.45)',%20'z-index:%202147483647',%20'font-family:%20-apple-system,%20BlinkMacSystemFont,%20%22Segoe%20UI%22,%20Roboto,%20sans-serif',%20'font-size:%2013px',%20'line-height:%201.4',%20'padding:%2012px%2014px',%20'box-sizing:%20border-box',%20'display:%20flex',%20'flex-direction:%20column',%20'gap:%206px',%20'transition:%20opacity%200.25s%20ease,%20transform%200.25s%20ease'%20%5D.join(';');%20const%20topRow%20=%20document.createElement('div');%20topRow.style.cssText%20=%20'display:%20flex;%20justify-content:%20space-between;%20align-items:%20center;%20font-weight:%20700;%20font-size:%2013px;';%20const%20titleSpan%20=%20document.createElement('span');%20titleSpan.id%20=%20TOAST_ID%20+%20'_title';%20const%20closeBtn%20=%20document.createElement('button');%20closeBtn.innerText%20=%20'%E2%9C%95';%20closeBtn.setAttribute('title',%20'Dismiss%20notification');%20closeBtn.style.cssText%20=%20'background:%20none;%20border:%20none;%20color:%20#9ca3af;%20cursor:%20pointer;%20padding:%200%204px;%20font-size:%2015px;%20line-height:%201;%20border-radius:%204px;%20transition:%20color%200.15s;';%20closeBtn.onmouseenter%20=%20()%20=%3E%20closeBtn.style.color%20=%20'#ffffff';%20closeBtn.onmouseleave%20=%20()%20=%3E%20closeBtn.style.color%20=%20'#9ca3af';%20closeBtn.onclick%20=%20()%20=%3E%20removeToast();%20topRow.appendChild(titleSpan);%20topRow.appendChild(closeBtn);%20const%20msgDiv%20=%20document.createElement('div');%20msgDiv.id%20=%20TOAST_ID%20+%20'_msg';%20msgDiv.style.cssText%20=%20'color:%20#d1d5db;%20font-size:%2012px;%20white-space:%20normal;%20line-height:%201.4;';%20toast.appendChild(topRow);%20toast.appendChild(msgDiv);%20document.body.appendChild(toast);%20toast.addEventListener('mouseenter',%20()%20=%3E%20%7B%20if%20(toastTimer)%20%7B%20clearTimeout(toastTimer);%20toastTimer%20=%20null;%20%7D%20%7D);%20toast.addEventListener('mouseleave',%20()%20=%3E%20%7B%20if%20(toast._autoCloseMs%20%3E%200)%20%7B%20toastTimer%20=%20setTimeout(removeToast,%20Math.max(toast._autoCloseMs,%2010000));%20%7D%20%7D);%20%7D%20toast.style.opacity%20=%20'1';%20toast.style.transform%20=%20'translateY(0)';%20const%20titleEl%20=%20document.getElementById(TOAST_ID%20+%20'_title');%20const%20msgEl%20=%20document.getElementById(TOAST_ID%20+%20'_msg');%20const%20icon%20=%20type%20===%20'success'%20?%20'%E2%9C%85'%20:%20type%20===%20'error'%20?%20'%E2%9D%8C'%20:%20type%20===%20'warn'%20?%20'%E2%9A%A0%EF%B8%8F'%20:%20'%E2%9A%A1';%20const%20accent%20=%20type%20===%20'success'%20?%20'#22c55e'%20:%20type%20===%20'error'%20?%20'#ef4444'%20:%20type%20===%20'warn'%20?%20'#f59e0b'%20:%20'#38bdf8';%20if%20(titleEl)%20%7B%20titleEl.style.color%20=%20accent;%20titleEl.innerHTML%20=%20icon%20+%20'%20'%20+%20title;%20%7D%20if%20(msgEl)%20%7B%20msgEl.innerHTML%20=%20message;%20%7D%20const%20dismissBtn%20=%20toast.querySelector('%5Bdata-action=%22dismiss%22%5D');%20if%20(dismissBtn)%20%7B%20dismissBtn.onclick%20=%20()%20=%3E%20removeToast();%20%7D%20toast._autoCloseMs%20=%20autoCloseMs;%20if%20(autoCloseMs%20%3E%200)%20%7B%20toastTimer%20=%20setTimeout(removeToast,%20autoCloseMs);%20%7D%20%7D%20function%20removeToast()%20%7B%20if%20(toastTimer)%20%7B%20clearTimeout(toastTimer);%20toastTimer%20=%20null;%20%7D%20const%20toast%20=%20document.getElementById(TOAST_ID);%20if%20(toast%20&&%20toast.isConnected)%20%7B%20toast.style.opacity%20=%20'0';%20toast.style.transform%20=%20'translateY(-8px)';%20setTimeout(()%20=%3E%20toast.remove(),%20250);%20%7D%20%7D%20const%20sleep%20=%20(ms)%20=%3E%20new%20Promise(r%20=%3E%20setTimeout(r,%20ms));%20function%20normalize(str)%20%7B%20return%20(str%20%7C%7C%20'')%20.replace(/%5B%5Cu00A0%5Cu1680%5Cu2000-%5Cu200B%5Cu2028%5Cu2029%5Cu202F%5Cu205F%5Cu3000%5CuFEFF%5D/g,%20'%20')%20.replace(/%5Cs+/g,%20'%20')%20.trim()%20.toUpperCase();%20%7D%20function%20normalizeClean(str)%20%7B%20return%20normalize(str).replace(/%5B%5EA-Z0-9%5D/g,%20'');%20%7D%20function%20cleanEbayItemText(el)%20%7B%20if%20(!el)%20return%20'';%20try%20%7B%20const%20clone%20=%20el.cloneNode(true);%20clone.querySelectorAll('.clipped,%20svg,%20button').forEach(x%20=%3E%20x.remove());%20return%20(clone.textContent%20%7C%7C%20'').trim();%20%7D%20catch%20(e)%20%7B%20return%20(el.textContent%20%7C%7C%20'').trim();%20%7D%20%7D%20function%20createValueTracker()%20%7B%20const%20exactSet%20=%20new%20Set();%20const%20cleanSet%20=%20new%20Set();%20let%20containerCleanText%20=%20'';%20function%20add(str)%20%7B%20if%20(!str)%20return;%20const%20stripped%20=%20String(str).replace(/%5Cs*%5C(%5C+%5Cd+%5C)%5Cs*$/g,%20'').trim();%20const%20norm%20=%20normalize(stripped);%20if%20(!norm)%20return;%20exactSet.add(norm);%20const%20cl%20=%20normalizeClean(norm);%20if%20(cl)%20cleanSet.add(cl);%20if%20(/%5B%5C/;%7C%5D/.test(norm))%20%7B%20norm.split(/%5B%5C/;%7C%5D/).map(s%20=%3E%20s.trim()).filter(Boolean).forEach(part%20=%3E%20%7B%20exactSet.add(part);%20const%20cp%20=%20normalizeClean(part);%20if%20(cp)%20cleanSet.add(cp);%20%7D);%20%7D%20%7D%20function%20setContainerRawText(txt)%20%7B%20if%20(txt)%20%7B%20containerCleanText%20=%20normalizeClean(txt);%20%7D%20%7D%20function%20has(val)%20%7B%20if%20(!val)%20return%20false;%20const%20norm%20=%20normalize(val);%20if%20(!norm)%20return%20false;%20if%20(exactSet.has(norm))%20return%20true;%20const%20cl%20=%20normalizeClean(norm);%20if%20(cl%20&&%20cleanSet.has(cl))%20return%20true;%20if%20(/%5B%5C/;%7C%5D/.test(norm))%20%7B%20const%20parts%20=%20norm.split(/%5B%5C/;%7C%5D/).map(s%20=%3E%20s.trim()).filter(Boolean);%20for%20(const%20p%20of%20parts)%20%7B%20if%20(exactSet.has(p))%20return%20true;%20const%20cp%20=%20normalizeClean(p);%20if%20(cp%20&&%20cleanSet.has(cp))%20return%20true;%20if%20(cp%20&&%20cp.length%20%3E=%204%20&&%20containerCleanText.includes(cp))%20return%20true;%20%7D%20%7D%20if%20(cl%20&&%20cl.length%20%3E=%204%20&&%20containerCleanText.includes(cl))%20%7B%20return%20true;%20%7D%20for%20(const%20item%20of%20exactSet)%20%7B%20if%20(item.endsWith('...')%20&&%20norm.startsWith(item.slice(0,%20-3)))%20return%20true;%20if%20(norm.endsWith('...')%20&&%20item.startsWith(norm.slice(0,%20-3)))%20return%20true;%20%7D%20return%20false;%20%7D%20return%20%7B%20add,%20has,%20setContainerRawText,%20size:%20()%20=%3E%20exactSet.size,%20getAll:%20()%20=%3E%20Array.from(exactSet)%20%7D;%20%7D%20function%20checkEbayPage(payload)%20%7B%20const%20host%20=%20window.location.hostname.toLowerCase();%20const%20url%20=%20window.location.href.toLowerCase();%20if%20(!host.includes('ebay.'))%20%7B%20showToast('Wrong%20Website',%20'Please%20open%20your%20eBay%20listing%20page%20to%20run%20this%20tool.',%20'error',%205000);%20return%20false;%20%7D%20const%20matches%20=%20(payload%20&&%20Array.isArray(payload.pageMatch)%20&&%20payload.pageMatch.length%20%3E%200)%20?%20payload.pageMatch%20:%20%5B'lstng',%20'sl/',%20'itm',%20'draft',%20'sell'%5D;%20const%20isListing%20=%20matches.some(m%20=%3E%20url.includes(m.toLowerCase()));%20if%20(!isListing)%20%7B%20showToast('Not%20a%20Listing%20Page',%20'Please%20navigate%20to%20an%20active%20eBay%20listing%20draft/edit%20page.',%20'warn',%205000);%20return%20false;%20%7D%20return%20true;%20%7D%20function%20setNativeValue(el,%20value)%20%7B%20const%20lastValue%20=%20el.value;%20const%20proto%20=%20el.tagName%20===%20'TEXTAREA'%20?%20window.HTMLTextAreaElement.prototype%20:%20window.HTMLInputElement.prototype;%20const%20setter%20=%20Object.getOwnPropertyDescriptor(proto,%20'value')?.set;%20if%20(setter)%20%7B%20setter.call(el,%20value);%20%7D%20else%20%7B%20el.value%20=%20value;%20%7D%20if%20(el._valueTracker)%20%7B%20try%20%7B%20el._valueTracker.setValue(lastValue);%20%7D%20catch%20(e)%20%7B%7D%20%7D%20%7D%20function%20locateTitleField(titleConfig)%20%7B%20const%20customSelectors%20=%20(titleConfig%20&&%20titleConfig.selectors)%20%7C%7C%20%5B%20'input%5Bname=%22title%22%5D',%20'textarea%5Bname=%22title%22%5D',%20'input%5Bdata-testid=%22title%22%5D',%20'textarea%5Bdata-testid=%22title%22%5D',%20'input%5Baria-label*=%22Title%22%20i%5D',%20'textarea%5Baria-label*=%22Title%22%20i%5D',%20'input%5Bplaceholder*=%22Title%22%20i%5D',%20'textarea%5Bplaceholder*=%22Title%22%20i%5D',%20'div%5Bclass*=%22title%22%20i%5D%20input',%20'div%5Bclass*=%22title%22%20i%5D%20textarea'%20%5D;%20for%20(const%20sel%20of%20customSelectors)%20%7B%20try%20%7B%20const%20el%20=%20document.querySelector(sel);%20if%20(el%20&&%20el.isConnected)%20%7B%20return%20el;%20%7D%20%7D%20catch%20(e)%20%7B%7D%20%7D%20const%20labels%20=%20Array.from(document.querySelectorAll('label,%20%5Bclass*=%22label%22%5D,%20span,%20h3,%20h4'));%20for%20(const%20lbl%20of%20labels)%20%7B%20const%20txt%20=%20(lbl.innerText%20%7C%7C%20lbl.textContent%20%7C%7C%20'').trim().toLowerCase();%20if%20(txt%20===%20'title'%20%7C%7C%20txt%20===%20'listing%20title'%20%7C%7C%20(txt.includes('title')%20&&%20txt.length%20%3C%2018))%20%7B%20const%20container%20=%20lbl.closest('%5Bclass*=%22field%22%5D,%20%5Bclass*=%22row%22%5D,%20%5Bclass*=%22title%22%5D,%20div')%20%7C%7C%20lbl.parentElement;%20if%20(container)%20%7B%20const%20inp%20=%20container.querySelector('input%5Btype=%22text%22%5D,%20input:not(%5Btype%5D),%20textarea');%20if%20(inp%20&&%20inp.isConnected)%20return%20inp;%20%7D%20const%20forAttr%20=%20lbl.getAttribute('for');%20if%20(forAttr)%20%7B%20const%20el%20=%20document.getElementById(forAttr);%20if%20(el%20&&%20el.isConnected)%20return%20el;%20%7D%20%7D%20%7D%20return%20null;%20%7D%20async%20function%20updateEbayTitle(titleConfig,%20newTitle)%20%7B%20if%20(!newTitle%20%7C%7C%20!String(newTitle).trim())%20%7B%20return%20%7B%20success:%20true,%20skipped:%20true,%20reason:%20'Empty%20title'%20%7D;%20%7D%20const%20cleanTitle%20=%20String(newTitle).trim().slice(0,%2080);%20const%20titleEl%20=%20locateTitleField(titleConfig);%20if%20(!titleEl)%20%7B%20return%20%7B%20success:%20false,%20reason:%20'Title%20field%20not%20found'%20%7D;%20%7D%20const%20currentVal%20=%20(titleEl.value%20%7C%7C%20'').trim();%20if%20(currentVal%20===%20cleanTitle)%20%7B%20return%20%7B%20success:%20true,%20updated:%20false,%20alreadyUpToDate:%20true,%20value:%20cleanTitle%20%7D;%20%7D%20titleEl.focus();%20await%20sleep(60);%20setNativeValue(titleEl,%20cleanTitle);%20titleEl.dispatchEvent(new%20Event('input',%20%7B%20bubbles:%20true,%20cancelable:%20true%20%7D));%20titleEl.dispatchEvent(new%20Event('change',%20%7B%20bubbles:%20true,%20cancelable:%20true%20%7D));%20await%20sleep(150);%20if%20(typeof%20titleEl.blur%20===%20'function')%20%7B%20titleEl.blur();%20%7D%20await%20sleep(150);%20const%20verified%20=%20(titleEl.value%20%7C%7C%20'').trim();%20const%20success%20=%20verified%20===%20cleanTitle;%20return%20%7B%20success:%20success,%20updated:%20success,%20value:%20verified,%20reason:%20success%20?%20null%20:%20%60Value%20mismatch%20(got%20%22$%7Bverified.slice(0,%2020)%7D...%22)%60%20%7D;%20%7D%20function%20locateTargetField(targetConfig)%20%7B%20const%20aliases%20=%20(targetConfig%20&&%20targetConfig.aliases)%20%7C%7C%20%5B'Manufacturer%20Part%20Number',%20'MPN',%20'Part%20Number'%5D;%20const%20customSelectors%20=%20(targetConfig%20&&%20targetConfig.selectors)%20%7C%7C%20%5B%5D;%20function%20isMenuButton(btn)%20%7B%20if%20(!btn)%20return%20false;%20const%20controls%20=%20btn.getAttribute('aria-controls');%20const%20cls%20=%20btn.className%20%7C%7C%20'';%20return%20!!(controls%20%7C%7C%20cls.includes('fake-menu-button')%20%7C%7C%20cls.includes('se-expand-button'));%20%7D%20function%20resolveMenu(btn)%20%7B%20const%20controlsId%20=%20btn.getAttribute('aria-controls');%20if%20(controlsId)%20%7B%20const%20m%20=%20document.getElementById(controlsId);%20if%20(m)%20return%20m;%20%7D%20return%20btn.parentElement?.querySelector('.fake-menu-button__menu')%20%7C%7C%20btn.closest('.fake-menu-button')?.querySelector('.fake-menu-button__menu')%20%7C%7C%20btn.parentElement?.parentElement?.querySelector('.fake-menu-button__menu');%20%7D%20for%20(const%20a%20of%20aliases)%20%7B%20const%20btnByName%20=%20document.querySelector(%60button%5Bname=%22attributes.$%7Ba%7D%22%20i%5D%60)%20%7C%7C%20document.querySelector(%60button%5Bname*=%22$%7Ba%7D%22%20i%5D%60);%20if%20(btnByName%20&&%20btnByName.isConnected)%20%7B%20const%20row%20=%20btnByName.closest('%5Bdata-testid=%22attribute%22%5D,%20.summary__attributes--fields,%20.summary__attributes--field,%20tr,%20fieldset')%20%7C%7C%20btnByName.parentElement;%20return%20%7B%20type:%20'menu',%20button:%20btnByName,%20menu:%20resolveMenu(btnByName),%20container:%20row,%20label:%20a%20%7D;%20%7D%20%7D%20const%20labelCandidates%20=%20Array.from(document.querySelectorAll('label,%20button.fake-link,%20%5Bdata-aspect-name%5D,%20%5Bdata-name%5D,%20span.field__label,%20.summary__attributes--label'));%20for%20(const%20node%20of%20labelCandidates)%20%7B%20const%20text%20=%20(node.innerText%20%7C%7C%20node.textContent%20%7C%7C%20'').trim();%20const%20aspectAttr%20=%20(node.getAttribute('data-aspect-name')%20%7C%7C%20node.getAttribute('data-name')%20%7C%7C%20'').trim();%20for%20(const%20a%20of%20aliases)%20%7B%20const%20al%20=%20a.toLowerCase();%20const%20matchesAspect%20=%20aspectAttr.toLowerCase()%20===%20al%20%7C%7C%20aspectAttr.toLowerCase().includes(al);%20const%20matchesText%20=%20text.toLowerCase()%20===%20al%20%7C%7C%20(text.toLowerCase().includes(al)%20&&%20text.length%20%3C%20al.length%20+%2018);%20if%20(matchesAspect%20%7C%7C%20matchesText)%20%7B%20const%20row%20=%20node.closest('%5Bdata-testid=%22attribute%22%5D,%20.summary__attributes--fields,%20.summary__attributes--field,%20%5Bclass*=%22aspect%22%5D,%20%5Bclass*=%22specific%22%5D,%20tr,%20fieldset')%20%7C%7C%20node.parentElement?.parentElement;%20if%20(row)%20%7B%20const%20btn%20=%20row.querySelector('button.fake-menu-button__button,%20button.se-expand-button__button,%20button%5Baria-controls%5D,%20button%5Bname%5E=%22attributes.%22%5D');%20if%20(btn%20&&%20isMenuButton(btn))%20%7B%20return%20%7B%20type:%20'menu',%20button:%20btn,%20menu:%20resolveMenu(btn),%20container:%20row,%20label:%20a%20%7D;%20%7D%20const%20inp%20=%20row.querySelector('input%5Btype=%22text%22%5D,%20input:not(%5Btype%5D),%20%5Brole=%22combobox%22%5D');%20if%20(inp%20&&%20inp.isConnected)%20%7B%20return%20%7B%20type:%20'input',%20input:%20inp,%20container:%20row,%20label:%20a%20%7D;%20%7D%20%7D%20%7D%20%7D%20%7D%20for%20(const%20sel%20of%20customSelectors)%20%7B%20try%20%7B%20const%20el%20=%20document.querySelector(sel);%20if%20(el%20&&%20el.isConnected)%20%7B%20if%20(el.tagName%20===%20'BUTTON'%20&&%20isMenuButton(el))%20%7B%20const%20row%20=%20el.closest('%5Bdata-testid=%22attribute%22%5D,%20.summary__attributes--fields')%20%7C%7C%20el.parentElement;%20return%20%7B%20type:%20'menu',%20button:%20el,%20menu:%20resolveMenu(el),%20container:%20row,%20label:%20'Custom%20Selector'%20%7D;%20%7D%20const%20inp%20=%20el.tagName%20===%20'INPUT'%20?%20el%20:%20el.querySelector('input');%20if%20(inp%20&&%20inp.isConnected)%20%7B%20const%20row%20=%20inp.closest('%5Bdata-testid=%22attribute%22%5D,%20.summary__attributes--fields')%20%7C%7C%20inp.parentElement;%20return%20%7B%20type:%20'input',%20input:%20inp,%20container:%20row,%20label:%20'Custom%20Selector'%20%7D;%20%7D%20%7D%20%7D%20catch%20(e)%20%7B%7D%20%7D%20const%20allInputs%20=%20Array.from(document.querySelectorAll('input%5Btype=%22text%22%5D,%20input:not(%5Btype%5D),%20%5Brole=%22combobox%22%5D'));%20for%20(const%20inp%20of%20allInputs)%20%7B%20const%20aria%20=%20(inp.getAttribute('aria-label')%20%7C%7C%20'').toLowerCase();%20const%20ph%20=%20(inp.placeholder%20%7C%7C%20'').toLowerCase();%20const%20name%20=%20(inp.name%20%7C%7C%20'').toLowerCase();%20for%20(const%20a%20of%20aliases)%20%7B%20const%20al%20=%20a.toLowerCase();%20if%20(aria.includes(al)%20%7C%7C%20ph.includes(al)%20%7C%7C%20name.includes(al))%20%7B%20const%20row%20=%20inp.closest('%5Bdata-testid=%22attribute%22%5D,%20.summary__attributes--fields')%20%7C%7C%20inp.parentElement;%20return%20%7B%20type:%20'input',%20input:%20inp,%20container:%20row,%20label:%20a%20%7D;%20%7D%20%7D%20%7D%20return%20null;%20%7D%20function%20extractExistingValues(target)%20%7B%20const%20tracker%20=%20createValueTracker();%20if%20(target.container)%20%7B%20tracker.setContainerRawText(target.container.innerText%20%7C%7C%20target.container.textContent%20%7C%7C%20'');%20%7D%20if%20(target.type%20===%20'menu'%20&&%20target.button)%20%7B%20const%20btnText%20=%20target.button.innerText%20%7C%7C%20target.button.textContent%20%7C%7C%20'';%20const%20cleanBtnText%20=%20btnText.replace(/%5Cs*%5C(%5C+%5Cd+%5C)%5Cs*$/g,%20'').trim();%20if%20(cleanBtnText%20&&%20!/%5E(select%7Center%20your%20own%7C-%20select%20-)$/i.test(cleanBtnText))%20%7B%20tracker.add(cleanBtnText);%20%7D%20const%20menu%20=%20target.menu%20%7C%7C%20(target.button.getAttribute('aria-controls')%20?%20document.getElementById(target.button.getAttribute('aria-controls'))%20:%20null);%20if%20(menu)%20%7B%20const%20selectedItems%20=%20Array.from(menu.querySelectorAll(%20'%5Bname%5E=%22selectedOptions-%22%5D%20%5Brole=%22menuitemcheckbox%22%5D%5Baria-checked=%22true%22%5D,%20.selectedOptions%20%5Brole=%22menuitemcheckbox%22%5D%5Baria-checked=%22true%22%5D,%20%5Brole=%22menuitemcheckbox%22%5D%5Baria-checked=%22true%22%5D'%20));%20selectedItems.forEach(item%20=%3E%20%7B%20const%20textEl%20=%20item.querySelector('.filter-menu__text')%20%7C%7C%20item;%20const%20txt%20=%20cleanEbayItemText(textEl);%20if%20(txt)%20tracker.add(txt);%20%7D);%20%7D%20%7D%20else%20if%20(target.type%20===%20'input'%20&&%20target.container)%20%7B%20const%20chipElements%20=%20Array.from(target.container.querySelectorAll(%20'.chip,%20%5Bclass*=%22chip%22%5D,%20.pill,%20%5Bclass*=%22pill%22%5D,%20.token,%20%5Bclass*=%22token%22%5D,%20.tag,%20%5Bclass*=%22tag%22%5D,%20%5Bclass*=%22chips-combobox__item%22%5D,%20li%5Brole=%22listitem%22%5D'%20));%20chipElements.forEach(el%20=%3E%20%7B%20if%20(el%20===%20target.input%20%7C%7C%20(el.contains%20&&%20el.contains(target.input)))%20return;%20const%20txt%20=%20cleanEbayItemText(el);%20if%20(txt)%20tracker.add(txt);%20%7D);%20const%20removeButtons%20=%20Array.from(target.container.querySelectorAll(%20'button%5Baria-label*=%22remove%22%20i%5D,%20button%5Baria-label*=%22delete%22%20i%5D,%20%5Baria-label*=%22remove%22%20i%5D'%20));%20removeButtons.forEach(btn%20=%3E%20%7B%20const%20aria%20=%20btn.getAttribute('aria-label')%20%7C%7C%20'';%20const%20m%20=%20aria.match(/(?:remove%7Cdelete%7Cclose%7Cclear)%5Cs+(.+)/i);%20if%20(m%20&&%20m%5B1%5D)%20tracker.add(m%5B1%5D);%20%7D);%20if%20(target.input%20&&%20target.input.value)%20%7B%20tracker.add(target.input.value);%20%7D%20%7D%20return%20tracker;%20%7D%20async%20function%20addViaEbayMenu(target,%20toAdd)%20%7B%20const%20btn%20=%20target.button;%20let%20menu%20=%20target.menu%20%7C%7C%20(btn.getAttribute('aria-controls')%20?%20document.getElementById(btn.getAttribute('aria-controls'))%20:%20null);%20if%20(btn.getAttribute('aria-expanded')%20!==%20'true')%20%7B%20btn.click();%20await%20sleep(350);%20menu%20=%20menu%20%7C%7C%20(btn.getAttribute('aria-controls')%20?%20document.getElementById(btn.getAttribute('aria-controls'))%20:%20null);%20%7D%20if%20(!menu)%20%7B%20throw%20new%20Error('eBay%20menu%20container%20could%20not%20be%20opened.');%20%7D%20const%20searchInput%20=%20menu.querySelector(%20'input%5Bname*=%22search-box-%22%5D,%20input%5Bplaceholder*=%22Enter%20your%20own%22%20i%5D,%20input%5Baria-label*=%22Enter%20your%20own%22%20i%5D,%20.se-search-box%20input,%20input%5Btype=%22text%22%5D'%20);%20if%20(!searchInput)%20%7B%20throw%20new%20Error('Could%20not%20find%20search%20input%20inside%20eBay%20dropdown.');%20%7D%20let%20addedCount%20=%200;%20for%20(let%20i%20=%200;%20i%20%3C%20toAdd.length;%20i++)%20%7B%20const%20val%20=%20toAdd%5Bi%5D;%20showToast('Adding%20Part%20Numbers',%20%60%5B$%7Bi%20+%201%7D/$%7BtoAdd.length%7D%5D%20Typing:%20%22$%7Bval.slice(0,%2022)%7D$%7Bval.length%20%3E%2022%20?%20'...'%20:%20''%7D%22%60);%20searchInput.focus();%20setNativeValue(searchInput,%20'');%20searchInput.dispatchEvent(new%20Event('input',%20%7B%20bubbles:%20true%20%7D));%20await%20sleep(100);%20setNativeValue(searchInput,%20val);%20searchInput.dispatchEvent(new%20Event('input',%20%7B%20bubbles:%20true%20%7D));%20await%20sleep(400);%20let%20customOption%20=%20menu.querySelector(%20'%5Bname%5E=%22customOptions-%22%5D%20%5Brole=%22menuitemcheckbox%22%5D,%20.customOptions%20%5Brole=%22menuitemcheckbox%22%5D'%20);%20if%20(!customOption)%20%7B%20const%20allItems%20=%20Array.from(menu.querySelectorAll('%5Brole=%22menuitemcheckbox%22%5D'));%20customOption%20=%20allItems.find(it%20=%3E%20%7B%20const%20txt%20=%20cleanEbayItemText(it);%20return%20normalizeClean(txt)%20===%20normalizeClean(val);%20%7D);%20%7D%20if%20(customOption)%20%7B%20customOption.click();%20addedCount++;%20await%20sleep(350);%20%7D%20else%20%7B%20const%20ev%20=%20new%20KeyboardEvent('keydown',%20%7B%20key:%20'Enter',%20code:%20'Enter',%20keyCode:%2013,%20which:%2013,%20bubbles:%20true%20%7D);%20searchInput.dispatchEvent(ev);%20await%20sleep(300);%20%7D%20setNativeValue(searchInput,%20'');%20searchInput.dispatchEvent(new%20Event('input',%20%7B%20bubbles:%20true%20%7D));%20await%20sleep(150);%20%7D%20if%20(btn.getAttribute('aria-expanded')%20===%20'true')%20%7B%20btn.click();%20await%20sleep(250);%20%7D%20return%20addedCount;%20%7D%20async%20function%20addViaStandardInput(target,%20toAdd)%20%7B%20const%20input%20=%20target.input;%20let%20addedCount%20=%200;%20for%20(let%20i%20=%200;%20i%20%3C%20toAdd.length;%20i++)%20%7B%20const%20val%20=%20toAdd%5Bi%5D;%20showToast('Adding%20Part%20Numbers',%20%60%5B$%7Bi%20+%201%7D/$%7BtoAdd.length%7D%5D%20Entering:%20%22$%7Bval.slice(0,%2022)%7D...%22%60);%20input.focus();%20await%20sleep(60);%20setNativeValue(input,%20val);%20input.dispatchEvent(new%20Event('input',%20%7B%20bubbles:%20true,%20cancelable:%20true%20%7D));%20input.dispatchEvent(new%20Event('change',%20%7B%20bubbles:%20true,%20cancelable:%20true%20%7D));%20await%20sleep(120);%20const%20options%20=%20Array.from(document.querySelectorAll('%5Brole=%22option%22%5D,%20.combobox__option,%20li%5Brole=%22option%22%5D'));%20const%20matched%20=%20options.find(opt%20=%3E%20%7B%20const%20t%20=%20(opt.innerText%20%7C%7C%20opt.textContent%20%7C%7C%20'').trim().toLowerCase();%20return%20t%20===%20val.toLowerCase();%20%7D);%20if%20(matched%20&&%20typeof%20matched.click%20===%20'function')%20%7B%20matched.click();%20addedCount++;%20await%20sleep(150);%20%7D%20else%20%7B%20%5B'keydown',%20'keypress',%20'keyup'%5D.forEach(type%20=%3E%20%7B%20const%20ev%20=%20new%20KeyboardEvent(type,%20%7B%20key:%20'Enter',%20code:%20'Enter',%20keyCode:%2013,%20which:%2013,%20bubbles:%20true,%20cancelable:%20true%20%7D);%20input.dispatchEvent(ev);%20%7D);%20addedCount++;%20await%20sleep(150);%20%7D%20if%20(typeof%20input.blur%20===%20'function')%20input.blur();%20await%20sleep(120);%20%7D%20return%20addedCount;%20%7D%20async%20function%20updateEbayMpn(mpnConfig,%20rows)%20%7B%20const%20target%20=%20locateTargetField(mpnConfig);%20if%20(!target)%20%7B%20return%20%7B%20success:%20false,%20reason:%20'MPN%20field%20not%20found'%20%7D;%20%7D%20const%20existingBefore%20=%20extractExistingValues(target);%20const%20toAdd%20=%20%5B%5D;%20const%20alreadyPresent%20=%20%5B%5D;%20for%20(const%20val%20of%20rows)%20%7B%20if%20(existingBefore.has(val))%20%7B%20alreadyPresent.push(val);%20%7D%20else%20%7B%20toAdd.push(val);%20existingBefore.add(val);%20%7D%20%7D%20if%20(toAdd.length%20===%200)%20%7B%20return%20%7B%20success:%20true,%20alreadyUpToDate:%20true,%20added:%200,%20duplicatesSkipped:%20alreadyPresent.length%20%7D;%20%7D%20let%20committedCount%20=%200;%20try%20%7B%20if%20(target.type%20===%20'menu')%20%7B%20committedCount%20=%20await%20addViaEbayMenu(target,%20toAdd);%20%7D%20else%20%7B%20committedCount%20=%20await%20addViaStandardInput(target,%20toAdd);%20%7D%20%7D%20catch%20(err)%20%7B%20return%20%7B%20success:%20false,%20reason:%20err.message%20%7C%7C%20String(err)%20%7D;%20%7D%20await%20sleep(300);%20const%20existingAfter%20=%20extractExistingValues(target);%20let%20verifiedAdded%20=%200;%20let%20failedToCommit%20=%200;%20for%20(const%20val%20of%20toAdd)%20%7B%20if%20(existingAfter.has(val))%20%7B%20verifiedAdded++;%20%7D%20else%20%7B%20failedToCommit++;%20%7D%20%7D%20return%20%7B%20success:%20true,%20alreadyUpToDate:%20false,%20added:%20verifiedAdded,%20failed:%20failedToCommit,%20duplicatesSkipped:%20alreadyPresent.length%20%7D;%20%7D%20async%20function%20run()%20%7B%20showToast('eBay%20Assistant',%20'Reading%20clipboard%20content...');%20let%20text%20=%20'';%20try%20%7B%20text%20=%20await%20navigator.clipboard.readText();%20%7D%20catch%20(e)%20%7B%20showToast('Clipboard%20Access%20Denied',%20'Please%20click%20the%20bookmarklet%20again%20to%20allow%20clipboard%20access.',%20'error',%2012000);%20return;%20%7D%20if%20(!text%20%7C%7C%20!text.trim())%20%7B%20showToast('Clipboard%20Empty',%20'Click%20a%20%22Copy%20for%20eBay%22%20button%20in%20the%20tool%20first,%20then%20click%20this%20bookmark.',%20'warn',%2012000);%20return;%20%7D%20let%20payload;%20try%20%7B%20payload%20=%20JSON.parse(text);%20%7D%20catch%20(e)%20%7B%20payload%20=%20null;%20%7D%20if%20(!payload%20%7C%7C%20typeof%20payload%20!==%20'object'%20%7C%7C%20payload.__protocol%20!==%20REQUIRED_PROTOCOL)%20%7B%20showToast(%20'Invalid%20Data',%20'Clipboard%20does%20not%20contain%20valid%20eBay%20Assistant%20data.%20Click%20%3Cb%3ECopy%20for%20eBay%3C/b%3E%20or%20%3Cb%3EMaster%20Copy%3C/b%3E%20in%20the%20tool%20first.',%20'error',%2015000%20);%20return;%20%7D%20const%20payloadVersion%20=%20String(payload.version%20%7C%7C%20'unknown');%20if%20(!SUPPORTED_VERSIONS.includes(payloadVersion))%20%7B%20showToast(%20'Version%20Mismatch',%20%60Copied%20data%20is%20%3Cb%3Ev$%7BpayloadVersion%7D%3C/b%3E,%20but%20Bookmarklet%20supports%20%3Cb%3Ev1.0%20-%20v1.2%3C/b%3E.%3Cbr%3EPlease%20drag%20the%20new%20bookmarklet%20from%20the%20tool%20bar.%60,%20'error',%2018000%20);%20return;%20%7D%20if%20(!checkEbayPage(payload))%20return;%20const%20isMaster%20=%20payload.action%20===%20'MASTER_UPDATE';%20const%20isTitleOnly%20=%20payload.action%20===%20'UPDATE_TITLE';%20const%20isMpnOnly%20=%20payload.action%20===%20'UPDATE_MPN';%20const%20hasTitle%20=%20isTitleOnly%20?%20Boolean(payload.value)%20:%20(isMaster%20&&%20payload.title%20&&%20Boolean(payload.title.value%20%7C%7C%20(typeof%20payload.title%20===%20'string'%20&&%20payload.title)));%20const%20titleVal%20=%20isTitleOnly%20?%20(payload.value%20%7C%7C%20'')%20:%20(payload.title%20?%20(payload.title.value%20%7C%7C%20(typeof%20payload.title%20===%20'string'%20?%20payload.title%20:%20''))%20:%20'');%20const%20titleConfig%20=%20(payload.title%20&&%20payload.title.target)%20%7C%7C%20(isTitleOnly%20?%20payload.target%20:%20null)%20%7C%7C%20%7B%7D;%20const%20hasMpn%20=%20isMpnOnly%20?%20(Array.isArray(payload.rows)%20&&%20payload.rows.length%20%3E%200)%20:%20(isMaster%20&&%20payload.mpn%20&&%20Array.isArray(payload.mpn.rows)%20&&%20payload.mpn.rows.length%20%3E%200);%20const%20mpnRows%20=%20isMpnOnly%20?%20(payload.rows%20%7C%7C%20%5B%5D)%20:%20(payload.mpn%20&&%20Array.isArray(payload.mpn.rows)%20?%20payload.mpn.rows%20:%20%5B%5D);%20const%20mpnConfig%20=%20(payload.mpn%20&&%20payload.mpn.target)%20%7C%7C%20(isMpnOnly%20?%20payload.target%20:%20null)%20%7C%7C%20%7B%7D;%20if%20(!hasTitle%20&&%20!hasMpn)%20%7B%20showToast('No%20Data',%20'Copied%20content%20contains%20neither%20title%20nor%20part%20numbers%20to%20update.',%20'warn',%2012000);%20return;%20%7D%20let%20titleResult%20=%20null;%20let%20mpnResult%20=%20null;%20const%20stagedOverview%20=%20%5B%5D;%20if%20(hasTitle%20&&%20titleVal)%20stagedOverview.push(%60Title%20(%22$%7Btruncate(titleVal,%2024)%7D%22)%60);%20if%20(hasMpn%20&&%20mpnRows.length%20%3E%200)%20stagedOverview.push(%60$%7BmpnRows.length%7D%20MPN$%7BmpnRows.length%20%3E%201%20?%20's'%20:%20''%7D%60);%20showToast('eBay%20Assistant',%20%60Applying%20staged%20data:%20%3Cb%3E$%7BstagedOverview.join('%20+%20')%7D%3C/b%3E...%60);%20await%20sleep(250);%20if%20(hasTitle%20&&%20titleVal)%20%7B%20showToast('eBay%20Assistant',%20'Writing%20listing%20Title...');%20titleResult%20=%20await%20updateEbayTitle(titleConfig,%20titleVal);%20%7D%20if%20(hasMpn%20&&%20mpnRows.length%20%3E%200)%20%7B%20showToast('eBay%20Assistant',%20'Checking%20Manufacturer%20Part%20Numbers...');%20mpnResult%20=%20await%20updateEbayMpn(mpnConfig,%20mpnRows);%20%7D%20function%20truncate(str,%20max%20=%2034)%20%7B%20if%20(!str)%20return%20'';%20return%20str.length%20%3E%20max%20?%20str.slice(0,%20max%20-%201)%20+%20'%E2%80%A6'%20:%20str;%20%7D%20function%20escapeHtml(str)%20%7B%20if%20(!str)%20return%20'';%20return%20String(str)%20.replace(/&/g,%20'&amp;')%20.replace(/%3C/g,%20'&lt;')%20.replace(/%3E/g,%20'&gt;')%20.replace(/%22/g,%20'&quot;');%20%7D%20function%20renderRow(icon,%20label,%20statusText,%20statusColor,%20extraText)%20%7B%20const%20extraHtml%20=%20extraText%20?%20%60%3Cdiv%20style=%22font-size:11px;color:#9ca3af;margin-top:2px;word-break:break-word;%22%3E$%7BextraText%7D%3C/div%3E%60%20:%20'';%20return%20%60%20%3Cdiv%20style=%22display:flex;align-items:flex-start;gap:8px;padding:5px%200;border-bottom:1px%20solid%20rgba(255,255,255,0.08);%22%3E%20%3Cspan%20style=%22font-size:14px;line-height:1.2;flex-shrink:0;%22%3E$%7Bicon%7D%3C/span%3E%20%3Cdiv%20style=%22flex:1;min-width:0;line-height:1.35;%22%3E%20%3Cspan%20style=%22font-weight:600;color:#f9fafb;%22%3E$%7Blabel%7D:%3C/span%3E%20%3Cspan%20style=%22color:$%7BstatusColor%7D;margin-left:4px;font-weight:500;%22%3E$%7BstatusText%7D%3C/span%3E%20$%7BextraHtml%7D%20%3C/div%3E%20%3C/div%3E%20%60;%20%7D%20const%20rowsHtml%20=%20%5B%5D;%20let%20hasChanges%20=%20false;%20let%20hasRealError%20=%20false;%20let%20allUpToDate%20=%20true;%20if%20(titleResult)%20%7B%20if%20(titleResult.success)%20%7B%20if%20(titleResult.alreadyUpToDate)%20%7B%20rowsHtml.push(renderRow('%E2%9A%A1',%20'Title',%20'Already%20up%20to%20date',%20'#38bdf8',%20%60%22$%7BescapeHtml(truncate(titleVal,%2038))%7D%22%60));%20%7D%20else%20%7B%20rowsHtml.push(renderRow('%E2%9C%85',%20'Title',%20'Updated',%20'#22c55e',%20%60%22$%7BescapeHtml(truncate(titleVal,%2038))%7D%22%60));%20hasChanges%20=%20true;%20allUpToDate%20=%20false;%20%7D%20%7D%20else%20%7B%20rowsHtml.push(renderRow('%E2%9D%8C',%20'Title',%20'Failed',%20'#ef4444',%20escapeHtml(titleResult.reason%20%7C%7C%20'Field%20not%20found')));%20hasRealError%20=%20true;%20allUpToDate%20=%20false;%20%7D%20%7D%20if%20(mpnResult)%20%7B%20if%20(mpnResult.success)%20%7B%20const%20mpnPreview%20=%20mpnRows.slice(0,%203).join(',%20')%20+%20(mpnRows.length%20%3E%203%20?%20'%20(+%20'%20+%20(mpnRows.length%20-%203)%20+%20'%20more)'%20:%20'');%20if%20(mpnResult.alreadyUpToDate)%20%7B%20const%20count%20=%20mpnResult.duplicatesSkipped%20%7C%7C%20mpnRows.length;%20rowsHtml.push(renderRow('%E2%9A%A1',%20'MPN',%20'All%20part%20numbers%20already%20present',%20'#38bdf8',%20%60$%7Bcount%7D%20verified%20on%20listing:%20%5B$%7BescapeHtml(mpnPreview)%7D%5D%60));%20%7D%20else%20%7B%20const%20skipTxt%20=%20mpnResult.duplicatesSkipped%20%3E%200%20?%20%60%20($%7BmpnResult.duplicatesSkipped%7D%20duplicate(s)%20existed)%60%20:%20'';%20const%20addedCount%20=%20mpnResult.added;%20rowsHtml.push(renderRow('%E2%9C%85',%20'MPN',%20%60Added%20$%7BaddedCount%7D%20part%20number$%7BaddedCount%20%3E%201%20?%20's'%20:%20''%7D$%7BskipTxt%7D%60,%20'#22c55e',%20%60Staged:%20%5B$%7BescapeHtml(mpnPreview)%7D%5D%60));%20hasChanges%20=%20true;%20allUpToDate%20=%20false;%20%7D%20%7D%20else%20%7B%20rowsHtml.push(renderRow('%E2%9D%8C',%20'MPN',%20'Failed',%20'#ef4444',%20escapeHtml(mpnResult.reason%20%7C%7C%20'Field%20not%20found')));%20hasRealError%20=%20true;%20allUpToDate%20=%20false;%20%7D%20%7D%20const%20summaryContent%20=%20%60%20%3Cdiv%20style=%22display:flex;flex-direction:column;gap:2px;margin-top:4px;%22%3E$%7BrowsHtml.join('')%7D%3C/div%3E%20%3Cdiv%20style=%22display:flex;justify-content:flex-end;margin-top:8px;padding-top:6px;border-top:1px%20solid%20rgba(255,255,255,0.08);%22%3E%20%3Cbutton%20data-action=%22dismiss%22%20style=%22background:rgba(255,255,255,0.08);border:1px%20solid%20rgba(255,255,255,0.15);color:#d1d5db;font-size:11px;padding:3px%2010px;border-radius:4px;cursor:pointer;font-weight:500;%22%3EDismiss%3C/button%3E%20%3C/div%3E%60;%20if%20(hasRealError%20&&%20hasChanges)%20%7B%20showToast('Partial%20Success',%20summaryContent,%20'warn',%2030000);%20%7D%20else%20if%20(hasRealError%20&&%20!hasChanges)%20%7B%20showToast('Update%20Failed',%20summaryContent,%20'error',%2030000);%20%7D%20else%20if%20(allUpToDate)%20%7B%20showToast('Listing%20Up%20to%20Date',%20summaryContent,%20'info',%2025000);%20%7D%20else%20%7B%20showToast('Update%20Complete',%20summaryContent,%20'success',%2030000);%20%7D%20%7D%20run().catch(err%20=%3E%20%7B%20showToast('Error',%20(err%20&&%20err.message)%20?%20err.message%20:%20String(err),%20'error',%2025000);%20%7D);%20%7D)();";

// Developer-configured target settings (updated from backend/source, zero user configuration required)
const DEFAULT_PAYLOAD_CONFIG = {
  title: {
    fieldName: "Title",
    selectors: [
      'input[name="title"]',
      'textarea[name="title"]',
      'input[data-testid="title"]',
      'textarea[data-testid="title"]',
      'input[aria-label*="Title" i]',
      'textarea[aria-label*="Title" i]',
      'input[placeholder*="Title" i]',
      'textarea[placeholder*="Title" i]'
    ]
  },
  mpn: {
    fieldName: "Manufacturer Part Number",
    aliases: ["Manufacturer Part Number", "MPN", "Part Number"],
    selectors: [
      'button[name="attributes.Manufacturer Part Number"]',
      'button[name*="Manufacturer Part Number" i]',
      'button.fake-menu-button__button[aria-controls]',
      'button.se-expand-button__button[aria-controls]',
      'input[name*="search-box-attributesManufacturerPartNumber" i]',
      'input[aria-label*="Manufacturer Part Number" i]',
      'input[aria-label*="MPN" i]',
      'div[data-testid*="Manufacturer Part Number" i] input',
      'div[data-name*="Manufacturer Part Number" i] input',
      'input[placeholder*="Manufacturer Part Number" i]',
      'input[placeholder*="MPN" i]',
      '.chips-combobox input',
      '[class*="chips-combobox"] input'
    ],
    chipSelector: '.chip, [class*="chip"], .pill, [class*="pill"], .token, [class*="token"], .tag, [class*="tag"], [class*="chips-combobox__item"], li[role="listitem"]',
    inputSelector: 'input[type="text"], input:not([type]), [role="combobox"], [contenteditable="true"]',
    skipDuplicates: true
  }
};

function initBookmarkletLink() {
  const bmLink = document.getElementById("ebay-bookmarklet-link");
  if (bmLink) {
    bmLink.href = EBAY_BOOKMARKLET_CODE;
    bmLink.setAttribute('title', 'Drag to Bookmarks bar');
    bmLink.addEventListener('click', function(e) {
      e.preventDefault();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(EBAY_BOOKMARKLET_CODE).then(function() {
          const origText = bmLink.textContent;
          bmLink.textContent = "✓ Code Copied!";
          setTimeout(function() {
            bmLink.textContent = origText;
          }, 1800);
        });
      }
    });
  }

  const copyEbayBtn = document.getElementById("btn-copy-ebay-payload");
  if (copyEbayBtn) {
    copyEbayBtn.addEventListener("click", copyEbayBookmarkletPayload);
  }

  const copyTitleBtn = document.getElementById("btn-copy-ebay-title");
  if (copyTitleBtn) {
    copyTitleBtn.addEventListener("click", copyEbayTitlePayload);
  }

  const copyMasterBtn = document.getElementById("btn-master-copy-ebay");
  if (copyMasterBtn) {
    copyMasterBtn.addEventListener("click", copyMasterEbayPayload);
  }
}

function copyEbayBookmarkletPayload() {
  const statusEl = document.getElementById("copy-status01");
  const rows = Array.from(document.querySelectorAll("#output01-container .mpn-output-item"))
    .map(function (el) { return el.innerText.trim(); })
    .filter(Boolean);

  if (rows.length === 0) {
    if (statusEl) {
      statusEl.innerText = "⚠️ Enter part numbers first!";
      statusEl.classList.remove("success");
      statusEl.classList.add("failed");
      setTimeout(function () {
        const count = document.querySelectorAll("#output01-container .mpn-output-item").length;
        statusEl.innerText = count > 1 ? "Click any row to copy" : "Click Output to copy";
        statusEl.classList.remove("failed");
      }, 1500);
    }
    return;
  }

  const targetConfig = DEFAULT_PAYLOAD_CONFIG.mpn;
  const payload = {
    __protocol: "EBAY_TOOL_PAYLOAD",
    version: "1.2", action: "UPDATE_MPN",
    generatedAt: new Date().toISOString(),
    pageMatch: ["ebay.com/lstng", "ebay.com/sl/", "ebay.com/itm/"],
    target: targetConfig,
    rows: rows
  };

  const jsonStr = JSON.stringify(payload, null, 2);

  const onCopied = function () {
    if (statusEl) {
      statusEl.innerText = "Success! Copied for eBay (" + rows.length + " row" + (rows.length > 1 ? "s" : "") + ")";
      statusEl.classList.remove("failed");
      statusEl.classList.add("success");
      setTimeout(function () {
        const count = document.querySelectorAll("#output01-container .mpn-output-item").length;
        statusEl.innerText = count > 1 ? "Click any row to copy" : "Click Output to copy";
        statusEl.classList.remove("success");
      }, 2200);
    }
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(jsonStr).then(onCopied).catch(function () {
      fallbackCopy(jsonStr, onCopied, function () {
        if (statusEl) statusEl.innerText = "Failed to copy payload!";
      });
    });
  } else {
    fallbackCopy(jsonStr, onCopied, function () {
      if (statusEl) statusEl.innerText = "Failed to copy payload!";
    });
  }
}
