// ── REPAIR PDF ────────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Re-loads the PDF with lenient parsing and re-saves it cleanly using PDF-lib. This fixes minor structural corruption, broken cross-reference tables and encoding issues.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF to Repair</div>
      ${dz('repair', false, '.pdf,application/pdf', 'Drop PDF here')}
      <div class="file-list" id="fl-repair"></div>
    </div>
    <div class="ctrl-group" id="repairOptions" style="display:none">
      <div class="ctrl-group-title">Repair Options</div>
      <div class="ctrl-row">
        <label style="display:flex;align-items:center;gap:7px;cursor:pointer">
          <input type="checkbox" id="repairIgnoreEnc" checked> Ignore encryption errors
        </label>
      </div>
      <div class="ctrl-row">
        <label style="display:flex;align-items:center;gap:7px;cursor:pointer">
          <input type="checkbox" id="repairCapLen" checked> Repair capacity/length mismatches
        </label>
      </div>
      <div class="warn-box">
        Repair works best on <strong>structurally damaged</strong> PDFs. Heavily corrupted or truncated files may not be recoverable. Original file is never modified.
      </div>
      <div style="font-size:0.78rem;color:var(--txt3);margin-top:6px" id="repairOrigInfo"></div>
    </div>
    <div id="repairDiag" style="display:none" class="ctrl-group">
      <div class="ctrl-group-title">Pre-repair Diagnostics</div>
      <div id="repairDiagContent"></div>
    </div>
    ${progHTML('repair')}
    ${resHTML('repair')}
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-gold btn-lg" id="repairBtn" onclick="doRepair()" disabled>🔧 Repair & Download</button>
      <button class="btn btn-ghost btn-sm" onclick="resetRepair()">↺ Reset</button>
    </div>`;

  window.onFilesLoaded_repair = async () => {
    const file = STATE.repair?.files?.[0]; if (!file) return;
    document.getElementById('repairOptions').style.display = '';
    document.getElementById('repairOrigInfo').textContent = `File size: ${fmtSz(file.size)}`;
    document.getElementById('repairBtn').disabled = false;
    // Quick diagnostic
    showProg('repair', 10, 'Running diagnostics…');
    try {
      const ab   = await file.arrayBuffer();
      const diags = [];
      // Check PDF header
      const header = new Uint8Array(ab, 0, 8);
      const headerStr = String.fromCharCode(...header);
      if (!headerStr.startsWith('%PDF')) diags.push({ type:'error', msg:'Missing PDF header — file may not be a valid PDF' });
      else diags.push({ type:'ok', msg:`Valid PDF header found: ${headerStr.slice(0,8)}` });
      // Check file size
      if (file.size < 500) diags.push({ type:'warn', msg:'File is very small — may be incomplete' });
      // Try loading
      try {
        const doc = await PDFLib.PDFDocument.load(ab.slice(0), { ignoreEncryption:true });
        const pgCount = doc.getPageCount();
        diags.push({ type:'ok', msg:`PDF-lib loaded successfully — ${pgCount} page${pgCount!==1?'s':''}` });
      } catch(e) {
        diags.push({ type:'error', msg:'PDF-lib failed to load: ' + e.message });
      }
      try {
        const doc2 = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise;
        diags.push({ type:'ok', msg:`PDF.js loaded successfully — ${doc2.numPages} page${doc2.numPages!==1?'s':''}` });
      } catch(e) {
        diags.push({ type:'warn', msg:'PDF.js warning: ' + e.message });
      }

      hideProg('repair');
      document.getElementById('repairDiag').style.display = '';
      document.getElementById('repairDiagContent').innerHTML = diags.map(d => `
        <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:0.9rem;flex-shrink:0">${d.type==='ok'?'✅':d.type==='warn'?'⚠️':'❌'}</span>
          <span style="font-size:0.82rem;color:${d.type==='ok'?'var(--teal)':d.type==='warn'?'var(--gold)':'var(--rose)'}">${d.msg}</span>
        </div>`).join('');
    } catch(e) { hideProg('repair'); }
  };

  window.doRepair = async () => {
    const file = STATE.repair?.files?.[0]; if (!file) return;
    const btn  = document.getElementById('repairBtn'); btn.disabled = true;
    showProg('repair', 10, 'Loading damaged PDF…');
    try {
      const ab     = await file.arrayBuffer();
      const ignEnc = document.getElementById('repairIgnoreEnc').checked;
      const capLen = document.getElementById('repairCapLen').checked;

      showProg('repair', 30, 'Attempting repair…');
      const doc = await PDFLib.PDFDocument.load(ab, {
        ignoreEncryption: ignEnc,
        capNumbers:       capLen,
        throwOnInvalidObject: false,
      });

      showProg('repair', 70, 'Re-saving cleanly…');
      const out   = await doc.save({ useObjectStreams: false });
      const fname = file.name.replace('.pdf','') + '_repaired.pdf';
      downloadBytes(out, fname);
      logHistory('Repair PDF', '🔧', [file], out.length);

      showProg('repair', 100); setTimeout(() => hideProg('repair'), 500);
      const ratio = out.length > file.size
        ? `(${fmtSz(out.length)} — slightly larger after repair, this is normal)`
        : `(${fmtSz(out.length)})`;
      showRes('repair',
        `PDF repaired and saved cleanly ${ratio}. Check that all pages are intact.`,
        `<button class="btn btn-gold" onclick="doRepair()">⬇ Download Again</button>
         <button class="btn btn-ghost" onclick="resetRepair()">↺ Repair Another</button>`);
    } catch(e) {
      hideProg('repair');
      showRes('repair', `⚠️ Repair failed: ${e.message}. The file may be too heavily corrupted to recover.`,
        `<button class="btn btn-ghost" onclick="resetRepair()">↺ Try Another File</button>`);
    } finally { btn.disabled = false; }
  };

  window.resetRepair = () => {
    STATE.repair = {};
    document.getElementById('fl-repair').innerHTML = '';
    document.getElementById('repairOptions').style.display = 'none';
    document.getElementById('repairDiag').style.display    = 'none';
    document.getElementById('repairBtn').disabled = true;
    hideRes('repair'); hideProg('repair');
  };
};
