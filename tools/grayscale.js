// ── GRAYSCALE PDF ─────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Every page is rendered to canvas and converted to greyscale using pixel-level manipulation, then re-embedded into a new PDF.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF</div>
      ${dz('grayscale', false, '.pdf,application/pdf', 'Drop PDF here')}
      <div class="file-list" id="fl-grayscale"></div>
    </div>
    <div class="ctrl-group" id="gsOptions" style="display:none">
      <div class="ctrl-group-title">Settings</div>
      <div class="ctrl-row">
        <label>Output quality</label>
        <select class="inp" id="gsQuality" style="width:auto">
          <option value="0.95">High (95%)</option>
          <option value="0.82" selected>Medium (82%)</option>
          <option value="0.65">Low (65%)</option>
        </select>
      </div>
      <div class="ctrl-row">
        <label>Render scale</label>
        <select class="inp" id="gsScale" style="width:auto">
          <option value="2">High (2x)</option>
          <option value="1.5" selected>Normal (1.5x)</option>
          <option value="1">Low (1x)</option>
        </select>
      </div>
    </div>
    ${progHTML('grayscale')}
    ${resHTML('grayscale')}
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-gold btn-lg" id="gsBtn" onclick="doGrayscale()" disabled>🌑 Convert & Download</button>
      <button class="btn btn-ghost btn-sm" onclick="resetGs()">↺ Reset</button>
    </div>`;

  window.onFilesLoaded_grayscale = () => {
    document.getElementById('gsOptions').style.display = '';
    document.getElementById('gsBtn').disabled = false;
  };

  window.doGrayscale = async () => {
    const file = STATE.grayscale?.files?.[0]; if (!file) return;
    const btn  = document.getElementById('gsBtn'); btn.disabled = true;
    const q    = parseFloat(document.getElementById('gsQuality').value);
    const sc   = parseFloat(document.getElementById('gsScale').value);
    showProg('grayscale', 5, 'Loading PDF…');
    try {
      const ab    = await file.arrayBuffer();
      const pdfJs = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise;
      const newDoc= await PDFLib.PDFDocument.create();
      const total = pdfJs.numPages;

      for (let i = 1; i <= total; i++) {
        showProg('grayscale', 5 + Math.round((i / total) * 88), `Converting page ${i} of ${total}…`);
        const page     = await pdfJs.getPage(i);
        const viewport = page.getViewport({ scale: sc });
        const canvas   = document.createElement('canvas');
        canvas.width   = viewport.width;
        canvas.height  = viewport.height;
        const ctx      = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Greyscale pixel conversion
        const imgData  = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data     = imgData.data;
        for (let px = 0; px < data.length; px += 4) {
          const lum    = 0.299 * data[px] + 0.587 * data[px+1] + 0.114 * data[px+2];
          data[px] = data[px+1] = data[px+2] = lum;
        }
        ctx.putImageData(imgData, 0, 0);

        const dataUrl  = canvas.toDataURL('image/jpeg', q);
        const resp     = await fetch(dataUrl);
        const imgBytes = await resp.arrayBuffer();
        const embedded = await newDoc.embedJpg(imgBytes);
        const newPage  = newDoc.addPage([viewport.width, viewport.height]);
        newPage.drawImage(embedded, { x:0, y:0, width: newPage.getWidth(), height: newPage.getHeight() });
      }

      showProg('grayscale', 96, 'Saving…');
      const out   = await newDoc.save();
      const fname = file.name.replace('.pdf','') + '_grayscale.pdf';
      downloadBytes(out, fname);
      logHistory('Grayscale PDF', '🌑', [file], out.length);
      showProg('grayscale', 100); setTimeout(() => hideProg('grayscale'), 500);
      showRes('grayscale', `${total} page${total!==1?'s':''} converted to greyscale (${fmtSz(out.length)}).`,
        `<button class="btn btn-gold" onclick="doGrayscale()">⬇ Download Again</button>
         <button class="btn btn-ghost" onclick="resetGs()">↺ Convert Another</button>`);
    } catch(e) { hideProg('grayscale'); alert('Error: ' + e.message); }
    finally { btn.disabled = false; }
  };

  window.resetGs = () => {
    STATE.grayscale = {};
    document.getElementById('fl-grayscale').innerHTML = '';
    document.getElementById('gsOptions').style.display = 'none';
    document.getElementById('gsBtn').disabled = true;
    hideRes('grayscale'); hideProg('grayscale');
  };
};
