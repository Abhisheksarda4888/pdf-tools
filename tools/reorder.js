// ── REORDER PAGES ─────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How to use:</strong> Upload a PDF. Drag the page thumbnails to any order you want. The order shown is exactly how the PDF will be saved.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF</div>
      ${dz('reorder', false, '.pdf,application/pdf', 'Drop PDF here')}
      <div class="file-list" id="fl-reorder"></div>
    </div>
    <div id="reorderSection" style="display:none">
      <div class="ctrl-group">
        <div class="ctrl-group-title">Drag Pages to Reorder</div>
        <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="reorderReverse()">🔁 Reverse Order</button>
          <button class="btn btn-ghost btn-sm" onclick="reorderReset()">↺ Original Order</button>
          <span style="font-size:0.8rem;color:var(--txt3);align-self:center" id="reorderInfo"></span>
        </div>
        <div class="pages-grid" id="reorderGrid" style="max-height:500px"></div>
      </div>
      ${progHTML('reorder')}
      ${resHTML('reorder')}
      <div class="btn-row">
        <button class="btn btn-gold btn-lg" id="reorderBtn" onclick="doReorder()">↕️ Save New Order & Download</button>
        <button class="btn btn-ghost btn-sm" onclick="resetReorder()">↺ Reset</button>
      </div>
    </div>`;

  let pdfJsDoc  = null;
  let pdfBytes  = null;
  let pageOrder = []; // 1-indexed current order
  let dragSrc   = null;

  window.onFilesLoaded_reorder = async () => {
    const file = STATE.reorder?.files?.[0]; if (!file) return;
    pdfBytes = await file.arrayBuffer();
    const task = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
    pdfJsDoc   = await task.promise;
    const n    = pdfJsDoc.numPages;
    pageOrder  = Array.from({ length: n }, (_, i) => i + 1);
    document.getElementById('reorderSection').style.display = '';
    document.getElementById('reorderInfo').textContent = `${n} pages`;
    buildGrid();
  };

  async function buildGrid() {
    const grid = document.getElementById('reorderGrid'); if (!grid) return;
    grid.innerHTML = '';
    for (let pos = 0; pos < pageOrder.length; pos++) {
      const origPage = pageOrder[pos];
      const item = document.createElement('div');
      item.className = 'pg-thumb';
      item.draggable = true;
      item.dataset.pos = pos;
      item.style.cursor = 'grab';
      item.innerHTML = `<canvas></canvas>
        <div class="pg-num">Page ${origPage}</div>
        <div style="position:absolute;top:3px;left:3px;font-size:0.58rem;background:var(--ink4);border:1px solid var(--border);padding:1px 5px;border-radius:4px;color:var(--txt3);font-weight:700">#${pos+1}</div>`;

      item.addEventListener('dragstart', e => {
        dragSrc = pos;
        e.dataTransfer.effectAllowed = 'move';
        item.style.opacity = '0.45';
      });
      item.addEventListener('dragend',  () => { item.style.opacity = '1'; });
      item.addEventListener('dragover', e => { e.preventDefault(); item.style.borderColor = 'var(--gold)'; });
      item.addEventListener('dragleave',() => { item.style.borderColor = ''; });
      item.addEventListener('drop',     e => {
        e.preventDefault(); item.style.borderColor = '';
        if (dragSrc === null || dragSrc === pos) return;
        const moved = pageOrder.splice(dragSrc, 1)[0];
        pageOrder.splice(pos, 0, moved);
        dragSrc = null;
        buildGrid();
      });

      // Touch drag (simple swap on tap)
      let touchTimer;
      item.addEventListener('touchstart', () => { touchTimer = setTimeout(() => { item.style.boxShadow = '0 0 0 2px var(--gold)'; }, 300); }, { passive: true });
      item.addEventListener('touchend',   () => { clearTimeout(touchTimer); item.style.boxShadow = ''; });

      grid.appendChild(item);
      // render thumbnail async
      const canvas = item.querySelector('canvas');
      WLP.renderPage(pdfJsDoc, origPage, canvas, 0.4).catch(() => {});
    }
  }

  window.reorderReverse = () => {
    pageOrder.reverse();
    buildGrid();
  };

  window.reorderReset = () => {
    pageOrder = Array.from({ length: pdfJsDoc.numPages }, (_, i) => i + 1);
    buildGrid();
  };

  window.doReorder = async () => {
    if (!pdfBytes) return;
    const btn = document.getElementById('reorderBtn'); btn.disabled = true;
    showProg('reorder', 5, 'Loading…');
    try {
      const src  = await PDFLib.PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const dest = await PDFLib.PDFDocument.create();
      const indices = pageOrder.map(p => p - 1);
      showProg('reorder', 30, 'Reordering pages…');
      const copied = await dest.copyPages(src, indices);
      copied.forEach(p => dest.addPage(p));
      showProg('reorder', 92, 'Saving…');
      const out   = await dest.save();
      const fname = STATE.reorder.files[0].name.replace('.pdf','') + '_reordered.pdf';
      downloadBytes(out, fname);
      logHistory('Reorder Pages', '↕️', STATE.reorder.files, out.length);
      showProg('reorder', 100); setTimeout(() => hideProg('reorder'), 500);
      showRes('reorder', `Pages reordered and saved (${pageOrder.length} pages).`,
        `<button class="btn btn-gold" onclick="doReorder()">⬇ Download Again</button>
         <button class="btn btn-ghost" onclick="resetReorder()">↺ Reorder Another</button>`);
    } catch(e) { hideProg('reorder'); alert('Error: ' + e.message); }
    finally { btn.disabled = false; }
  };

  window.resetReorder = () => {
    STATE.reorder = {}; pdfBytes = null; pdfJsDoc = null; pageOrder = [];
    document.getElementById('fl-reorder').innerHTML = '';
    document.getElementById('reorderSection').style.display = 'none';
    hideRes('reorder'); hideProg('reorder');
  };
};
