// ═══════════════════════════════════════════════════
//  WeLovePDF — utils.js  (shared across ALL pages)
// ═══════════════════════════════════════════════════

// ─── GLOBAL STATE ───────────────────────────────────
const STATE = {};

// ─── FORMAT HELPERS ─────────────────────────────────
function fmtSz(b) {
  if (!b || b === 0) return '0 B';
  if (b < 1024)        return b + ' B';
  if (b < 1048576)     return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}

function fmtTime(ms) {
  if (ms < 1000) return ms + 'ms';
  return (ms / 1000).toFixed(1) + 's';
}

// ─── HISTORY ────────────────────────────────────────
function logHistory(tool, icon, files, resultSize) {
  try {
    const h = JSON.parse(localStorage.getItem('wlp_history') || '[]');
    h.unshift({
      tool, icon,
      files: (files || []).map(f => ({ name: f.name, size: f.size })),
      resultSize: resultSize || 0,
      ts: Date.now()
    });
    localStorage.setItem('wlp_history', JSON.stringify(h.slice(0, 200)));
  } catch (e) {}
}

// ─── DROP ZONE HTML ──────────────────────────────────
function dz(id, multi = false, accept = '.pdf,application/pdf', label = 'Drop PDF here') {
  const inputId = `fi-${id}`;
  return `
  <div class="drop-zone" id="dz-${id}"
    onclick="document.getElementById('${inputId}').click()"
    ondragover="event.preventDefault();this.classList.add('drag')"
    ondragleave="this.classList.remove('drag')"
    ondrop="event.preventDefault();this.classList.remove('drag');handleDrop('${id}',event.dataTransfer.files)">
    <div class="dz-icon">📂</div>
    <h3>${label}</h3>
    <p>Click or drag & drop · ${multi ? 'Multiple files OK' : 'Single file'}</p>
    <div class="dz-hint">
      <span class="dz-tag">🔒 100% Private</span>
      <span class="dz-tag">No Upload</span>
      <span class="dz-tag">Browser Only</span>
    </div>
    <input type="file" id="${inputId}" ${multi ? 'multiple' : ''} accept="${accept}"
      onchange="handleFiles('${id}',this.files)">
  </div>`;
}

// ─── FILE HANDLING ───────────────────────────────────
function handleDrop(id, files) { handleFiles(id, files); }

function handleFiles(id, files) {
  if (!files || !files.length) return;
  STATE[id] = STATE[id] || {};
  if (STATE[id].multi) {
    STATE[id].files = [...(STATE[id].files || []), ...Array.from(files)];
  } else {
    STATE[id].files = Array.from(files);
  }
  renderFL(id, STATE[id].files);
  if (typeof window[`onFilesLoaded_${id}`] === 'function') {
    window[`onFilesLoaded_${id}`]();
  }
}

function renderFL(id, files) {
  const el = document.getElementById(`fl-${id}`);
  if (!el) return;
  if (!files || !files.length) { el.innerHTML = ''; return; }
  el.innerHTML = files.map((f, i) => `
    <div class="file-item">
      <div class="fi-icon">📄</div>
      <div class="fi-info">
        <div class="fi-name" title="${f.name}">${f.name}</div>
        <div class="fi-size">${fmtSz(f.size)}</div>
      </div>
      <button class="fi-remove" onclick="removeFile('${id}',${i})" title="Remove">✕ Remove</button>
    </div>`).join('');
}

function removeFile(id, i) {
  if (!STATE[id]?.files) return;
  STATE[id].files.splice(i, 1);
  renderFL(id, STATE[id].files);
}

// ─── PROGRESS BAR HTML + CONTROLS ───────────────────
function progHTML(id) {
  return `<div class="prog-wrap" id="prog-${id}">
    <div class="prog-top">
      <span class="prog-label" id="prog-lbl-${id}">Processing…</span>
      <span class="prog-pct" id="prog-pct-${id}">0%</span>
    </div>
    <div class="prog-track"><div class="prog-fill" id="prog-fill-${id}"></div></div>
    <div class="prog-msg" id="prog-msg-${id}"></div>
  </div>`;
}

function showProg(id, pct, msg, label) {
  const w  = document.getElementById(`prog-${id}`); if (!w) return;
  w.style.display = 'block';
  const f  = document.getElementById(`prog-fill-${id}`);
  const p  = document.getElementById(`prog-pct-${id}`);
  const m  = document.getElementById(`prog-msg-${id}`);
  const lb = document.getElementById(`prog-lbl-${id}`);
  if (f)  f.style.width = Math.max(0, Math.min(100, pct)) + '%';
  if (p)  p.textContent = Math.round(pct) + '%';
  if (m && msg  !== undefined) m.textContent = msg;
  if (lb && label !== undefined) lb.textContent = label;
}

