/**
 * pages/traveler/area-intelligence.js
 * Area Intelligence — สแกนพื้นที่แล้วสรุปว่าโซนนี้เหมาะกับใคร มีอะไรเด่น ใช้เวลากี่ชั่วโมง
 */

import { el, clear } from '../../lib/dom.js';
import { navigate } from '../../lib/router.js';
import { distanceKm, isWithinRadius } from '../../lib/geo.js';
import { initMap, addPlaceMarkers, addRadiusCircle, addUserMarker } from '../../components/map-view.js';
import { CONFIG, RADIUS_OPTIONS } from '../../lib/constants.js';
import { formatRating } from '../../lib/format.js';
import { toast } from '../../components/toast.js';

/* --------- zone profiles --------- */
const ZONE_PROFILES = {
  beach:     { traveler: 'นักท่องเที่ยวสายทะเลและชายหาด',         icon: '🏖️', color: '#0ea5e9', hoursPerPlace: 2.5 },
  mountain:  { traveler: 'นักผจญภัยและสายธรรมชาติ',              icon: '⛰️', color: '#16a34a', hoursPerPlace: 3   },
  temple:    { traveler: 'นักท่องเที่ยวเชิงวัฒนธรรม/ประวัติศาสตร์', icon: '🛕', color: '#d97706', hoursPerPlace: 1.5 },
  food:      { traveler: 'สายกิน Food Lover',                    icon: '🍜', color: '#dc2626', hoursPerPlace: 1   },
  market:    { traveler: 'สายช้อปปิ้งและตลาด',                   icon: '🛍️', color: '#9333ea', hoursPerPlace: 2   },
  viewpoint: { traveler: 'ช่างภาพและนักชมวิว',                   icon: '🌅', color: '#ea580c', hoursPerPlace: 1.5 },
};

/* --------- AI summary text --------- */
function buildSummaryText(analysis) {
  const { dominant, total, visitHours, topPlaces } = analysis;
  const profile = ZONE_PROFILES[dominant.id] ?? { traveler: 'นักท่องเที่ยวทั่วไป', icon: '🗺️' };
  const topName = topPlaces[0]?.name ?? 'สถานที่ในพื้นที่นี้';

  return `โซนนี้เหมาะกับ${profile.traveler} โดยเฉพาะ `
    + `มี ${total} จุดที่น่าสนใจรอบบริเวณนี้ `
    + `และ "${topName}" เป็นจุดที่ได้รับความนิยมสูงสุด `
    + `ควรจัดเวลาอย่างน้อย ${visitHours} ชั่วโมงเพื่อสัมผัสประสบการณ์ได้ครบถ้วน`;
}

/* --------- core analysis --------- */
function analyzeZone(places, categories) {
  if (!places.length) return null;

  const catById = new Map(categories.map((c) => [c.id, c]));

  /* นับตามหมวด */
  const catCount = {};
  for (const p of places) {
    catCount[p.categoryId] = (catCount[p.categoryId] ?? 0) + 1;
  }

  /* หมวดเด่น */
  const [dominantId, dominantCount] = Object.entries(catCount)
    .sort((a, b) => b[1] - a[1])[0];
  const dominant = catById.get(dominantId) ?? { id: dominantId, name: dominantId, icon: '📍' };
  const profile  = ZONE_PROFILES[dominantId] ?? { traveler: 'นักท่องเที่ยวทั่วไป', icon: '🗺️', color: '#64748b', hoursPerPlace: 1.5 };

  /* top 3 สถานที่ */
  const topPlaces = [...places].sort((a, b) => b.rating - a.rating).slice(0, 3);

  /* ประเมินชั่วโมง */
  const visitHours = Math.min(12, Math.max(1, Math.round(places.length * profile.hoursPerPlace)));

  /* breakdown */
  const breakdown = Object.entries(catCount)
    .map(([id, count]) => ({ cat: catById.get(id), count, pct: Math.round((count / places.length) * 100) }))
    .sort((a, b) => b.count - a.count);

  return { dominant, profile, topPlaces, visitHours, breakdown, total: places.length };
}

