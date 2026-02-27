// ── REMOVE PAGES ──────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How to use:</strong> Upload a PDF. Click any page thumbnail to mark it for deletion (turns red). Click again to unmark. Then hit <strong>Remove Marked Pages</strong>.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF</div>
      ${dz('removepages', false, '.pdf,application/pdf', 'Drop PDF here')}
      <div class="file-list" id="fl-removepages"></div>
    </div>
    <div id="removeSection" style="display:none">
      <div class="ctrl-group">
        <div class="ctrl-group-title">
          Click Pages to Mark for Removal
          <span id="removeCount" style="margin-left:auto;font-size:0.78rem;color:var(--rose);font-weight:600"></span>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="markAll()">Select All</button>
          <button class="btn btn-ghost btn-sm" onclick="clearMarks()">Clear All</button>
          <span style="font-size:0.8rem;color:var(--txt3);align-self:center" id="removePagesInfo"></span>
        </div>
        <div class="pages-grid" id="removeGrid"></div>
      </div>
      ${progHTML('removepages')}
      ${resHTML('removepages')}
      <div class="btn-row">
        <button class="btn btn-rose btn-lg" id="removeBtn" onclick="doRemove()" disabled>🗑 Remove Marked Pages</button>
        <button class="btn btn-ghost btn-sm" onclick="resetRemove()">↺ Reset</button>
      </div>
    </div>`;

  let pdfJsDoc   = null;
  let pdfBytes   = null;
  let markedPages = new Set();
  let totalPages  = 0;

  window.onFilesLoaded_removepages = async () => {
    const file = STATE.removepages?.files?.[0]; if (!file) return;
    pdfBytes = await file.arrayBuffer();
    const task = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
    pdfJsDoc   = await task.promise;
    totalPages = pdfJsDoc.numPages;
    markedPages.clear();
    document.getElementById('removeSection').style.display = '';
    document.getElementById('removePagesInfo').textContent = `${totalPages} pages total`;
    buildGrid();
  };

  async function buildGrid() {
    const grid = document.getElementById('removeGrid'); if (!grid) return;
    grid.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      const wrap = document.createElement('div');
      wrap.className = 'pg-thumb';
      wrap.dataset.page = i;
      wrap.innerHTML = `<canvas></canvas><div class="pg-num">Page ${i}</div>
        <div class="pg-check">✓</div>
        <div class="pg-del-badge">DEL</div>`;
      wrap.onclick = () => toggleMark(i, wrap);
      grid.appendChild(wrap);
      // render thumbnail async
      const canvas = wrap.querySelector('canvas');
      WLP.renderPage(pdfJsDoc, i, canvas, 0.4).catch(() => {});
    }
    updateCount();
  }

  function toggleMark(i, el) {
    if (markedPages.has(i)) { markedPages.delete(i); el.classList.remove('marked'); }
    else { markedPages.add(i); el.classList.add('marked'); }
    updateCount();
  }

  function updateCount() {
    const n   = markedPages.size;
    const keep = totalPages - n;
    document.getElementById('removeCount').textContent = n > 0 ? `${n} marked for deletion` : '';
    document.getElementById('removeBtn').disabled = n === 0 || keep === 0;
    if (keep === 0 && n > 0) {
      document.getElementById('removeCount').textContent = '⚠ Cannot remove all pages';
    }
  }

  window.markAll = () => {
    for (let i = 1; i <= totalPages; i++) markedPages.add(i);
    document.querySelectorAll('#removeGrid .pg-thumb').forEach(el => el.classList.add('marked'));
    updateCount();
  };

  window.clearMarks = () => {
    markedPages.clear();
    document.querySelectorAll('#removeGrid .pg-thumb').forEach(el => el.classList.remove('marked'));
    updateCount();
  };

  window.doRemove = async () => {
    if (!pdfBytes || !markedPages.size) return;
    const keep = totalPages - markedPages.size;
    if (keep === 0) { alert('Cannot remove all pages — keep at least one.'); return; }
    const btn = document.getElementById('removeBtn'); btn.disabled = true;
    showProg('removepages', 5, 'Loading…');
    try {
      const src  = await PDFLib.PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const dest = await PDFLib.PDFDocument.create();
      const keepIndices = [];
      for (let i = 1; i <= totalPages; i++) { if (!markedPages.has(i)) keepIndices.push(i - 1); }
      showProg('removepages', 30, 'Removing pages…');
      const copied = await dest.copyPages(src, keepIndices);
      copied.forEach(p => dest.addPage(p));
      showProg('removepages', 90, 'Saving…');
      const out   = await dest.save();
      const fname = STATE.removepages.files[0].name.replace('.pdf','') + '_removed.pdf';
      downloadBytes(out, fname);
      logHistory('Remove Pages', '🗑️', STATE.removepages.files, out.length);
      showProg('removepages', 100); setTimeout(() => hideProg('removepages'), 500);
      showRes('removepages',
        `Removed ${markedPages.size} page${markedPages.size!==1?'s':''}. ${keep} page${keep!==1?'s':''} remain.`,
        `<button class="btn btn-gold" onclick="doRemove()">⬇ Download Again</button>
         <button class="btn btn-ghost" onclick="resetRemove()">↺ Remove More</button>`);
    } catch(e) { hideProg('removepages'); alert('Error: ' + e.message); }
    finally { btn.disabled = false; }
  };

  window.resetRemove = () => {
    STATE.removepages = {}; pdfBytes = null; pdfJsDoc = null;
    markedPages.clear(); totalPages = 0;
    document.getElementById('fl-removepages').innerHTML = '';
    document.getElementById('removeSection').style.display = 'none';
    hideRes('removepages'); hideProg('removepages');
  };
};