function hideProg(id) {
  const w = document.getElementById(`prog-${id}`);
  if (w) w.style.display = 'none';
}

// ─── RESULT BOX HTML + CONTROLS ─────────────────────
function resHTML(id) {
  return `<div class="result-box" id="res-${id}">
    <div class="res-icon">✅</div>
    <h3 id="res-title-${id}">Done!</h3>
    <p id="res-msg-${id}"></p>
    <div class="btn-row btn-row-center" id="res-btns-${id}"></div>
  </div>`;
}

function showRes(id, msg, btns, title) {
  const box = document.getElementById(`res-${id}`); if (!box) return;
  box.style.display = 'block';
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  const t = document.getElementById(`res-title-${id}`);
  const m = document.getElementById(`res-msg-${id}`);
  const b = document.getElementById(`res-btns-${id}`);
  if (t && title) t.textContent = title;
  if (m) m.textContent = msg || '';
  if (b && btns) b.innerHTML = btns;
}

function hideRes(id) {
  const box = document.getElementById(`res-${id}`);
  if (box) box.style.display = 'none';
}

// ─── PDF LOAD HELPER ─────────────────────────────────
async function loadPDF(file) {
  const ab = await file.arrayBuffer();
  return await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
}

// ─── DOWNLOAD HELPER ─────────────────────────────────
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download= filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

function downloadBytes(bytes, filename) {
  downloadBlob(new Blob([bytes], { type: 'application/pdf' }), filename);
}

// ─── INFO ICON HELPER ────────────────────────────────
function infoIcon(text) {
  return `<span class="info-icon" tabindex="0" aria-label="Info">i<span class="tooltip">${text}</span></span>`;
}

// ─── SCROLL UP BUTTON ────────────────────────────────
// Injected automatically into every page that loads utils.js
function _initScrollUp() {
  // Only inject once
  if (document.getElementById('scrollUp')) return;
  const btn = document.createElement('button');
  btn.id = 'scrollUp';
  btn.title = 'Back to top';
  btn.innerHTML = '↑';
  btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  document.body.appendChild(btn);
}

window.addEventListener('scroll', () => {
  const btn = document.getElementById('scrollUp');
  if (btn) btn.classList.toggle('visible', window.scrollY > 280);
}, { passive: true });

// ─── HAMBURGER MOBILE MENU ───────────────────────────
function _initMobileMenu() {
  const ham  = document.getElementById('navHam');
  const menu = document.getElementById('mobileMenu');
  if (!ham || !menu) return;
  ham.addEventListener('click', () => {
    menu.classList.toggle('open');
    const open = menu.classList.contains('open');
    ham.querySelectorAll('span')[0].style.transform = open ? 'rotate(45deg) translate(4px,4px)' : '';
    ham.querySelectorAll('span')[1].style.opacity   = open ? '0' : '1';
    ham.querySelectorAll('span')[2].style.transform = open ? 'rotate(-45deg) translate(4px,-4px)' : '';
  });
  // Close on outside click
  document.addEventListener('click', e => {
    if (!ham.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove('open');
    }
  });
}

