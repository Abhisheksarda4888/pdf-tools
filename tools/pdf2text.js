// ── PDF → TEXT ────────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Extracts all readable text from a PDF using PDF.js. Works on text-based PDFs only — scanned image PDFs require OCR which is not yet available.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF</div>
      ${dz('pdf2text', false, '.pdf,application/pdf', 'Drop PDF here')}
      <div class="file-list" id="fl-pdf2text"></div>
    </div>
    <div class="ctrl-group" id="p2tOptions" style="display:none">
      <div class="ctrl-group-title">Options</div>
      <div class="ctrl-row">
        <label>Output format</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-gold btn-sm p2t-fmt" data-f="plain" onclick="setP2TFmt('plain',this)">📄 Plain Text</button>
          <button class="btn btn-ghost btn-sm p2t-fmt" data-f="paged" onclick="setP2TFmt('paged',this)">📑 With Page Breaks</button>
        </div>
      </div>
      <div class="ctrl-row">
        <label>Pages</label>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <label style="min-width:auto;display:flex;gap:5px;align-items:center;cursor:pointer">
            <input type="radio" name="p2tScope" value="all" checked onchange="p2tScopeChange(this)"> All pages
          </label>
          <label style="min-width:auto;display:flex;gap:5px;align-items:center;cursor:pointer">
            <input type="radio" name="p2tScope" value="range" onchange="p2tScopeChange(this)"> Range
          </label>
        </div>
      </div>
      <div id="p2tRangeWrap" style="display:none">
        <div class="ctrl-row">
          <label>Page range</label>
          <input class="inp" id="p2tRange" placeholder="e.g. 1-5, 8" style="flex:1">
        </div>
      </div>
    </div>
    <div id="p2tResultSection" style="display:none">
      <div class="ctrl-group">
        <div class="ctrl-group-title">
          Extracted Text
          <span id="p2tStats" style="margin-left:auto;font-size:0.76rem;color:var(--txt3)"></span>
        </div>
        <textarea class="code-area" id="p2tOutput" style="min-height:260px;color:var(--txt);font-family:'Barlow',sans-serif;font-size:0.84rem" readonly placeholder="Extracted text will appear here…"></textarea>
        <div class="btn-row" style="margin-top:10px">
          <button class="btn btn-teal btn-sm" onclick="p2tCopy()">📋 Copy All</button>
          <button class="btn btn-ghost btn-sm" onclick="p2tDownloadTxt()">⬇ Download .txt</button>
        </div>
      </div>
    </div>
    ${progHTML('pdf2text')}
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-gold btn-lg" id="p2tBtn" onclick="doP2T()" disabled>📄 Extract Text</button>
      <button class="btn btn-ghost btn-sm" onclick="resetP2T()">↺ Reset</button>
    </div>`;

  let p2tFmt = 'plain';
  let extractedText = '';

  window.setP2TFmt = (fmt, btn) => {
    p2tFmt = fmt;
    document.querySelectorAll('.p2t-fmt').forEach(b => {
      b.classList.toggle('btn-gold',  b === btn);
      b.classList.toggle('btn-ghost', b !== btn);
    });
  };

  window.p2tScopeChange = (el) => {
    document.getElementById('p2tRangeWrap').style.display = el.value === 'range' ? '' : 'none';
  };

  window.onFilesLoaded_pdf2text = () => {
    document.getElementById('p2tOptions').style.display = '';
    document.getElementById('p2tBtn').disabled = false;
  };

  function parseRangeP2T(str, total) {
    const pages = new Set();
    str.split(',').forEach(p => {
      p = p.trim();
      if (p.includes('-')) {
        const [a,b] = p.split('-').map(Number);
        for (let i=a; i<=Math.min(b,total); i++) pages.add(i);
      } else { const n=Number(p); if(n>=1&&n<=total) pages.add(n); }
    });
    return [...pages].sort((a,b)=>a-b);
  }

  window.doP2T = async () => {
    const file = STATE.pdf2text?.files?.[0]; if (!file) return;
    const btn  = document.getElementById('p2tBtn'); btn.disabled = true;
    showProg('pdf2text', 5, 'Loading PDF…');
    try {
      const ab    = await file.arrayBuffer();
      const pdfJs = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise;
      const total = pdfJs.numPages;
      const scope = document.querySelector('input[name="p2tScope"]:checked').value;
      const pages = scope === 'range'
        ? parseRangeP2T(document.getElementById('p2tRange').value, total)
        : Array.from({ length: total }, (_,i) => i+1);

      const parts = [];
      for (let idx = 0; idx < pages.length; idx++) {
        const pg = pages[idx];
        showProg('pdf2text', 10 + Math.round((idx/pages.length)*85), `Extracting page ${pg}…`);
        const page    = await pdfJs.getPage(pg);
        const content = await page.getTextContent();
        const text    = content.items.map(item => item.str).join(' ').replace(/ +/g,' ').trim();
        if (p2tFmt === 'paged') {
          parts.push(`── Page ${pg} ──\n${text}`);
        } else {
          parts.push(text);
        }
      }

      extractedText = parts.join(p2tFmt === 'paged' ? '\n\n' : '\n');
      const words   = extractedText.split(/\s+/).filter(Boolean).length;
      const chars   = extractedText.length;

      document.getElementById('p2tOutput').value = extractedText;
      document.getElementById('p2tStats').textContent = `${words.toLocaleString()} words · ${chars.toLocaleString()} chars · ${pages.length} pages`;
      document.getElementById('p2tResultSection').style.display = '';

      logHistory('PDF → Text', '📄', [file], 0);
      showProg('pdf2text', 100); setTimeout(() => hideProg('pdf2text'), 500);
    } catch(e) { hideProg('pdf2text'); alert('Error: ' + e.message); }
    finally { btn.disabled = false; }
  };

  window.p2tCopy = () => {
    navigator.clipboard.writeText(extractedText).then(() => showToast('📋 Copied!')).catch(() => {
      document.getElementById('p2tOutput').select();
      document.execCommand('copy');
      showToast('📋 Copied!');
    });
  };

  window.p2tDownloadTxt = () => {
    if (!extractedText) return;
    const blob  = new Blob([extractedText], { type: 'text/plain' });
    const fname = (STATE.pdf2text.files[0]?.name.replace('.pdf','') || 'extracted') + '.txt';
    downloadBlob(blob, fname);
  };

  window.resetP2T = () => {
    STATE.pdf2text = {}; extractedText = '';
    document.getElementById('fl-pdf2text').innerHTML = '';
    document.getElementById('p2tOptions').style.display = 'none';
    document.getElementById('p2tResultSection').style.display = 'none';
    document.getElementById('p2tBtn').disabled = true;
    hideProg('pdf2text');
  };

  function showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
      background:rgba(34,211,184,0.95);color:#000;font-weight:700;font-size:0.88rem;
      padding:9px 22px;border-radius:50px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.4);
      animation:fadeUp 0.2s ease both;`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
  }
};
