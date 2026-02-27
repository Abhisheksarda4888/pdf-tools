// ── FLATTEN PDF ───────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Re-renders every page through canvas to flatten all interactive form fields, annotations and layers into static content. After flattening, fields cannot be edited.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF</div>
      ${dz('flatten', false, '.pdf,application/pdf', 'Drop PDF here')}
      <div class="file-list" id="fl-flatten"></div>
    </div>
    <div class="ctrl-group" id="flatOptions" style="display:none">
      <div class="ctrl-group-title">Flatten Settings</div>
      <div class="ctrl-row">
        <label>Output quality</label>
        <select class="inp" id="flatQuality" style="width:auto">
          <option value="0.98" selected>High (98%) — recommended</option>
          <option value="0.85">Medium (85%)</option>
          <option value="0.70">Low (70%) — smaller file</option>
        </select>
      </div>
      <div class="ctrl-row">
        <label>Render scale</label>
        <select class="inp" id="flatScale" style="width:auto">
          <option value="2" selected>High (2x) — recommended</option>
          <option value="1.5">Normal (1.5x)</option>
          <option value="1">Low (1x)</option>
        </select>
      </div>
      <div class="warn-box">
        <strong>Note:</strong> Flattening is irreversible. Form fields, checkboxes and annotations will become static image content and cannot be edited afterwards.
      </div>
    </div>
    ${progHTML('flatten')}
    ${resHTML('flatten')}
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-gold btn-lg" id="flatBtn" onclick="doFlatten()" disabled>📋 Flatten & Download</button>
      <button class="btn btn-ghost btn-sm" onclick="resetFlat()">↺ Reset</button>
    </div>`;

  window.onFilesLoaded_flatten = () => {
    document.getElementById('flatOptions').style.display = '';
    document.getElementById('flatBtn').disabled = false;
  };

  window.doFlatten = async () => {
    const file = STATE.flatten?.files?.[0]; if (!file) return;
    const btn  = document.getElementById('flatBtn'); btn.disabled = true;
    const q    = parseFloat(document.getElementById('flatQuality').value);
    const sc   = parseFloat(document.getElementById('flatScale').value);
    showProg('flatten', 5, 'Loading PDF…');
    try {
      const ab    = await file.arrayBuffer();
      const pdfJs = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise;
      const newDoc= await PDFLib.PDFDocument.create();
      const total = pdfJs.numPages;

      for (let i = 1; i <= total; i++) {
        showProg('flatten', 5 + Math.round((i/total)*88), `Flattening page ${i} of ${total}…`);
        const page     = await pdfJs.getPage(i);
        const viewport = page.getViewport({ scale: sc });
        const canvas   = document.createElement('canvas');
        canvas.width   = viewport.width; canvas.height = viewport.height;
        // render with annotations
        await page.render({ canvasContext: canvas.getContext('2d'), viewport, renderInteractiveForms: true }).promise;
        const dataUrl  = canvas.toDataURL('image/jpeg', q);
        const resp     = await fetch(dataUrl);
        const imgBytes = await resp.arrayBuffer();
        const embedded = await newDoc.embedJpg(imgBytes);
        const newPage  = newDoc.addPage([viewport.width, viewport.height]);
        newPage.drawImage(embedded, { x:0, y:0, width: newPage.getWidth(), height: newPage.getHeight() });
      }

      showProg('flatten', 96, 'Saving…');
      const out   = await newDoc.save();
      const fname = file.name.replace('.pdf','') + '_flattened.pdf';
      downloadBytes(out, fname);
      logHistory('Flatten PDF', '📋', [file], out.length);
      showProg('flatten', 100); setTimeout(() => hideProg('flatten'), 500);
      showRes('flatten', `${total} page${total!==1?'s':''} flattened successfully (${fmtSz(out.length)}).`,
        `<button class="btn btn-gold" onclick="doFlatten()">⬇ Download Again</button>
         <button class="btn btn-ghost" onclick="resetFlat()">↺ Flatten Another</button>`);
    } catch(e) { hideProg('flatten'); alert('Error: ' + e.message); }
    finally { btn.disabled = false; }
  };

  window.resetFlat = () => {
    STATE.flatten = {};
    document.getElementById('fl-flatten').innerHTML = '';
    document.getElementById('flatOptions').style.display = 'none';
    document.getElementById('flatBtn').disabled = true;
    hideRes('flatten'); hideProg('flatten');
  };
};
