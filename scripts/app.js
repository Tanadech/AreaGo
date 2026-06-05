/**
 * app.js — Entry point หลักของแอป
 * ทำหน้าที่: โหลดข้อมูล → ตรวจ role → render shell → ส่งต่อ router
 */

import { loadInitialData } from '../lib/api.js';
import { qs, el, clear } from '../lib/dom.js';
import { initRouter, navigate, getActiveRole, setActiveRole, ROLES } from '../lib/router.js';
import { createModal } from '../components/modal.js';
import { BottomNav } from '../components/bottom-nav.js';

/* ---------- pages ---------- */
import { TravelerHomePage } from '../pages/traveler/home.js';
import { MapPage } from '../pages/traveler/map-page.js';
import { ScanPage } from '../pages/traveler/scan-page.js';
import { TripPage } from '../pages/traveler/trip-page.js';
import { AiTripPlannerPage } from '../pages/traveler/ai-trip-planner.js';
import { AreaIntelligencePage } from '../pages/traveler/area-intelligence.js';
import { MerchantDashboard } from '../pages/merchant/dashboard.js';
import { StoreFormPage } from '../pages/merchant/store-form.js';
import { AdminDashboard } from '../pages/admin/dashboard.js';
import { ManageStoresPage } from '../pages/admin/manage-stores.js';
import { ReportsPage } from '../pages/admin/reports.js';

/* ---------- global state ---------- */
let appData = null;
let stats = null;
let modal = null;

/* ========== Role Selector ========== */
function renderRoleSelector(appRoot) {
  clear(appRoot);
  appRoot.className = '';          /* reset sidebar/traveler shell classes */
  appRoot.style.cssText = '';
  appRoot.append(
    el('div', { class: 'role-selector' }, [
      el('div', { class: 'role-selector__logo' }, [
        el('span', { class: 'role-selector__logo-icon', text: '📡' }),
        el('h1', { class: 'role-selector__title', text: 'AreaScan' }),
        el('p', { class: 'role-selector__tagline', text: 'Tourism Platform — สำรวจพื้นที่ ค้นหาที่เที่ยว' }),
      ]),
      el('div', { class: 'role-cards' }, [
        roleCard('traveler', '🧭', 'นักท่องเที่ยว', 'สแกนพื้นที่ ค้นหาสถานที่ วางแผนเที่ยว'),
        roleCard('merchant', '🏪', 'ผู้ค้า / ร้านค้า', 'จัดการร้าน โปรโมท ดูสถิติ'),
        roleCard('admin',    '⚙️', 'Admin', 'จัดการแพลตฟอร์มทั้งหมด'),
      ]),
    ])
  );
}

function roleCard(role, icon, title, sub) {
  return el('button', {
    class: 'role-card',
    type: 'button',
    onClick: () => {
      setActiveRole(role);
      navigate(role, 'home');
    },
  }, [
    el('span', { class: 'role-card__icon', text: icon }),
    el('div', {}, [
      el('div', { class: 'role-card__title', text: title }),
      el('div', { class: 'role-card__sub', text: sub }),
    ]),
    el('span', { class: 'role-card__arrow', text: '›' }),
  ]);
}

/* ========== Traveler Shell ========== */
function renderTravelerShell(appRoot, activePage) {
  /* ถ้ายังเป็น traveler shell อยู่ ไม่ต้อง rebuild โครงสร้าง */
  if (!appRoot.classList.contains('app-shell') || appRoot.classList.contains('app-shell--sidebar')) {
    buildTravelerShell(appRoot);
  }
  const pageEl = qs('#page-content', appRoot) ?? buildTravelerShell(appRoot);
  clear(pageEl);

  const pageComponent = {
    home:       () => TravelerHomePage({ stats, areas: appData.areas }),
    map:        () => MapPage({ places: appData.places, categories: appData.categories, modal }),
    scan:       () => ScanPage({ places: appData.places, categories: appData.categories, modal }),
    trip:       () => TripPage({ places: appData.places, categories: appData.categories }),
    'ai-trip':  () => AiTripPlannerPage({ places: appData.places, categories: appData.categories }),
    'area-intel': () => AreaIntelligencePage({ places: appData.places, categories: appData.categories }),
    profile:    () => profilePage('traveler'),
  }[activePage] ?? (() => TravelerHomePage({ stats, areas: appData.areas }));

  pageEl.append(pageComponent());

  /* update bottom nav */
  const navEl = qs('#bottom-nav', appRoot);
  if (navEl) {
    clear(navEl);
    navEl.append(BottomNav({ role: 'traveler', activePage }));
  }
}

function buildTravelerShell(appRoot) {
  clear(appRoot);
  appRoot.className = 'app-shell';
  appRoot.style.cssText = '';

  const pageEl = el('div', { id: 'page-content', class: 'app--traveler' });
  const navEl = el('div', { id: 'bottom-nav' });
  navEl.append(BottomNav({ role: 'traveler', activePage: 'home' }));

  appRoot.append(modal.root, pageEl, navEl);
  return pageEl;
}

/* ========== Sidebar Shell (Merchant + Admin) ========== */
function renderSidebarShell(appRoot, role, activePage, navItems) {
  clear(appRoot);
  appRoot.className = 'app-shell app-shell--sidebar';
  appRoot.style.cssText = '';

  const sidebarEl = buildSidebar(role, activePage, navItems);
  const pageEl = el('div', { id: 'page-content', class: 'main-content' });

  appRoot.append(sidebarEl, pageEl, modal.root);
  return pageEl;
}

