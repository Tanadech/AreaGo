/**
 * pages/traveler/trip-page.js
 * วางแผนเที่ยว Day Trip — เลือกสถานที่ → ระบบสร้าง itinerary อัตโนมัติ
 */

import { el, clear } from '../../lib/dom.js';
import { STORAGE_KEYS } from '../../lib/constants.js';
import { formatDistance } from '../../lib/format.js';
import { toast } from '../../components/toast.js';

const START_HOUR = 8;

function buildItinerary(selectedPlaces) {
  let hour = START_HOUR;
  return selectedPlaces.map((place, i) => {
    const time = `${String(hour).padStart(2, '0')}:00`;
    hour += 2;
    return { time, place, index: i };
  });
}

function pad(n) { return String(n).padStart(2, '0'); }

export function TripPage({ places, categories }) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.tripPlan) ?? '[]'); } catch {}

  let selected = saved.map((id) => places.find((p) => p.id === id)).filter(Boolean);

  const pickPanel = el('div', { class: 'trip-pick-panel' });
  const itineraryPanel = el('div', { class: 'trip-itinerary' });

  function savePlan() {
    try { localStorage.setItem(STORAGE_KEYS.tripPlan, JSON.stringify(selected.map((p) => p.id))); } catch {}
  }

  function renderPick() {
    clear(pickPanel);
    const catGroups = {};
    for (const p of places) {
      if (!catGroups[p.categoryId]) catGroups[p.categoryId] = [];
      catGroups[p.categoryId].push(p);
    }

    pickPanel.append(
      el('p', { class: 'trip-pick__hint', text: 'เลือกสถานที่ที่ต้องการเที่ยว (ลากเรียงลำดับได้)' }),
      ...categories.map((cat) => {
        const items = (catGroups[cat.id] ?? []).slice(0, 4);
        if (!items.length) return null;
        return el('div', { class: 'trip-pick__group' }, [
          el('h4', { class: 'trip-pick__cat', text: `${cat.icon} ${cat.name}` }),
          el('div', { class: 'trip-pick__items' },
            items.map((place) => {
              const isSelected = selected.some((p) => p.id === place.id);
              return el('button', {
                class: `trip-place-chip ${isSelected ? 'trip-place-chip--selected' : ''}`,
                type: 'button',
                onClick: () => togglePlace(place),
              }, [
                el('span', { text: place.name }),
                el('span', { class: 'trip-place-chip__check', text: isSelected ? '✓' : '+' }),
              ]);
            })
          ),
        ]);
      }).filter(Boolean)
    );
  }

  function renderItinerary() {
    clear(itineraryPanel);
    if (!selected.length) {
      itineraryPanel.append(
        el('div', { class: 'trip-empty' }, [
          el('span', { text: '📋', class: 'trip-empty__icon' }),
          el('p', { text: 'เลือกสถานที่เพื่อสร้างแผนเที่ยว' }),
        ])
      );
      return;
    }

    const plan = buildItinerary(selected);
    itineraryPanel.append(
      el('div', { class: 'trip-itinerary__header' }, [
        el('h3', { class: 'trip-itinerary__title', text: '🗺️ Day Trip Plan' }),
        el('div', { class: 'trip-itinerary__actions' }, [
          el('button', { class: 'btn btn--outline btn--sm', type: 'button', text: 'ล้างแผน',
            onClick: () => { selected = []; savePlan(); renderPick(); renderItinerary(); },
          }),
          el('button', { class: 'btn btn--primary btn--sm', type: 'button', text: '📤 แชร์',
            onClick: () => toast.show('คัดลอกลิงก์แผนเที่ยวแล้ว', 'success'),
          }),
        ]),
      ]),
      ...plan.map(({ time, place }) => {
        const cat = categoryById.get(place.categoryId);
        return el('div', { class: 'trip-step' }, [
          el('div', { class: 'trip-step__time-col' }, [
            el('div', { class: 'trip-step__time', text: time }),
            el('div', { class: 'trip-step__dot' }),
            el('div', { class: 'trip-step__line' }),
          ]),
          el('div', { class: 'trip-step__card' }, [
            el('div', { class: 'trip-step__badge', text: `${cat?.icon ?? '📍'} ${cat?.name ?? ''}` }),
            el('h4', { class: 'trip-step__name', text: place.name }),
            el('p', { class: 'trip-step__sub', text: place.openHours }),
            el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: '🗺️ นำทาง',
              onClick: () => window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`, '_blank'
              ),
            }),
          ]),
        ]);
      })
    );
  }

  function togglePlace(place) {
    const idx = selected.findIndex((p) => p.id === place.id);
    if (idx === -1) selected.push(place);
    else selected.splice(idx, 1);
    savePlan();
    renderPick();
    renderItinerary();
    toast.show(idx === -1 ? `เพิ่ม "${place.name}" แล้ว` : `ลบ "${place.name}" แล้ว`, 'success');
  }

  renderPick();
  renderItinerary();

  return el('div', { class: 'page page--trip' }, [
    el('h2', { class: 'page-title', text: '📋 วางแผนเที่ยว' }),
    el('div', { class: 'trip-layout' }, [
      el('div', { class: 'trip-layout__pick' }, [pickPanel]),
      el('div', { class: 'trip-layout__plan' }, [itineraryPanel]),
    ]),
  ]);
}
