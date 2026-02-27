// ── SPLIT PDF ─────────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How to use:</strong> Upload a PDF, then choose how to split it — by fixed page count, by custom ranges, or extract every page individually.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF</div>
      ${dz('split', false, '.pdf,application/pdf', 'Drop PDF to split')}
      <div class="file-list" id="fl-split"></div>
    </div>
    <div class="ctrl-group" id="splitOptions" style="display:none">
      <div class="ctrl-group-title">Split Method</div>
      <div class="tabs">
        <button class="tab-btn active" onclick="splitTabSwitch('range',this)">📏 Custom Ranges</button>
        <button class="tab-btn" onclick="splitTabSwitch('fixed',this)">🔢 Every N Pages</button>
        <button class="tab-btn" onclick="splitTabSwitch('all',this)">📄 Every Page</button>
      </div>
      <!-- Range -->
      <div id="split-tab-range">
        <div class="warn-box">Enter page ranges separated by commas. Example: <strong>1-3, 4-6, 7</strong> → 3 files.</div>
        <div class="ctrl-row">
          <label>Ranges</label>
          <input class="inp" id="splitRanges" placeholder="1-3, 4-6, 7-9" style="flex:1">
        </div>
        <div style="font-size:0.78rem;color:var(--txt3);margin-top:4px" id="splitPageInfo"></div>
      </div>
      <!-- Fixed -->
      <div id="split-tab-fixed" style="display:none">
        <div class="ctrl-row">
          <label>Pages per file</label>
          <input class="inp" id="splitFixed" type="number" value="1" min="1" style="width:90px">
        </div>
        <div style="font-size:0.78rem;color:var(--txt3);margin-top:4px" id="splitFixedInfo"></div>
      </div>
      <!-- All -->
      <div id="split-tab-all" style="display:none">
        <div class="info-box">Each page will be saved as a separate PDF file. They will download as individual files.</div>
      </div>
    </div>
    ${progHTML('split')}
    ${resHTML('split')}
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-gold btn-lg" id="splitBtn" onclick="doSplit()" disabled>✂️ Split & Download</button>
      <button class="btn btn-ghost btn-sm" onclick="resetSplit()">↺ Reset</button>
    </div>`;

  let totalPages = 0;
  let splitMode  = 'range';

  window.splitTabSwitch = (mode, btn) => {
    splitMode = mode;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ['range','fixed','all'].forEach(m => {
      const el = document.getElementById(`split-tab-${m}`);
      if (el) el.style.display = m === mode ? '' : 'none';
    });
    updateFixedInfo();
  };

  window.onFilesLoaded_split = async () => {
    const file = STATE.split?.files?.[0];
    if (!file) return;
    const ab  = await file.arrayBuffer();
    const doc = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
    totalPages = doc.getPageCount();
    document.getElementById('splitOptions').style.display = '';
    document.getElementById('splitBtn').disabled = false;
    document.getElementById('splitPageInfo').textContent = `PDF has ${totalPages} pages.`;
    document.getElementById('splitRanges').placeholder = `e.g. 1-${Math.ceil(totalPages/2)}, ${Math.ceil(totalPages/2)+1}-${totalPages}`;
    updateFixedInfo();
  };

  function updateFixedInfo() {
    if (!totalPages) return;
    const n   = parseInt(document.getElementById('splitFixed')?.value || 1);
    const cnt = Math.ceil(totalPages / n);
    const el  = document.getElementById('splitFixedInfo');
    if (el) el.textContent = `Will create ${cnt} file${cnt!==1?'s':''} from ${totalPages} pages.`;
  }
  document.getElementById('splitFixed')?.addEventListener('input', updateFixedInfo);

  // Parse range string → [[start,end], ...]
  function parseRanges(str, total) {
    const ranges = [];
    const parts  = str.split(',').map(s => s.trim()).filter(Boolean);
    for (const p of parts) {
      if (p.includes('-')) {
        const [a, b] = p.split('-').map(Number);
        if (!isNaN(a) && !isNaN(b) && a >= 1 && b <= total && a <= b) ranges.push([a, b]);
      } else {
        const n = Number(p);
        if (!isNaN(n) && n >= 1 && n <= total) ranges.push([n, n]);
      }
    }
    return ranges;
  }

  window.doSplit = async () => {
    const file = STATE.split?.files?.[0];
    if (!file) return;
    const btn = document.getElementById('splitBtn');
    btn.disabled = true;
    showProg('split', 5, 'Loading PDF…');
    try {
      const ab  = await file.arrayBuffer();
      const src = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
      const total = src.getPageCount();
      let ranges = [];

      if (splitMode === 'range') {
        ranges = parseRanges(document.getElementById('splitRanges').value, total);
        if (!ranges.length) { alert('Please enter valid page ranges.'); return; }
      } else if (splitMode === 'fixed') {
        const n = parseInt(document.getElementById('splitFixed').value || 1);
        for (let i = 1; i <= total; i += n) ranges.push([i, Math.min(i + n - 1, total)]);
      } else {
        for (let i = 1; i <= total; i++) ranges.push([i, i]);
      }

      let downloaded = 0;
      for (let r = 0; r < ranges.length; r++) {
        showProg('split', 5 + Math.round((r / ranges.length) * 90), `Creating file ${r+1} of ${ranges.length}…`);
        const [start, end] = ranges[r];
        const newDoc = await PDFLib.PDFDocument.create();
        const indices = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
        const copied  = await newDoc.copyPages(src, indices);
        copied.forEach(p => newDoc.addPage(p));
        const out  = await newDoc.save();
        const base = file.name.replace('.pdf', '');
        downloadBytes(out, `${base}_part${r+1}_pages${start}-${end}.pdf`);
        downloaded++;
        await new Promise(r => setTimeout(r, 120)); // small delay between downloads
      }

      logHistory('Split PDF', '✂️', [file], 0);
      showProg('split', 100); setTimeout(() => hideProg('split'), 500);
      showRes('split', `Created ${downloaded} file${downloaded!==1?'s':''} from ${total} pages.`,
        `<button class="btn btn-gold" onclick="doSplit()">⬇ Download Again</button>
         <button class="btn btn-ghost" onclick="resetSplit()">↺ Split Another</button>`);
    } catch(e) {
      hideProg('split'); alert('Error: ' + e.message);
    } finally { btn.disabled = false; }
  };

  window.resetSplit = () => {
    STATE.split = {};
    totalPages  = 0;
    document.getElementById('fl-split').innerHTML = '';
    document.getElementById('splitOptions').style.display = 'none';
    document.getElementById('splitBtn').disabled = true;
    hideRes('split'); hideProg('split');
  };
};
