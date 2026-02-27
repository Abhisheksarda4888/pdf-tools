// ── ROTATE PAGES ──────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How to use:</strong> Upload a PDF. Select which pages to rotate (or check "All pages"), choose the rotation angle, then download.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF</div>
      ${dz('rotate', false, '.pdf,application/pdf', 'Drop PDF to rotate')}
      <div class="file-list" id="fl-rotate"></div>
    </div>
    <div id="rotateOptions" style="display:none">
      <div class="ctrl-group">
        <div class="ctrl-group-title">Rotation Options</div>
        <div class="ctrl-row">
          <label>Rotation angle</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-ghost btn-sm rot-angle-btn active-angle" data-deg="90"  onclick="setAngle(90,this)">↻ 90° Right</button>
            <button class="btn btn-ghost btn-sm rot-angle-btn" data-deg="180" onclick="setAngle(180,this)">↕ 180°</button>
            <button class="btn btn-ghost btn-sm rot-angle-btn" data-deg="270" onclick="setAngle(270,this)">↺ 90° Left</button>
          </div>
        </div>
        <div class="ctrl-row">
          <label>Apply to</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <label style="min-width:auto;display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="radio" name="rotScope" value="all" checked onchange="rotScopeChange(this)"> All pages
            </label>
            <label style="min-width:auto;display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="radio" name="rotScope" value="select" onchange="rotScopeChange(this)"> Select pages
            </label>
            <label style="min-width:auto;display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="radio" name="rotScope" value="range" onchange="rotScopeChange(this)"> Page range
            </label>
          </div>
        </div>
        <div id="rotSelectWrap" style="display:none">
          <div class="pages-grid" id="rotPageGrid"></div>
          <div style="font-size:0.78rem;color:var(--txt3)" id="rotSelCount">0 pages selected</div>
        </div>
        <div id="rotRangeWrap" style="display:none">
          <div class="ctrl-row">
            <label>Page range</label>
            <input class="inp" id="rotRangeInput" placeholder="e.g. 1-3, 5, 7-9" style="flex:1">
          </div>
        </div>
      </div>
      ${progHTML('rotate')}
      ${resHTML('rotate')}
      <div class="btn-row">
        <button class="btn btn-gold btn-lg" id="rotateBtn" onclick="doRotate()">🔄 Rotate & Download</button>
        <button class="btn btn-ghost btn-sm" onclick="resetRotate()">↺ Reset</button>
      </div>
    </div>`;

  let rotAngle = 90;
  let rotScope = 'all';
  let selectedPages = new Set();
  let totalPages = 0;

  window.setAngle = (deg, btn) => {
    rotAngle = deg;
    document.querySelectorAll('.rot-angle-btn').forEach(b => {
      b.classList.toggle('btn-gold', b === btn);
      b.classList.toggle('btn-ghost', b !== btn);
    });
  };
  // init first button active
  setTimeout(() => setAngle(90, document.querySelector('.rot-angle-btn')), 50);

  window.rotScopeChange = (el) => {
    rotScope = el.value;
    document.getElementById('rotSelectWrap').style.display = rotScope === 'select' ? '' : 'none';
    document.getElementById('rotRangeWrap').style.display  = rotScope === 'range'  ? '' : 'none';
  };

  window.onFilesLoaded_rotate = async () => {
    const file = STATE.rotate?.files?.[0]; if (!file) return;
    const ab  = await file.arrayBuffer();
    const doc = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
    totalPages = doc.getPageCount();
    document.getElementById('rotateOptions').style.display = '';
    buildPageGrid();
  };

  function buildPageGrid() {
    const grid = document.getElementById('rotPageGrid'); if (!grid) return;
    grid.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      const div = document.createElement('div');
      div.className = 'pg-thumb';
      div.dataset.page = i;
      div.innerHTML = `<div style="height:60px;display:flex;align-items:center;justify-content:center;font-size:0.75rem;color:var(--txt3)">Pg ${i}</div>
        <div class="pg-num">Page ${i}</div><div class="pg-check">✓</div>`;
      div.onclick = () => togglePage(i, div);
      grid.appendChild(div);
    }
  }

  function togglePage(i, el) {
    if (selectedPages.has(i)) { selectedPages.delete(i); el.classList.remove('sel'); }
    else { selectedPages.add(i); el.classList.add('sel'); }
    document.getElementById('rotSelCount').textContent = selectedPages.size + ' page' + (selectedPages.size!==1?'s':'') + ' selected';
  }

  window.doRotate = async () => {
    const file = STATE.rotate?.files?.[0]; if (!file) return;
    const btn  = document.getElementById('rotateBtn'); btn.disabled = true;
    showProg('rotate', 5, 'Loading…');
    try {
      const ab  = await file.arrayBuffer();
      const doc = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
      const pages = doc.getPages();

      let targetIndices = [];
      if (rotScope === 'all') {
        targetIndices = pages.map((_, i) => i);
      } else if (rotScope === 'select') {
        targetIndices = [...selectedPages].map(n => n - 1);
      } else {
        const rangeStr = document.getElementById('rotRangeInput').value;
        rangeStr.split(',').forEach(part => {
          part = part.trim();
          if (part.includes('-')) {
            const [a,b] = part.split('-').map(Number);
            for (let i=a;i<=b;i++) targetIndices.push(i-1);
          } else { targetIndices.push(Number(part)-1); }
        });
        targetIndices = targetIndices.filter(i => i >= 0 && i < pages.length);
      }

      if (!targetIndices.length) { alert('No pages selected.'); return; }

      targetIndices.forEach((idx, i) => {
        showProg('rotate', 10 + Math.round((i / targetIndices.length) * 85), `Rotating page ${idx+1}…`);
        const page    = pages[idx];
        const current = page.getRotation().angle;
        page.setRotation(PDFLib.degrees((current + rotAngle) % 360));
      });

      showProg('rotate', 97, 'Saving…');
      const out   = await doc.save();
      const fname = file.name.replace('.pdf','') + '_rotated.pdf';
      downloadBytes(out, fname);
      logHistory('Rotate Pages', '🔄', [file], out.length);
      showProg('rotate', 100); setTimeout(() => hideProg('rotate'), 500);
      showRes('rotate', `${targetIndices.length} page${targetIndices.length!==1?'s':''} rotated by ${rotAngle}°.`,
        `<button class="btn btn-gold" onclick="doRotate()">⬇ Download Again</button>
         <button class="btn btn-ghost" onclick="resetRotate()">↺ Rotate Another</button>`);
    } catch(e) { hideProg('rotate'); alert('Error: ' + e.message); }
    finally { btn.disabled = false; }
  };

  window.resetRotate = () => {
    STATE.rotate = {}; totalPages = 0; selectedPages = new Set();
    document.getElementById('fl-rotate').innerHTML = '';
    document.getElementById('rotateOptions').style.display = 'none';
    hideRes('rotate'); hideProg('rotate');
  };
};
