(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  var STORAGE_PREFIX = "ops_admin_";

  // Known admin model paths — used for G+key navigation
  var NAV_MODEL_PATHS = {
    U: "ops_admin/platformuser/",
    I: "ops_admin/interviewsession/",
    R: "ops_admin/resumeuploadrecord/",
    J: "ops_admin/suggestedjobrecord/",
    L: "ops_admin/useractivitylog/",
    D: "", // dashboard
  };

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  function qs(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }

  function qsa(sel, ctx) {
    return Array.from((ctx || document).querySelectorAll(sel));
  }

  function isTyping() {
    var el = document.activeElement;
    if (!el) return false;
    var tag = el.tagName;
    return (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      el.isContentEditable
    );
  }

  function storageGet(key) {
    try {
      return localStorage.getItem(STORAGE_PREFIX + key);
    } catch (e) {
      return null;
    }
  }

  function storageSet(key, val) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, val);
    } catch (e) {}
  }

  function getAdminBase() {
    // Extract base admin URL from breadcrumbs home link, fall back to /admin/
    var homeLink = qs(".breadcrumbs a[href]");
    if (homeLink) {
      var href = homeLink.getAttribute("href");
      // breadcrumb home link is usually the admin index
      var match = href.match(/^(\/[^/]+\/)/);
      if (match) return match[1];
    }
    return "/admin/";
  }

  function getModelName() {
    // Extract from body class like "model-platformuser"
    var match = document.body.className.match(/\bmodel-(\w+)\b/);
    return match ? match[1] : null;
  }

  function isChangeList() {
    return document.body.classList.contains("change-list");
  }

  function isChangeForm() {
    return (
      document.body.classList.contains("change-form") ||
      document.body.classList.contains("add-form")
    );
  }

  // ---------------------------------------------------------------------------
  // Module: Keyboard Shortcuts
  // ---------------------------------------------------------------------------

  var gPending = false;
  var gTimer = null;

  function initKeyboardShortcuts() {
    // Build route map from data-kbd attributes on action cards
    var routes = Object.assign({}, NAV_MODEL_PATHS);
    qsa("[data-kbd]").forEach(function (el) {
      var key = el.getAttribute("data-kbd").toUpperCase();
      var href = el.getAttribute("href");
      if (href && href !== "#") {
        routes[key] = href; // full URL from card
      }
    });

    function navigate(key) {
      var dest = routes[key.toUpperCase()];
      if (dest === undefined) return;
      // If it's a path fragment (not starting with /), prepend admin base
      if (dest.length > 0 && dest[0] !== "/") {
        dest = getAdminBase() + dest;
      } else if (dest === "") {
        dest = getAdminBase();
      }
      window.location.href = dest;
    }

    document.addEventListener("keydown", function (e) {
      // Never fire during text input
      if (isTyping()) return;

      var key = e.key;

      // Ctrl+S / Cmd+S on change forms — submit default save
      if ((e.ctrlKey || e.metaKey) && key === "s" && isChangeForm()) {
        var saveBtn = qs("input[type='submit'][name='_save'], input[type='submit'].default");
        if (saveBtn) {
          e.preventDefault();
          saveBtn.click();
        }
        return;
      }

      // Skip if any modifier is held (except Shift for ?)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // "?" — open shortcut help
      if (key === "?") {
        e.preventDefault();
        toggleKbdModal();
        return;
      }

      // "/" — focus search
      if (key === "/") {
        var searchInput = qs(
          "#changelist-search input[type='text'], #toolbar input[type='text']"
        );
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // Escape — close modal or blur
      if (key === "Escape") {
        var modal = qs("#ops-kbd-modal");
        if (modal && !modal.hidden) {
          hideKbdModal();
          return;
        }
        if (document.activeElement) {
          document.activeElement.blur();
        }
        return;
      }

      // "E" — toggle filter panel
      if (key === "e" || key === "E") {
        if (isChangeList()) {
          e.preventDefault();
          toggleFilterPanel();
        }
        return;
      }

      // "1" / "2" — density toggle on list pages
      if (key === "1" && isChangeList()) {
        e.preventDefault();
        applyDensity("compact");
        storageSet("density", "compact");
        return;
      }
      if (key === "2" && isChangeList()) {
        e.preventDefault();
        applyDensity("comfortable");
        storageSet("density", "comfortable");
        return;
      }

      // "J" / "K" — row navigation on list pages
      if (key === "j" && isChangeList()) {
        e.preventDefault();
        moveRowFocus(1);
        return;
      }
      if (key === "k" && isChangeList()) {
        e.preventDefault();
        moveRowFocus(-1);
        return;
      }

      // "X" — toggle checkbox on focused row
      if (key === "x" && isChangeList()) {
        var focused = qs(".ops-row-focused");
        if (focused) {
          var cb = focused.querySelector("input[type='checkbox']");
          if (cb) {
            e.preventDefault();
            cb.checked = !cb.checked;
            cb.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
        return;
      }

      // "Enter" — open focused row
      if (key === "Enter" && isChangeList()) {
        var focusedRow = qs(".ops-row-focused");
        if (focusedRow) {
          var link = focusedRow.querySelector("th a, td.field-email a, td a");
          if (link) {
            e.preventDefault();
            link.click();
          }
        }
        return;
      }

      // Two-key "G then X" navigation
      if (gPending) {
        gPending = false;
        clearTimeout(gTimer);
        navigate(key.toUpperCase());
        return;
      }

      if (key.toLowerCase() === "g") {
        gPending = true;
        gTimer = setTimeout(function () {
          gPending = false;
        }, 1500);
        return;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Module: Keyboard Modal
  // ---------------------------------------------------------------------------

  var prevFocusEl = null;

  function toggleKbdModal() {
    var modal = qs("#ops-kbd-modal");
    if (!modal) return;
    if (modal.hidden) {
      showKbdModal();
    } else {
      hideKbdModal();
    }
  }

  function showKbdModal() {
    var modal = qs("#ops-kbd-modal");
    if (!modal) return;
    prevFocusEl = document.activeElement;
    modal.hidden = false;
    modal.removeAttribute("hidden");
    // Focus close button
    var closeBtn = qs("#ops-kbd-close");
    if (closeBtn) closeBtn.focus();
    // Trap focus
    trapFocus(modal);
    // Close on backdrop click
    modal.addEventListener("click", function onBackdrop(ev) {
      if (ev.target === modal) {
        hideKbdModal();
        modal.removeEventListener("click", onBackdrop);
      }
    });
  }

  function hideKbdModal() {
    var modal = qs("#ops-kbd-modal");
    if (!modal) return;
    modal.hidden = true;
    if (prevFocusEl) {
      prevFocusEl.focus();
      prevFocusEl = null;
    }
  }

  function trapFocus(container) {
    var focusable = qsa(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      container
    ).filter(function (el) {
      return el.offsetParent !== null; // visible only
    });
    if (focusable.length === 0) return;

    container.addEventListener("keydown", function onTrap(e) {
      if (e.key !== "Tab") return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
      // Clean up when modal closes
      if (container.hidden) {
        container.removeEventListener("keydown", onTrap);
      }
    });
  }

  function initKbdModalControls() {
    // Close button
    var closeBtn = qs("#ops-kbd-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", hideKbdModal);
    }
    // Nav trigger button
    var trigger = qs("#ops-kbd-trigger");
    if (trigger) {
      trigger.addEventListener("click", toggleKbdModal);
    }
  }

  // ---------------------------------------------------------------------------
  // Module: Toast Notifications
  // ---------------------------------------------------------------------------

  function initToastSystem() {
    var messages = qsa(".messagelist li");
    if (messages.length === 0) return;

    // Create container
    var container = document.createElement("div");
    container.className = "ops-toast-container";
    container.setAttribute("aria-live", "polite");
    container.setAttribute("role", "status");
    document.body.appendChild(container);

    messages.forEach(function (msg, i) {
      var type = msg.classList.contains("error")
        ? "error"
        : msg.classList.contains("warning")
        ? "warning"
        : "success";

      var toast = document.createElement("div");
      toast.className = "ops-toast ops-toast-" + type;
      toast.setAttribute("role", "alert");
      toast.style.animationDelay = i * 80 + "ms";

      var text = document.createElement("span");
      text.className = "ops-toast-text";
      text.textContent = msg.textContent.trim();

      var closeBtn = document.createElement("button");
      closeBtn.className = "ops-toast-close";
      closeBtn.type = "button";
      closeBtn.setAttribute("aria-label", "Dismiss");
      closeBtn.textContent = "\u00D7";

      var progress = document.createElement("div");
      progress.className = "ops-toast-progress";

      toast.appendChild(text);
      toast.appendChild(closeBtn);
      toast.appendChild(progress);
      container.appendChild(toast);

      closeBtn.addEventListener("click", function () {
        dismissToast(toast);
      });

      var delay = 5000 + i * 400;
      setTimeout(function () {
        dismissToast(toast);
      }, delay);
    });
  }

  function dismissToast(toast) {
    if (toast.classList.contains("ops-toast-exit")) return;
    toast.classList.add("ops-toast-exit");
    toast.addEventListener("animationend", function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    });
  }

  // ---------------------------------------------------------------------------
  // Module: Bulk Action Confirmation
  // ---------------------------------------------------------------------------

  function initBulkActionConfirmation() {
    var form = qs("#changelist-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      var actionSelect = qs("select[name='action']", form);
      if (!actionSelect) return;
      if (actionSelect.value !== "delete_selected") return;

      var checked = qsa("input[name='_selected_action']:checked", form);
      if (checked.length === 0) return;

      var count = checked.length;
      var confirmed = window.confirm(
        "You are about to delete " +
          count +
          " item" +
          (count !== 1 ? "s" : "") +
          ".\n\nThis action cannot be undone. Continue?"
      );
      if (!confirmed) e.preventDefault();
    });
  }

  // ---------------------------------------------------------------------------
  // Module: Filter Persistence
  // ---------------------------------------------------------------------------

  function initFilterPersistence() {
    if (!isChangeList()) return;

    var modelName = getModelName();
    if (!modelName) return;

    var storageKey = "filters_" + modelName;
    var currentQS = window.location.search;

    if (currentQS && currentQS !== "?" && currentQS.length > 1) {
      // Save current filters (skip if it's just page or ordering)
      storageSet(storageKey, currentQS);
    } else {
      // No active filters — check for saved ones
      var saved = storageGet(storageKey);
      if (saved && saved.length > 1) {
        showFilterRestorationBanner(saved);
      }
    }
  }

  function showFilterRestorationBanner(savedQS) {
    var contentArea = qs("#content-main") || qs("#content");
    if (!contentArea) return;

    var banner = document.createElement("div");
    banner.className = "ops-filter-restore-banner";
    banner.setAttribute("role", "alert");

    var msg = document.createElement("span");
    msg.textContent = "You have saved filters for this view.";

    var restoreLink = document.createElement("a");
    restoreLink.href = window.location.pathname + savedQS;
    restoreLink.className = "ops-btn-sm ops-btn-primary";
    restoreLink.textContent = "Restore filters";

    var dismissBtn = document.createElement("button");
    dismissBtn.className = "ops-btn-sm ops-btn-ghost";
    dismissBtn.type = "button";
    dismissBtn.textContent = "Dismiss";
    dismissBtn.addEventListener("click", function () {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    });

    banner.appendChild(msg);
    banner.appendChild(restoreLink);
    banner.appendChild(dismissBtn);
    contentArea.insertBefore(banner, contentArea.firstChild);
  }

  // ---------------------------------------------------------------------------
  // Module: Table Density Toggle
  // ---------------------------------------------------------------------------

  function initDensityToggle() {
    if (!isChangeList()) return;

    var changelist = qs("#changelist");
    if (!changelist) return;

    // Apply saved preference
    var saved = storageGet("density") || "comfortable";
    applyDensity(saved);

    // Inject density toggle control into toolbar
    var toolbar = qs("#toolbar");
    if (!toolbar) return;

    var wrapper = document.createElement("span");
    wrapper.className = "ops-density-toggle";
    wrapper.setAttribute("role", "radiogroup");
    wrapper.setAttribute("aria-label", "Table density");

    var btnCompact = document.createElement("button");
    btnCompact.type = "button";
    btnCompact.className = "ops-density-btn";
    btnCompact.dataset.density = "compact";
    btnCompact.setAttribute("aria-label", "Compact density");
    btnCompact.title = "Compact (1)";
    btnCompact.innerHTML = "&#9776;"; // ≡

    var btnComfort = document.createElement("button");
    btnComfort.type = "button";
    btnComfort.className = "ops-density-btn";
    btnComfort.dataset.density = "comfortable";
    btnComfort.setAttribute("aria-label", "Comfortable density");
    btnComfort.title = "Comfortable (2)";
    btnComfort.innerHTML = "&#9783;"; // ⊗ → use "⋮⋮" feel

    wrapper.appendChild(btnCompact);
    wrapper.appendChild(btnComfort);
    toolbar.appendChild(wrapper);

    wrapper.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-density]");
      if (!btn) return;
      var d = btn.dataset.density;
      applyDensity(d);
      storageSet("density", d);
    });

    updateDensityButtons(saved);
  }

  function applyDensity(density) {
    var changelist = qs("#changelist");
    if (!changelist) return;
    changelist.classList.remove("ops-density-compact", "ops-density-comfortable");
    changelist.classList.add("ops-density-" + density);
    updateDensityButtons(density);
  }

  function updateDensityButtons(density) {
    qsa(".ops-density-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.density === density);
      btn.setAttribute("aria-checked", String(btn.dataset.density === density));
    });
  }

  // ---------------------------------------------------------------------------
  // Module: Filter Panel Toggle
  // ---------------------------------------------------------------------------

  function initFilterPanelToggle() {
    if (!isChangeList()) return;

    var filterNav = qs("#changelist-filter");
    if (!filterNav) return;

    var changelist = qs("#changelist") || qs(".changelist-form-container");

    // Inject toggle button inside filter panel
    filterNav.style.position = "relative";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ops-filter-toggle";
    btn.setAttribute("aria-label", "Toggle filter panel");
    btn.title = "Toggle filters (E)";
    btn.innerHTML = "&#9668;"; // ◄
    filterNav.appendChild(btn);

    // Restore saved state
    var collapsed = storageGet("filter_collapsed") === "true";
    if (collapsed && changelist) {
      changelist.classList.add("ops-filter-collapsed");
      btn.innerHTML = "&#9658;"; // ►
    }

    btn.addEventListener("click", function () {
      collapsed = !collapsed;
      if (changelist) changelist.classList.toggle("ops-filter-collapsed", collapsed);
      btn.innerHTML = collapsed ? "&#9658;" : "&#9668;";
      btn.setAttribute("aria-expanded", String(!collapsed));
      storageSet("filter_collapsed", String(collapsed));
    });

    btn.setAttribute("aria-expanded", String(!collapsed));
  }

  // ---------------------------------------------------------------------------
  // Module: Keyboard Row Navigation
  // ---------------------------------------------------------------------------

  var currentRowIndex = -1;

  function initKeyboardRowNavigation() {
    if (!isChangeList()) return;
    // Rows are fetched dynamically since they may not exist yet
  }

  function getRows() {
    return qsa("#result_list tbody tr");
  }

  function moveRowFocus(delta) {
    var rows = getRows();
    if (rows.length === 0) return;

    // Remove previous focus
    if (currentRowIndex >= 0 && currentRowIndex < rows.length) {
      rows[currentRowIndex].classList.remove("ops-row-focused");
      rows[currentRowIndex].removeAttribute("aria-current");
    }

    currentRowIndex = Math.max(0, Math.min(rows.length - 1, currentRowIndex + delta));
    var row = rows[currentRowIndex];
    row.classList.add("ops-row-focused");
    row.setAttribute("aria-current", "true");
    row.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  // ---------------------------------------------------------------------------
  // Module: System Status Toggle (Dashboard)
  // ---------------------------------------------------------------------------

  function initSystemStatusToggle() {
    var btn = qs(".ops-system-status__toggle");
    if (!btn) return;

    btn.addEventListener("click", function () {
      var targetId = btn.getAttribute("aria-controls");
      var target = targetId ? qs("#" + targetId) : null;
      if (!target) return;

      var expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expanded));
      if (expanded) {
        target.hidden = true;
        target.setAttribute("hidden", "");
      } else {
        target.hidden = false;
        target.removeAttribute("hidden");
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Module: Stitch Sidebar Active State
  // ---------------------------------------------------------------------------

  function initSidenavActiveState() {
    var path = window.location.pathname;
    qsa("#ops-sidenav .ops-sidenav__item").forEach(function (link) {
      var dataPath = link.getAttribute("data-path");
      if (!dataPath) return;

      var isActive = false;
      if (dataPath === "index") {
        // Active only on the exact admin index (e.g. /admin/ or /admin)
        isActive = /^\/[^/]+\/?$/.test(path);
      } else if (dataPath === "auth_group") {
        isActive = path.indexOf("/auth/group/") >= 0;
      } else {
        isActive = path.indexOf("/" + dataPath + "/") >= 0;
      }

      if (isActive) {
        link.classList.add("ops-nav-active");
        link.setAttribute("aria-current", "page");
      } else {
        link.classList.remove("ops-nav-active");
        link.removeAttribute("aria-current");
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Module: Avatar Circles for User Tables
  // ---------------------------------------------------------------------------

  var AVATAR_PALETTE = [
    "#6366f1", "#0ea5e9", "#10b981", "#f59e0b",
    "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"
  ];

  function emailToAvatarColor(email) {
    var hash = 0;
    for (var i = 0; i < email.length; i++) {
      hash = (hash * 31 + email.charCodeAt(i)) & 0x7fffffff;
    }
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
  }

  function makeAvatar(initials, color) {
    var el = document.createElement("span");
    el.className = "ops-avatar";
    el.style.background = color;
    el.textContent = initials.slice(0, 2).toUpperCase();
    el.setAttribute("aria-hidden", "true");
    return el;
  }

  function initAvatarCircles() {
    if (!isChangeList()) return;
    if (getModelName() !== "platformuser") return;

    qsa("#result_list tbody tr").forEach(function (row) {
      // Look for the primary email cell (th or td.field-email)
      var cell = row.querySelector("th.field-email, td.field-email") || row.querySelector("th");
      if (!cell) return;

      var link = cell.querySelector("a");
      var rawText = link ? link.textContent.trim() : cell.textContent.trim();
      if (!rawText || !rawText.includes("@")) return;

      // Avoid double-injection
      if (cell.querySelector(".ops-avatar")) return;

      var localPart = rawText.split("@")[0];
      var initials = localPart.length >= 2
        ? localPart[0] + localPart[localPart.length - 1]
        : localPart[0];
      var avatar = makeAvatar(initials, emailToAvatarColor(rawText));

      var wrapper = document.createElement("span");
      wrapper.className = "ops-user-cell";

      var infoSpan = document.createElement("span");
      infoSpan.className = "ops-user-cell__info";
      // Move existing inner HTML into info span
      while (cell.firstChild) {
        infoSpan.appendChild(cell.firstChild);
      }

      wrapper.appendChild(avatar);
      wrapper.appendChild(infoSpan);
      cell.appendChild(wrapper);
    });
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  document.addEventListener("DOMContentLoaded", function () {
    initKeyboardShortcuts();
    initKbdModalControls();
    initToastSystem();
    initBulkActionConfirmation();
    initFilterPersistence();
    initDensityToggle();
    initFilterPanelToggle();
    initKeyboardRowNavigation();
    initSystemStatusToggle();
    initSidenavActiveState();
    initAvatarCircles();
  });
})();
