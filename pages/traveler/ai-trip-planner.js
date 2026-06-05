/**
 * pages/traveler/ai-trip-planner.js
 * AI Trip Planner — สร้างแผนเที่ยวอัตโนมัติตามงบประมาณ เวลา และความสนใจ
 */

import { el, clear } from '../../lib/dom.js';
import { navigate } from '../../lib/router.js';
import { formatRating, formatPriceLevel } from '../../lib/format.js';
import { toast } from '../../components/toast.js';

const BUDGET_OPTIONS = [
  { id: 'low',  label: 'ประหยัด',   sub: 'ฟรี – ฿200/คน',  levels: [0, 1]    },
  { id: 'mid',  label: 'ปานกลาง',  sub: '฿200 – ฿600/คน', levels: [0, 1, 2] },
  { id: 'high', label: 'พรีเมียม', sub: '฿600+/คน',        levels: [0, 1, 2, 3] },
];

const TIME_OPTIONS = [
  { id: 2,  label: '2 ชม.',   places: 1 },
  { id: 4,  label: '4 ชม.',   places: 2 },
  { id: 6,  label: '6 ชม.',   places: 3 },
  { id: 8,  label: 'วันเต็ม', places: 5 },
];

const AI_PERSONAS = {
  beach:     { icon: '🏖️', type: 'ทริปชิลริมทะเล',        vibe: 'ผ่อนคลาย สบาย ๆ' },
  mountain:  { icon: '⛰️', type: 'ทริปผจญภัยธรรมชาติ',   vibe: 'แอดเวนเจอร์ สดชื่น' },
  temple:    { icon: '🛕', type: 'ทริปวัฒนธรรมและประวัติศาสตร์', vibe: 'ลึกซึ้ง น่าศึกษา' },
  food:      { icon: '🍜', type: 'ทริปสายกิน',             vibe: 'อร่อย หลากหลาย' },
  market:    { icon: '🛍️', type: 'ทริปช้อปปิ้งและตลาด',  vibe: 'คึกคัก สนุกสนาน' },
  viewpoint: { icon: '🌅', type: 'ทริปชมวิวและถ่ายภาพ',  vibe: 'สวยงาม น่าจดจำ' },
};

