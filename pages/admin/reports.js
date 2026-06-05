/**
 * pages/admin/reports.js
 * หน้ารายงาน admin — top lists, breakdown, revenue
 */

import { el } from '../../lib/dom.js';
import { toast } from '../../components/toast.js';

export function ReportsPage({ stats }) {
  const { topAreas, topPlaces, categoryBreakdown, platform } = stats;

  function barChart(items, maxVal) {
    return el('div', { class: 'report-bar-chart' },
      items.map((item) => {
        const pct = Math.round((item.count / maxVal) * 100);
        return el('div', { class: 'report-bar-row' }, [
          el('span', { class: 'report-bar-row__icon', text: item.icon }),
          el('span', { class: 'report-bar-row__label', text: item.name }),
          el('div', { class: 'rank-bar' }, [
            el('div', { class: 'rank-bar__fill', style: `width:${pct}%` }),
          ]),
          el('span', { class: 'report-bar-row__count', text: item.count }),
        ]);
      })
    );
  }

  const maxCatCount = Math.max(...categoryBreakdown.map((c) => c.count));

  return el('div', { class: 'page page--admin' }, [
    el('h2', { class: 'page-title', text: '📊 รายงาน' }),

    el('div', { class: 'home-section' }, [
      el('div', { class: 'home-section__hd' }, [
        el('h3', { class: 'home-section__title', text: 'สถานที่ตามหมวดหมู่' }),
        el('button', { class: 'btn btn--sm btn--outline', type: 'button', text: '⬇️ Export',
          onClick: () => toast.show('ส่งออกรายงาน PDF แล้ว', 'success') }),
      ]),
      barChart(categoryBreakdown, maxCatCount),
    ]),

    el('div', { class: 'home-section' }, [
      el('h3', { class: 'home-section__title', text: 'ร้านยอดนิยม' }),
      el('div', { class: 'admin-rank-list' },
        topPlaces.map((p, i) =>
          el('div', { class: 'rank-item' }, [
            el('span', { class: 'rank-item__num', text: String(i + 1) }),
            el('div', { class: 'rank-item__info' }, [
              el('span', { class: 'rank-item__name', text: p.name }),
              el('span', { class: 'rank-item__cat', text: p.category }),
            ]),
            el('span', { class: 'rank-item__val', text: `${p.views.toLocaleString('th-TH')} ครั้ง` }),
          ])
        )
      ),
    ]),

    el('div', { class: 'home-section' }, [
      el('h3', { class: 'home-section__title', text: 'รายได้จากโฆษณา' }),
      el('div', { class: 'revenue-card revenue-card--large' }, [
        el('div', { class: 'revenue-card__amount', text: `฿ ${platform.adRevenue.toLocaleString('th-TH')}` }),
        el('div', { class: 'revenue-card__label', text: 'รวมรายได้เดือนนี้' }),
        el('div', { class: 'revenue-card__meta', text: `จากผู้ค้าที่โปรโมท ${platform.totalMerchants.toLocaleString('th-TH')} ราย` }),
      ]),
    ]),
  ]);
}