function buildSidebar(role, activePage, navItems) {
  const brandNames = { merchant: { icon: '🏪', name: 'AreaScan', badge: 'ผู้ค้า' }, admin: { icon: '⚙️', name: 'AreaScan', badge: 'Admin' } };
  const b = brandNames[role];

  const items = navItems.map(({ page, icon, label }) =>
    el('button', {
      class: `sidebar-nav__item ${page === activePage ? 'sidebar-nav__item--active' : ''}`,
      type: 'button',
      onClick: () => navigate(role, page),
    }, [
      el('span', { class: 'sidebar-nav__icon', text: icon }),
      el('span', { text: label }),
    ])
  );

  return el('nav', { class: 'sidebar-nav' }, [
    el('div', { class: 'sidebar-nav__brand' }, [
      el('span', { class: 'sidebar-nav__brand-icon', text: b.icon }),
      el('div', {}, [
        el('div', { class: 'sidebar-nav__brand-name', text: b.name }),
        el('div', { class: 'sidebar-nav__role-badge', text: b.badge }),
      ]),
    ]),
    ...items,
    el('div', { class: 'sidebar-nav__divider' }),
    el('button', {
      class: 'sidebar-nav__switch',
      type: 'button',
      text: '⇄ เปลี่ยน Role',
      onClick: () => { setActiveRole(null); location.hash = ''; renderRoleSelector(qs('#app')); },
    }),
  ]);
}

/* ========== Merchant Pages ========== */
const MERCHANT_NAV = [
  { page: 'home',    icon: '📊', label: 'Dashboard'   },
  { page: 'store',   icon: '🏪', label: 'จัดการร้าน'  },
  { page: 'promo',   icon: '🎯', label: 'โปรโมชั่น'   },
  { page: 'stats',   icon: '📈', label: 'สถิติ'        },
  { page: 'profile', icon: '👤', label: 'โปรไฟล์'     },
];

function renderMerchantShell(appRoot, activePage) {
  const pageEl = renderSidebarShell(appRoot, 'merchant', activePage, MERCHANT_NAV);

  const page = {
    home:    () => MerchantDashboard({ stats }),
    store:   () => StoreFormPage(),
    profile: () => profilePage('merchant'),
  }[activePage] ?? (() => MerchantDashboard({ stats }));

  pageEl.append(page());
}

/* ========== Admin Pages ========== */
const ADMIN_NAV = [
  { page: 'home',    icon: '📊', label: 'Dashboard'       },
  { page: 'stores',  icon: '🏪', label: 'จัดการร้านค้า'   },
  { page: 'users',   icon: '👥', label: 'จัดการผู้ใช้'    },
  { page: 'reviews', icon: '⭐', label: 'จัดการรีวิว'     },
  { page: 'reports', icon: '📈', label: 'รายงาน'          },
];

function renderAdminShell(appRoot, activePage) {
  const pageEl = renderSidebarShell(appRoot, 'admin', activePage, ADMIN_NAV);

  const page = {
    home:    () => AdminDashboard({ stats }),
    stores:  () => ManageStoresPage(),
    reports: () => ReportsPage({ stats }),
    profile: () => profilePage('admin'),
  }[activePage] ?? (() => AdminDashboard({ stats }));

  pageEl.append(page());
}

/* ========== Profile placeholder ========== */
function profilePage(role) {
  return el('div', { class: 'page' }, [
    el('h2', { class: 'page-title', text: '👤 โปรไฟล์' }),
    el('div', { class: 'home-section' }, [
      el('div', { class: 'stat-grid stat-grid--2' }),
      el('button', {
        class: 'btn btn--outline btn--full', type: 'button',
        text: '⇄ เปลี่ยน Role',
        onClick: () => { setActiveRole(null); location.hash = ''; renderRoleSelector(qs('#app')); },
      }),
    ]),
  ]);
}

/* ========== Bootstrap ========== */
async function bootstrap() {
  const appRoot = qs('#app');

  try {
    [appData, stats] = await Promise.all([
      loadInitialData(),
      fetch('data/mock-stats.json').then((r) => r.json()),
    ]);
  } catch (err) {
    appRoot.innerHTML = `<div style="padding:32px;color:red">โหลดข้อมูลไม่ได้: ${err.message}</div>`;
    return;
  }

  modal = createModal();

  const savedRole = getActiveRole();

  initRouter((role, page) => {
    if (!role || !Object.values(ROLES).includes(role)) {
      renderRoleSelector(appRoot);
      return;
    }
    setActiveRole(role);

    if (role === ROLES.TRAVELER) renderTravelerShell(appRoot, page);
    else if (role === ROLES.MERCHANT) renderMerchantShell(appRoot, page);
    else if (role === ROLES.ADMIN) renderAdminShell(appRoot, page);
  });

  /* ถ้าเปิดหน้าแรกและไม่มี hash → แสดง role selector หรือ restore role เดิม */
  if (!location.hash || location.hash === '#') {
    if (savedRole) navigate(savedRole, 'home');
    else renderRoleSelector(appRoot);
  }
}

document.addEventListener('DOMContentLoaded', bootstrap);