export function AiTripPlannerPage({ places, categories }) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  let budget = 'mid';
  let hours = 4;
  let interests = new Set(categories.map((c) => c.id));
  let plan = null;

  const root = el('div', { class: 'page page--ai-trip' });

  /* ---------- AI Logic ---------- */
  function generatePlan() {
    const budgetOpt = BUDGET_OPTIONS.find((b) => b.id === budget);
    const timeOpt   = TIME_OPTIONS.find((t) => t.id === hours);

    const eligible = places.filter(
      (p) => interests.has(p.categoryId) && budgetOpt.levels.includes(p.priceLevel),
    );

    if (!eligible.length) return null;

    const sorted  = [...eligible].sort((a, b) => b.rating - a.rating);
    const picked  = sorted.slice(0, timeOpt.places);

    /* หา persona จากหมวดที่มีมากที่สุด */
    const catCount = {};
    for (const p of picked) catCount[p.categoryId] = (catCount[p.categoryId] ?? 0) + 1;
    const dominant = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    const persona  = AI_PERSONAS[dominant] ?? { icon: '🗺️', type: 'ทริปผสม', vibe: 'หลากหลาย น่าสนใจ' };

    /* สร้าง itinerary */
    let hour = 8;
    const itinerary = picked.map((place) => {
      const time = `${String(hour).padStart(2, '0')}:00`;
      hour += Math.ceil(hours / picked.length);
      return { time, place };
    });

    return { persona, itinerary, hours, budgetOpt };
  }

  /* ---------- Render ---------- */
  function render() {
    clear(root);
    root.append(
      /* topbar */
      el('div', { class: 'page-topbar' }, [
        el('button', { class: 'back-btn', type: 'button', text: '←',
          onClick: () => navigate('traveler', 'home') }),
        el('div', {}, [
          el('h2', { class: 'page-title', text: '🤖 AI Trip Planner' }),
          el('p', { class: 'page-sub', text: 'บอก AI แล้วให้มันออกแบบทริปให้คุณ' }),
        ]),
      ]),

      /* form */
      el('div', { class: 'ai-form' }, [

        /* งบประมาณ */
        el('div', { class: 'ai-form__group' }, [
          el('p', { class: 'ai-form__label', text: '💰 งบประมาณต่อคน' }),
          el('div', { class: 'ai-chips' },
            BUDGET_OPTIONS.map((opt) =>
              el('button', {
                class: `ai-chip ${budget === opt.id ? 'ai-chip--active' : ''}`,
                type: 'button',
                onClick: () => { budget = opt.id; render(); },
              }, [
                el('span', { class: 'ai-chip__label', text: opt.label }),
                el('span', { class: 'ai-chip__sub', text: opt.sub }),
              ])
            )
          ),
        ]),

        /* เวลาที่มี */
        el('div', { class: 'ai-form__group' }, [
          el('p', { class: 'ai-form__label', text: '⏱️ เวลาที่มี' }),
          el('div', { class: 'ai-chips ai-chips--row' },
            TIME_OPTIONS.map((opt) =>
              el('button', {
                class: `ai-chip ai-chip--sm ${hours === opt.id ? 'ai-chip--active' : ''}`,
                type: 'button',
                onClick: () => { hours = opt.id; render(); },
              }, [
                el('span', { class: 'ai-chip__label', text: opt.label }),
              ])
            )
          ),
        ]),

        /* ความสนใจ */
        el('div', { class: 'ai-form__group' }, [
          el('p', { class: 'ai-form__label', text: '❤️ ความสนใจ' }),
          el('div', { class: 'ai-chips ai-chips--row' },
            categories.map((cat) =>
              el('button', {
                class: `ai-chip ai-chip--sm ${interests.has(cat.id) ? 'ai-chip--active' : ''}`,
                type: 'button',
                onClick: () => {
                  if (interests.has(cat.id)) {
                    if (interests.size > 1) interests.delete(cat.id);
                  } else {
                    interests.add(cat.id);
                  }
                  render();
                },
              }, [
                el('span', { text: `${cat.icon} ${cat.name}` }),
              ])
            )
          ),
        ]),

        /* ปุ่มสร้างแผน */
        el('button', {
          class: 'btn btn--primary btn--full ai-generate-btn',
          type: 'button',
          text: '✨ ให้ AI สร้างแผนเที่ยว',
          onClick: () => {
            plan = generatePlan();
            if (!plan) {
              toast.show('ไม่พบสถานที่ที่ตรงกับเงื่อนไข ลองปรับความสนใจใหม่', 'error');
              return;
            }
            render();
          },
        }),
      ]),

      /* ผลลัพธ์ */
      plan ? renderPlan(plan) : null,
    );
  }

  function renderPlan({ persona, itinerary, hours, budgetOpt }) {
    const endHour = 8 + hours;

    return el('div', { class: 'ai-result' }, [

      /* AI summary card */
      el('div', { class: 'ai-summary-card' }, [
        el('div', { class: 'ai-summary-card__icon', text: persona.icon }),
        el('div', {}, [
          el('h3', { class: 'ai-summary-card__type', text: persona.type }),
          el('p', { class: 'ai-summary-card__vibe', text: `บรรยากาศ: ${persona.vibe}` }),
          el('p', { class: 'ai-summary-card__meta' }, [
            el('span', { text: `⏱️ ${hours === 8 ? 'วันเต็ม' : `${hours} ชั่วโมง`}` }),
            el('span', { text: '  ·  ' }),
            el('span', { text: `💰 ${budgetOpt.sub}` }),
            el('span', { text: '  ·  ' }),
            el('span', { text: `📍 ${itinerary.length} สถานที่` }),
          ]),
        ]),
      ]),

      /* itinerary */
      el('div', { class: 'home-section' }, [
        el('div', { class: 'home-section__hd' }, [
          el('h3', { class: 'home-section__title', text: '📅 แผนเที่ยว' }),
          el('button', { class: 'btn btn--outline btn--sm', type: 'button', text: '📤 แชร์',
            onClick: () => toast.show('คัดลอกลิงก์แผนเที่ยวแล้ว', 'success') }),
        ]),
        ...itinerary.map(({ time, place }, i) => {
          const cat = categoryById.get(place.categoryId);
          const isLast = i === itinerary.length - 1;
          return el('div', { class: 'trip-step' }, [
            el('div', { class: 'trip-step__time-col' }, [
              el('div', { class: 'trip-step__time', text: time }),
              el('div', { class: 'trip-step__dot' }),
              isLast ? null : el('div', { class: 'trip-step__line' }),
            ]),
            el('div', { class: 'trip-step__card' }, [
              el('div', { class: 'trip-step__badge', text: `${cat?.icon ?? ''} ${cat?.name ?? ''}` }),
              el('h4', { class: 'trip-step__name', text: place.name }),
              el('div', { class: 'ai-place-meta' }, [
                el('span', { text: `⭐ ${formatRating(place.rating)}` }),
                el('span', { text: `  ·  ${formatPriceLevel(place.priceLevel)}` }),
                el('span', { text: `  ·  ${place.openHours}` }),
              ]),
              el('button', {
                class: 'btn btn--ghost btn--sm', type: 'button', text: '🗺️ นำทาง',
                onClick: () => window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`, '_blank'
                ),
              }),
            ]),
          ]);
        }),
      ]),
    ]);
  }

  render();
  return root;
}
