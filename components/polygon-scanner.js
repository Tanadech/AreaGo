/**
 * polygon-scanner.js
 * Wizard 3 ขั้นตอน: กำหนดพื้นที่ (วาด polygon) → สแกน → ผลลัพธ์
 * ใช้ Google Maps JavaScript API สำหรับการวาด polygon บนแผนที่
 */

import { el, clear, qs } from '../lib/dom.js';
import { CONFIG } from '../lib/constants.js';
import { initMap } from './map-view.js';

const STEPS = ['กำหนดพื้นที่', 'สแกนข้อมูล', 'สรุปผล'];

/**
 * คำนวณพื้นที่ polygon (ตร.กม.) โดยประมาณ (Shoelace formula)
 */
function calcPolygonAreaKm2(latlngs) {
  if (latlngs.length < 3) return 0;
  let area = 0;
  const n = latlngs.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += latlngs[i].lng * latlngs[j].lat;
    area -= latlngs[j].lng * latlngs[i].lat;
  }
  const degArea = Math.abs(area) / 2;
  return degArea * 111.32 * 111.32;
}

/**
 * กรองสถานที่ที่อยู่ภายใน polygon ด้วย ray-casting algorithm
 */
function isPointInPolygon(latlng, polygon) {
  const { lat, lng } = latlng;
  const pts = polygon;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].lng, yi = pts[i].lat;
    const xj = pts[j].lng, yj = pts[j].lat;
    const intersect = ((yi > lat) !== (yj > lat)) &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * @param {{places:Array, categories:Array, onScanComplete:(results:Object)=>void}} props
 * @returns {HTMLElement}
 */
