// ── PDF → IMAGES ──────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Each page is rendered at your chosen quality and saved as a separate image file. JPG is smaller; PNG is lossless.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF</div>
      ${dz('pdf2img', false, '.pdf,application/pdf', 'Drop PDF here')}
      <div class="file-list" id="fl-pdf2img"></div>
    </div>
    <div class="ctrl-group" id="p2iOptions" style="display:none">
      <div class="ctrl-group-title">Export Settings</div>
      <div class="ctrl-row">
        <label>Format</label>
        <div style="display:flex;gap:8px">
          <button class="btn btn-gold btn-sm p2i-fmt-btn" data-fmt="jpeg" onclick="setP2IFmt('jpeg',this)">🖼 JPG</button>
          <button class="btn btn-ghost btn-sm p2i-fmt-btn" data-fmt="png"  onclick="setP2IFmt('png',this)">🖼 PNG</button>
        </div>
      </div>
      <div class="ctrl-row" id="p2iQualityRow">
        <label>JPG quality</label>
        <input type="range" class="inp" id="p2iQuality" min="40" max="100" value="90" style="width:160px" oninput="document.getElementById('p2iQVal').textContent=this.value+'%'">
        <span id="p2iQVal" style="font-size:0.82rem;color:var(--gold);font-weight:700;min-width:36px">90%</span>
      </div>
      <div class="ctrl-row">
        <label>Render scale</label>
        <select class="inp" id="p2iScale" style="width:auto">
          <option value="3">Ultra (3x)</option>
          <option value="2" selected>High (2x)</option>
          <option value="1.5">Normal (1.5x)</option>
          <option value="1">Low (1x)</option>
        </select>
      </div>
      <div class="ctrl-row">
        <label>Pages to export</label>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <label style="min-width:auto;display:flex;gap:5px;align-items:center;cursor:pointer">
            <input type="radio" name="p2iPages" value="all" checked onchange="p2iPagesChange(this)"> All pages
          </label>
          <label style="min-width:auto;display:flex;gap:5px;align-items:center;cursor:pointer">
            <input type="radio" name="p2iPages" value="range" onchange="p2iPagesChange(this)"> Range
          </label>
        </div>
      </div>
      <div id="p2iRangeWrap" style="display:none">
        <div class="ctrl-row">
          <label>Page range</label>
          <input class="inp" id="p2iRange" placeholder="e.g. 1-5, 8, 10-12" style="flex:1">
        </div>
      </div>
      <div style="font-size:0.78rem;color:var(--txt3);margin-top:4px" id="p2iInfo"></div>
    </div>

    <!-- Preview strip -->
    <div id="p2iPreviewWrap" style="display:none">
      <div class="ctrl-group">
        <div class="ctrl-group-title">Preview</div>
        <div id="p2iPreviewStrip" style="display:flex;gap:10px;overflow-x:auto;padding:6px 2px"></div>
      </div>
    </div>

    ${progHTML('pdf2img')}
    ${resHTML('pdf2img')}
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-gold btn-lg" id="p2iBtn" onclick="doP2I()" disabled>🖼️ Export Images</button>
      <button class="btn btn-ghost btn-sm" onclick="resetP2I()">↺ Reset</button>
    </div>`;

  let p2iFmt   = 'jpeg';
  let pdfJsDoc = null;
  let totalPgs = 0;

  window.setP2IFmt = (fmt, btn) => {
    p2iFmt = fmt;
    document.querySelectorAll('.p2i-fmt-btn').forEach(b => {
      b.classList.toggle('btn-gold',  b === btn);
      b.classList.toggle('btn-ghost', b !== btn);
    });
    document.getElementById('p2iQualityRow').style.display = fmt === 'jpeg' ? '' : 'none';
  };

  window.p2iPagesChange = (el) => {
    document.getElementById('p2iRangeWrap').style.display = el.value === 'range' ? '' : 'none';
  };

  window.onFilesLoaded_pdf2img = async () => {
    const file = STATE.pdf2img?.files?.[0]; if (!file) return;
    const ab   = await file.arrayBuffer();
    pdfJsDoc   = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise;
    totalPgs   = pdfJsDoc.numPages;
    document.getElementById('p2iOptions').style.display = '';
    document.getElementById('p2iBtn').disabled = false;
    document.getElementById('p2iInfo').textContent = `${totalPgs} pages available`;
    buildPreview();
  };

  async function buildPreview() {
    const wrap = document.getElementById('p2iPreviewWrap');
    const strip= document.getElementById('p2iPreviewStrip');
    wrap.style.display = ''; strip.innerHTML = '';
    const show = Math.min(totalPgs, 6);
    for (let i = 1; i <= show; i++) {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'height:80px;width:auto;border-radius:4px;border:1px solid var(--border);flex-shrink:0';
      strip.appendChild(canvas);
      WLP.renderPage(pdfJsDoc, i, canvas, 0.5).catch(()=>{});
    }
    if (totalPgs > show) {
      const more = document.createElement('div');
      more.style.cssText = 'display:flex;align-items:center;padding:0 10px;font-size:0.78rem;color:var(--txt3);flex-shrink:0';
      more.textContent = `+${totalPgs - show} more`;
      strip.appendChild(more);
    }
  }

  function parseRangeP2I(str, total) {
    const pages = new Set();
    str.split(',').forEach(p => {
      p = p.trim();
      if (p.includes('-')) {
        const [a,b] = p.split('-').map(Number);
        for (let i=a;i<=Math.min(b,total);i++) pages.add(i);
      } else { const n=Number(p); if(n>=1&&n<=total) pages.add(n); }
    });
    return [...pages].sort((a,b)=>a-b);
  }

  window.doP2I = async () => {
    if (!pdfJsDoc) return;
    const btn   = document.getElementById('p2iBtn'); btn.disabled = true;
    const scale = parseFloat(document.getElementById('p2iScale').value);
    const q     = parseInt(document.getElementById('p2iQuality').value) / 100;
    const fmt   = p2iFmt;
    const mime  = fmt === 'jpeg' ? 'image/jpeg' : 'image/png';
    const ext   = fmt === 'jpeg' ? 'jpg' : 'png';
    const pagesMode = document.querySelector('input[name="p2iPages"]:checked').value;
    let   pages;
    if (pagesMode === 'range') {
      pages = parseRangeP2I(document.getElementById('p2iRange').value, totalPgs);
      if (!pages.length) { alert('Enter valid page range.'); btn.disabled=false; return; }
    } else {
      pages = Array.from({ length: totalPgs }, (_, i) => i+1);
    }

    showProg('pdf2img', 5, 'Starting…');
    try {
      const base = STATE.pdf2img.files[0].name.replace('.pdf','');
      for (let idx = 0; idx < pages.length; idx++) {
        const pgNum  = pages[idx];
        showProg('pdf2img', 5 + Math.round((idx / pages.length) * 90), `Exporting page ${pgNum} of ${totalPgs}…`);
        const page     = await pdfJsDoc.getPage(pgNum);
        const viewport = page.getViewport({ scale });
        const canvas   = document.createElement('canvas');
        canvas.width   = viewport.width; canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const dataUrl  = canvas.toDataURL(mime, q);
        const a        = document.createElement('a');
        a.href         = dataUrl;
        a.download     = `${base}_page${pgNum}.${ext}`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        await new Promise(r => setTimeout(r, 100));
      }
      logHistory('PDF → Images', '🖼️', STATE.pdf2img.files, 0);
      showProg('pdf2img', 100); setTimeout(() => hideProg('pdf2img'), 500);
      showRes('pdf2img', `${pages.length} image${pages.length!==1?'s':''} exported as ${ext.toUpperCase()}.`,
        `<button class="btn btn-gold" onclick="doP2I()">⬇ Export Again</button>
         <button class="btn btn-ghost" onclick="resetP2I()">↺ Convert Another</button>`);
    } catch(e) { hideProg('pdf2img'); alert('Error: ' + e.message); }
    finally { btn.disabled = false; }
  };

  window.resetP2I = () => {
    STATE.pdf2img = {}; pdfJsDoc = null; totalPgs = 0;
    document.getElementById('fl-pdf2img').innerHTML = '';
    document.getElementById('p2iOptions').style.display = 'none';
    document.getElementById('p2iPreviewWrap').style.display = 'none';
    document.getElementById('p2iBtn').disabled = true;
    hideRes('pdf2img'); hideProg('pdf2img');
  };
};
