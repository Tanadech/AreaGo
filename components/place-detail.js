/**
 * place-detail.js
 * เนื้อหารายละเอียดสถานที่ที่จะนำไปใส่ใน modal
 * แยกจาก modal.js เพราะ modal คือ "กล่อง" ส่วนนี้คือ "เนื้อหา" — คนละหน้าที่ (กฎข้อ 1, 2)
 */

import { el } from '../lib/dom.js';
import { ICONS } from '../lib/icons.js';
import {
  formatRating,
  formatReviewCount,
  formatPriceLevel,
  formatDistance,
} from '../lib/format.js';

/**
 * @param {Object} props
 * @param {Object} props.place
 * @param {Object} props.category
 * @param {boolean} props.isFavorite
 * @param {(placeId:string)=>void} props.onToggleFavorite
 * @returns {HTMLElement}
 */
export function PlaceDetail({ place, category, isFavorite, onToggleFavorite }) {
  const tags = (place.tags ?? []).map((tag) =>
    el('span', { class: 'place-detail__tag', text: `#${tag}` }),
  );

  const stat = (iconHtml, label, value) =>
    el('div', { class: 'place-detail__stat' }, [
      el('span', { class: 'place-detail__stat-icon', html: iconHtml }),
      el('div', {}, [
        el('span', { class: 'place-detail__stat-value', text: value }),
        el('span', { class: 'place-detail__stat-label', text: label }),
      ]),
    ]);

  const favButton = el('button', {
    class: `place-detail__fav ${isFavorite ? 'place-detail__fav--active' : ''}`,
    type: 'button',
    html: `${ICONS.heart}<span>${isFavorite ? 'บันทึกแล้ว' : 'บันทึกที่ชอบ'}</span>`,
    onClick: () => onToggleFavorite(place.id),
  });

  return el('div', { class: 'place-detail' }, [
    el('div', {
      class: 'place-detail__hero',
      style: `background-image:url('${place.image}')`,
    }, [
      el('span', { class: 'place-detail__category', text: `${category?.icon ?? ''} ${category?.name ?? ''}`.trim() }),
    ]),
    el('div', { class: 'place-detail__content' }, [
      el('h2', { class: 'place-detail__name', text: place.name }),
      el('p', { class: 'place-detail__name-en', text: place.nameEn }),
      el('div', { class: 'place-detail__stats' }, [
        stat(ICONS.star, 'คะแนน', `${formatRating(place.rating)} (${formatReviewCount(place.reviewCount)})`),
        stat(ICONS.pin, 'ระยะจากศูนย์กลาง', formatDistance(place.distanceKm ?? 0)),
        stat(ICONS.clock, 'เวลาเปิด', place.openHours),
        stat('💰', 'ระดับราคา', formatPriceLevel(place.priceLevel)),
      ]),
      el('p', { class: 'place-detail__desc', text: place.description }),
      el('div', { class: 'place-detail__tags' }, tags),
      favButton,
    ]),
  ]);
}
