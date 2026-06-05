/**
 * pages/merchant/store-form.js
 * ฟอร์มลงทะเบียน/แก้ไขข้อมูลร้านค้า (3 ขั้นตอน)
 */

import { el, clear } from '../../lib/dom.js';
import { MERCHANT_TYPES } from '../../lib/constants.js';
import { initMap } from '../../components/map-view.js';
import { toast } from '../../components/toast.js';
import { navigate } from '../../lib/router.js';

const STEPS = ['ข้อมูลพื้นฐาน', 'พิกัด', 'รายละเอียด'];

export function StoreFormPage() {
  let currentStep = 0;
  let formData = {
    type: '', name: '', address: '', phone: '', openHours: '',
    lat: null, lng: null, images: [],
  };
  let map = null;
  let pinMarker = null;

  const root = el('div', { class: 'page page--store-form' });

  function stepHeader() {
    const steps = STEPS.map((label, i) =>
      el('div', { class: `wizard-step ${i === currentStep ? 'wizard-step--active' : ''} ${i < currentStep ? 'wizard-step--done' : ''}` }, [
        el('div', { class: 'wizard-step__num', text: i < currentStep ? '✓' : String(i + 1) }),
        el('span', { class: 'wizard-step__label', text: label }),
      ])
    );
    return el('div', { class: 'wizard-steps' }, steps);
  }

  /* ------- Step 0 ------- */
  function renderStep0() {
    return el('div', { class: 'form-step' }, [
      el('p', { class: 'form-hint', text: '+ เพิ่มรูปภาพ' }),
      el('div', { class: 'form-upload-box', text: '📷 อัปโหลดรูปภาพ' }),

      el('label', { class: 'form-label', text: 'ประเภทข้อมูล *' }),
      el('div', { class: 'merchant-types merchant-types--select' },
        MERCHANT_TYPES.map((t) =>
          el('button', {
            class: `merchant-type-chip ${formData.type === t.id ? 'merchant-type-chip--active' : ''}`,
            type: 'button',
            onClick: () => { formData.type = t.id; renderAll(); },
          }, [el('span', { text: t.icon }), el('span', { text: t.name })])
        )
      ),

      field('ชื่อสถานที่ *', 'text', formData.name, (v) => { formData.name = v; }),
      field('ที่อยู่สถานที่ *', 'text', formData.address, (v) => { formData.address = v; }, 'กรุงเทพมหานคร'),

      el('label', { class: 'form-label', text: 'หมวดหมู่ *' }),
      el('select', { class: 'form-select', onChange: (e) => { formData.type = e.target.value; } },
        [el('option', { value: '', text: 'เลือกหมวดหมู่' }), ...MERCHANT_TYPES.map((t) =>
          el('option', { value: t.id, text: `${t.icon} ${t.name}`, selected: t.id === formData.type ? 'selected' : null })
        )]
      ),

      navButtons(),
    ]);
  }

  /* ------- Step 1: พิกัด ------- */
  function renderStep1() {
    const mapEl = el('div', { class: 'scanner-map' });
    const coordEl = el('p', { class: 'form-coords', text: 'กดบนแผนที่เพื่อปักหมุดตำแหน่งร้าน' });

    setTimeout(async () => {
      map = await initMap(mapEl);
      map.addListener('click', (e) => {
        formData.lat = e.latLng.lat();
        formData.lng = e.latLng.lng();
        if (pinMarker) pinMarker.setMap(null);
        pinMarker = new google.maps.Marker({
          position: { lat: formData.lat, lng: formData.lng },
          map,
        });
        coordEl.textContent = `📍 ${formData.lat.toFixed(6)}, ${formData.lng.toFixed(6)}`;
      });
    }, 80);

    return el('div', { class: 'form-step' }, [mapEl, coordEl, navButtons()]);
  }

  /* ------- Step 2: รายละเอียด ------- */
  function renderStep2() {
    return el('div', { class: 'form-step' }, [
      field('เบอร์โทรศัพท์', 'tel', formData.phone, (v) => { formData.phone = v; }, 'เช่น 02-123-4567'),
      field('เวลาเปิด-ปิด', 'text', formData.openHours, (v) => { formData.openHours = v; }, 'เช่น 07:00 - 21:00'),
      el('label', { class: 'form-label', text: 'เพิ่มโดย' }),
      el('p', { class: 'form-auto', text: 'เจ้าหน้าที่กรมสมบัติ' }),
      el('label', { class: 'form-label', text: 'วันที่เพิ่มข้อมูล' }),
      el('p', { class: 'form-auto', text: new Date().toLocaleDateString('th-TH') }),
      navButtons(),
    ]);
  }

  function field(label, type, value, onChange, placeholder = '') {
    return el('div', { class: 'form-field' }, [
      el('label', { class: 'form-label', text: label }),
      el('input', {
        class: 'form-input',
        type,
        value: value ?? '',
        placeholder,
        onInput: (e) => onChange(e.target.value),
      }),
    ]);
  }

  function navButtons() {
    const prev = currentStep > 0
      ? el('button', { class: 'btn btn--outline', type: 'button', text: '← ก่อนหน้า',
          onClick: () => { currentStep--; renderAll(); } })
      : null;

    const next = currentStep < STEPS.length - 1
      ? el('button', { class: 'btn btn--primary', type: 'button', text: 'ถัดไป →',
          onClick: () => { currentStep++; renderAll(); } })
      : el('button', { class: 'btn btn--primary', type: 'button', text: '✅ บันทึกข้อมูล',
          onClick: () => {
            toast.show('บันทึกข้อมูลร้านเรียบร้อยแล้ว รอการอนุมัติ', 'success');
            setTimeout(() => navigate('merchant', 'home'), 1200);
          } });

    return el('div', { class: 'wizard-nav' }, [prev, next].filter(Boolean));
  }

  function renderAll() {
    clear(root);
    root.append(
      el('div', { class: 'page-topbar' }, [
        el('button', { class: 'back-btn', type: 'button', text: '←', onClick: () => navigate('merchant', 'home') }),
        el('h2', { class: 'page-title', text: 'เพิ่มข้อมูลสถานที่' }),
      ]),
      stepHeader(),
      currentStep === 0 ? renderStep0()
        : currentStep === 1 ? renderStep1()
        : renderStep2(),
    );
  }

  renderAll();
  return root;
}
