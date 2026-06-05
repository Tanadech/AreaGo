/**
 * pages/traveler/home.js
 * หน้าแรกนักท่องเที่ยว — ภาพรวม, เมนูลัด, แจ้งเตือน
 */

import { el } from '../../lib/dom.js';
import { navigate } from '../../lib/router.js';
import { StatCard } from '../../components/stat-card.js';

export function TravelerHomePage({ stats, areas }) {
  const today = new Date().toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });

  const quickMenu = [
    { icon: '🗺️', label: 'แผนที่',           page: 'map'        },
    { icon: '📡', label: 'สแกนพื้นที่',      page: 'scan'       },
    { icon: '➕', label: 'เพิ่มข้อมูล',      page: 'add'        },
    { icon: '🤖', label: 'AI Trip Planner',   page: 'ai-trip'    },
    { icon: '🧠', label: 'Area Intelligence', page: 'area-intel' },
    { icon: '📋', label: 'แผนเที่ยว',        page: 'trip'       },
    { icon: '📈', label: 'Dashboard',         page: 'profile'    },
    { icon: '⋯',  label: 'เพิ่มเติม',        page: 'profile'    },
  ];

  const menuItems = quickMenu.map(({ icon, label, page }) =>
    el('button', {
      class: 'home-menu__item',
      type: 'button',
      onClick: () => navigate('traveler', page),
    }, [
      el('span', { class: 'home-menu__icon', text: icon }),
      el('span', { class: 'home-menu__label', text: label }),
    ])
  );

  const alerts = [
    { icon: '⚠️', msg: 'ไฟฟ้าโรงสร้างส่วน', sub: 'อยู่ระหว่างดำเนินการ 14 จุด', time: '1 ชม. ที่แล้ว', color: '#f97316' },
    { icon: '🏙️', msg: 'สะพานลอยใหม่',      sub: 'ถนนคนเดินโขนตีนรบ',         time: '3 ชม. ที่แล้ว', color: '#0ea5e9' },
  ];

  return el('div', { class: 'page page--traveler-home' }, [
    /* ส่วนทักทาย */
    el('div', { class: 'home-hero' }, [
      el('div', {}, [
        el('h2', { class: 'home-hero__greeting', text: 'สวัสดีครับ' }),
        el('p', { class: 'home-hero__name', text: 'ผู้ดูแลระบบเขตสัมมาบางเขน' }),
        el('p', { class: 'home-hero__date', text: `ข้อมูล ณ ${today}` }),
      ]),
      el('button', { class: 'home-hero__notif', type: 'button', text: '🔔' }),
    ]),

    /* สถิติภาพรวม */
    el('div', { class: 'home-section' }, [
      el('div', { class: 'home-section__hd' }, [
        el('h3', { class: 'home-section__title', text: 'ภาพรวมเมือง' }),
        el('button', { class: 'home-section__more', type: 'button', text: 'ดูทั้งหมด ›' }),
      ]),
      el('div', { class: 'stat-grid stat-grid--2' }, [
        StatCard({ icon: '📍', label: 'สถานที่ทั้งหมด',  value: stats.platform.totalPlaces,   growth: stats.platform.placeGrowth,   color: '#0d9488' }),
        StatCard({ icon: '🏪', label: 'ธุรกิจ/ร้านค้า',  value: stats.platform.totalMerchants, growth: stats.platform.merchantGrowth, color: '#2563eb' }),
        StatCard({ icon: '⭐', label: 'รีวิวเอื้อน',     value: stats.platform.totalReviews,   growth: stats.platform.reviewGrowth,   color: '#d97706' }),
        StatCard({ icon: '👥', label: 'ประชากร',         value: stats.platform.totalUsers,     growth: stats.platform.userGrowth,     color: '#9333ea' }),
      ]),
    ]),

    /* เมนูหลัก */
    el('div', { class: 'home-section' }, [
      el('h3', { class: 'home-section__title', text: 'เมนูหลัก' }),
      el('div', { class: 'home-menu' }, menuItems),
    ]),

    /* แจ้งเตือนล่าสุด */
    el('div', { class: 'home-section' }, [
      el('div', { class: 'home-section__hd' }, [
        el('h3', { class: 'home-section__title', text: 'แจ้งเตือนล่าสุด' }),
        el('button', { class: 'home-section__more', type: 'button', text: 'ดูทั้งหมด ›' }),
      ]),
      el('div', { class: 'alert-list' },
        alerts.map((a) =>
          el('div', { class: 'alert-item' }, [
            el('span', { class: 'alert-item__icon', text: a.icon, style: `color:${a.color}` }),
            el('div', { class: 'alert-item__body' }, [
              el('p', { class: 'alert-item__msg', text: a.msg }),
              el('p', { class: 'alert-item__sub', text: a.sub }),
            ]),
            el('span', { class: 'alert-item__time', text: a.time }),
          ])
        )
      ),
    ]),
  ]);
}
