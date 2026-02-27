// ── EXTRACT IMAGES ────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Renders each page as a high-quality JPG image and downloads them. Every page becomes a separate image file named by page number.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF</div>
      ${dz('extractimages', false, '.pdf,application/pdf', 'Drop PDF here')}
      <div class="file-list" id="fl-extractimages"></div>
    </div>
    <div class="ctrl-group" id="eiOptions" style="display:none">
      <div class="ctrl-group-title">Export Settings</div>
      <div class="ctrl-row">
        <label>Format</label>
        <div style="display:flex;gap:8px">
          <button class="btn btn-gold btn-sm ei-fmt-btn" data-f="jpeg" onclick="setEIFmt('jpeg',this)">🖼 JPG</button>
          <button class="btn btn-ghost btn-sm ei-fmt-btn" data-f="png"  onclick="setEIFmt('png',this)">🖼 PNG</button>
        </div>
      </div>
      <div class="ctrl-row" id="eiQualityRow">
        <label>Quality</label>
        <input type="range" class="inp" id="eiQuality" min="40" max="100" value="92" style="width:140px" oninput="document.getElementById('eiQVal').textContent=this.value+'%'">
        <span id="eiQVal" style="font-size:0.82rem;color:var(--gold);font-weight:700;min-width:36px">92%</span>
      </div>
      <div class="ctrl-row">
        <label>Render scale</label>
        <select class="inp" id="eiScale" style="width:auto">
          <option value="3">Ultra (3x)</option>
          <option value="2" selected>High (2x)</option>
          <option value="1.5">Normal (1.5x)</option>
          <option value="1">Low (1x)</option>
        </select>
      </div>
      <div class="ctrl-row">
        <label>Pages</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <label style="min-width:auto;display:flex;gap:5px;align-items:center;cursor:pointer">
            <input type="radio" name="eiPages" value="all" checked onchange="eiPagesChange(this)"> All pages
          </label>
          <label style="min-width:auto;display:flex;gap:5px;align-items:center;cursor:pointer">
            <input type="radio" name="eiPages" value="range" onchange="eiPagesChange(this)"> Range
          </label>
        </div>
      </div>
      <div id="eiRangeWrap" style="display:none">
        <div class="ctrl-row">
          <label>Range</label>
          <input class="inp" id="eiRange" placeholder="e.g. 1-5, 8, 10-12" style="flex:1">
        </div>
      </div>
      <div style="font-size:0.78rem;color:var(--txt3);margin-top:4px" id="eiInfo"></div>
    </div>
    <!-- Preview strip -->
    <div id="eiPreviewWrap" style="display:none">
      <div class="ctrl-group">
        <div class="ctrl-group-title">Preview (first 4 pages)</div>
        <div id="eiPreviewStrip" style="display:flex;gap:10px;overflow-x:auto;padding:4px 2px"></div>
      </div>
    </div>
    ${progHTML('extractimages')}
    ${resHTML('extractimages')}
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-gold btn-lg" id="eiBtn" onclick="doExtractImages()" disabled>🎨 Export Images</button>
      <button class="btn btn-ghost btn-sm" onclick="resetEI()">↺ Reset</button>
    </div>`;

  let eiFmt    = 'jpeg';
  let pdfJsDoc = null;
  let totalPgs = 0;

  window.setEIFmt = (fmt, btn) => {
    eiFmt = fmt;
    document.querySelectorAll('.ei-fmt-btn').forEach(b => {
      b.classList.toggle('btn-gold',  b === btn);
      b.classList.toggle('btn-ghost', b !== btn);
    });
    document.getElementById('eiQualityRow').style.display = fmt === 'jpeg' ? '' : 'none';
  };

  window.eiPagesChange = (el) => {
    document.getElementById('eiRangeWrap').style.display = el.value === 'range' ? '' : 'none';
  };

  window.onFilesLoaded_extractimages = async () => {
    const file = STATE.extractimages?.files?.[0]; if (!file) return;
    const ab   = await file.arrayBuffer();
    pdfJsDoc   = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise;
    totalPgs   = pdfJsDoc.numPages;
    document.getElementById('eiOptions').style.display = '';
    document.getElementById('eiBtn').disabled = false;
    document.getElementById('eiInfo').textContent = `${totalPgs} pages available`;
    buildPreview();
  };

  async function buildPreview() {
    const wrap  = document.getElementById('eiPreviewWrap');
    const strip = document.getElementById('eiPreviewStrip');
    wrap.style.display = ''; strip.innerHTML = '';
    const show  = Math.min(totalPgs, 4);
    for (let i = 1; i <= show; i++) {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'height:90px;width:auto;border-radius:5px;border:1px solid var(--border);flex-shrink:0;box-shadow:0 3px 10px rgba(0,0,0,.3)';
      strip.appendChild(canvas);
      WLP.renderPage(pdfJsDoc, i, canvas, 0.55).catch(()=>{});
    }
    if (totalPgs > show) {
      const more = document.createElement('div');
      more.style.cssText = 'display:flex;align-items:center;padding:0 12px;font-size:0.78rem;color:var(--txt3);flex-shrink:0';
      more.textContent = `+${totalPgs - show} more pages`;
      strip.appendChild(more);
    }
  }

  function parseRange(str, total) {
    const pages = new Set();
    str.split(',').forEach(p => {
      p = p.trim();
      if (p.includes('-')) {
        const [a,b] = p.split('-').map(Number);
        for (let i=a; i<=Math.min(b,total); i++) pages.add(i);
      } else { const n=Number(p); if(n>=1&&n<=total) pages.add(n); }
    });
    return [...pages].sort((a,b)=>a-b);
  }

  window.doExtractImages = async () => {
    if (!pdfJsDoc) return;
    const btn   = document.getElementById('eiBtn'); btn.disabled = true;
    const scale = parseFloat(document.getElementById('eiScale').value);
    const q     = parseInt(document.getElementById('eiQuality').value) / 100;
    const fmt   = eiFmt;
    const mime  = fmt === 'jpeg' ? 'image/jpeg' : 'image/png';
    const ext   = fmt === 'jpeg' ? 'jpg' : 'png';
    const mode  = document.querySelector('input[name="eiPages"]:checked').value;
    let pages;
    if (mode === 'range') {
      pages = parseRange(document.getElementById('eiRange').value, totalPgs);
      if (!pages.length) { alert('Enter a valid page range.'); btn.disabled=false; return; }
    } else {
      pages = Array.from({ length: totalPgs }, (_, i) => i+1);
    }

    showProg('extractimages', 5, 'Starting export…');
    try {
      const base = STATE.extractimages.files[0].name.replace('.pdf','');
      for (let idx=0; idx<pages.length; idx++) {
        const pgNum  = pages[idx];
        showProg('extractimages', 5 + Math.round((idx/pages.length)*90), `Exporting page ${pgNum}…`);
        const page     = await pdfJsDoc.getPage(pgNum);
        const viewport = page.getViewport({ scale });
        const canvas   = document.createElement('canvas');
        canvas.width   = viewport.width; canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const dataUrl  = canvas.toDataURL(mime, q);
        const a        = document.createElement('a');
        a.href         = dataUrl;
        a.download     = `${base}_page${String(pgNum).padStart(3,'0')}.${ext}`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        await new Promise(r => setTimeout(r, 100));
      }
      logHistory('Extract Images', '🎨', STATE.extractimages.files, 0);
      showProg('extractimages', 100); setTimeout(() => hideProg('extractimages'), 500);
      showRes('extractimages', `${pages.length} image${pages.length!==1?'s':''} exported as ${ext.toUpperCase()}.`,
        `<button class="btn btn-gold" onclick="doExtractImages()">⬇ Export Again</button>
         <button class="btn btn-ghost" onclick="resetEI()">↺ Extract from Another</button>`);
    } catch(e) { hideProg('extractimages'); alert('Error: ' + e.message); }
    finally { btn.disabled = false; }
  };

  window.resetEI = () => {
    STATE.extractimages = {}; pdfJsDoc=null; totalPgs=0;
    document.getElementById('fl-extractimages').innerHTML='';
    document.getElementById('eiOptions').style.display='none';
    document.getElementById('eiPreviewWrap').style.display='none';
    document.getElementById('eiBtn').disabled=true;
    hideRes('extractimages'); hideProg('extractimages');
  };
};
