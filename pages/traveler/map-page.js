/**
 * pages/traveler/map-page.js
 * หน้าแผนที่แบบ full-screen พร้อม filter หมวดหมู่และ marker
 */

import { el, clear } from '../../lib/dom.js';
import { initMap, addPlaceMarkers } from '../../components/map-view.js';
import { PlaceDetail } from '../../components/place-detail.js';
import { SearchBox } from '../../components/search-box.js';
import { ALL_CATEGORIES } from '../../lib/constants.js';
import * as storage from '../../lib/storage.js';

export function MapPage({ places, categories, modal }) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  let map = null;
  let markerLayer = null;
  let activeCat = ALL_CATEGORIES;
  let activeQuery = '';

  const mapContainer = el('div', { class: 'map-full' });
  const filterBar = buildFilterBar();
  const scanBtn = el('button', {
    class: 'map-scan-fab',
    type: 'button',
    html: '<span>📡</span><span>สแกนพื้นที่</span>',
    onClick: () => import('../../lib/router.js').then(({ navigate }) => navigate('traveler', 'scan')),
  });

  function buildFilterBar() {
    const allCats = [{ id: ALL_CATEGORIES, name: 'ทั้งหมด', icon: '🧭' }, ...categories];
    const bar = el('div', { class: 'map-filter-bar' }, [
      SearchBox({ onSearch: (q) => { activeQuery = q; refresh(); }, placeholder: 'ค้นหาสถานที่ ห้องเช่า ถนน...' }),
      el('div', { class: 'map-filter-chips' },
        allCats.map((c) =>
          el('button', {
            class: `chip ${c.id === activeCat ? 'chip--active' : ''}`,
            type: 'button',
            text: `${c.icon} ${c.name}`,
            onClick: (ev) => {
              activeCat = c.id;
              bar.querySelectorAll('.chip').forEach((b) => b.classList.remove('chip--active'));
              ev.currentTarget.classList.add('chip--active');
              refresh();
            },
          })
        )
      ),
    ]);
    return bar;
  }

  function getFiltered() {
    const q = activeQuery.toLowerCase();
    return places.filter((p) => {
      const catOk = activeCat === ALL_CATEGORIES || p.categoryId === activeCat;
      const qOk = !q || p.name.toLowerCase().includes(q) || (p.nameEn ?? '').toLowerCase().includes(q);
      return catOk && qOk;
    });
  }

  function refresh() {
    if (!map) return;
    if (markerLayer) markerLayer.clearLayers();
    markerLayer = addPlaceMarkers(map, getFiltered(), categoryById, openDetail);
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

  function buildSummary() {
    const catCounts = {};
    for (const p of getFiltered()) {
      catCounts[p.categoryId] = (catCounts[p.categoryId] ?? 0) + 1;
    }
    const items = categories.slice(0, 5).map((c) =>
      el('div', { class: 'map-summary__item' }, [
        el('span', { text: c.icon }),
        el('span', { text: String(catCounts[c.id] ?? 0) }),
      ])
    );
    return el('div', { class: 'map-summary' }, [
      el('p', { class: 'map-summary__label', text: 'สรุปข้อมูลในพื้นที่นี้' }),
      el('div', { class: 'map-summary__row' }, items),
    ]);
  }

  /* initMap เป็น async — ต้อง await */
  setTimeout(async () => {
    map = await initMap(mapContainer);
    refresh();
  }, 50);

  return el('div', { class: 'page page--map' }, [
    filterBar,
    mapContainer,
    scanBtn,
    buildSummary(),
  ]);
}
