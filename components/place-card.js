/**
 * place-card.js
 * การ์ดสถานที่ 1 ใบ — แสดงข้อมูลสรุป + ปุ่มโปรด + คลิกเพื่อดูรายละเอียด
 * รับ category มาเพื่อแสดงป้ายหมวด, รับสถานะโปรดและ callback จาก controller
 */

import { el } from '../lib/dom.js';
import { ICONS } from '../lib/icons.js';
import {
  formatRating,
  formatReviewCount,
  formatPriceLevel,
  formatDistance,
} from '../lib/format.js';
import { truncate } from '../lib/validator.js';

/**
 * @param {Object} props
 * @param {Object} props.place สถานที่ (มี distanceKm จาก scanArea)
 * @param {Object} props.category หมวดหมู่ของสถานที่นี้
 * @param {boolean} props.isFavorite
 * @param {(placeId:string)=>void} props.onToggleFavorite
 * @param {(placeId:string)=>void} props.onOpenDetail
 * @returns {HTMLElement}
 */
export function PlaceCard({ place, category, isFavorite, onToggleFavorite, onOpenDetail }) {
  const favButton = el('button', {
    class: `place-card__fav ${isFavorite ? 'place-card__fav--active' : ''}`,
    type: 'button',
    'aria-label': 'บันทึกเป็นรายการโปรด',
    html: ICONS.heart,
    onClick: (event) => {
      event.stopPropagation();
      onToggleFavorite(place.id);
    },
  });

  const badge = el('span', {
    class: 'place-card__badge',
    text: `${category?.icon ?? ''} ${category?.name ?? ''}`.trim(),
  });

  const media = el('div', {
    class: 'place-card__media',
    style: `background-image:url('${place.image}')`,
  }, [badge, favButton]);

  const meta = el('div', { class: 'place-card__meta' }, [
    el('span', { class: 'place-card__rating', html: `${ICONS.star}${formatRating(place.rating)}` }),
    el('span', { class: 'place-card__reviews', text: `(${formatReviewCount(place.reviewCount)})` }),
    el('span', { class: 'place-card__price', text: formatPriceLevel(place.priceLevel) }),
  ]);

  const footer = el('div', { class: 'place-card__footer' }, [
    el('span', { class: 'place-card__distance', html: `${ICONS.pin}${formatDistance(place.distanceKm ?? 0)}` }),
    el('span', { class: 'place-card__hours', html: `${ICONS.clock}${place.openHours}` }),
  ]);

  return el(
    'article',
    {
      class: 'place-card',
      role: 'button',
      tabindex: '0',
      dataset: { placeId: place.id },
      onClick: () => onOpenDetail(place.id),
      onKeydown: (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenDetail(place.id);
        }
      },
    },
    [
      media,
      el('div', { class: 'place-card__body' }, [
        el('h3', { class: 'place-card__name', text: place.name }),
        el('p', { class: 'place-card__name-en', text: place.nameEn }),
        meta,
        el('p', { class: 'place-card__desc', text: truncate(place.description, 90) }),
        footer,
      ]),
    ],
  );
}
