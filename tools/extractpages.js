// ── EXTRACT PAGES ─────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Select specific pages by clicking thumbnails or typing page numbers. Selected pages are saved as a new PDF.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF</div>
      ${dz('extractpages', false, '.pdf,application/pdf', 'Drop PDF here')}
      <div class="file-list" id="fl-extractpages"></div>
    </div>
    <div id="extractSection" style="display:none">
      <div class="ctrl-group">
        <div class="ctrl-group-title">
          Select Pages to Extract
          <span id="extractSelCount" style="margin-left:auto;font-size:0.78rem;color:var(--gold);font-weight:600"></span>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
          <button class="btn btn-ghost btn-sm" onclick="extractSelectAll()">Select All</button>
          <button class="btn btn-ghost btn-sm" onclick="extractClearAll()">Clear All</button>
          <div style="display:flex;align-items:center;gap:7px;margin-left:auto">
            <input class="inp" id="extractRangeInput" placeholder="e.g. 1-3, 5, 8-10" style="width:180px">
            <button class="btn btn-teal btn-sm" onclick="extractApplyRange()">Apply Range</button>
          </div>
        </div>
        <div class="pages-grid" id="extractGrid"></div>
      </div>
      <div class="ctrl-group">
        <div class="ctrl-group-title">Output Options</div>
        <div class="ctrl-row">
          <label>Save as</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <label style="min-width:auto;display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="radio" name="extractOut" value="single" checked> Single PDF
            </label>
            <label style="min-width:auto;display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="radio" name="extractOut" value="individual"> Individual PDFs (one per page)
            </label>
          </div>
        </div>
      </div>
      ${progHTML('extractpages')}
      ${resHTML('extractpages')}
      <div class="btn-row" style="margin-top:4px">
        <button class="btn btn-gold btn-lg" id="extractBtn" onclick="doExtract()" disabled>📌 Extract & Download</button>
        <button class="btn btn-ghost btn-sm" onclick="resetExtract()">↺ Reset</button>
      </div>
    </div>`;

  let pdfJsDoc = null;
  let pdfBytes = null;
  let selected = new Set();
  let totalPgs = 0;

  window.onFilesLoaded_extractpages = async () => {
    const file = STATE.extractpages?.files?.[0]; if (!file) return;
    pdfBytes = await file.arrayBuffer();
    pdfJsDoc = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise;
    totalPgs = pdfJsDoc.numPages;
    selected.clear();
    document.getElementById('extractSection').style.display = '';
    buildGrid();
  };

  async function buildGrid() {
    const grid = document.getElementById('extractGrid'); if (!grid) return;
    grid.innerHTML = '';
    for (let i = 1; i <= totalPgs; i++) {
      const wrap = document.createElement('div');
      wrap.className = 'pg-thumb' + (selected.has(i) ? ' sel' : '');
      wrap.dataset.page = i;
      wrap.innerHTML = `<canvas></canvas><div class="pg-num">Page ${i}</div><div class="pg-check">✓</div>`;
      wrap.onclick = () => toggleExtract(i, wrap);
      grid.appendChild(wrap);
      const canvas = wrap.querySelector('canvas');
      WLP.renderPage(pdfJsDoc, i, canvas, 0.4).catch(()=>{});
    }
    updateCount();
  }

  function toggleExtract(i, el) {
    if (selected.has(i)) { selected.delete(i); el.classList.remove('sel'); }
    else { selected.add(i); el.classList.add('sel'); }
    updateCount();
  }

  function updateCount() {
    const n = selected.size;
    document.getElementById('extractSelCount').textContent = n > 0 ? `${n} page${n!==1?'s':''} selected` : 'None selected';
    document.getElementById('extractBtn').disabled = n === 0;
  }

  window.extractSelectAll = () => {
    for (let i=1; i<=totalPgs; i++) selected.add(i);
    document.querySelectorAll('#extractGrid .pg-thumb').forEach(el => el.classList.add('sel'));
    updateCount();
  };

  window.extractClearAll = () => {
    selected.clear();
    document.querySelectorAll('#extractGrid .pg-thumb').forEach(el => el.classList.remove('sel'));
    updateCount();
  };

  window.extractApplyRange = () => {
    const str = document.getElementById('extractRangeInput').value;
    if (!str.trim()) return;
    selected.clear();
    str.split(',').forEach(p => {
      p = p.trim();
      if (p.includes('-')) {
        const [a,b] = p.split('-').map(Number);
        for (let i=a; i<=Math.min(b,totalPgs); i++) selected.add(i);
      } else { const n=Number(p); if(n>=1&&n<=totalPgs) selected.add(n); }
    });
    document.querySelectorAll('#extractGrid .pg-thumb').forEach(el => {
      el.classList.toggle('sel', selected.has(parseInt(el.dataset.page)));
    });
    updateCount();
  };

  window.doExtract = async () => {
    if (!pdfBytes || !selected.size) return;
    const btn    = document.getElementById('extractBtn'); btn.disabled = true;
    const outMode= document.querySelector('input[name="extractOut"]:checked').value;
    const sorted = [...selected].sort((a,b)=>a-b);
    showProg('extractpages', 5, 'Loading…');
    try {
      const src   = await PDFLib.PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const base  = STATE.extractpages.files[0].name.replace('.pdf','');

      if (outMode === 'single') {
        const dest    = await PDFLib.PDFDocument.create();
        const indices = sorted.map(p => p - 1);
        showProg('extractpages', 30, 'Extracting pages…');
        const copied  = await dest.copyPages(src, indices);
        copied.forEach(p => dest.addPage(p));
        showProg('extractpages', 90, 'Saving…');
        const out = await dest.save();
        downloadBytes(out, `${base}_extracted.pdf`);
        logHistory('Extract Pages', '📌', STATE.extractpages.files, out.length);
        showRes('extractpages', `${sorted.length} page${sorted.length!==1?'s':''} extracted into one PDF.`,
          `<button class="btn btn-gold" onclick="doExtract()">⬇ Download Again</button>
           <button class="btn btn-ghost" onclick="resetExtract()">↺ Extract More</button>`);
      } else {
        for (let i=0; i<sorted.length; i++) {
          showProg('extractpages', 5 + Math.round((i/sorted.length)*90), `Saving page ${sorted[i]}…`);
          const dest   = await PDFLib.PDFDocument.create();
          const copied = await dest.copyPages(src, [sorted[i]-1]);
          dest.addPage(copied[0]);
          const out = await dest.save();
          downloadBytes(out, `${base}_page${sorted[i]}.pdf`);
          await new Promise(r => setTimeout(r, 100));
        }
        logHistory('Extract Pages', '📌', STATE.extractpages.files, 0);
        showRes('extractpages', `${sorted.length} individual PDF${sorted.length!==1?'s':''} downloaded.`,
          `<button class="btn btn-ghost" onclick="resetExtract()">↺ Extract More</button>`);
      }

      showProg('extractpages', 100); setTimeout(() => hideProg('extractpages'), 500);
    } catch(e) { hideProg('extractpages'); alert('Error: ' + e.message); }
    finally { btn.disabled = false; }
  };

  window.resetExtract = () => {
    STATE.extractpages = {}; pdfBytes=null; pdfJsDoc=null; selected.clear(); totalPgs=0;
    document.getElementById('fl-extractpages').innerHTML = '';
    document.getElementById('extractSection').style.display = 'none';
    hideRes('extractpages'); hideProg('extractpages');
  };
};