export function AreaIntelligencePage({ places, categories }) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  let selectedRadius = 3;
  let map = null;
  let markerLayer = null;
  let radiusCircle = null;
  let userMarker = null;
  let analysis = null;

  const root       = el('div', { class: 'page page--area-intel' });
  const mapEl      = el('div', { class: 'scanner-map' });
  const resultEl   = el('div', { class: 'intel-result intel-result--hidden' });

  /* ---------- UI ---------- */
  function render() {
    clear(root);
    root.append(
      /* topbar */
      el('div', { class: 'page-topbar' }, [
        el('button', { class: 'back-btn', type: 'button', text: '←',
          onClick: () => navigate('traveler', 'home') }),
        el('div', {}, [
          el('h2', { class: 'page-title', text: '🧠 Area Intelligence' }),
          el('p', { class: 'page-sub', text: 'สแกนพื้นที่แล้วให้ AI วิเคราะห์' }),
        ]),
      ]),

      /* รัศมี */
      el('div', { class: 'ai-form__group' }, [
        el('p', { class: 'ai-form__label', text: '📐 รัศมีสแกน' }),
        el('div', { class: 'ai-chips ai-chips--row' },
          RADIUS_OPTIONS.map((opt) =>
            el('button', {
              class: `ai-chip ai-chip--sm ${selectedRadius === opt.value ? 'ai-chip--active' : ''}`,
              type: 'button',
              text: opt.label,
              onClick: () => { selectedRadius = opt.value; render(); },
            })
          )
        ),
      ]),

      /* แผนที่ */
      mapEl,

      /* ปุ่มสแกน */
      el('button', {
        class: 'btn btn--primary btn--full',
        type: 'button',
        text: '🧠 สแกนและวิเคราะห์พื้นที่',
        onClick: scanAndAnalyze,
      }),

      resultEl,
    );

    /* init map */
    setTimeout(async () => {
      map = await initMap(mapEl);
      if (map && analysis) refreshMap(analysis.topPlaces.concat([]));
    }, 80);
  }

  async function scanAndAnalyze() {
    const btn = root.querySelector('.btn--primary');
    if (btn) { btn.disabled = true; btn.textContent = 'กำลังรับ GPS...'; }

    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 6000,
        })
      );
      doScan(pos.coords.latitude, pos.coords.longitude);
    } catch {
      toast.show('ไม่สามารถรับ GPS ได้ ใช้พิกัดเริ่มต้นแทน', 'error');
      doScan(CONFIG.defaultLat, CONFIG.defaultLng);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🧠 สแกนและวิเคราะห์พื้นที่'; }
    }
  }

  async function doScan(lat, lng) {
    /* อัปเดตแผนที่ */
    if (!map) map = await initMap(mapEl, { lat, lng, zoom: 14 });
    else { map.setCenter({ lat, lng }); map.setZoom(14); }

    if (userMarker) userMarker.setMap(null);
    if (radiusCircle) radiusCircle.setMap(null);
    if (markerLayer) markerLayer.clearLayers();

    userMarker   = addUserMarker(map, lat, lng);
    radiusCircle = addRadiusCircle(map, lat, lng, selectedRadius);

    /* กรองสถานที่ */
    const center  = { lat, lng };
    const matched = places
      .filter((p) => isWithinRadius(center, p, selectedRadius))
      .map((p) => ({ ...p, distanceKm: distanceKm(center, p) }));

    markerLayer = addPlaceMarkers(map, matched, categoryById, () => {});

    /* วิเคราะห์ */
    analysis = analyzeZone(matched, categories);
    renderResult(analysis);
  }

  function refreshMap(matched) {
    if (markerLayer) markerLayer.clearLayers();
    markerLayer = addPlaceMarkers(map, matched, categoryById, () => {});
  }

  function renderResult(data) {
    clear(resultEl);
    resultEl.classList.remove('intel-result--hidden');

    if (!data) {
      resultEl.append(
        el('div', { class: 'intel-empty' }, [
          el('span', { text: '🔍', class: 'trip-empty__icon' }),
          el('p', { text: 'ไม่พบสถานที่ในรัศมีนี้ ลองขยายรัศมีสแกน' }),
        ])
      );
      return;
    }

    const { dominant, profile, topPlaces, visitHours, breakdown, total } = data;

    resultEl.append(

      /* zone badge */
      el('div', { class: 'intel-zone-card', style: `border-left: 4px solid ${profile.color}` }, [
        el('div', { class: 'intel-zone-card__header' }, [
          el('span', { class: 'intel-zone-card__icon', text: profile.icon }),
          el('div', {}, [
            el('p', { class: 'intel-zone-card__traveler', text: `เหมาะกับ${profile.traveler}` }),
            el('p', { class: 'intel-zone-card__dominant', text: `หมวดหลัก: ${dominant.icon ?? ''} ${dominant.name}` }),
          ]),
        ]),
        el('div', { class: 'intel-stats' }, [
          intelStat('📍', 'สถานที่', `${total} จุด`),
          intelStat('⏱️', 'ควรใช้เวลา', `${visitHours} ชั่วโมง`),
          intelStat('⭐', 'คะแนนเฉลี่ย', formatRating(
            topPlaces.reduce((s, p) => s + p.rating, 0) / (topPlaces.length || 1)
          )),
        ]),
      ]),

      /* AI summary */
      el('div', { class: 'intel-ai-text' }, [
        el('p', { class: 'intel-ai-text__label', text: '🤖 AI วิเคราะห์' }),
        el('p', { class: 'intel-ai-text__body', text: buildSummaryText(data) }),
      ]),

      /* สถานที่เด่น */
      el('div', { class: 'home-section' }, [
        el('h3', { class: 'home-section__title', text: '🏆 สถานที่เด่นในโซนนี้' }),
        el('div', { class: 'intel-top-list' },
          topPlaces.map((p, i) => {
            const cat = categoryById.get(p.categoryId);
            return el('div', { class: 'intel-top-item' }, [
              el('span', { class: 'intel-top-item__rank', text: `${['🥇','🥈','🥉'][i]}` }),
              el('div', { class: 'intel-top-item__info' }, [
                el('p', { class: 'intel-top-item__name', text: p.name }),
                el('p', { class: 'intel-top-item__meta', text: `${cat?.icon ?? ''} ${cat?.name ?? ''} · ⭐ ${formatRating(p.rating)}` }),
              ]),
            ]);
          })
        ),
      ]),

      /* breakdown */
      el('div', { class: 'home-section' }, [
        el('h3', { class: 'home-section__title', text: '📊 สัดส่วนประเภทสถานที่' }),
        el('div', { class: 'scan-result__cats' },
          breakdown.map((b) =>
            el('div', { class: 'scan-result__cat-row' }, [
              el('span', { text: `${b.cat?.icon ?? '📍'} ${b.cat?.name ?? 'อื่น ๆ'}` }),
              el('div', { class: 'intel-bar-wrap' }, [
                el('div', { class: 'scan-progress' }, [
                  el('div', { class: 'scan-progress__bar', style: `width:${b.pct}%` }),
                ]),
              ]),
              el('strong', { text: `${b.count}` }),
            ])
          )
        ),
      ]),
    );
  }

  function intelStat(icon, label, value) {
    return el('div', { class: 'intel-stat' }, [
      el('span', { class: 'intel-stat__icon', text: icon }),
      el('span', { class: 'intel-stat__value', text: value }),
      el('span', { class: 'intel-stat__label', text: label }),
    ]);
  }

  render();
  return root;
}
