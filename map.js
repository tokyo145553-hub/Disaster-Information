(function () {
  "use strict";

  const japanBounds = [[20.2, 122.5], [46.4, 153.5]];
  const prefUrl = "./data/prefectures.geojson";
  const prefLayerCache = new Map();

  window.TEB = window.TEB || {};
  window.TEB.maps = {};
  window.TEB.prefectures = null;

  const intensityColors = {
    "1": "#9ca3af",
    "2": "#60a5fa",
    "3": "#facc15",
    "4": "#f97316",
    "5-": "#ef4444",
    "5+": "#dc2626",
    "6-": "#b91c1c",
    "6+": "#7f1d1d",
    "7": "#a855f7"
  };

  window.TEB.intensityColor = function (value) {
    if (value == null) return "#64748b";
    const normalized = String(value).replace("弱", "-").replace("強", "+");
    return intensityColors[normalized] || intensityColors[String(parseInt(value, 10))] || "#64748b";
  };

  window.TEB.warningColor = function (level) {
    if (level === "special") return "#a855f7";
    if (level === "warning") return "#ff4d5e";
    if (level === "advisory") return "#ffd166";
    return "#22314d";
  };

  window.TEB.createMap = function (id, options) {
    const el = document.getElementById(id);
    if (!el || !window.L) return null;
    const map = L.map(id, Object.assign({
      center: [37.7, 137.8],
      zoom: 5,
      minZoom: 4,
      maxZoom: 10,
      maxBounds: japanBounds,
      zoomControl: true
    }, options || {}));
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      subdomains: "abcd",
      maxZoom: 20
    }).addTo(map);
    window.TEB.maps[id] = map;
    setTimeout(() => map.invalidateSize(), 80);
    return map;
  };

  window.TEB.loadPrefectures = async function () {
    if (window.TEB.prefectures) return window.TEB.prefectures;
    window.TEB.prefectures = await window.TEB.fetchJson(prefUrl);
    return window.TEB.prefectures;
  };

  window.TEB.addPrefectureLayer = async function (map, styleResolver, clickHandler) {
    if (!map || !window.L) return null;
    const data = await window.TEB.loadPrefectures();
    const layer = L.geoJSON(data, {
      style(feature) {
        const color = styleResolver ? styleResolver(feature) : "#22314d";
        return {
          color: "#405777",
          weight: 1,
          fillColor: color,
          fillOpacity: color === "#22314d" ? .22 : .58,
          opacity: .9
        };
      },
      onEachFeature(feature, leafletLayer) {
        leafletLayer.bindTooltip(feature.properties.name, { sticky: true });
        leafletLayer.on("click", () => {
          if (clickHandler) clickHandler(feature, leafletLayer);
        });
      }
    }).addTo(map);
    prefLayerCache.set(map, layer);
    return layer;
  };

  window.TEB.refreshPrefectureLayer = function (map, styleResolver) {
    const layer = prefLayerCache.get(map);
    if (!layer) return;
    layer.setStyle((feature) => ({
      color: "#405777",
      weight: 1,
      fillColor: styleResolver ? styleResolver(feature) : "#22314d",
      fillOpacity: .58,
      opacity: .9
    }));
  };

  window.TEB.addEpicenter = function (map, quake, options) {
    if (!map || !quake || !quake.lat || !quake.lon || !window.L) return null;
    const color = window.TEB.intensityColor(quake.maxScale);
    const marker = L.marker([quake.lat, quake.lon], {
      icon: L.divIcon({
        className: "",
        html: `<span class="map-marker" style="background:${color}">${window.TEB.escape(quake.maxScale || "震")}</span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      })
    }).addTo(map);
    marker.bindPopup(`<strong>${window.TEB.escape(quake.place || "震源")}</strong><br>M ${window.TEB.escape(quake.magnitude || "--")} / ${window.TEB.escape(quake.depth || "--")}km`);
    if (options && options.pan) map.setView([quake.lat, quake.lon], Math.max(map.getZoom(), 6));
    return marker;
  };

  window.TEB.addEewMarker = function (map, eew) {
    if (!map || !eew || !eew.lat || !eew.lon || !window.L) return null;
    const marker = L.marker([eew.lat, eew.lon], {
      icon: L.divIcon({
        className: "",
        html: '<span class="map-marker eew">EEW</span>',
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      })
    }).addTo(map);
    marker.bindPopup(`<strong>緊急地震速報</strong><br>${window.TEB.escape(eew.place || "震源不明")}<br>M ${window.TEB.escape(eew.magnitude || "--")}`);
    if (window.TEB.settings.autoPan) map.setView([eew.lat, eew.lon], 6);
    return marker;
  };
})();
