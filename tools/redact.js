// ── REDACT PDF ────────────────────────────────────────────────────────────
// Draw multiple black boxes on any page, permanently burn into PDF
// ─────────────────────────────────────────────────────────────────────────

window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');

  mount.innerHTML = `
    <div class="info-box">
      <strong>How to use:</strong> Load your PDF, then <strong>click and drag</strong> to draw black redaction boxes over any sensitive content.
      Add as many boxes as needed on any page. Click <strong>Apply Redactions</strong> to permanently burn them in.
    </div>

    <!-- Upload -->
    <div class="ctrl-group" style="margin-bottom:14px">
      <div class="ctrl-group-title">Step 1 — Load Your PDF</div>
      ${dz('redact', false, '.pdf,application/pdf', 'Drop PDF to redact')}
      <div class="file-list" id="fl-redact"></div>
    </div>

    <!-- Redact canvas area -->
    <div id="redactSection" style="display:none">
      <div class="ctrl-group" style="margin-bottom:14px">
        <div class="ctrl-group-title">
          Step 2 — Draw Redaction Boxes
          <span class="redact-count" id="redactCount" style="margin-left:auto">0 boxes</span>
        </div>

        <div class="warn-box">
          <strong>Click and drag</strong> anywhere on the page to draw a black box. 
          Hit <strong>✕</strong> on any box to remove it. Switch pages with the toolbar.
          Redactions are <strong>permanent</strong> once applied.
        </div>

        <!-- Viewer -->
        <div id="redactViewerWrap"></div>

        <!-- Page navigation for redact -->
        <div style="display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap">
          <span style="font-size:0.82rem;color:var(--txt2)">Drawing on page:</span>
          <select class="inp" id="redactPageSel" style="width:auto" onchange="switchRedactPage(this.value)"></select>
          <span style="font-size:0.78rem;color:var(--txt3)" id="redactPageInfo"></span>
        </div>
      </div>

      <!-- Summary -->
      <div id="redactSummary" style="display:none" class="ctrl-group" style="margin-bottom:14px">
        <div class="ctrl-group-title">Redaction Summary</div>
        <div id="redactSummaryList"></div>
      </div>

      ${progHTML('redact')}
      ${resHTML('redact')}

      <div class="btn-row" style="margin-top:4px">
        <button class="btn btn-gold btn-lg" id="applyRedactBtn" onclick="applyRedactions()" disabled>
          ⬛ Apply Redactions & Download
        </button>
        <button class="btn btn-danger btn-sm" onclick="clearAllRedactions()">🗑 Clear All Boxes</button>
        <button class="btn btn-ghost btn-sm" onclick="resetRedactTool()">↺ Start Over</button>
      </div>
    </div>
  `;

  let pdfBytes  = null;
  let pdfJsDoc  = null;
  // allBoxes: { page, canvX, canvY, canvW, canvH, canvasW, canvasH }[]
  let allBoxes  = [];
  let curPage   = 1;
  let viewCanvas= null;

  // ── PDF LOAD ─────────────────────────────────────────────────────────
  window.onFilesLoaded_redact = async () => {
    const file = STATE.redact?.files?.[0];
    if (!file) return;
    pdfBytes  = await file.arrayBuffer();
    const loadTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
    pdfJsDoc  = await loadTask.promise;

    // Build page selector
    const sel = document.getElementById('redactPageSel');
    if (sel) {
      sel.innerHTML = '';
      for (let i = 1; i <= pdfJsDoc.numPages; i++) {
        sel.innerHTML += `<option value="${i}">Page ${i}</option>`;
      }
    }

    document.getElementById('redactSection').style.display = '';
    document.getElementById('applyRedactBtn').disabled = false;

    // Build viewer with redact mode
    WLP.buildViewer('redactViewerWrap', pdfJsDoc, {
      redactMode: true,
      onPageRender: (pageNum, canvas) => {
        curPage    = pageNum;
        viewCanvas = canvas;
        // Re-init REDACT for this page
        REDACT.currentPage = pageNum;
        REDACT.currentCanvas = canvas;
        // Restore any existing boxes for this page as visual overlays
        renderExistingBoxes(pageNum, canvas);
        // Set up new drawing
        initRedactDraw(canvas, pageNum);
        updatePageInfo(pageNum);
      }
    });

    // Initial page render triggers onPageRender above
  };

  function initRedactDraw(canvas, page) {
    // Remove old listeners via clone trick
    const newCanvas = canvas.cloneNode(false);
    canvas.parentNode.replaceChild(newCanvas, canvas);
    viewCanvas = newCanvas;
    WLP._vOpts.onPageRender = (pn, cv) => {
      curPage = pn; viewCanvas = cv;
      REDACT.currentPage = pn;
      REDACT.currentCanvas = cv;
      renderExistingBoxes(pn, cv);
      initRedactDraw(cv, pn);
      updatePageInfo(pn);
    };

    // Copy rendered content from old canvas
    newCanvas.width  = canvas.width;
    newCanvas.height = canvas.height;
    newCanvas.style.width  = canvas.style.width;
    newCanvas.style.height = canvas.style.height;
    newCanvas.style.cursor = 'crosshair';
    newCanvas.style.touchAction = 'none';

    // Re-render page onto new canvas
    WLP.renderPage(pdfJsDoc, page, newCanvas, WLP._vScale || 1.5);

    let drawing = false, startX = 0, startY = 0;
    let previewEl = null;

    const getXY = (e) => {
      const rect = newCanvas.getBoundingClientRect();
      const src  = e.touches ? e.touches[0] : e;
      return {
        x: (src.clientX - rect.left),
        y: (src.clientY - rect.top)
      };
    };

    newCanvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const { x, y } = getXY(e);
      drawing = true; startX = x; startY = y;
      // create preview
      previewEl = document.createElement('div');
      previewEl.style.cssText = `position:absolute;background:rgba(0,0,0,0.75);
        border:2px dashed var(--rose);pointer-events:none;z-index:50;box-sizing:border-box;`;
      previewEl.style.left = x + 'px'; previewEl.style.top = y + 'px';
      previewEl.style.width = '0'; previewEl.style.height = '0';
      const stage = newCanvas.closest('.overlay-stage') || newCanvas.parentElement;
      stage.style.position = 'relative';
      stage.appendChild(previewEl);
    });

    newCanvas.addEventListener('mousemove', (e) => {
      if (!drawing || !previewEl) return;
      const { x, y } = getXY(e);
      const lx = Math.min(x, startX), ly = Math.min(y, startY);
      const lw = Math.abs(x - startX), lh = Math.abs(y - startY);
      previewEl.style.left   = lx + 'px';
      previewEl.style.top    = ly + 'px';
      previewEl.style.width  = lw + 'px';
      previewEl.style.height = lh + 'px';
    });

    newCanvas.addEventListener('mouseup', (e) => {
      if (!drawing) return;
      drawing = false;
      const { x, y } = getXY(e);
      const lx = Math.min(x, startX), ly = Math.min(y, startY);
      const lw = Math.abs(x - startX), lh = Math.abs(y - startY);
      if (previewEl) previewEl.remove(); previewEl = null;
      if (lw > 6 && lh > 6) {
        addRedactBox(page, lx, ly, lw, lh, newCanvas);
      }
    });

    // Touch
    newCanvas.addEventListener('touchstart', e => { e.preventDefault(); newCanvas.dispatchEvent(new MouseEvent('mousedown', { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY })); }, { passive: false });
    newCanvas.addEventListener('touchmove',  e => { e.preventDefault(); newCanvas.dispatchEvent(new MouseEvent('mousemove', { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY })); }, { passive: false });
    newCanvas.addEventListener('touchend',   e => { newCanvas.dispatchEvent(new MouseEvent('mouseup',   { clientX: (e.changedTouches[0]||{}).clientX, clientY: (e.changedTouches[0]||{}).clientY })); });
  }

  function addRedactBox(page, cx, cy, cw, ch, canvas) {
    const box = { id: Date.now() + Math.random(), page, cx, cy, cw, ch, canvasW: canvas.offsetWidth, canvasH: canvas.offsetHeight };
    allBoxes.push(box);
    renderBoxOnCanvas(box, canvas);
    updateBoxCount();
    updateSummary();
  }

  function renderBoxOnCanvas(box, canvas) {
    const stage = canvas.closest('.overlay-stage') || canvas.parentElement;
    const el = document.createElement('div');
    el.id = `rbox-${box.id}`;
    el.style.cssText = `position:absolute;left:${box.cx}px;top:${box.cy}px;
      width:${box.cw}px;height:${box.ch}px;
      background:rgba(0,0,0,0.9);z-index:40;box-sizing:border-box;
      border:1.5px solid rgba(248,113,113,0.4);`;
    // delete btn
    const del = document.createElement('div');
    del.style.cssText = `position:absolute;top:-9px;right:-9px;width:20px;height:20px;
      border-radius:50%;background:var(--rose);color:#fff;font-size:10px;
      display:flex;align-items:center;justify-content:center;cursor:pointer;
      border:2px solid var(--ink);z-index:51;font-weight:900;`;
    del.textContent = '✕';
    del.onclick = () => { removeRedactBox(box.id); };
    el.appendChild(del);
    stage.appendChild(el);
    box.el = el;
  }

  function renderExistingBoxes(page, canvas) {
    // Remove old visual boxes for this page
    allBoxes.filter(b => b.page === page).forEach(b => {
      if (b.el) b.el.remove();
      b.el = null;
    });
    // Re-render
    setTimeout(() => {
      allBoxes.filter(b => b.page === page).forEach(b => {
        // Scale to current canvas display size
        const scaleX = canvas.offsetWidth  / (b.canvasW || canvas.offsetWidth);
        const scaleY = canvas.offsetHeight / (b.canvasH || canvas.offsetHeight);
        b.cx *= scaleX; b.cy *= scaleY; b.cw *= scaleX; b.ch *= scaleY;
        b.canvasW = canvas.offsetWidth;
        b.canvasH = canvas.offsetHeight;
        renderBoxOnCanvas(b, canvas);
      });
    }, 100);
  }

  function removeRedactBox(id) {
    const i = allBoxes.findIndex(b => b.id === id);
    if (i === -1) return;
    if (allBoxes[i].el) allBoxes[i].el.remove();
    allBoxes.splice(i, 1);
    updateBoxCount();
    updateSummary();
  }

  window.clearAllRedactions = () => {
    allBoxes.forEach(b => { if (b.el) b.el.remove(); });
    allBoxes = [];
    updateBoxCount();
    updateSummary();
  };

  window.switchRedactPage = (val) => {
    WLP._vRender(parseInt(val));
  };

  function updateBoxCount() {
    const el = document.getElementById('redactCount');
    if (el) {
      const n = allBoxes.length;
      el.textContent = n + ' box' + (n !== 1 ? 'es' : '');
    }
    const btn = document.getElementById('applyRedactBtn');
    if (btn) btn.disabled = allBoxes.length === 0;
  }

  function updatePageInfo(page) {
    const el = document.getElementById('redactPageInfo');
    if (!el) return;
    const pageBoxes = allBoxes.filter(b => b.page === page).length;
    el.textContent = pageBoxes > 0 ? `(${pageBoxes} box${pageBoxes>1?'es':''} on this page)` : '';
    const sel = document.getElementById('redactPageSel');
    if (sel) sel.value = page;
  }

  function updateSummary() {
    const wrap = document.getElementById('redactSummary');
    const list = document.getElementById('redactSummaryList');
    if (!wrap || !list) return;
    if (!allBoxes.length) { wrap.style.display = 'none'; return; }
    wrap.style.display = '';
    // Group by page
    const byPage = {};
    allBoxes.forEach(b => { byPage[b.page] = (byPage[b.page] || 0) + 1; });
    list.innerHTML = Object.entries(byPage).map(([pg, cnt]) =>
      `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:0.82rem;color:var(--txt2)">Page ${pg}</span>
        <span style="font-size:0.78rem;color:var(--rose);background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.2);padding:2px 8px;border-radius:20px">${cnt} redaction${cnt>1?'s':''}</span>
      </div>`
    ).join('');
  }

  // ── APPLY REDACTIONS ─────────────────────────────────────────────────
  window.applyRedactions = async () => {
    if (!pdfBytes || !allBoxes.length) return;
    const btn = document.getElementById('applyRedactBtn');
    btn.disabled = true; btn.textContent = '⏳ Applying…';
    showProg('redact', 10, 'Loading PDF…');

    try {
      const pdfDoc  = await PDFLib.PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const pages   = pdfDoc.getPages();

      // Group boxes by page
      const byPage = {};
      allBoxes.forEach(b => { (byPage[b.page] = byPage[b.page] || []).push(b); });

      const pageNums = Object.keys(byPage);
      pageNums.forEach((pg, idx) => {
        showProg('redact', 10 + Math.round((idx / pageNums.length) * 80), `Redacting page ${pg}…`);
        const page = pages[parseInt(pg) - 1];
        if (!page) return;
        const { width: pW, height: pH } = page.getSize();

        byPage[pg].forEach(b => {
          // Scale from display canvas to PDF coordinates
          const scaleX = pW / (b.canvasW || 1);
          const scaleY = pH / (b.canvasH || 1);
          const x  = b.cx * scaleX;
          const y  = pH - (b.cy * scaleY) - (b.ch * scaleY);
          const w  = b.cw * scaleX;
          const h  = b.ch * scaleY;

          page.drawRectangle({
            x, y, width: w, height: h,
            color: PDFLib.rgb(0, 0, 0),
            opacity: 1,
          });
        });
      });

      showProg('redact', 95, 'Saving…');
      const outBytes = await pdfDoc.save();
      const fname    = (STATE.redact.files[0].name.replace('.pdf','') || 'document') + '_redacted.pdf';
      downloadBytes(outBytes, fname);
      logHistory('Redact PDF', '⬛', STATE.redact.files, outBytes.length);

      showProg('redact', 100, 'Done!');
      setTimeout(() => hideProg('redact'), 600);
      showRes('redact',
        `${allBoxes.length} redaction${allBoxes.length>1?'s':''} applied across ${pageNums.length} page${pageNums.length>1?'s':''}. Downloading now!`,
        `<a href="#" class="btn btn-gold" onclick="applyRedactions();return false">⬇ Download Again</a>
         <button class="btn btn-ghost" onclick="resetRedactTool()">↺ Redact Another</button>`);

    } catch(err) {
      hideProg('redact');
      showToast('❌ Error: ' + err.message);
    } finally {
      btn.disabled = false; btn.textContent = '⬛ Apply Redactions & Download';
    }
  };

  window.resetRedactTool = () => {
    STATE.redact = {};
    pdfBytes = null; pdfJsDoc = null;
    allBoxes = [];
    document.getElementById('redactSection').style.display = 'none';
    document.getElementById('fl-redact').innerHTML = '';
    hideRes('redact'); hideProg('redact');
    updateBoxCount();
  };

  function showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
      background:rgba(248,113,113,0.95);color:#fff;font-weight:600;font-size:0.88rem;
      padding:10px 22px;border-radius:50px;z-index:9999;
      box-shadow:0 4px 20px rgba(0,0,0,0.4);animation:fadeUp 0.25s ease both;max-width:90vw;text-align:center`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  updateBoxCount();
};