export function PolygonScanner({ places, categories, onScanComplete }) {
  let currentStep = 0;
  let drawnPolygon = null;
  let polygonPoints = []; /* array of {lat, lng} */
  let map = null;
  let drawOverlays = []; /* overlay objects ที่วาดบนแผนที่ */

  const root = el('div', { class: 'polygon-scanner' });

  function renderStepHeader() {
    return el('div', { class: 'scanner-steps' }, [
      ...STEPS.map((label, i) =>
        el('div', { class: `scanner-step ${i === currentStep ? 'scanner-step--active' : ''} ${i < currentStep ? 'scanner-step--done' : ''}` }, [
          el('div', { class: 'scanner-step__num', text: i < currentStep ? '✓' : String(i + 1) }),
          el('span', { class: 'scanner-step__label', text: label }),
        ])
      ),
      ...STEPS.slice(1).map((_, i) =>
        el('div', { class: `scanner-step__line ${i < currentStep ? 'scanner-step__line--done' : ''}` })
      ),
    ]);
  }

  /* ---------- Step 1: วาด polygon ---------- */
  function renderStep1() {
    const mapEl = el('div', { id: 'polygon-map', class: 'scanner-map' });
    const hint = el('p', { class: 'scanner-hint', text: `ปักหมุดอย่างน้อย ${CONFIG.polygonMinPoints} จุด เพื่อกำหนดขอบเขตพื้นที่` });
    const counter = el('span', { class: 'scanner-counter', text: `จุดที่ปักแล้ว 0 / ${CONFIG.polygonMaxPoints} จุด (แนะนำ 4-8 จุด)` });
    const btnScan = el('button', {
      class: 'btn btn--primary btn--full scanner-btn-scan',
      type: 'button',
      disabled: 'true',
      text: 'สแกนพื้นที่นี้',
      onClick: () => {
        currentStep = 1;
        render();
        startScan();
      },
    });
    const btnReset = el('button', {
      class: 'btn btn--outline scanner-btn-reset',
      type: 'button',
      text: '🗑️ ลบจุดสุดท้าย',
      onClick: resetLastPoint,
    });

    setTimeout(async () => {
      map = await initMap(mapEl, { zoom: 14 });

      map.addListener('click', (e) => {
        if (polygonPoints.length >= CONFIG.polygonMaxPoints) return;
        polygonPoints.push({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        updateDrawing();
      });
    }, 100);

    function updateDrawing() {
      /* ลบ overlay เดิมทั้งหมด */
      drawOverlays.forEach((o) => o.setMap(null));
      drawOverlays = [];

      const n = polygonPoints.length;

      /* วาด marker แต่ละจุดพร้อมหมายเลข */
      polygonPoints.forEach((pt, i) => {
        const marker = new google.maps.Marker({
          position: pt,
          map,
          label: {
            text: String(i + 1),
            color: 'white',
            fontSize: '11px',
            fontWeight: 'bold',
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#10b981',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          zIndex: 100,
        });
        drawOverlays.push(marker);
      });

      if (n >= 2) {
        const polyline = new google.maps.Polyline({
          path: polygonPoints,
          map,
          strokeColor: '#10b981',
          strokeWeight: 2,
          strokeOpacity: 1,
        });
        drawOverlays.push(polyline);
      }

      if (n >= 3) {
        const polygon = new google.maps.Polygon({
          paths: polygonPoints,
          map,
          strokeColor: '#10b981',
          strokeWeight: 2,
          fillColor: '#10b981',
          fillOpacity: 0.15,
        });
        drawOverlays.push(polygon);
      }

      counter.textContent = `จุดที่ปักแล้ว ${n} / ${CONFIG.polygonMaxPoints} จุด (แนะนำ 4-8 จุด)`;
      btnScan.disabled = n < CONFIG.polygonMinPoints;
      drawnPolygon = n >= 3 ? polygonPoints : null;
    }

    function resetLastPoint() {
      if (polygonPoints.length > 0) {
        polygonPoints.pop();
        updateDrawing();
      }
    }

    return el('div', { class: 'scanner-step-body' }, [
      mapEl, hint, counter,
      el('div', { class: 'scanner-actions' }, [btnReset, btnScan]),
    ]);
  }

  /* ---------- Step 2: กำลังสแกน (animation) ---------- */
  function renderStep2() {
    return el('div', { class: 'scanner-step-body scanner-scanning' }, [
      el('div', { class: 'scanner-wave' }, [
        el('div', { class: 'scanner-wave__ring' }),
        el('div', { class: 'scanner-wave__ring' }),
        el('div', { class: 'scanner-wave__ring' }),
      ]),
      el('p', { class: 'scanner-scanning__text', text: 'กำลังวิเคราะห์ข้อมูล...' }),
      el('ul', { class: 'scanner-scanning__steps' }, [
        el('li', { text: '✓ ดึงข้อมูลสถานที่' }),
        el('li', { text: '✓ วิเคราะห์พิกัด' }),
        el('li', { id: 'scan-step-3', text: '  จัดหมวดหมู่...' }),
        el('li', { id: 'scan-step-4', text: '  บันทึกเข้าระบบ...' }),
      ]),
    ]);
  }

  function startScan() {
    setTimeout(() => {
      const s3 = document.getElementById('scan-step-3');
      const s4 = document.getElementById('scan-step-4');
      if (s3) s3.textContent = '✓ จัดหมวดหมู่';
      if (s4) s4.textContent = '✓ บันทึกเข้าระบบ';
    }, 1200);

    setTimeout(() => {
      const catById = new Map(categories.map((c) => [c.id, c]));
      const matched = places.filter((p) => isPointInPolygon(p, drawnPolygon ?? []));
      const areaKm2 = calcPolygonAreaKm2(drawnPolygon ?? []);

      const grouped = {};
      for (const p of matched) {
        const cat = catById.get(p.categoryId);
        const key = cat?.id ?? 'other';
        if (!grouped[key]) grouped[key] = { cat, count: 0 };
        grouped[key].count++;
      }

      currentStep = 2;
      render();
      onScanComplete({ matched, grouped, areaKm2, polygon: drawnPolygon });
    }, 2200);
  }

  /* ---------- Step 3: ผลลัพธ์ placeholder (controller จัดการ) ---------- */
  function renderStep3() {
    return el('div', { class: 'scanner-step-body' }, [
      el('p', { class: 'scanner-scanning__text', text: 'กำลังแสดงผลลัพธ์...' }),
    ]);
  }

  function render() {
    clear(root);
    root.append(
      renderStepHeader(),
      currentStep === 0 ? renderStep1()
        : currentStep === 1 ? renderStep2()
        : renderStep3(),
    );
  }

  render();
  return root;
}
