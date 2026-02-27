// ── ADD PAGE NUMBERS ──────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Adds page numbers to every page using PDF-lib. Choose position, font size, prefix and starting number.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF</div>
      ${dz('pagenumber', false, '.pdf,application/pdf', 'Drop PDF here')}
      <div class="file-list" id="fl-pagenumber"></div>
    </div>
    <div class="ctrl-group" id="pnOptions" style="display:none">
      <div class="ctrl-group-title">Page Number Settings</div>
      <div class="ctrl-row">
        <label>Position</label>
        <select class="inp" id="pnPosition" style="width:auto">
          <option value="bottom-center" selected>Bottom Centre</option>
          <option value="bottom-left">Bottom Left</option>
          <option value="bottom-right">Bottom Right</option>
          <option value="top-center">Top Centre</option>
          <option value="top-left">Top Left</option>
          <option value="top-right">Top Right</option>
        </select>
      </div>
      <div class="ctrl-row">
        <label>Format</label>
        <select class="inp" id="pnFormat" style="width:auto">
          <option value="n" selected>1, 2, 3…</option>
          <option value="page-n">Page 1, Page 2…</option>
          <option value="n-of-total">1 of 10, 2 of 10…</option>
          <option value="custom">Custom prefix</option>
        </select>
      </div>
      <div class="ctrl-row" id="pnCustomRow" style="display:none">
        <label>Prefix text</label>
        <input class="inp" id="pnCustomPrefix" placeholder="e.g. Pg " style="width:120px">
      </div>
      <div class="ctrl-row">
        <label>Starting number</label>
        <input class="inp" type="number" id="pnStart" value="1" min="0" style="width:90px">
      </div>
      <div class="ctrl-row">
        <label>Font size</label>
        <input type="range" class="inp" id="pnSize" min="7" max="24" value="11" style="width:130px" oninput="document.getElementById('pnSizeVal').textContent=this.value+'pt'">
        <span id="pnSizeVal" style="font-size:0.82rem;color:var(--gold);font-weight:700;min-width:36px">11pt</span>
      </div>
      <div class="ctrl-row">
        <label>Margin from edge</label>
        <input type="range" class="inp" id="pnMargin" min="10" max="50" value="20" style="width:130px" oninput="document.getElementById('pnMarginVal').textContent=this.value+'pt'">
        <span id="pnMarginVal" style="font-size:0.82rem;color:var(--gold);font-weight:700;min-width:36px">20pt</span>
      </div>
      <div class="ctrl-row">
        <label>Skip first page</label>
        <label style="min-width:auto;display:flex;align-items:center;gap:7px;cursor:pointer">
          <input type="checkbox" id="pnSkipFirst"> Don't number page 1 (cover page)
        </label>
      </div>
    </div>
    ${progHTML('pagenumber')}
    ${resHTML('pagenumber')}
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-gold btn-lg" id="pnBtn" onclick="doPageNumber()" disabled>🔢 Add Numbers & Download</button>
      <button class="btn btn-ghost btn-sm" onclick="resetPN()">↺ Reset</button>
    </div>`;

  document.getElementById('pnFormat')?.addEventListener('change', function() {
    document.getElementById('pnCustomRow').style.display = this.value === 'custom' ? '' : 'none';
  });

  window.onFilesLoaded_pagenumber = () => {
    document.getElementById('pnOptions').style.display = '';
    document.getElementById('pnBtn').disabled = false;
  };

  window.doPageNumber = async () => {
    const file = STATE.pagenumber?.files?.[0]; if (!file) return;
    const btn  = document.getElementById('pnBtn'); btn.disabled = true;
    showProg('pagenumber', 5, 'Loading…');
    try {
      const ab    = await file.arrayBuffer();
      const doc   = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
      const pages = doc.getPages();
      const font  = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
      const pos   = document.getElementById('pnPosition').value;
      const fmt   = document.getElementById('pnFormat').value;
      const start = parseInt(document.getElementById('pnStart').value) || 1;
      const sz    = parseInt(document.getElementById('pnSize').value);
      const margin= parseInt(document.getElementById('pnMargin').value);
      const skip  = document.getElementById('pnSkipFirst').checked;
      const prefix= document.getElementById('pnCustomPrefix').value || '';
      const total = pages.length;

      pages.forEach((page, idx) => {
        showProg('pagenumber', 10 + Math.round((idx/total)*85), `Numbering page ${idx+1}…`);
        if (skip && idx === 0) return;
        const { width: pW, height: pH } = page.getSize();
        const num   = start + (skip ? idx - 1 : idx);
        let   label;
        if      (fmt === 'n')          label = String(num);
        else if (fmt === 'page-n')     label = `Page ${num}`;
        else if (fmt === 'n-of-total') label = `${num} of ${total}`;
        else                           label = `${prefix}${num}`;

        const tw  = font.widthOfTextAtSize(label, sz);
        const isTop = pos.startsWith('top');
        const y   = isTop ? pH - margin - sz : margin;
        let   x;
        if      (pos.endsWith('left'))   x = margin;
        else if (pos.endsWith('right'))  x = pW - tw - margin;
        else                             x = pW/2 - tw/2;

        page.drawText(label, { x, y, size: sz, font, color: PDFLib.rgb(0.3,0.3,0.3) });
      });

      showProg('pagenumber', 96, 'Saving…');
      const out   = await doc.save();
      const fname = file.name.replace('.pdf','') + '_numbered.pdf';
      downloadBytes(out, fname);
      logHistory('Add Page Numbers', '🔢', [file], out.length);
      showProg('pagenumber', 100); setTimeout(() => hideProg('pagenumber'), 500);
      showRes('pagenumber', `Page numbers added to ${total} pages.`,
        `<button class="btn btn-gold" onclick="doPageNumber()">⬇ Download Again</button>
         <button class="btn btn-ghost" onclick="resetPN()">↺ Number Another</button>`);
    } catch(e) { hideProg('pagenumber'); alert('Error: ' + e.message); }
    finally { btn.disabled = false; }
  };

  window.resetPN = () => {
    STATE.pagenumber = {};
    document.getElementById('fl-pagenumber').innerHTML = '';
    document.getElementById('pnOptions').style.display = 'none';
    document.getElementById('pnBtn').disabled = true;
    hideRes('pagenumber'); hideProg('pagenumber');
  };
};
