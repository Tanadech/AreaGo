/**
 * toast.js
 * แจ้งเตือนชั่วคราว (toast notification) — ใช้ร่วมกันทั้งแอป
 * เรียก toast.show('ข้อความ', 'success'|'error'|'info') จากที่ใดก็ได้
 */

import { el } from '../lib/dom.js';

const ICONS = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

class ToastManager {
  constructor() {
    this.container = el('div', { class: 'toast-container' });
    document.body.append(this.container);
  }

  show(message, type = 'info', durationMs = 3000) {
    const item = el('div', { class: `toast toast--${type}` }, [
      el('span', { class: 'toast__icon', text: ICONS[type] ?? ICONS.info }),
      el('span', { class: 'toast__msg', text: message }),
    ]);

    this.container.append(item);
    requestAnimationFrame(() => item.classList.add('toast--visible'));

    setTimeout(() => {
      item.classList.remove('toast--visible');
      setTimeout(() => item.remove(), 300);
    }, durationMs);
  }
}

export const toast = new ToastManager();
