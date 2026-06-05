/**
 * map-view.js
 * Google Maps JavaScript API wrapper — แทนที่ Leaflet
 * Public API ยังเหมือนเดิม (initMap, addPlaceMarkers, addRadiusCircle, addUserMarker)
 * แต่ initMap คืน Promise เพราะต้องรอ API โหลด
 */

import { CONFIG } from '../lib/constants.js';

const CATEGORY_COLORS = {
  beach:     '#0ea5e9',
  mountain:  '#16a34a',
  temple:    '#d97706',
  food:      '#dc2626',
  market:    '#9333ea',
  viewpoint: '#ea580c',
  cafe:      '#b45309',
  hotel:     '#1d4ed8',
  default:   '#64748b',
};

function getCategoryColor(categoryId) {
  return CATEGORY_COLORS[categoryId] ?? CATEGORY_COLORS.default;
}

/** สร้าง SVG pin icon พร้อม emoji ตามหมวดหมู่ */
function createPinIcon(color, emoji = '📍') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
    <path d="M18 0C8.059 0 0 8.059 0 18c0 5.7 2.638 10.789 6.75 14.141L18 46l11.25-13.859C33.362 28.789 36 23.7 36 18 36 8.059 27.941 0 18 0z" fill="${color}" stroke="white" stroke-width="2"/>
    <text x="18" y="24" text-anchor="middle" font-size="15" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${emoji}</text>
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(36, 46),
    anchor: new google.maps.Point(18, 46),
  };
}

/** รอ Google Maps API โหลดเสร็จก่อนสร้างแผนที่ */
const mapsReady = () => window._mapsReady ?? Promise.resolve();

/**
 * สร้าง Google Map ที่ element ที่กำหนด
 * @param {HTMLElement} container
 * @param {{lat?:number, lng?:number, zoom?:number}} options
 * @returns {Promise<google.maps.Map>}
 */
export async function initMap(
  container,
  { lat = CONFIG.defaultLat, lng = CONFIG.defaultLng, zoom = CONFIG.defaultZoom } = {},
) {
  await mapsReady();
  return new google.maps.Map(container, {
    center: { lat, lng },
    zoom,
    mapTypeControl: true,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
      mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain'],
    },
    fullscreenControl: false,
    streetViewControl: true,
    zoomControl: true,
  });
}

/**
 * วาง marker ของสถานที่บนแผนที่ พร้อม InfoWindow แสดงรายละเอียด
 * คืน object ที่มี clearLayers() เพื่อ reset markers
 */
export function addPlaceMarkers(map, places, categoryById, onClickPlace) {
  const infoWindow = new google.maps.InfoWindow();
  const markers = [];

  for (const place of places) {
    const cat = categoryById.get(place.categoryId);
    const color = getCategoryColor(place.categoryId);
    const icon = createPinIcon(color, cat?.icon ?? '📍');

    const marker = new google.maps.Marker({
      position: { lat: place.lat, lng: place.lng },
      map,
      title: place.name,
      icon,
    });

    marker.addListener('click', () => {
      infoWindow.setContent(`
        <div class="map-popup">
          <strong>${place.name}</strong>
          <p>${cat?.icon ?? ''} ${cat?.name ?? ''} · ⭐ ${place.rating}</p>
          <button class="map-popup__btn" data-place-id="${place.id}">ดูรายละเอียด</button>
        </div>
      `);
      infoWindow.open(map, marker);
      google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
        const btn = document.querySelector(`[data-place-id="${place.id}"]`);
        if (btn) btn.addEventListener('click', () => onClickPlace(place.id));
      });
    });

    markers.push(marker);
  }

  return {
    markers,
    clearLayers() {
      this.markers.forEach((m) => m.setMap(null));
      this.markers.length = 0;
    },
  };
}

/**
 * วาดวงกลมแสดงรัศมีสแกนรอบจุดศูนย์กลาง
 * @returns {google.maps.Circle}
 */
export function addRadiusCircle(map, lat, lng, radiusKm) {
  return new google.maps.Circle({
    map,
    center: { lat, lng },
    radius: radiusKm * 1000,
    strokeColor: '#0d9488',
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: '#0d9488',
    fillOpacity: 0.08,
  });
}

/**
 * เพิ่ม marker ตำแหน่งผู้ใช้ (จุดสีน้ำเงิน)
 * @returns {google.maps.Marker}
 */
export function addUserMarker(map, lat, lng) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="#2563eb" stroke="white" stroke-width="3"/>
    <circle cx="12" cy="12" r="4" fill="white"/>
  </svg>`;
  return new google.maps.Marker({
    position: { lat, lng },
    map,
    icon: {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(24, 24),
      anchor: new google.maps.Point(12, 12),
    },
    title: 'ตำแหน่งของคุณ',
    zIndex: 999,
  });
}
