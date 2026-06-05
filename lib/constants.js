/**
 * constants.js — ค่าคงที่ทั้งหมดของแอป
 */

export const CONFIG = Object.freeze({
  pageSize: 6,
  scanRadiusKm: 80,
  searchDebounceMs: 250,
  defaultLat: 13.7563,
  defaultLng: 100.5018,
  defaultZoom: 13,
  polygonMinPoints: 4,
  polygonMaxPoints: 8,
});

export const DATA_PATHS = Object.freeze({
  areas: 'data/areas.json',
  places: 'data/places.json',
  categories: 'data/categories.json',
  stats: 'data/mock-stats.json',
});

export const STORAGE_KEYS = Object.freeze({
  favorites: 'ats:favorites',
  lastAreaId: 'ats:last-area',
  role: 'ats:role',
  tripPlan: 'ats:trip-plan',
});

export const SORT_OPTIONS = Object.freeze({
  DISTANCE: 'distance',
  RATING: 'rating',
  POPULAR: 'popular',
});

export const ALL_CATEGORIES = 'all';

export const RADIUS_OPTIONS = Object.freeze([
  { value: 0.5, label: '500 ม.' },
  { value: 1,   label: '1 กม.'  },
  { value: 3,   label: '3 กม.'  },
  { value: 5,   label: '5 กม.'  },
]);

export const MERCHANT_TYPES = Object.freeze([
  { id: 'restaurant', name: 'ร้านอาหาร',       icon: '🍜' },
  { id: 'cafe',       name: 'คาเฟ่',           icon: '☕' },
  { id: 'hotel',      name: 'โรงแรม',          icon: '🏨' },
  { id: 'rental',     name: 'รถเช่า',          icon: '🚗' },
  { id: 'souvenir',   name: 'ร้านของฝาก',      icon: '🛍️' },
  { id: 'spa',        name: 'สปา',             icon: '💆' },
  { id: 'activity',   name: 'กิจกรรมท่องเที่ยว', icon: '🎯' },
]);
