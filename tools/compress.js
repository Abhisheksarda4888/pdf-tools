// ── COMPRESS PDF ──────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Each page is rendered to a canvas at reduced quality and re-embedded. Works best on image-heavy PDFs. Pure text PDFs may not shrink much.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF</div>
      ${dz('compress', false, '.pdf,application/pdf', 'Drop PDF to compress')}
      <div class="file-list" id="fl-compress"></div>
    </div>
    <div class="ctrl-group" id="compressOptions" style="display:none">
      <div class="ctrl-group-title">Compression Settings</div>
      <div class="ctrl-row">
        <label>Quality level</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm comp-q-btn" data-q="0.95" onclick="setCompQ(0.95,this)">🟢 High (95%)</button>
          <button class="btn btn-gold  btn-sm comp-q-btn" data-q="0.75" onclick="setCompQ(0.75,this)">🟡 Medium (75%)</button>
          <button class="btn btn-ghost btn-sm comp-q-btn" data-q="0.50" onclick="setCompQ(0.50,this)">🔴 Low (50%)</button>
        </div>
      </div>
      <div class="ctrl-row">
        <label>Render scale</label>
        <select class="inp" id="compScale" style="width:auto">
          <option value="2">High (2x)</option>
          <option value="1.5" selected>Normal (1.5x)</option>
          <option value="1">Low (1x)</option>
        </select>
      </div>
      <div class="ctrl-row">
        <label>Format</label>
        <select class="inp" id="compFmt" style="width:auto">
          <option value="image/jpeg" selected>JPEG (smaller)</option>
          <option value="image/png">PNG (lossless)</option>
        </select>
      </div>
      <div style="font-size:0.8rem;color:var(--txt3);margin-top:4px" id="compOrigSize"></div>
    </div>
    ${progHTML('compress')}
    ${resHTML('compress')}
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-gold btn-lg" id="compBtn" onclick="doCompress()" disabled>🗜️ Compress & Download</button>
      <button class="btn btn-ghost btn-sm" onclick="resetCompress()">↺ Reset</button>
    </div>`;

  let compQ = 0.75;

  window.setCompQ = (q, btn) => {
    compQ = q;
    document.querySelectorAll('.comp-q-btn').forEach(b => {
      b.classList.toggle('btn-gold',  b === btn);
      b.classList.toggle('btn-ghost', b !== btn);
    });
  };

  window.onFilesLoaded_compress = () => {
    const file = STATE.compress?.files?.[0]; if (!file) return;
    document.getElementById('compressOptions').style.display = '';
    document.getElementById('compBtn').disabled = false;
    document.getElementById('compOrigSize').textContent = `Original size: ${fmtSz(file.size)}`;
  };

  window.doCompress = async () => {
    const file = STATE.compress?.files?.[0]; if (!file) return;
    const btn  = document.getElementById('compBtn'); btn.disabled = true;
    const scale = parseFloat(document.getElementById('compScale').value);
    const fmt   = document.getElementById('compFmt').value;
    showProg('compress', 5, 'Loading PDF…');
    try {
      const ab      = await file.arrayBuffer();
      const pdfJs   = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise;
      const newDoc  = await PDFLib.PDFDocument.create();
      const total   = pdfJs.numPages;

      for (let i = 1; i <= total; i++) {
        showProg('compress', 5 + Math.round((i / total) * 88), `Compressing page ${i} of ${total}…`);
        const page     = await pdfJs.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas   = document.createElement('canvas');
        canvas.width   = viewport.width;
        canvas.height  = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

        const dataUrl  = canvas.toDataURL(fmt, compQ);
        const resp     = await fetch(dataUrl);
        const imgBytes = await resp.arrayBuffer();
        const embedded = fmt === 'image/jpeg'
          ? await newDoc.embedJpg(imgBytes)
          : await newDoc.embedPng(imgBytes);

        const newPage = newDoc.addPage([viewport.width / scale * (scale > 1 ? scale : 1), viewport.height / scale * (scale > 1 ? scale : 1)]);
        newPage.drawImage(embedded, { x: 0, y: 0, width: newPage.getWidth(), height: newPage.getHeight() });
      }

      showProg('compress', 96, 'Saving…');
      const out   = await newDoc.save();
      const ratio = Math.round((1 - out.length / file.size) * 100);
      const fname = file.name.replace('.pdf','') + '_compressed.pdf';
      downloadBytes(out, fname);
      logHistory('Compress PDF', '🗜️', [file], out.length);
      showProg('compress', 100); setTimeout(() => hideProg('compress'), 500);
      showRes('compress',
        `Compressed from ${fmtSz(file.size)} → ${fmtSz(out.length)} ${ratio > 0 ? '(' + ratio + '% smaller)' : '(similar size — try lower quality)'}`,
        `<button class="btn btn-gold" onclick="doCompress()">⬇ Download Again</button>
         <button class="btn btn-ghost" onclick="resetCompress()">↺ Compress Another</button>`);
    } catch(e) { hideProg('compress'); alert('Error: ' + e.message); }
    finally { btn.disabled = false; }
  };

  window.resetCompress = () => {
    STATE.compress = {};
    document.getElementById('fl-compress').innerHTML = '';
    document.getElementById('compressOptions').style.display = 'none';
    document.getElementById('compBtn').disabled = true;
    hideRes('compress'); hideProg('compress');
  };
};