// ─── DRAGGABLE OVERLAY SYSTEM ────────────────────────
// Used by: sign, addtext, redact (multi-boxes), watermark
const OVERLAY = {
  items: [],   // { id, el, x, y, w, h, type, data }
  nextId: 1,

  init(stageId) {
    this.stageEl = document.getElementById(stageId);
    this.items   = [];
    this.nextId  = 1;
  },

  _makeDraggable(el, item) {
    let startX, startY, startL, startT, dragging = false;

    const onDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // deactivate all
      this.items.forEach(i => i.el.classList.remove('active'));
      el.classList.add('active');

      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      startX = cx; startY = cy;
      startL = parseInt(el.style.left) || 0;
      startT = parseInt(el.style.top)  || 0;
      dragging = true;

      const move = (ev) => {
        if (!dragging) return;
        const mx = ev.touches ? ev.touches[0].clientX : ev.clientX;
        const my = ev.touches ? ev.touches[0].clientY : ev.clientY;
        const stage = this.stageEl.getBoundingClientRect();
        const elW   = el.offsetWidth;
        const elH   = el.offsetHeight;
        let newL = startL + (mx - startX);
        let newT = startT + (my - startY);
        // clamp to stage
        const canvEl = this.stageEl.querySelector('canvas');
        const canvW = canvEl ? canvEl.offsetWidth  : this.stageEl.offsetWidth;
        const canvH = canvEl ? canvEl.offsetHeight : this.stageEl.offsetHeight;
        newL = Math.max(0, Math.min(canvW - elW, newL));
        newT = Math.max(0, Math.min(canvH - elH, newT));
        el.style.left = newL + 'px';
        el.style.top  = newT + 'px';
        item.x = newL; item.y = newT;
      };

      const up = () => { dragging = false; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up); };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup',   up);
      window.addEventListener('touchmove', move, { passive: false });
      window.addEventListener('touchend',  up);
    };

    el.addEventListener('mousedown',  onDown);
    el.addEventListener('touchstart', onDown, { passive: false });
  },

  _makeResizable(el, item) {
    const handle = el.querySelector('.drag-handle');
    if (!handle) return;
    let startX, startY, startW, startH;

    const onDown = (e) => {
      e.preventDefault(); e.stopPropagation();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      startX = cx; startY = cy;
      startW = el.offsetWidth;
      startH = el.offsetHeight;
      const move = (ev) => {
        const mx = ev.touches ? ev.touches[0].clientX : ev.clientX;
        const my = ev.touches ? ev.touches[0].clientY : ev.clientY;
        const nw = Math.max(40, startW + (mx - startX));
        const nh = Math.max(20, startH + (my - startY));
        el.style.width  = nw + 'px';
        el.style.height = nh + 'px';
        item.w = nw; item.h = nh;
      };
      const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up); };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup',   up);
      window.addEventListener('touchmove', move, { passive: false });
      window.addEventListener('touchend',  up);
    };
    handle.addEventListener('mousedown',  onDown);
    handle.addEventListener('touchstart', onDown, { passive: false });
  },

  addItem(opts) {
    // opts: { type, content, x, y, w, h, style, canDelete }
    const id   = this.nextId++;
    const item = { id, ...opts };
    const el   = document.createElement('div');
    el.className  = 'draggable-item';
    el.id         = `ditem-${id}`;
    el.style.left = (opts.x || 40) + 'px';
    el.style.top  = (opts.y || 40) + 'px';
    el.style.width = (opts.w || 160) + 'px';
    if (opts.h) el.style.height = opts.h + 'px';
    if (opts.style) el.style.cssText += opts.style;
    el.innerHTML = opts.content || '';

    // delete btn
    if (opts.canDelete !== false) {
      const del = document.createElement('div');
      del.className = 'drag-delete';
      del.textContent = '✕';
      del.title = 'Remove';
      del.onclick = (e) => { e.stopPropagation(); this.removeItem(id); };
      el.appendChild(del);
    }

    // resize handle
    const handle = document.createElement('div');
    handle.className = 'drag-handle';
    handle.title = 'Resize';
    el.appendChild(handle);

    item.el = el;
    this.items.push(item);
    this.stageEl.appendChild(el);
    this._makeDraggable(el, item);
    this._makeResizable(el, item);

    return item;
  },

  removeItem(id) {
    const i = this.items.findIndex(it => it.id === id);
    if (i === -1) return;
    this.items[i].el.remove();
    this.items.splice(i, 1);
  },

  clearAll() {
    this.items.forEach(it => it.el.remove());
    this.items = [];
  },

  // Returns positions scaled to PDF page coordinates
  getScaled(canvasWidth, canvasHeight, pdfWidth, pdfHeight) {
    return this.items.map(item => ({
      ...item,
      pdfX:  (item.x / canvasWidth)  * pdfWidth,
      pdfY:  pdfHeight - ((item.y / canvasHeight) * pdfHeight) - ((item.h || 60) / canvasHeight) * pdfHeight,
      pdfW:  (item.el.offsetWidth  / canvasWidth)  * pdfWidth,
      pdfH:  (item.el.offsetHeight / canvasHeight) * pdfHeight,
    }));
  }
};

