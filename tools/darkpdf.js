// ── DARK / INVERT PDF ─────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Every page is rendered to canvas and all pixel colours are inverted (255 - value). White becomes black, making it comfortable for night reading.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF</div>
      ${dz('darkpdf', false, '.pdf,application/pdf', 'Drop PDF here')}
      <div class="file-list" id="fl-darkpdf"></div>
    </div>
    <div class="ctrl-group" id="darkOptions" style="display:none">
      <div class="ctrl-group-title">Settings</div>
      <div class="ctrl-row">
        <label>Mode</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-gold btn-sm dark-mode-btn" data-mode="invert" onclick="setDarkMode('invert',this)">🌙 Full Invert</button>
          <button class="btn btn-ghost btn-sm dark-mode-btn" data-mode="sepia"  onclick="setDarkMode('sepia',this)">📜 Sepia</button>
          <button class="btn btn-ghost btn-sm dark-mode-btn" data-mode="dim"    onclick="setDarkMode('dim',this)">🔅 Dim (70%)</button>
        </div>
      </div>
      <div class="ctrl-row">
        <label>Output quality</label>
        <select class="inp" id="darkQuality" style="width:auto">
          <option value="0.92" selected>High (92%)</option>
          <option value="0.75">Medium (75%)</option>
        </select>
      </div>
    </div>
    ${progHTML('darkpdf')}
    ${resHTML('darkpdf')}
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-gold btn-lg" id="darkBtn" onclick="doDark()" disabled>🌙 Convert & Download</button>
      <button class="btn btn-ghost btn-sm" onclick="resetDark()">↺ Reset</button>
    </div>`;

  let darkMode = 'invert';

  window.setDarkMode = (mode, btn) => {
    darkMode = mode;
    document.querySelectorAll('.dark-mode-btn').forEach(b => {
      b.classList.toggle('btn-gold',  b === btn);
      b.classList.toggle('btn-ghost', b !== btn);
    });
  };

  window.onFilesLoaded_darkpdf = () => {
    document.getElementById('darkOptions').style.display = '';
    document.getElementById('darkBtn').disabled = false;
  };

  window.doDark = async () => {
    const file = STATE.darkpdf?.files?.[0]; if (!file) return;
    const btn  = document.getElementById('darkBtn'); btn.disabled = true;
    const q    = parseFloat(document.getElementById('darkQuality').value);
    showProg('darkpdf', 5, 'Loading PDF…');
    try {
      const ab    = await file.arrayBuffer();
      const pdfJs = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise;
      const newDoc= await PDFLib.PDFDocument.create();
      const total = pdfJs.numPages;

      for (let i = 1; i <= total; i++) {
        showProg('darkpdf', 5 + Math.round((i / total) * 88), `Processing page ${i} of ${total}…`);
        const page     = await pdfJs.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas   = document.createElement('canvas');
        canvas.width   = viewport.width;
        canvas.height  = viewport.height;
        const ctx      = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d       = imgData.data;

        if (darkMode === 'invert') {
          for (let px = 0; px < d.length; px += 4) {
            d[px]   = 255 - d[px];
            d[px+1] = 255 - d[px+1];
            d[px+2] = 255 - d[px+2];
          }
        } else if (darkMode === 'sepia') {
          for (let px = 0; px < d.length; px += 4) {
            const r = d[px], g = d[px+1], b = d[px+2];
            d[px]   = Math.min(255, r*0.393 + g*0.769 + b*0.189);
            d[px+1] = Math.min(255, r*0.349 + g*0.686 + b*0.168);
            d[px+2] = Math.min(255, r*0.272 + g*0.534 + b*0.131);
          }
        } else if (darkMode === 'dim') {
          for (let px = 0; px < d.length; px += 4) {
            d[px] *= 0.7; d[px+1] *= 0.7; d[px+2] *= 0.7;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const dataUrl  = canvas.toDataURL('image/jpeg', q);
        const resp     = await fetch(dataUrl);
        const imgBytes = await resp.arrayBuffer();
        const embedded = await newDoc.embedJpg(imgBytes);
        const newPage  = newDoc.addPage([viewport.width, viewport.height]);
        newPage.drawImage(embedded, { x:0, y:0, width: newPage.getWidth(), height: newPage.getHeight() });
      }

      showProg('darkpdf', 96, 'Saving…');
      const out   = await newDoc.save();
      const fname = file.name.replace('.pdf','') + '_dark.pdf';
      downloadBytes(out, fname);
      logHistory('Dark / Invert PDF', '🌙', [file], out.length);
      showProg('darkpdf', 100); setTimeout(() => hideProg('darkpdf'), 500);
      showRes('darkpdf', `${total} page${total!==1?'s':''} converted (${darkMode} mode).`,
        `<button class="btn btn-gold" onclick="doDark()">⬇ Download Again</button>
         <button class="btn btn-ghost" onclick="resetDark()">↺ Convert Another</button>`);
    } catch(e) { hideProg('darkpdf'); alert('Error: ' + e.message); }
    finally { btn.disabled = false; }
  };

  window.resetDark = () => {
    STATE.darkpdf = {};
    document.getElementById('fl-darkpdf').innerHTML = '';
    document.getElementById('darkOptions').style.display = 'none';
    document.getElementById('darkBtn').disabled = true;
    hideRes('darkpdf'); hideProg('darkpdf');
  };
};
