// ── CROP PDF ──────────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Sets the CropBox of every page by trimming margins from each edge. Enter values in points (1 inch = 72pt). The visible area shrinks but original content is preserved.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF</div>
      ${dz('crop', false, '.pdf,application/pdf', 'Drop PDF here')}
      <div class="file-list" id="fl-crop"></div>
    </div>
    <div class="ctrl-group" id="cropOptions" style="display:none">
      <div class="ctrl-group-title">Crop Margins (points)</div>
      <div class="ctrl-row">
        <label>Unit</label>
        <select class="inp" id="cropUnit" style="width:auto" onchange="cropUnitChange()">
          <option value="pt" selected>Points (pt)</option>
          <option value="mm">Millimetres (mm)</option>
          <option value="in">Inches (in)</option>
        </select>
      </div>
      <!-- Visual margin diagram -->
      <div style="margin:18px auto;max-width:280px;position:relative">
        <div style="background:var(--ink3);border:1px solid var(--border2);border-radius:var(--r);padding:28px;position:relative">
          <div style="background:rgba(240,180,41,0.08);border:2px dashed rgba(240,180,41,0.3);border-radius:6px;height:80px;display:flex;align-items:center;justify-content:center">
            <span style="font-size:0.74rem;color:var(--txt3)">Remaining page area</span>
          </div>
          <!-- Top input -->
          <div style="position:absolute;top:6px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:4px">
            <input class="inp" id="cropTop" type="number" value="0" min="0" style="width:60px;padding:4px 6px;font-size:0.8rem;text-align:center" oninput="updateCropPreview()">
            <span style="font-size:0.68rem;color:var(--txt3)">top</span>
          </div>
          <!-- Bottom input -->
          <div style="position:absolute;bottom:6px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:4px">
            <input class="inp" id="cropBottom" type="number" value="0" min="0" style="width:60px;padding:4px 6px;font-size:0.8rem;text-align:center" oninput="updateCropPreview()">
            <span style="font-size:0.68rem;color:var(--txt3)">bottom</span>
          </div>
          <!-- Left input -->
          <div style="position:absolute;left:2px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;align-items:center;gap:2px">
            <input class="inp" id="cropLeft" type="number" value="0" min="0" style="width:54px;padding:4px 5px;font-size:0.8rem;text-align:center" oninput="updateCropPreview()">
            <span style="font-size:0.62rem;color:var(--txt3)">left</span>
          </div>
          <!-- Right input -->
          <div style="position:absolute;right:2px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;align-items:center;gap:2px">
            <input class="inp" id="cropRight" type="number" value="0" min="0" style="width:54px;padding:4px 5px;font-size:0.8rem;text-align:center" oninput="updateCropPreview()">
            <span style="font-size:0.62rem;color:var(--txt3)">right</span>
          </div>
        </div>
      </div>
      <div class="ctrl-row">
        <label>Quick presets</label>
        <div style="display:flex;gap:7px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="setCropPreset(0,0,0,0)">None</button>
          <button class="btn btn-ghost btn-sm" onclick="setCropPreset(20,20,20,20)">Small (20pt)</button>
          <button class="btn btn-ghost btn-sm" onclick="setCropPreset(36,36,36,36)">Medium (36pt)</button>
          <button class="btn btn-ghost btn-sm" onclick="setCropPreset(72,72,72,72)">Large (72pt/1in)</button>
        </div>
      </div>
      <div class="ctrl-row">
        <label>Apply to</label>
        <select class="inp" id="cropScope" style="width:auto">
          <option value="all" selected>All pages</option>
          <option value="odd">Odd pages only</option>
          <option value="even">Even pages only</option>
        </select>
      </div>
      <div style="font-size:0.78rem;color:var(--txt3);margin-top:6px" id="cropInfo"></div>
    </div>
    ${progHTML('crop')}
    ${resHTML('crop')}
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-gold btn-lg" id="cropBtn" onclick="doCrop()" disabled>✂️ Crop & Download</button>
      <button class="btn btn-ghost btn-sm" onclick="resetCrop()">↺ Reset</button>
    </div>`;

  const PT = { pt: 1, mm: 2.8346, in: 72 };

  window.cropUnitChange = () => updateCropPreview();

  window.setCropPreset = (t, b, l, r) => {
    ['cropTop','cropBottom','cropLeft','cropRight'].forEach((id, i) => {
      document.getElementById(id).value = [t,b,l,r][i];
    });
    updateCropPreview();
  };

  window.updateCropPreview = () => {
    const unit = document.getElementById('cropUnit')?.value || 'pt';
    const mult = PT[unit] || 1;
    const t = parseFloat(document.getElementById('cropTop')?.value||0) * mult;
    const b = parseFloat(document.getElementById('cropBottom')?.value||0) * mult;
    const l = parseFloat(document.getElementById('cropLeft')?.value||0) * mult;
    const r = parseFloat(document.getElementById('cropRight')?.value||0) * mult;
    const el = document.getElementById('cropInfo');
    if (el) el.textContent = `Trimming: top ${t.toFixed(0)}pt · bottom ${b.toFixed(0)}pt · left ${l.toFixed(0)}pt · right ${r.toFixed(0)}pt`;
  };

  window.onFilesLoaded_crop = async () => {
    const file = STATE.crop?.files?.[0]; if (!file) return;
    const ab   = await file.arrayBuffer();
    const doc  = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
    const pg   = doc.getPage(0);
    const { width, height } = pg.getSize();
    document.getElementById('cropOptions').style.display = '';
    document.getElementById('cropBtn').disabled = false;
    document.getElementById('cropInfo').textContent = `Page size: ${width.toFixed(0)} × ${height.toFixed(0)} pt`;
  };

  window.doCrop = async () => {
    const file = STATE.crop?.files?.[0]; if (!file) return;
    const btn  = document.getElementById('cropBtn'); btn.disabled = true;
    showProg('crop', 5, 'Loading…');
    try {
      const unit  = document.getElementById('cropUnit').value;
      const mult  = PT[unit] || 1;
      const top   = parseFloat(document.getElementById('cropTop').value||0)    * mult;
      const bot   = parseFloat(document.getElementById('cropBottom').value||0) * mult;
      const left  = parseFloat(document.getElementById('cropLeft').value||0)   * mult;
      const right = parseFloat(document.getElementById('cropRight').value||0)  * mult;
      const scope = document.getElementById('cropScope').value;

      const ab    = await file.arrayBuffer();
      const doc   = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
      const pages = doc.getPages();

      pages.forEach((page, idx) => {
        showProg('crop', 10 + Math.round((idx/pages.length)*85), `Cropping page ${idx+1}…`);
        const pageNum = idx + 1;
        if (scope === 'odd'  && pageNum % 2 === 0) return;
        if (scope === 'even' && pageNum % 2 !== 0) return;
        const { width: w, height: h } = page.getSize();
        page.setCropBox(left, bot, w - left - right, h - top - bot);
      });

      showProg('crop', 96, 'Saving…');
      const out   = await doc.save();
      const fname = file.name.replace('.pdf','') + '_cropped.pdf';
      downloadBytes(out, fname);
      logHistory('Crop PDF', '✂️', [file], out.length);
      showProg('crop', 100); setTimeout(() => hideProg('crop'), 500);
      showRes('crop', `PDF cropped (${pages.length} pages).`,
        `<button class="btn btn-gold" onclick="doCrop()">⬇ Download Again</button>
         <button class="btn btn-ghost" onclick="resetCrop()">↺ Crop Another</button>`);
    } catch(e) { hideProg('crop'); alert('Error: ' + e.message); }
    finally { btn.disabled = false; }
  };

  window.resetCrop = () => {
    STATE.crop = {};
    document.getElementById('fl-crop').innerHTML = '';
    document.getElementById('cropOptions').style.display = 'none';
    document.getElementById('cropBtn').disabled = true;
    hideRes('crop'); hideProg('crop');
  };
};
