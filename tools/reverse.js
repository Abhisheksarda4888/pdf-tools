// ── REVERSE PAGES ─────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Instantly reverses the entire page order of a PDF. The last page becomes the first and vice versa. One click — no configuration needed.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF</div>
      ${dz('reverse', false, '.pdf,application/pdf', 'Drop PDF here')}
      <div class="file-list" id="fl-reverse"></div>
    </div>
    <div id="reverseInfo" style="display:none">
      <div class="ctrl-group">
        <div class="ctrl-group-title">Reverse Options</div>
        <div class="ctrl-row">
          <label>Mode</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <label style="min-width:auto;display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="radio" name="revMode" value="all" checked> All pages
            </label>
            <label style="min-width:auto;display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="radio" name="revMode" value="range"> Page range only
            </label>
          </div>
        </div>
        <div id="revRangeWrap" style="display:none">
          <div class="ctrl-row">
            <label>Range</label>
            <input class="inp" id="revRange" placeholder="e.g. 2-8" style="flex:1">
          </div>
          <div style="font-size:0.78rem;color:var(--txt3);margin-top:4px">Pages outside the range stay in original position.</div>
        </div>
        <div style="font-size:0.78rem;color:var(--txt3);margin-top:4px" id="revPageInfo"></div>
      </div>
    </div>
    ${progHTML('reverse')}
    ${resHTML('reverse')}
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-gold btn-lg" id="reverseBtn" onclick="doReverse()" disabled>🔁 Reverse & Download</button>
      <button class="btn btn-ghost btn-sm" onclick="resetReverse()">↺ Reset</button>
    </div>`;

  let totalPages = 0;

  document.querySelector('input[name="revMode"]')?.addEventListener('change', function() {});
  // Use event delegation
  document.getElementById('toolBody').addEventListener('change', e => {
    if (e.target.name === 'revMode') {
      document.getElementById('revRangeWrap').style.display = e.target.value === 'range' ? '' : 'none';
    }
  });

  window.onFilesLoaded_reverse = async () => {
    const file = STATE.reverse?.files?.[0]; if (!file) return;
    const ab   = await file.arrayBuffer();
    const doc  = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
    totalPages = doc.getPageCount();
    document.getElementById('reverseInfo').style.display = '';
    document.getElementById('reverseBtn').disabled = false;
    document.getElementById('revPageInfo').textContent = `${totalPages} pages — will be reversed to ${totalPages}→1 order`;
    document.getElementById('revRange').placeholder = `e.g. 2-${totalPages-1}`;
  };

  window.doReverse = async () => {
    const file = STATE.reverse?.files?.[0]; if (!file) return;
    const btn  = document.getElementById('reverseBtn'); btn.disabled = true;
    showProg('reverse', 5, 'Loading…');
    try {
      const ab   = await file.arrayBuffer();
      const src  = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
      const dest = await PDFLib.PDFDocument.create();
      const mode = document.querySelector('input[name="revMode"]:checked').value;
      let   order = Array.from({ length: totalPages }, (_, i) => i); // 0-indexed

      if (mode === 'range') {
        const rangeStr = document.getElementById('revRange').value;
        let [a,b] = rangeStr.split('-').map(n=>parseInt(n.trim())-1);
        if (isNaN(a)) a=0; if (isNaN(b)) b=totalPages-1;
        a = Math.max(0,a); b = Math.min(totalPages-1,b);
        // Reverse just the slice
        const slice = order.slice(a, b+1).reverse();
        order = [...order.slice(0,a), ...slice, ...order.slice(b+1)];
      } else {
        order.reverse();
      }

      showProg('reverse', 30, 'Reversing pages…');
      const copied = await dest.copyPages(src, order);
      copied.forEach(p => dest.addPage(p));

      showProg('reverse', 90, 'Saving…');
      const out   = await dest.save();
      const fname = file.name.replace('.pdf','') + '_reversed.pdf';
      downloadBytes(out, fname);
      logHistory('Reverse Pages', '🔁', [file], out.length);
      showProg('reverse', 100); setTimeout(() => hideProg('reverse'), 500);
      showRes('reverse', `${totalPages} pages reversed successfully.`,
        `<button class="btn btn-gold" onclick="doReverse()">⬇ Download Again</button>
         <button class="btn btn-ghost" onclick="resetReverse()">↺ Reverse Another</button>`);
    } catch(e) { hideProg('reverse'); alert('Error: ' + e.message); }
    finally { btn.disabled = false; }
  };

  window.resetReverse = () => {
    STATE.reverse = {}; totalPages = 0;
    document.getElementById('fl-reverse').innerHTML='';
    document.getElementById('reverseInfo').style.display='none';
    document.getElementById('reverseBtn').disabled=true;
    hideRes('reverse'); hideProg('reverse');
  };
};
