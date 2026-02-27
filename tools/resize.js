// ── RESIZE PAGES ──────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Changes every page to a new size by scaling content to fit. Choose a standard paper size or enter custom dimensions.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF</div>
      ${dz('resize', false, '.pdf,application/pdf', 'Drop PDF here')}
      <div class="file-list" id="fl-resize"></div>
    </div>
    <div class="ctrl-group" id="resizeOptions" style="display:none">
      <div class="ctrl-group-title">Target Page Size</div>
      <div class="ctrl-row">
        <label>Preset size</label>
        <select class="inp" id="resizePreset" onchange="resizePresetChange()" style="width:auto">
          <option value="a4">A4 — 210 × 297 mm</option>
          <option value="a3">A3 — 297 × 420 mm</option>
          <option value="a5">A5 — 148 × 210 mm</option>
          <option value="letter" selected>Letter — 8.5 × 11 in</option>
          <option value="legal">Legal — 8.5 × 14 in</option>
          <option value="custom">Custom dimensions…</option>
        </select>
      </div>
      <div id="resizeCustomWrap" style="display:none">
        <div class="ctrl-row">
          <label>Width</label>
          <input class="inp" type="number" id="resizeW" value="595" min="1" style="width:100px">
          <select class="inp" id="resizeUnit" style="width:auto" onchange="resizeUnitChange()">
            <option value="pt" selected>pt</option>
            <option value="mm">mm</option>
            <option value="in">in</option>
          </select>
        </div>
        <div class="ctrl-row">
          <label>Height</label>
          <input class="inp" type="number" id="resizeH" value="842" min="1" style="width:100px">
        </div>
      </div>
      <div class="ctrl-row">
        <label>Orientation</label>
        <div style="display:flex;gap:8px">
          <button class="btn btn-gold btn-sm resize-orient" onclick="setOrient('portrait',this)">▯ Portrait</button>
          <button class="btn btn-ghost btn-sm resize-orient" onclick="setOrient('landscape',this)">▭ Landscape</button>
        </div>
      </div>
      <div class="ctrl-row">
        <label>Scale content</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <label style="min-width:auto;display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="radio" name="resizeScale" value="fit" checked> Fit (keep ratio)
          </label>
          <label style="min-width:auto;display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="radio" name="resizeScale" value="stretch"> Stretch to fill
          </label>
          <label style="min-width:auto;display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="radio" name="resizeScale" value="none"> No scaling (crop/pad)
          </label>
        </div>
      </div>
      <div style="font-size:0.78rem;color:var(--txt3);margin-top:4px" id="resizeInfo"></div>
    </div>
    ${progHTML('resize')}
    ${resHTML('resize')}
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-gold btn-lg" id="resizeBtn" onclick="doResize()" disabled>📐 Resize & Download</button>
      <button class="btn btn-ghost btn-sm" onclick="resetResize()">↺ Reset</button>
    </div>`;

  // pt dimensions for presets
  const PRESETS = {
    a4:     [595.28, 841.89],
    a3:     [841.89, 1190.55],
    a5:     [419.53, 595.28],
    letter: [612, 792],
    legal:  [612, 1008],
  };
  const PT = { pt:1, mm:2.8346, in:72 };
  let orient = 'portrait';

  window.setOrient = (o, btn) => {
    orient = o;
    document.querySelectorAll('.resize-orient').forEach(b => {
      b.classList.toggle('btn-gold',  b===btn);
      b.classList.toggle('btn-ghost', b!==btn);
    });
    updateResizeInfo();
  };

  window.resizePresetChange = () => {
    const v = document.getElementById('resizePreset').value;
    document.getElementById('resizeCustomWrap').style.display = v==='custom' ? '' : 'none';
    updateResizeInfo();
  };

  window.resizeUnitChange = () => {
    // just update info label
    updateResizeInfo();
  };

  function getTargetPt() {
    const preset = document.getElementById('resizePreset').value;
    let w, h;
    if (preset === 'custom') {
      const unit = document.getElementById('resizeUnit').value;
      const mult = PT[unit] || 1;
      w = parseFloat(document.getElementById('resizeW').value||595) * mult;
      h = parseFloat(document.getElementById('resizeH').value||842) * mult;
    } else {
      [w, h] = PRESETS[preset] || [612, 792];
    }
    return orient === 'landscape' ? [Math.max(w,h), Math.min(w,h)] : [Math.min(w,h), Math.max(w,h)];
  }

  function updateResizeInfo() {
    const [w, h] = getTargetPt();
    const el = document.getElementById('resizeInfo');
    if (el) el.textContent = `Target: ${w.toFixed(0)} × ${h.toFixed(0)} pt (${(w/2.8346).toFixed(0)} × ${(h/2.8346).toFixed(0)} mm)`;
  }

  window.onFilesLoaded_resize = async () => {
    const file = STATE.resize?.files?.[0]; if (!file) return;
    const ab   = await file.arrayBuffer();
    const doc  = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
    const pg   = doc.getPage(0);
    const { width, height } = pg.getSize();
    document.getElementById('resizeOptions').style.display = '';
    document.getElementById('resizeBtn').disabled = false;
    document.getElementById('resizeInfo').textContent = `Current size: ${width.toFixed(0)} × ${height.toFixed(0)} pt`;
    updateResizeInfo();
  };

  window.doResize = async () => {
    const file = STATE.resize?.files?.[0]; if (!file) return;
    const btn  = document.getElementById('resizeBtn'); btn.disabled = true;
    showProg('resize', 5, 'Loading…');
    try {
      const ab     = await file.arrayBuffer();
      const pdfJs  = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise;
      const newDoc = await PDFLib.PDFDocument.create();
      const total  = pdfJs.numPages;
      const [tW, tH] = getTargetPt();
      const scaleMode = document.querySelector('input[name="resizeScale"]:checked').value;

      for (let i = 1; i <= total; i++) {
        showProg('resize', 5 + Math.round((i/total)*88), `Resizing page ${i} of ${total}…`);
        const page     = await pdfJs.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas   = document.createElement('canvas');
        canvas.width   = viewport.width; canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

        const newPage = newDoc.addPage([tW, tH]);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const resp    = await fetch(dataUrl);
        const imgBytes= await resp.arrayBuffer();
        const embedded= await newDoc.embedJpg(imgBytes);

        const srcW = viewport.width, srcH = viewport.height;
        let drawW, drawH, drawX, drawY;
        if (scaleMode === 'stretch') {
          drawW=tW; drawH=tH; drawX=0; drawY=0;
        } else if (scaleMode === 'fit') {
          const scale = Math.min(tW/srcW, tH/srcH);
          drawW=srcW*scale; drawH=srcH*scale;
          drawX=(tW-drawW)/2; drawY=(tH-drawH)/2;
        } else {
          drawW=srcW; drawH=srcH; drawX=(tW-srcW)/2; drawY=(tH-srcH)/2;
        }
        newPage.drawImage(embedded, { x:drawX, y:drawY, width:drawW, height:drawH });
      }

      showProg('resize', 96, 'Saving…');
      const out   = await newDoc.save();
      const fname = file.name.replace('.pdf','') + '_resized.pdf';
      downloadBytes(out, fname);
      logHistory('Resize Pages', '📐', [file], out.length);
      showProg('resize', 100); setTimeout(() => hideProg('resize'), 500);
      showRes('resize', `${total} page${total!==1?'s':''} resized to ${getTargetPt().map(v=>v.toFixed(0)).join(' × ')} pt.`,
        `<button class="btn btn-gold" onclick="doResize()">⬇ Download Again</button>
         <button class="btn btn-ghost" onclick="resetResize()">↺ Resize Another</button>`);
    } catch(e) { hideProg('resize'); alert('Error: ' + e.message); }
    finally { btn.disabled = false; }
  };

  window.resetResize = () => {
    STATE.resize = {};
    document.getElementById('fl-resize').innerHTML = '';
    document.getElementById('resizeOptions').style.display = 'none';
    document.getElementById('resizeBtn').disabled = true;
    hideRes('resize'); hideProg('resize');
  };

  // init
  setTimeout(updateResizeInfo, 50);
};