// ─── REDACT CANVAS DRAW SYSTEM ───────────────────────
// Allows drawing multiple black boxes on canvas by click-drag
const REDACT = {
  boxes: [],    // [{ page, x, y, w, h, canvX, canvY, canvW, canvH }]
  drawing: false,
  startX: 0, startY: 0,
  currentCanvas: null,
  currentPage: 1,
  previewBox: null,   // DOM element showing live rect

  init(canvasId, page) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    this.currentCanvas = canvas;
    this.currentPage   = page;

    // Remove old listeners if any
    canvas.onmousedown  = null;
    canvas.onmousemove  = null;
    canvas.onmouseup    = null;
    canvas.ontouchstart = null;
    canvas.ontouchmove  = null;
    canvas.ontouchend   = null;
    canvas.style.cursor = 'crosshair';

    const getXY = (e) => {
      const rect = canvas.getBoundingClientRect();
      const src  = e.touches ? e.touches[0] : e;
      return { x: src.clientX - rect.left, y: src.clientY - rect.top };
    };

    canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const { x, y } = getXY(e);
      this.drawing = true;
      this.startX = x; this.startY = y;
      if (!this.previewBox) {
        this.previewBox = document.createElement('div');
        this.previewBox.style.cssText = 'position:absolute;background:rgba(0,0,0,0.7);border:1px solid #f87171;pointer-events:none;z-index:50;';
        canvas.parentElement.style.position = 'relative';
        canvas.parentElement.appendChild(this.previewBox);
      }
      this.previewBox.style.display = 'block';
      this.previewBox.style.left    = x + 'px';
      this.previewBox.style.top     = y + 'px';
      this.previewBox.style.width   = '0px';
      this.previewBox.style.height  = '0px';
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.drawing || !this.previewBox) return;
      const { x, y } = getXY(e);
      const lx = Math.min(x, this.startX), ly = Math.min(y, this.startY);
      const lw = Math.abs(x - this.startX), lh = Math.abs(y - this.startY);
      this.previewBox.style.left   = lx + 'px';
      this.previewBox.style.top    = ly + 'px';
      this.previewBox.style.width  = lw + 'px';
      this.previewBox.style.height = lh + 'px';
    });

    canvas.addEventListener('mouseup', (e) => {
      if (!this.drawing) return;
      this.drawing = false;
      const { x, y } = getXY(e);
      const lx = Math.min(x, this.startX), ly = Math.min(y, this.startY);
      const lw = Math.abs(x - this.startX), lh = Math.abs(y - this.startY);
      if (lw > 5 && lh > 5) {
        this.addBox(this.currentPage, lx, ly, lw, lh, canvas);
      }
      if (this.previewBox) this.previewBox.style.display = 'none';
    });

    // Touch support
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY })); }, { passive: false });
    canvas.addEventListener('touchmove',  (e) => { e.preventDefault(); canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY })); }, { passive: false });
    canvas.addEventListener('touchend',   (e) => { canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: (e.changedTouches[0]||{}).clientX, clientY: (e.changedTouches[0]||{}).clientY })); });
  },

  addBox(page, canvX, canvY, canvW, canvH, canvas) {
    const boxId = Date.now();
    const parent= canvas.parentElement;
    const badge = document.createElement('div');
    badge.id    = `rb-${boxId}`;
    badge.style.cssText = `
      position:absolute;left:${canvX}px;top:${canvY}px;width:${canvW}px;height:${canvH}px;
      background:rgba(0,0,0,0.85);border:1.5px solid #f87171;z-index:40;box-sizing:border-box;
    `;
    // delete button
    const del = document.createElement('div');
    del.style.cssText = 'position:absolute;top:-9px;right:-9px;width:18px;height:18px;border-radius:50%;background:#f87171;color:#fff;font-size:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;border:2px solid #07070e;font-weight:900;z-index:51;';
    del.textContent = '✕';
    del.onclick = () => this.removeBox(boxId);
    badge.appendChild(del);
    parent.appendChild(badge);

    this.boxes.push({ id: boxId, page, canvX, canvY, canvW, canvH, el: badge });
    if (typeof window.onRedactUpdate === 'function') window.onRedactUpdate();
  },

  removeBox(id) {
    const i = this.boxes.findIndex(b => b.id === id);
    if (i === -1) return;
    this.boxes[i].el.remove();
    this.boxes.splice(i, 1);
    if (typeof window.onRedactUpdate === 'function') window.onRedactUpdate();
  },

  clearAll() {
    this.boxes.forEach(b => b.el.remove());
    this.boxes = [];
    if (this.previewBox) { this.previewBox.remove(); this.previewBox = null; }
  },

  // Scale canvas coords to PDF coords
  getScaled(canvas, pdfW, pdfH, filterPage) {
    const cW = canvas.width;   // actual pixel width of canvas
    const cH = canvas.height;
    const dW = canvas.offsetWidth;  // displayed CSS width
    const dH = canvas.offsetHeight;
    const scX = cW / dW;
    const scY = cH / dH;

    return this.boxes
      .filter(b => !filterPage || b.page === filterPage)
      .map(b => ({
        x:  b.canvX * scX  / cW  * pdfW,
        y:  pdfH - (b.canvY * scY / cH * pdfH) - (b.canvH * scY / cH * pdfH),
        w:  b.canvW * scX / cW * pdfW,
        h:  b.canvH * scY / cH * pdfH,
      }));
  }
};

// ─── DISABLE RIGHT CLICK ─────────────────────────────
document.addEventListener('contextmenu', e => e.preventDefault());

// ─── INIT ON DOM READY ───────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  _initScrollUp();
  _initMobileMenu();
});
