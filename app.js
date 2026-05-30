(function () {
  "use strict";

  const defaults = {
    notifyEew: true,
    sound: true,
    autoPan: true,
    autoRefresh: true
  };

  const settings = Object.assign({}, defaults, JSON.parse(localStorage.getItem("teb-settings") || "{}"));
  const page = document.body.dataset.page || "home";

  window.TEB = window.TEB || {};
  window.TEB.page = page;
  window.TEB.settings = settings;
  window.TEB.saveSettings = function () {
    localStorage.setItem("teb-settings", JSON.stringify(settings));
  };
  window.TEB.formatTime = function (value) {
    if (!value) return "--";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  };
  window.TEB.setStatus = function (state, text) {
    document.querySelectorAll(".status-dot").forEach((dot) => {
      dot.classList.remove("online", "offline");
      if (state) dot.classList.add(state);
    });
    const label = document.getElementById("global-status-text");
    if (label && text) label.textContent = text;
  };
  window.TEB.escape = function (value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    })[char]);
  };
  window.TEB.fetchJson = async function (url, options) {
    const response = await fetch(url, Object.assign({ cache: "no-store" }, options));
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  };
  window.TEB.notify = async function (title, body) {
    if (!("Notification" in window) || !settings.notifyEew) return;
    if (Notification.permission === "default") await Notification.requestPermission();
    if (Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "./assets/logo.png",
        badge: "./assets/logo.png",
        tag: "teb-eew"
      });
    }
  };

  function setupNavigation() {
    document.querySelectorAll(`[data-nav="${page}"]`).forEach((link) => link.classList.add("active"));
    const toggle = document.getElementById("menu-toggle");
    if (toggle) toggle.addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
    document.querySelectorAll(".nav a").forEach((link) => {
      link.addEventListener("click", () => document.body.classList.remove("sidebar-open"));
    });
  }

  function setupNotifications() {
    document.querySelectorAll("#notify-button").forEach((button) => {
      if (!("Notification" in window)) {
        button.textContent = "通知非対応";
        button.disabled = true;
        return;
      }
      button.textContent = Notification.permission === "granted" ? "通知は有効" : "通知を有効化";
      button.addEventListener("click", async () => {
        const permission = await Notification.requestPermission();
        button.textContent = permission === "granted" ? "通知は有効" : "通知を有効化";
      });
    });
  }

  function setupSettingsPage() {
    if (page !== "settings") return;
    const bindings = [
      ["setting-notify-eew", "notifyEew"],
      ["setting-sound", "sound"],
      ["setting-auto-pan", "autoPan"],
      ["setting-auto-refresh", "autoRefresh"]
    ];
    bindings.forEach(([id, key]) => {
      const input = document.getElementById(id);
      if (!input) return;
      input.checked = Boolean(settings[key]);
      input.addEventListener("change", () => {
        settings[key] = input.checked;
        window.TEB.saveSettings();
      });
    });
  }

  function setupRefresh() {
    document.querySelectorAll("[data-refresh]").forEach((button) => {
      button.addEventListener("click", () => window.location.reload());
    });
    if (settings.autoRefresh && page !== "settings") {
      setInterval(() => window.location.reload(), 5 * 60 * 1000);
    }
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    try {
      await navigator.serviceWorker.register("./service-worker.js");
    } catch (error) {
      console.warn("Service Worker registration failed", error);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    setupNotifications();
    setupSettingsPage();
    setupRefresh();
    registerServiceWorker();
    window.TEB.setStatus("online", "オンライン");
  });

  window.addEventListener("online", () => window.TEB.setStatus("online", "オンライン"));
  window.addEventListener("offline", () => window.TEB.setStatus("offline", "オフライン"));
})();
