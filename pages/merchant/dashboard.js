/**
 * pages/merchant/dashboard.js
 * หน้า Dashboard ผู้ค้า — สถิติร้าน, จัดการข้อมูล, โปรโมชั่น
 */

import { el, clear } from '../../lib/dom.js';
import { StatCard } from '../../components/stat-card.js';
import { navigate } from '../../lib/router.js';
import { toast } from '../../components/toast.js';
import { MERCHANT_TYPES } from '../../lib/constants.js';

export function MerchantDashboard({ stats }) {
  const ms = stats.merchantStats;

  const statCards = [
    StatCard({ icon: '👁️', label: 'จำนวนคนดูร้าน',      value: ms.views,    color: '#0d9488' }),
    StatCard({ icon: '🧭', label: 'จำนวนคนกดนำทาง',     value: ms.navigate, color: '#2563eb' }),
    StatCard({ icon: '📞', label: 'จำนวนคนกดโทร',        value: ms.calls,    color: '#d97706' }),
    StatCard({ icon: '❤️', label: 'จำนวนคนบันทึกร้าน',  value: ms.saved,    color: '#dc2626' }),
  ];

  const promoOptions = [
    { days: 7,  label: '7 วัน',  price: '฿ 299',  benefits: ['ติดอันดับหน้าแรก', 'แสดงเป็นร้านแนะนำ'] },
    { days: 30, label: '30 วัน', price: '฿ 899',  benefits: ['ติดอันดับหน้าแรก', 'แสดงเป็นร้านแนะนำ', 'ป้าย Sponsored'] },
    { days: 90, label: '90 วัน', price: '฿ 1,990', benefits: ['ทุกอย่างของ 30 วัน', 'รายงานสถิติเพิ่มเติม', 'ลูกค้าสัมพันธ์'] },
  ];

  return el('div', { class: 'page page--merchant' }, [
    /* header */
    el('div', { class: 'merchant-header' }, [
      el('div', {}, [
        el('h2', { class: 'page-title', text: '🏪 Dashboard ร้านค้า' }),
        el('p', { class: 'page-sub', text: 'จัดการและติดตามสถิติร้านของคุณ' }),
      ]),
      el('button', {
        class: 'btn btn--primary',
        type: 'button',
        text: '+ จัดการร้าน',
        onClick: () => navigate('merchant', 'store'),
      }),
    ]),

    /* สถิติ */
    el('div', { class: 'home-section' }, [
      el('h3', { class: 'home-section__title', text: '📊 สถิติร้านค้า' }),
      el('div', { class: 'stat-grid stat-grid--2' }, statCards),
    ]),

    /* ประเภทร้านค้า */
    el('div', { class: 'home-section' }, [
      el('h3', { class: 'home-section__title', text: '🗂️ ประเภทกิจการ' }),
      el('div', { class: 'merchant-types' },
        MERCHANT_TYPES.map((t) =>
          el('div', { class: 'merchant-type-chip' }, [
            el('span', { text: t.icon }),
            el('span', { text: t.name }),
          ])
        )
      ),
    ]),

    /* โปรโมชั่น */
    el('div', { class: 'home-section' }, [
      el('h3', { class: 'home-section__title', text: '🎯 โปรโมทร้านค้า' }),
      el('div', { class: 'promo-plans' },
        promoOptions.map((opt) =>
          el('div', { class: 'promo-plan' }, [
            el('div', { class: 'promo-plan__header' }, [
              el('span', { class: 'promo-plan__label', text: opt.label }),
              el('span', { class: 'promo-plan__price', text: opt.price }),
            ]),
            el('ul', { class: 'promo-plan__benefits' },
              opt.benefits.map((b) => el('li', { text: `✓ ${b}` }))
            ),
            el('button', {
              class: 'btn btn--primary btn--full',
              type: 'button',
              text: `เลือก ${opt.label}`,
              onClick: () => toast.show(`เลือกแพ็กเกจ ${opt.label} แล้ว! ทีมงานจะติดต่อกลับ`, 'success'),
            }),
          ])
        )
      ),
    ]),
  ]);
}
