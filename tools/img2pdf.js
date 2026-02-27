// ── IMAGES → PDF ──────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Upload JPG, PNG or WebP images. Drag cards to reorder them. Each image becomes one page. Download as a single PDF.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload Images (JPG, PNG, WebP)</div>
      ${dz('img2pdf', true, 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp', 'Drop images here')}
      <div class="file-list" id="fl-img2pdf"></div>
    </div>
    <div class="ctrl-group" id="i2pOptions" style="display:none">
      <div class="ctrl-group-title">Page Settings</div>
      <div class="ctrl-row">
        <label>Page size</label>
        <select class="inp" id="i2pSize" style="width:auto">
          <option value="auto" selected>Match image size</option>
          <option value="a4">A4 (595 × 842 pt)</option>
          <option value="letter">Letter (612 × 792 pt)</option>
        </select>
      </div>
      <div class="ctrl-row">
        <label>Image fit</label>
        <select class="inp" id="i2pFit" style="width:auto">
          <option value="contain" selected>Contain (keep ratio)</option>
          <option value="stretch">Stretch to fill</option>
        </select>
      </div>
      <div class="ctrl-row">
        <label>Margin</label>
        <select class="inp" id="i2pMargin" style="width:auto">
          <option value="0" selected>None</option>
          <option value="20">Small (20pt)</option>
          <option value="40">Medium (40pt)</option>
        </select>
      </div>
    </div>

    <!-- Order preview -->
    <div id="i2pOrderWrap" style="display:none">
      <div class="ctrl-group">
        <div class="ctrl-group-title">Drag to Reorder Pages</div>
        <div id="i2pOrder" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:10px"></div>
      </div>
    </div>

    ${progHTML('img2pdf')}
    ${resHTML('img2pdf')}
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-gold btn-lg" id="i2pBtn" onclick="doI2P()" disabled>📄 Create PDF & Download</button>
      <button class="btn btn-ghost btn-sm" onclick="resetI2P()">↺ Reset</button>
    </div>`;

  STATE.img2pdf = { files: [], multi: true };
  let dragSrc = null;

  window.onFilesLoaded_img2pdf = () => {
    const files = STATE.img2pdf.files;
    document.getElementById('i2pOptions').style.display  = files.length ? '' : 'none';
    document.getElementById('i2pOrderWrap').style.display= files.length > 1 ? '' : 'none';
    document.getElementById('i2pBtn').disabled = !files.length;
    renderOrder(files);
  };

  function renderOrder(files) {
    const grid = document.getElementById('i2pOrder'); if (!grid) return;
    grid.innerHTML = '';
    files.forEach((f, i) => {
      const card = document.createElement('div');
      card.style.cssText = 'background:var(--ink3);border:1px solid var(--border);border-radius:var(--r);padding:6px;text-align:center;cursor:grab;transition:all 0.18s;position:relative';
      card.draggable = true;
      card.dataset.i = i;
      // thumbnail
      const img = document.createElement('img');
      img.style.cssText = 'width:100%;height:70px;object-fit:cover;border-radius:4px;display:block';
      const url = URL.createObjectURL(f);
      img.src = url; img.onload = () => URL.revokeObjectURL(url);
      const lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:0.62rem;color:var(--txt3);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
      lbl.textContent = `#${i+1} ${f.name}`;
      // del btn
      const del = document.createElement('div');
      del.style.cssText = 'position:absolute;top:-6px;right:-6px;width:17px;height:17px;border-radius:50%;background:var(--rose);color:#fff;font-size:9px;display:flex;align-items:center;justify-content:center;cursor:pointer;border:2px solid var(--ink);font-weight:900';
      del.textContent = '✕';
      del.onclick = () => { STATE.img2pdf.files.splice(i,1); onFilesLoaded_img2pdf(); };
      card.appendChild(img); card.appendChild(lbl); card.appendChild(del);
      card.addEventListener('dragstart', e => { dragSrc = i; e.dataTransfer.effectAllowed = 'move'; card.style.opacity='0.4'; });
      card.addEventListener('dragend',   () => card.style.opacity = '1');
      card.addEventListener('dragover',  e => { e.preventDefault(); card.style.borderColor='var(--gold)'; });
      card.addEventListener('dragleave', () => card.style.borderColor = '');
      card.addEventListener('drop', e => {
        e.preventDefault(); card.style.borderColor = '';
        if (dragSrc===null||dragSrc===i) return;
        const moved = STATE.img2pdf.files.splice(dragSrc,1)[0];
        STATE.img2pdf.files.splice(i,0,moved);
        dragSrc = null;
        onFilesLoaded_img2pdf();
      });
      grid.appendChild(card);
    });
  }

  window.doI2P = async () => {
    const files = STATE.img2pdf.files;
    if (!files.length) return;
    const btn   = document.getElementById('i2pBtn'); btn.disabled = true;
    const size  = document.getElementById('i2pSize').value;
    const fit   = document.getElementById('i2pFit').value;
    const margin= parseInt(document.getElementById('i2pMargin').value);
    showProg('img2pdf', 5, 'Creating PDF…');
    try {
      const doc = await PDFLib.PDFDocument.create();
      for (let i = 0; i < files.length; i++) {
        showProg('img2pdf', 5 + Math.round((i / files.length) * 90), `Adding image ${i+1} of ${files.length}…`);
        const ab   = await files[i].arrayBuffer();
        const mime = files[i].type;
        let   embedded;
        if (mime === 'image/png') {
          embedded = await doc.embedPng(ab);
        } else {
          // convert webp/jpeg via canvas
          const blob   = new Blob([ab], { type: mime });
          const url    = URL.createObjectURL(blob);
          const img    = new Image();
          await new Promise(res => { img.onload = res; img.src = url; });
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
          canvas.getContext('2d').drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          const jpgData = await fetch(canvas.toDataURL('image/jpeg', 0.92)).then(r => r.arrayBuffer());
          embedded = await doc.embedJpg(jpgData);
        }
        const { width: iW, height: iH } = embedded;
        let pageW, pageH;
        if (size === 'a4')     { pageW = 595; pageH = 842; }
        else if (size==='letter') { pageW = 612; pageH = 792; }
        else { pageW = iW; pageH = iH; }

        const page = doc.addPage([pageW, pageH]);
        const areaW = pageW - margin*2;
        const areaH = pageH - margin*2;
        let drawW, drawH, drawX, drawY;
        if (fit === 'stretch') {
          drawW = areaW; drawH = areaH; drawX = margin; drawY = margin;
        } else {
          const scale = Math.min(areaW/iW, areaH/iH);
          drawW = iW*scale; drawH = iH*scale;
          drawX = margin + (areaW-drawW)/2;
          drawY = margin + (areaH-drawH)/2;
        }
        page.drawImage(embedded, { x:drawX, y:drawY, width:drawW, height:drawH });
      }
      showProg('img2pdf', 97, 'Saving…');
      const out   = await doc.save();
      downloadBytes(out, 'images_combined.pdf');
      logHistory('Images → PDF', '📷', files, out.length);
      showProg('img2pdf', 100); setTimeout(() => hideProg('img2pdf'), 500);
      showRes('img2pdf', `${files.length} image${files.length!==1?'s':''} combined into PDF (${fmtSz(out.length)}).`,
        `<button class="btn btn-gold" onclick="doI2P()">⬇ Download Again</button>
         <button class="btn btn-ghost" onclick="resetI2P()">↺ Convert More</button>`);
    } catch(e) { hideProg('img2pdf'); alert('Error: ' + e.message); }
    finally { btn.disabled = false; }
  };

  window.resetI2P = () => {
    STATE.img2pdf = { files: [], multi: true };
    document.getElementById('fl-img2pdf').innerHTML = '';
    document.getElementById('i2pOptions').style.display   = 'none';
    document.getElementById('i2pOrderWrap').style.display = 'none';
    document.getElementById('i2pBtn').disabled = true;
    hideRes('img2pdf'); hideProg('img2pdf');
  };
};
