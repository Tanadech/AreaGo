/**
 * modal.js
 * กล่อง modal เอนกประสงค์ — รับเนื้อหา (content node) ใดก็ได้มาแสดง
 * จัดการเปิด/ปิด, คลิกฉากหลัง, กด Esc ให้ครบในที่เดียว เพื่อนำกลับมาใช้ซ้ำ (กฎข้อ 10)
 */

import { el, clear } from '../lib/dom.js';
import { ICONS } from '../lib/icons.js';

/**
 * สร้าง modal หนึ่งตัวต่อแอป แล้วคืน API ควบคุม { open, close, root }
 * @returns {{open:(content:HTMLElement)=>void, close:()=>void, root:HTMLElement}}
 */
export function createModal() {
  const body = el('div', { class: 'modal__body' });

  const closeButton = el('button', {
    class: 'modal__close',
    type: 'button',
    'aria-label': 'ปิด',
    html: ICONS.close,
    onClick: close,
  });

  const dialog = el('div', { class: 'modal__dialog', role: 'dialog', 'aria-modal': 'true' }, [
    closeButton,
    body,
  ]);

  const root = el('div', {
    class: 'modal',
    'data-open': 'false',
    onClick: (event) => {
      if (event.target === root) close();
    },
  }, [dialog]);

  function open(content) {
    clear(body);
    body.append(content);
    root.dataset.open = 'true';
    document.body.classList.add('is-modal-open');
  }

  function close() {
    root.dataset.open = 'false';
    document.body.classList.remove('is-modal-open');
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.dataset.open === 'true') close();
  });

  return { open, close, root };
}
