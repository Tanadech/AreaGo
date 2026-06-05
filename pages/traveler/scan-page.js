/**
 * pages/traveler/scan-page.js
 * หน้าสแกนพื้นที่ — เลือกระหว่าง GPS radius หรือ Polygon
 */

import { el, clear } from '../../lib/dom.js';
import { RADIUS_OPTIONS, CONFIG } from '../../lib/constants.js';
import { PolygonScanner } from '../../components/polygon-scanner.js';
import { initMap, addPlaceMarkers, addRadiusCircle, addUserMarker } from '../../components/map-view.js';
import { distanceKm } from '../../lib/geo.js';
import { toast } from '../../components/toast.js';
import { PlaceDetail } from '../../components/place-detail.js';
import * as storage from '../../lib/storage.js';

export function ScanPage({ places, categories, modal }) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  let mode = 'gps'; /* 'gps' | 'polygon' */

  const body = el('div', { class: 'scan-body' });
  const modeBar = buildModeBar();

  function buildModeBar() {
    return el('div', { class: 'scan-mode-bar' }, [
      modeBtn('gps', '📍 GPS รัศมี'),
      modeBtn('polygon', '⬡ วาดพื้นที่'),
    ]);
  }

  function modeBtn(m, label) {
    return el('button', {
      class: `scan-mode-btn ${mode === m ? 'scan-mode-btn--active' : ''}`,
      type: 'button',
      text: label,
      onClick: () => switchMode(m),
    });
  }

  function switchMode(m) {
    mode = m;
    clear(modeBar);
    modeBar.append(modeBtn('gps', '📍 GPS รัศมี'), modeBtn('polygon', '⬡ วาดพื้นที่'));
    renderBody();
  }

  /* -------- GPS Mode -------- */
  function renderGpsMode() {
    clear(body);
    let selectedRadius = 1;
    let map = null;
    let radiusCircle = null;
    let markerLayer = null;
    let userMarker = null;

    const mapEl = el('div', { class: 'scanner-map' });
    const resultEl = el('div', { class: 'scan-gps-result scan-gps-result--hidden' });

    const radiusChips = el('div', { class: 'scan-radius-bar' },
      RADIUS_OPTIONS.map((opt) =>
        el('button', {
          class: `chip ${opt.value === selectedRadius ? 'chip--active' : ''}`,
          type: 'button',
          text: opt.label,
          onClick: (ev) => {
            selectedRadius = opt.value;
            radiusChips.querySelectorAll('.chip').forEach((b) => b.classList.remove('chip--active'));
            ev.currentTarget.classList.add('chip--active');
            if (map && userMarker) {
              const pos = userMarker.getPosition();
              if (radiusCircle) radiusCircle.setMap(null);
              radiusCircle = addRadiusCircle(map, pos.lat(), pos.lng(), selectedRadius);
              doScan(map, pos.lat(), pos.lng(), selectedRadius, resultEl);
            }
          },
        })
      )
    );

    const scanBtn = el('button', {
      class: 'btn btn--primary btn--full',
      type: 'button',
      text: '📡 สแกนตำแหน่งปัจจุบัน',
      onClick: async () => {
        scanBtn.disabled = true;
        scanBtn.textContent = 'กำลังรับ GPS...';
        try {
          const pos = await new Promise((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 6000,
            })
          );
          const { latitude: lat, longitude: lng } = pos.coords;
          if (!map) map = await initMap(mapEl, { lat, lng, zoom: 14 });
          else { map.setCenter({ lat, lng }); map.setZoom(14); }
          if (userMarker) userMarker.setMap(null);
          if (radiusCircle) radiusCircle.setMap(null);
          userMarker = addUserMarker(map, lat, lng);
          radiusCircle = addRadiusCircle(map, lat, lng, selectedRadius);
          doScan(map, lat, lng, selectedRadius, resultEl);
        } catch (err) {
          toast.show('ไม่สามารถรับตำแหน่ง GPS ได้ ใช้พิกัดกรุงเทพฯ แทน', 'error');
          const lat = CONFIG.defaultLat;
          const lng = CONFIG.defaultLng;
          if (!map) map = await initMap(mapEl, { lat, lng, zoom: 14 });
          if (userMarker) userMarker.setMap(null);
          if (radiusCircle) radiusCircle.setMap(null);
          userMarker = addUserMarker(map, lat, lng);
          radiusCircle = addRadiusCircle(map, lat, lng, selectedRadius);
          doScan(map, lat, lng, selectedRadius, resultEl);
        } finally {
          scanBtn.disabled = false;
          scanBtn.textContent = '📡 สแกนอีกครั้ง';
        }
      },
    });

    function doScan(m, lat, lng, radius, resultEl) {
      if (markerLayer) markerLayer.clearLayers();
      const center = { lat, lng };
      const matched = places
        .filter((p) => distanceKm(center, p) <= radius)
        .map((p) => ({ ...p, distanceKm: distanceKm(center, p) }))
        .sort((a, b) => a.distanceKm - b.distanceKm);

      markerLayer = addPlaceMarkers(m, matched, categoryById, openDetail);

      const grouped = {};
      for (const p of matched) {
        const cat = categoryById.get(p.categoryId);
        const key = cat?.id ?? 'other';
        if (!grouped[key]) grouped[key] = { cat, count: 0 };
        grouped[key].count++;
      }

      clear(resultEl);
      resultEl.classList.remove('scan-gps-result--hidden');
      resultEl.append(
        el('p', { class: 'scan-result__total' }, [
          el('strong', { text: String(matched.length) }),
          ` สถานที่ ในรัศมี ${radius < 1 ? `${radius * 1000} ม.` : `${radius} กม.`}`,
        ]),
        el('div', { class: 'scan-result__cats' },
          Object.values(grouped).map((g) =>
            el('div', { class: 'scan-result__cat-row' }, [
              el('span', { text: `${g.cat?.icon ?? '📍'} ${g.cat?.name ?? 'อื่น ๆ'}` }),
              el('strong', { text: String(g.count) }),
            ])
          )
        )
      );
    }

    function openDetail(placeId) {
      const place = places.find((p) => p.id === placeId);
      if (!place) return;
      modal.open(PlaceDetail({
        place,
        category: categoryById.get(place.categoryId),
        isFavorite: storage.isFavorite(place.id),
        onToggleFavorite: storage.toggleFavorite,
      }));
    }

    body.append(
      el('p', { class: 'scan-hint', text: 'เลือกรัศมีค้นหา จากนั้นกดสแกน' }),
      radiusChips,
      mapEl,
      scanBtn,
      resultEl,
    );
  }

  /* -------- Polygon Mode -------- */
  function renderPolygonMode() {
    clear(body);
    const resultEl = el('div', { class: 'scan-polygon-result scan-polygon-result--hidden' });

    function onScanComplete({ matched, grouped, areaKm2 }) {
      clear(resultEl);
      resultEl.classList.remove('scan-polygon-result--hidden');

      const catRows = Object.values(grouped).map((g) =>
        el('div', { class: 'scan-result__cat-row' }, [
          el('span', { class: 'scan-result__cat-label' }, [
            el('span', { text: g.cat?.icon ?? '📍' }),
            el('span', { text: ` ${g.cat?.name ?? 'อื่น ๆ'}` }),
          ]),
          el('strong', { text: String(g.count) }),
          buildProgressBar(g.count, matched.length),
        ])
      );

      resultEl.append(
        el('div', { class: 'scan-polygon-summary' }, [
          el('div', { class: 'scan-polygon-summary__area' }, [
            el('span', { class: 'scan-total__num', text: String(matched.length) }),
            el('span', { text: ' รายการ' }),
          ]),
          el('p', { class: 'scan-polygon-summary__sub', text: 'พบข้อมูลในพื้นที่นี้' }),
          el('div', { class: 'scan-progress' }, [
            el('div', { class: 'scan-progress__bar', style: 'width:100%' }),
          ]),
          el('p', { class: 'scan-polygon-summary__area-label', text: `พื้นที่ ${areaKm2.toFixed(2)} ตร.กม.` }),
        ]),
        el('div', { class: 'scan-result__cats' }, catRows),
        el('button', {
          class: 'btn btn--outline btn--full',
          type: 'button',
          text: '⬇️ ดาวน์โหลดรายงาน (PDF)',
          onClick: () => toast.show('ฟีเจอร์นี้จะพร้อมใช้เร็ว ๆ นี้', 'info'),
        }),
      );
    }

    function buildProgressBar(count, total) {
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return el('div', { class: 'scan-progress' }, [
        el('div', { class: 'scan-progress__bar', style: `width:${pct}%` }),
      ]);
    }

    body.append(
      PolygonScanner({ places, categories, onScanComplete }),
      resultEl,
    );
  }

  function renderBody() {
    if (mode === 'gps') renderGpsMode();
    else renderPolygonMode();
  }

  renderBody();

  return el('div', { class: 'page page--scan' }, [
    el('div', { class: 'scan-header' }, [
      el('h2', { class: 'page-title', text: 'สแกนพื้นที่' }),
    ]),
    modeBar,
    body,
  ]);
}
