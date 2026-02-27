// ── PDF VIEWER ────────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>Full-featured viewer:</strong> Navigate pages, zoom, search text, and view in fullscreen. All rendering happens locally in your browser.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Open PDF</div>
      ${dz('viewer', false, '.pdf,application/pdf', 'Drop PDF to view')}
      <div class="file-list" id="fl-viewer"></div>
    </div>
    <div id="viewerSection" style="display:none">
      <!-- Toolbar -->
      <div style="background:var(--ink2);border:1px solid var(--border);border-radius:var(--r2) var(--r2) 0 0;padding:10px 14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" onclick="viewNav(-1)">‹ Prev</button>
        <div style="display:flex;align-items:center;gap:6px;font-size:0.84rem">
          <span style="color:var(--txt3)">Page</span>
          <input class="inp" type="number" id="viewPageInput" min="1" value="1" style="width:52px;padding:4px 7px;text-align:center" onchange="viewGoTo(this.value)">
          <span style="color:var(--txt3)">of <span id="viewTotalPgs">—</span></span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="viewNav(1)">Next ›</button>
        <div style="width:1px;height:20px;background:var(--border);margin:0 4px"></div>
        <select class="inp" id="viewScaleSel" style="width:auto;font-size:0.8rem" onchange="viewZoom(this.value)">
          <option value="0.5">50%</option>
          <option value="0.75">75%</option>
          <option value="1">100%</option>
          <option value="1.5" selected>150%</option>
          <option value="2">200%</option>
          <option value="3">300%</option>
        </select>
        <button class="btn btn-ghost btn-sm" onclick="viewZoomIn()">＋</button>
        <button class="btn btn-ghost btn-sm" onclick="viewZoomOut()">－</button>
        <div style="width:1px;height:20px;background:var(--border);margin:0 4px"></div>
        <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:160px">
          <input class="inp" id="viewSearch" placeholder="🔍 Search text…" style="flex:1;font-size:0.82rem" oninput="viewSearchText(this.value)">
          <span id="viewSearchCount" style="font-size:0.76rem;color:var(--txt3);white-space:nowrap"></span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="viewFullscreen()" title="Fullscreen">⛶</button>
      </div>
      <!-- Thumbnail sidebar + canvas -->
      <div style="display:flex;background:var(--ink);border:1px solid var(--border);border-top:none;border-radius:0 0 var(--r2) var(--r2);overflow:hidden">
        <div id="viewThumbBar" style="width:80px;flex-shrink:0;overflow-y:auto;background:var(--ink2);border-right:1px solid var(--border);padding:8px 6px;display:flex;flex-direction:column;gap:6px;max-height:600px"></div>
        <div id="viewCanvasWrap" style="flex:1;overflow:auto;display:flex;align-items:flex-start;justify-content:center;padding:20px;min-height:400px;max-height:600px;position:relative">
          <canvas id="viewCanvas" style="max-width:100%;box-shadow:0 6px 32px rgba(0,0,0,.55);border-radius:3px;display:block"></canvas>
        </div>
      </div>
      <div class="btn-row" style="margin-top:10px">
        <button class="btn btn-ghost btn-sm" onclick="resetViewer()">↺ Open Another</button>
      </div>
    </div>`;

  let pdfDoc  = null;
  let curPage = 1;
  let scale   = 1.5;
  let allText = [];

  window.onFilesLoaded_viewer = async () => {
    const file = STATE.viewer?.files?.[0]; if (!file) return;
    showProg('viewer', 20, 'Loading PDF…');
    const ab = await file.arrayBuffer();
    pdfDoc   = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise;
    hideProg('viewer');
    document.getElementById('viewerSection').style.display = '';
    document.getElementById('viewTotalPgs').textContent = pdfDoc.numPages;
    document.getElementById('viewPageInput').max = pdfDoc.numPages;
    curPage = 1;
    renderView(1);
    buildThumbBar();
    preloadText();
    logHistory('PDF Viewer', '👁️', [file], 0);
  };

  async function renderView(n) {
    curPage = Math.max(1, Math.min(pdfDoc.numPages, n));
    document.getElementById('viewPageInput').value = curPage;
    const canvas = document.getElementById('viewCanvas');
    const page   = await pdfDoc.getPage(curPage);
    const vp     = page.getViewport({ scale });
    canvas.width  = vp.width; canvas.height = vp.height;
    canvas.style.width  = (vp.width/scale*scale) + 'px';
    canvas.style.height = (vp.height/scale*scale) + 'px';
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    // update thumb active
    document.querySelectorAll('.vthumb').forEach((t,i) => t.classList.toggle('active', i+1===curPage));
  }

  async function buildThumbBar() {
    const bar = document.getElementById('viewThumbBar'); if (!bar) return;
    bar.innerHTML = '';
    for (let i=1; i<=pdfDoc.numPages; i++) {
      const wrap  = document.createElement('div');
      wrap.className = 'vthumb' + (i===1?' active':'');
      wrap.style.cssText = 'cursor:pointer;border-radius:4px;overflow:hidden;border:2px solid transparent;transition:border-color 0.18s';
      wrap.onclick = () => renderView(i);
      wrap.classList.toggle('active', i===1);
      const tc = document.createElement('canvas');
      tc.style.cssText = 'width:66px;height:auto;display:block';
      const lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:0.58rem;text-align:center;color:var(--txt3);padding:2px 0';
      lbl.textContent = i;
      wrap.appendChild(tc); wrap.appendChild(lbl);
      bar.appendChild(wrap);
      // Apply active style via JS since class may not update in time
      wrap.addEventListener('click', () => {
        document.querySelectorAll('.vthumb').forEach(t => t.style.borderColor='');
        wrap.style.borderColor = 'var(--gold)';
      });
      (async () => {
        const pg = await pdfDoc.getPage(i);
        const vp = pg.getViewport({ scale: 0.25 });
        tc.width=vp.width; tc.height=vp.height;
        await pg.render({ canvasContext:tc.getContext('2d'), viewport:vp }).promise;
      })();
    }
  }

  async function preloadText() {
    allText = [];
    for (let i=1; i<=pdfDoc.numPages; i++) {
      const pg = await pdfDoc.getPage(i);
      const ct = await pg.getTextContent();
      allText.push(ct.items.map(it=>it.str).join(' '));
    }
  }

  window.viewNav    = (d) => renderView(curPage + d);
  window.viewGoTo   = (v) => renderView(parseInt(v)||1);
  window.viewZoom   = (v) => { scale = parseFloat(v); renderView(curPage); };
  window.viewZoomIn = () => {
    const steps = [0.5,0.75,1,1.5,2,3];
    const idx   = steps.indexOf(scale);
    if (idx < steps.length-1) { scale = steps[idx+1]; document.getElementById('viewScaleSel').value=scale; renderView(curPage); }
  };
  window.viewZoomOut = () => {
    const steps = [0.5,0.75,1,1.5,2,3];
    const idx   = steps.indexOf(scale);
    if (idx > 0) { scale = steps[idx-1]; document.getElementById('viewScaleSel').value=scale; renderView(curPage); }
  };

  window.viewSearchText = (q) => {
    const el = document.getElementById('viewSearchCount');
    if (!q.trim()) { el.textContent=''; return; }
    const matches = allText.reduce((a,t,i) => {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');
      const cnt   = (t.match(regex)||[]).length;
      return cnt>0 ? [...a, { page:i+1, cnt }] : a;
    }, []);
    if (!matches.length) { el.textContent='Not found'; return; }
    const first = matches[0].page;
    el.textContent = `${matches.reduce((a,m)=>a+m.cnt,0)} match${matches.reduce((a,m)=>a+m.cnt,0)!==1?'es':''} on ${matches.length} page${matches.length!==1?'s':''}`;
    renderView(first);
  };

  window.viewFullscreen = () => {
    const wrap = document.getElementById('viewCanvasWrap');
    if (wrap.requestFullscreen) wrap.requestFullscreen();
  };

  // Keyboard nav
  document.addEventListener('keydown', (e) => {
    if (!pdfDoc) return;
    if (e.key==='ArrowRight'||e.key==='ArrowDown') renderView(curPage+1);
    if (e.key==='ArrowLeft' ||e.key==='ArrowUp')   renderView(curPage-1);
  });

  window.resetViewer = () => {
    STATE.viewer = {}; pdfDoc=null; allText=[];
    document.getElementById('fl-viewer').innerHTML='';
    document.getElementById('viewerSection').style.display='none';
    hideProg('viewer');
  };
};
