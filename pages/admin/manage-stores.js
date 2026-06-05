/**
 * pages/admin/manage-stores.js
 * จัดการร้านค้า — อนุมัติ, แก้ไข, ระงับ
 */

import { el, clear } from '../../lib/dom.js';
import { toast } from '../../components/toast.js';
import { MERCHANT_TYPES } from '../../lib/constants.js';

const MOCK_PENDING = [
  { id: 's001', name: 'RIVA Cafe', type: 'cafe',       area: 'กรุงเทพฯ', submitted: '12 พ.ค. 2567', status: 'pending' },
  { id: 's002', name: 'ภูเก็ต วิลล่า', type: 'hotel',  area: 'ภูเก็ต',   submitted: '11 พ.ค. 2567', status: 'pending' },
  { id: 's003', name: 'ร้านขนมครก',  type: 'restaurant', area: 'เชียงใหม่', submitted: '10 พ.ค. 2567', status: 'pending' },
];

export function ManageStoresPage() {
  let stores = [...MOCK_PENDING];
  const listEl = el('div', { class: 'admin-store-list' });

  function renderList() {
    clear(listEl);
    if (!stores.length) {
      listEl.append(el('p', { class: 'empty-state', text: 'ไม่มีร้านค้าที่รออนุมัติ ✅' }));
      return;
    }

    listEl.append(...stores.map((store) => {
      const typeInfo = MERCHANT_TYPES.find((t) => t.id === store.type);
      return el('div', { class: `admin-store-item admin-store-item--${store.status}` }, [
        el('div', { class: 'admin-store-item__info' }, [
          el('span', { class: 'admin-store-item__icon', text: typeInfo?.icon ?? '🏪' }),
          el('div', {}, [
            el('p', { class: 'admin-store-item__name', text: store.name }),
            el('p', { class: 'admin-store-item__meta', text: `${store.area} · ส่งเมื่อ ${store.submitted}` }),
          ]),
        ]),
        el('div', { class: 'admin-store-item__actions' }, [
          el('button', { class: 'btn btn--sm btn--primary', type: 'button', text: '✓ อนุมัติ',
            onClick: () => {
              stores = stores.filter((s) => s.id !== store.id);
              toast.show(`อนุมัติ "${store.name}" แล้ว`, 'success');
              renderList();
            },
          }),
          el('button', { class: 'btn btn--sm btn--danger', type: 'button', text: '✗ ปฏิเสธ',
            onClick: () => {
              stores = stores.filter((s) => s.id !== store.id);
              toast.show(`ปฏิเสธ "${store.name}"`, 'error');
              renderList();
            },
          }),
        ]),
      ]);
    }));
  }

  renderList();

  return el('div', { class: 'page page--admin' }, [
    el('h2', { class: 'page-title', text: '🏪 จัดการร้านค้า' }),
    el('p', { class: 'page-sub', text: 'รายการร้านค้าที่รอการอนุมัติ' }),
    listEl,
  ]);
}
