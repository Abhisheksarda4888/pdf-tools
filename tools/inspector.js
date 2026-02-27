// ── PDF INSPECTOR ─────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Deep-inspects your PDF and reports page count, file size, metadata, page dimensions, fonts used, and encryption status — all without uploading.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF</div>
      ${dz('inspector', false, '.pdf,application/pdf', 'Drop PDF here')}
      <div class="file-list" id="fl-inspector"></div>
    </div>
    <div id="inspectorResult" style="display:none"></div>`;

  window.onFilesLoaded_inspector = async () => {
    const file = STATE.inspector?.files?.[0]; if (!file) return;
    showProg('inspector', 10, 'Inspecting…');
    try {
      const ab    = await file.arrayBuffer();
      const pdfJs = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise;
      const pdfl  = await PDFLib.PDFDocument.load(ab.slice(0), { ignoreEncryption: true });
      const total = pdfJs.numPages;

      // Gather page sizes
      const sizes = [];
      for (let i = 1; i <= Math.min(total, 20); i++) {
        const pg = await pdfJs.getPage(i);
        const vp = pg.getViewport({ scale: 1 });
        sizes.push({ w: vp.width, h: vp.height });
      }
      const uniqueSizes = [...new Map(sizes.map(s => [`${s.w.toFixed(0)}x${s.h.toFixed(0)}`, s])).values()];

      // PDF-lib metadata
      const metaMap = {
        Title:    pdfl.getTitle(),
        Author:   pdfl.getAuthor(),
        Subject:  pdfl.getSubject(),
        Keywords: pdfl.getKeywords(),
        Creator:  pdfl.getCreator(),
        Producer: pdfl.getProducer(),
        Created:  pdfl.getCreationDate()?.toLocaleDateString?.() || '—',
        Modified: pdfl.getModificationDate()?.toLocaleDateString?.() || '—',
      };

      // Fonts via PDF.js
      const fontSet = new Set();
      for (let i = 1; i <= Math.min(total, 10); i++) {
        const pg      = await pdfJs.getPage(i);
        const ops     = await pg.getOperatorList();
        const fnNames = pg.commonObjs._objs ? Object.keys(pg.commonObjs._objs).filter(k => k.startsWith('g_')) : [];
        fnNames.forEach(f => fontSet.add(f.replace(/g_\w+_/, '').split('+').pop()));
      }

      hideProg('inspector');

      const statCard = (icon, label, value, color='var(--gold)') =>
        `<div style="background:var(--ink3);border:1px solid var(--border);border-radius:var(--r2);padding:16px 20px;position:relative;overflow:hidden">
          <div style="font-size:1.4rem;margin-bottom:6px">${icon}</div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.6rem;font-weight:800;color:${color};line-height:1">${value}</div>
          <div style="font-size:0.7rem;color:var(--txt3);text-transform:uppercase;letter-spacing:0.1em;margin-top:3px;font-weight:600">${label}</div>
        </div>`;

      const metaRows = Object.entries(metaMap)
        .map(([k,v]) => `<tr><td style="color:var(--txt3);font-size:0.8rem;padding:7px 12px;border-bottom:1px solid var(--border);width:110px;vertical-align:top">${k}</td>
          <td style="font-size:0.84rem;padding:7px 12px;border-bottom:1px solid var(--border);color:${v?'var(--txt)':'var(--txt4)'}">${v||'—'}</td></tr>`)
        .join('');

      const sizeRows = uniqueSizes.map(s =>
        `<div style="display:inline-flex;align-items:center;gap:6px;background:var(--ink3);border:1px solid var(--border);border-radius:7px;padding:4px 10px;font-size:0.8rem;font-weight:600;margin:3px">
          📏 ${s.w.toFixed(0)} × ${s.h.toFixed(0)} pt &nbsp;<span style="color:var(--txt3);font-weight:400">(${(s.w/2.8346).toFixed(0)} × ${(s.h/2.8346).toFixed(0)} mm)</span>
        </div>`).join('');

      document.getElementById('inspectorResult').style.display = '';
      document.getElementById('inspectorResult').innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:20px">
          ${statCard('📄', 'Total Pages',  total,           'var(--gold)')}
          ${statCard('💾', 'File Size',    fmtSz(file.size),'var(--teal)')}
          ${statCard('📏', 'Page Formats', uniqueSizes.length,'var(--violet)')}
          ${statCard('🔤', 'Fonts Found',  fontSet.size,    'var(--rose)')}
        </div>

        <div class="ctrl-group" style="margin-bottom:14px">
          <div class="ctrl-group-title">Document Metadata</div>
          <div style="overflow:hidden;border-radius:var(--r);border:1px solid var(--border)">
            <table style="width:100%;border-collapse:collapse">${metaRows}</table>
          </div>
        </div>

        <div class="ctrl-group" style="margin-bottom:14px">
          <div class="ctrl-group-title">Page Sizes Detected</div>
          <div>${sizeRows}</div>
        </div>

        ${fontSet.size ? `<div class="ctrl-group">
          <div class="ctrl-group-title">Fonts Detected (first 10 pages)</div>
          <div>${[...fontSet].map(f=>`<span style="background:var(--ink3);border:1px solid var(--border);border-radius:6px;padding:3px 10px;font-size:0.78rem;margin:3px;display:inline-block">${f||'(unnamed)'}</span>`).join('')}</div>
        </div>` : ''}

        <div class="btn-row" style="margin-top:16px">
          <button class="btn btn-ghost btn-sm" onclick="resetInspector()">↺ Inspect Another</button>
        </div>`;

      logHistory('PDF Inspector', '🔍', [file], 0);
    } catch(e) { hideProg('inspector'); alert('Error: ' + e.message); }
  };

  window.resetInspector = () => {
    STATE.inspector = {};
    document.getElementById('fl-inspector').innerHTML = '';
    document.getElementById('inspectorResult').style.display = 'none';
    hideProg('inspector');
  };
};
