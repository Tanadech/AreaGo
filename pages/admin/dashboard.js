/**
 * pages/admin/dashboard.js
 * Dashboard กลาง Admin — ภาพรวมแพลตฟอร์ม, pending items, top lists
 */

import { el } from '../../lib/dom.js';
import { StatCard } from '../../components/stat-card.js';
import { navigate } from '../../lib/router.js';
import { toast } from '../../components/toast.js';

export function AdminDashboard({ stats }) {
  const { platform, topAreas, topPlaces, categoryBreakdown } = stats;

  return el('div', { class: 'page page--admin' }, [
    el('div', { class: 'admin-header' }, [
      el('h2', { class: 'page-title', text: '⚙️ Admin Dashboard' }),
      el('p', { class: 'page-sub', text: 'ภาพรวมแพลตฟอร์ม AreaScan Tourism' }),
    ]),

    /* สถิติหลัก */
    el('div', { class: 'home-section' }, [
      el('div', { class: 'stat-grid stat-grid--2' }, [
        StatCard({ icon: '👥', label: 'ผู้ใช้ทั้งหมด',         value: platform.totalUsers,     growth: platform.userGrowth,     color: '#0d9488' }),
        StatCard({ icon: '🏪', label: 'ร้านค้า/ผู้ค้า',        value: platform.totalMerchants, growth: platform.merchantGrowth, color: '#2563eb' }),
        StatCard({ icon: '📍', label: 'สถานที่ท่องเที่ยว',     value: platform.totalPlaces,    growth: platform.placeGrowth,    color: '#d97706' }),
        StatCard({ icon: '⭐', label: 'รีวิวทั้งหมด',          value: platform.totalReviews,   growth: platform.reviewGrowth,   color: '#9333ea' }),
      ]),
    ]),

    /* รออนุมัติ */
    el('div', { class: 'home-section' }, [
      el('h3', { class: 'home-section__title', text: '⏳ รอการอนุมัติ' }),
      el('div', { class: 'pending-list' }, [
        pendingItem('🏪', `ร้านค้าใหม่ ${platform.pendingMerchants} รายการ`, 'อนุมัติ',
          () => toast.show('อนุมัติร้านค้าแล้ว', 'success')),
        pendingItem('⭐', `รีวิวใหม่ ${platform.pendingReviews} รายการ`, 'ตรวจสอบ',
          () => navigate('admin', 'reviews')),
      ]),
    ]),

    /* พื้นที่ยอดนิยม */
    el('div', { class: 'home-section' }, [
      el('h3', { class: 'home-section__title', text: '🏆 จังหวัดยอดนิยม' }),
      el('div', { class: 'admin-rank-list' },
        topAreas.map((area, i) =>
          el('div', { class: 'rank-item' }, [
            el('span', { class: 'rank-item__num', text: String(i + 1) }),
            el('div', { class: 'rank-item__info' }, [
              el('span', { class: 'rank-item__name', text: area.name }),
              el('div', { class: 'rank-bar' }, [
                el('div', { class: 'rank-bar__fill', style: `width:${area.pct}%` }),
              ]),
            ]),
            el('span', { class: 'rank-item__val', text: area.visits.toLocaleString('th-TH') }),
          ])
        )
      ),
    ]),

    /* สถานที่ยอดนิยม */
    el('div', { class: 'home-section' }, [
      el('h3', { class: 'home-section__title', text: '📍 สถานที่ยอดนิยม' }),
      el('div', { class: 'admin-rank-list' },
        topPlaces.map((p, i) =>
          el('div', { class: 'rank-item' }, [
            el('span', { class: 'rank-item__num', text: String(i + 1) }),
            el('div', { class: 'rank-item__info' }, [
              el('span', { class: 'rank-item__name', text: p.name }),
              el('span', { class: 'rank-item__cat', text: p.category }),
            ]),
            el('span', { class: 'rank-item__val', text: p.views.toLocaleString('th-TH') }),
          ])
        )
      ),
    ]),

    /* รายได้โฆษณา */
    el('div', { class: 'home-section' }, [
      el('h3', { class: 'home-section__title', text: '💰 รายได้จากโฆษณา' }),
      el('div', { class: 'revenue-card' }, [
        el('div', { class: 'revenue-card__amount', text: `฿ ${platform.adRevenue.toLocaleString('th-TH')}` }),
        el('div', { class: 'revenue-card__label', text: 'รายได้สะสมเดือนนี้' }),
      ]),
    ]),
  ]);
}

function pendingItem(icon, label, btnText, onClick) {
  return el('div', { class: 'pending-item' }, [
    el('span', { class: 'pending-item__icon', text: icon }),
    el('span', { class: 'pending-item__label', text: label }),
    el('button', { class: 'btn btn--primary btn--sm', type: 'button', text: btnText, onClick }),
  ]);
}
