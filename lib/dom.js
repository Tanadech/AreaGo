/**
 * dom.js
 * helper สร้าง/จัดการ DOM element แบบสั้น ใช้ซ้ำทุก component
 * รวมไว้ที่เดียวเพื่อไม่ให้แต่ละ component เขียน document.createElement ซ้ำ ๆ (กฎข้อ 9)
 */

/**
 * สร้าง element พร้อม attribute และลูก
 * @param {string} tag ชื่อแท็ก เช่น 'div'
 * @param {Object} [props] attribute/property เช่น { class, dataset, onClick, html, text }
 * @param {Array<Node|string>} [children] โหนดลูก
 * @returns {HTMLElement}
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    if (value == null) continue;

    if (key === 'class') {
      node.className = value;
    } else if (key === 'html') {
      node.innerHTML = value;
    } else if (key === 'text') {
      node.textContent = value;
    } else if (key === 'dataset') {
      Object.assign(node.dataset, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      node.setAttribute(key, value);
    }
  }

  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.append(child.nodeType ? child : document.createTextNode(child));
  }
  return node;
}

/** ลบลูกทั้งหมดของ element (เร็วกว่า innerHTML = '') */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** หา element เดียวแบบสั้น */
export const qs = (selector, root = document) => root.querySelector(selector);

/**
 * หน่วงการเรียกฟังก์ชัน (debounce) ใช้กับช่องค้นหา
 * @param {Function} fn
 * @param {number} delayMs
 */
export function debounce(fn, delayMs) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}
