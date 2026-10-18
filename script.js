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

function updateOutput01(event) {
  if (event) {
    document.getElementById("reset01").disabled = false;
    document.getElementById("save01").disabled = false;
  }

  syncModifiedGroup();

  document.querySelectorAll(".duplicate-warning").forEach(el => {
    el.classList.remove("duplicate-warning");
  });

  const mainInput = document.getElementById("input01").value.trim();

  const sep =
    " " +
    document.querySelector('#inputform01 input[name="selector"]:checked')
      .value +
    " ";

  if (!mainInput) {
    document.getElementById("output01").innerText = "";
    return;
  }

  const outputOriginal = mainInput.replace(/\s+/g, " ");
  const tokens = mainInput.split(/[\s.-]+/).filter(Boolean);

  const outputSpacesOnly = tokens.join(" ");
  const outputDashes = tokens.join("-");
  const outputDots = tokens.join(".");
  const outputNoSpaces = tokens.join("");

  const modifiedEnabled = document.getElementById("section-two")
    ? document.getElementById("section-two").checked
    : true;

  const rawItems = [
    ...(document.getElementById("section-one").checked ? [outputOriginal] : []),
    ...(modifiedEnabled && document.getElementById("section-two-spaces").checked
      ? [outputSpacesOnly]
      : []),
    ...(modifiedEnabled && document.getElementById("section-two-dashes").checked
      ? [outputDashes]
      : []),
    ...(modifiedEnabled && document.getElementById("section-two-dots").checked
      ? [outputDots]
      : []),
    ...(document.getElementById("section-three").checked ? [outputNoSpaces] : [])
  ];

  const seen = new Set();
  const finalItems = [];

  const allItemsForDuplicates = [
    outputOriginal,
    outputSpacesOnly,
    outputDashes,
    outputDots,
    outputNoSpaces
  ];

  allItemsForDuplicates.forEach(item => {
    if (seen.has(item)) {
      markDuplicateOption(item);
    } else {
      seen.add(item);
    }
  });

  seen.clear();
  rawItems.forEach(item => {
    if (!seen.has(item)) {
      seen.add(item);
      finalItems.push(item);
    }
  });

  document.getElementById("output01").innerText = finalItems.join(sep);
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

document.getElementById("output01").addEventListener(
  "mousedown",
  function () {
    const text = document.getElementById("output01").innerText;
    try {
      navigator.clipboard.writeText(text);
      document.getElementById("copy-status01").innerText =
        "Success! Copied to clipboard";
      document.getElementById("copy-status01").classList.add("success");
      setTimeout(function () {
        document.getElementById("copy-status01").innerText =
          "Click Output to copy";
        document.getElementById("copy-status01").classList.remove("success");
        document.getElementById("input01").select();
      }, 1200);
    } catch (err) {
      document.getElementById("copy-status01").innerText =
        "Failed to copy!";
      document.getElementById("copy-status01").classList.add("failed");
      setTimeout(function () {
        document.getElementById("copy-status01").innerText =
          "Click Output to copy";
        document.getElementById("copy-status01").classList.remove("failed");
        document.getElementById("input01").select();
      }, 1200);
    }
  },
  false
);

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
document
  .getElementById("inputform03")
  .addEventListener("input", updateOutput03);


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
  document.getElementById("input01").value = "";
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


  updateOutput01();
  syncAllCollapseButtonStates();
};