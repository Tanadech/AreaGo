/**
 * explore.js
 * Page Controller ของหน้า "สำรวจพื้นที่"
 * หน้าที่: ถือ view state, ประสาน component + service, สั่ง render
 * ไม่มี business logic การคำนวณเอง (อยู่ใน service) และไม่มี markup ตายตัว (อยู่ใน component)
 */

import { el, clear } from '../lib/dom.js';
import { ALL_CATEGORIES, SORT_OPTIONS } from '../lib/constants.js';
import { formatResultCount } from '../lib/format.js';
import * as storage from '../lib/storage.js';
import { scanArea, findArea } from './area-service.js';
import { queryPlaces } from './place-service.js';

import { Header } from '../components/header.js';
import { Sidebar } from '../components/sidebar.js';
import { SearchBox } from '../components/search-box.js';
import { CategoryFilter } from '../components/category-filter.js';
import { PlaceCard } from '../components/place-card.js';
import { PlaceGrid } from '../components/place-grid.js';
import { Pagination } from '../components/pagination.js';
import { createModal } from '../components/modal.js';
import { PlaceDetail } from '../components/place-detail.js';
import { Loading } from '../components/loading.js';

/**
 * @param {Object} options
 * @param {{header:HTMLElement, sidebar:HTMLElement, controls:HTMLElement, grid:HTMLElement, pagination:HTMLElement}} options.mounts จุดแขวน DOM
 * @param {{areas:Array, places:Array, categories:Array}} options.data
 */
export function createExploreController({ mounts, data }) {
  const categoryById = new Map(data.categories.map((c) => [c.id, c]));
  const modal = createModal();
  document.body.append(modal.root);

  /** view state ทั้งหมดของหน้าอยู่ในก้อนเดียว ตามได้ง่าย */
  const state = {
    activeAreaId: storage.getLastAreaId() ?? data.areas[0]?.id,
    scanned: [],
    filters: { query: '', categoryId: ALL_CATEGORIES, sortBy: SORT_OPTIONS.DISTANCE, page: 1 },
  };

  /* ---------- actions (เปลี่ยน state แล้ว render) ---------- */

  function selectArea(areaId) {
    state.activeAreaId = areaId;
    state.filters.page = 1;
    storage.setLastAreaId(areaId);
    runScan();
    renderSidebar();
  }

  function runScan() {
    const area = findArea(data.areas, state.activeAreaId);
    state.scanned = area ? scanArea(area, data.places) : [];
    renderResults();
  }

  const setSearch = (query) => updateFilter({ query, page: 1 });
  const setCategory = (categoryId) => updateFilter({ categoryId, page: 1 });
  const setSort = (sortBy) => updateFilter({ sortBy, page: 1 });
  const setPage = (page) => updateFilter({ page });

  function updateFilter(patch) {
    Object.assign(state.filters, patch);
    renderResults();
  }

  function toggleFavorite(placeId) {
    storage.toggleFavorite(placeId);
    renderHeader();
    renderResults();
    if (modal.root.dataset.open === 'true') openDetail(placeId);
  }

  function openDetail(placeId) {
    const place = state.scanned.find((p) => p.id === placeId);
    if (!place) return;
    modal.open(
      PlaceDetail({
        place,
        category: categoryById.get(place.categoryId),
        isFavorite: storage.isFavorite(place.id),
        onToggleFavorite: toggleFavorite,
      }),
    );
  }

  /* ---------- render (state -> DOM) ---------- */

  function renderHeader() {
    clear(mounts.header);
    mounts.header.append(
      Header({
        searchBox: SearchBox({ onSearch: setSearch }),
        favoriteCount: storage.getFavorites().length,
      }),
    );
  }

  function renderSidebar() {
    clear(mounts.sidebar);
    mounts.sidebar.append(
      Sidebar({
        areas: data.areas,
        activeAreaId: state.activeAreaId,
        onSelectArea: selectArea,
      }),
    );
  }

  function renderControls(total) {
    clear(mounts.controls);
    mounts.controls.append(
      CategoryFilter({
        categories: data.categories,
        activeCategoryId: state.filters.categoryId,
        onSelectCategory: setCategory,
      }),
      el('div', { class: 'controls__row' }, [
        el('span', { class: 'controls__count', text: formatResultCount(total) }),
        buildSortSelect(),
      ]),
    );
  }

  function buildSortSelect() {
    const labels = {
      [SORT_OPTIONS.DISTANCE]: 'ใกล้ที่สุด',
      [SORT_OPTIONS.RATING]: 'คะแนนสูงสุด',
      [SORT_OPTIONS.POPULAR]: 'นิยมที่สุด',
    };
    const options = Object.entries(labels).map(([value, label]) =>
      el('option', { value, text: label, selected: value === state.filters.sortBy ? 'selected' : null }),
    );
    return el('select', {
      class: 'controls__sort',
      'aria-label': 'เรียงลำดับ',
      onChange: (event) => setSort(event.target.value),
    }, options);
  }

  function renderResults() {
    const result = queryPlaces(state.scanned, state.filters);
    if (result.page !== state.filters.page) state.filters.page = result.page;

    renderControls(result.total);

    const cards = result.items.map((place) =>
      PlaceCard({
        place,
        category: categoryById.get(place.categoryId),
        isFavorite: storage.isFavorite(place.id),
        onToggleFavorite: toggleFavorite,
        onOpenDetail: openDetail,
      }),
    );

    clear(mounts.grid);
    mounts.grid.append(PlaceGrid({ cards }));

    clear(mounts.pagination);
    mounts.pagination.append(
      Pagination({ page: result.page, totalPages: result.totalPages, onChangePage: setPage }),
    );
  }

  /* ---------- bootstrap หน้า ---------- */

  function start() {
    mounts.grid.append(Loading());
    renderHeader();
    renderSidebar();
    runScan();
  }

  return { start };
}
