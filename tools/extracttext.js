// ── EXTRACT TEXT (PAGE RANGE) ─────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Extracts text from a specific page range and shows it with per-page breakdown. Copy individual pages or download all as a .txt file.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF</div>
      ${dz('extracttext', false, '.pdf,application/pdf', 'Drop PDF here')}
      <div class="file-list" id="fl-extracttext"></div>
    </div>
    <div class="ctrl-group" id="etOptions" style="display:none">
      <div class="ctrl-group-title">Extraction Settings</div>
      <div class="ctrl-row">
        <label>Page range</label>
        <input class="inp" id="etRange" placeholder="e.g. 1-5 or leave blank for all" style="flex:1">
        <span style="font-size:0.78rem;color:var(--txt3)" id="etTotalInfo"></span>
      </div>
      <div class="ctrl-row">
        <label>Show</label>
        <select class="inp" id="etView" style="width:auto">
          <option value="all">All pages together</option>
          <option value="perpage" selected>Per-page breakdown</option>
        </select>
      </div>
    </div>
    ${progHTML('extracttext')}
    <div id="etResult" style="display:none">
      <div class="ctrl-group">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">
          <div class="ctrl-group-title" style="margin:0">Extracted Text</div>
          <div class="btn-row" style="margin:0;gap:8px">
            <span id="etStats" style="font-size:0.76rem;color:var(--txt3);align-self:center"></span>
            <button class="btn btn-teal btn-sm" onclick="etCopyAll()">📋 Copy All</button>
            <button class="btn btn-ghost btn-sm" onclick="etDownload()">⬇ .txt</button>
          </div>
        </div>
        <div id="etContent"></div>
      </div>
    </div>
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-gold btn-lg" id="etBtn" onclick="doExtractText()" disabled>📤 Extract Text</button>
      <button class="btn btn-ghost btn-sm" onclick="resetET()">↺ Reset</button>
    </div>`;

  let extractedPages = [];
  let totalPdf = 0;

  window.onFilesLoaded_extracttext = async () => {
    const file = STATE.extracttext?.files?.[0]; if (!file) return;
    const ab   = await file.arrayBuffer();
    const doc  = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise;
    totalPdf   = doc.numPages;
    document.getElementById('etOptions').style.display = '';
    document.getElementById('etBtn').disabled = false;
    document.getElementById('etTotalInfo').textContent = `(${totalPdf} pages)`;
    document.getElementById('etRange').placeholder = `e.g. 1-${totalPdf} (blank = all)`;
  };

  function parseRange(str, total) {
    if (!str.trim()) return Array.from({length:total},(_,i)=>i+1);
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

  window.doExtractText = async () => {
    const file = STATE.extracttext?.files?.[0]; if (!file) return;
    const btn  = document.getElementById('etBtn'); btn.disabled = true;
    showProg('extracttext', 5, 'Loading PDF…');
    try {
      const ab    = await file.arrayBuffer();
      const pdfJs = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise;
      const pages = parseRange(document.getElementById('etRange').value, totalPdf);
      extractedPages = [];
      let totalWords = 0;

      for (let idx=0; idx<pages.length; idx++) {
        const pgNum  = pages[idx];
        showProg('extracttext', 5 + Math.round((idx/pages.length)*90), `Extracting page ${pgNum}…`);
        const pg      = await pdfJs.getPage(pgNum);
        const content = await pg.getTextContent();
        const text    = content.items.map(it=>it.str).join(' ').replace(/ +/g,' ').trim();
        const words   = text ? text.split(/\s+/).filter(Boolean).length : 0;
        totalWords   += words;
        extractedPages.push({ page: pgNum, text, words });
      }

      document.getElementById('etStats').textContent =
        `${pages.length} pages · ${totalWords.toLocaleString()} words`;
      renderExtracted();
      hideProg('extracttext');
      logHistory('Extract Text (Pages)', '📤', [file], 0);
    } catch(e) { hideProg('extracttext'); alert('Error: ' + e.message); }
    finally { btn.disabled = false; }
  };

  function renderExtracted() {
    const mode = document.getElementById('etView').value;
    const wrap = document.getElementById('etContent');
    document.getElementById('etResult').style.display = '';

    if (mode === 'all') {
      const allText = extractedPages.map(p=>p.text).join('\n\n');
      wrap.innerHTML = `<textarea class="code-area" style="min-height:280px;font-size:0.84rem;color:var(--txt)" readonly>${allText}</textarea>`;
    } else {
      wrap.innerHTML = extractedPages.map(p => `
        <div style="margin-bottom:12px;border:1px solid var(--border);border-radius:var(--r2);overflow:hidden">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;background:var(--ink2);border-bottom:1px solid var(--border)">
            <span style="font-size:0.82rem;font-weight:700">📄 Page ${p.page}</span>
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:0.72rem;color:var(--txt3)">${p.words} words</span>
              <button class="btn btn-ghost btn-sm" onclick="etCopyPage(${p.page})" style="padding:2px 8px;font-size:0.74rem">📋 Copy</button>
            </div>
          </div>
          <div style="padding:12px 14px;font-size:0.83rem;color:var(--txt2);line-height:1.7;max-height:160px;overflow-y:auto;white-space:pre-wrap">${p.text || '<span style="color:var(--txt4);font-style:italic">No text found on this page</span>'}</div>
        </div>`).join('');
    }
  }

  window.etCopyAll = () => {
    const text = extractedPages.map(p=>`── Page ${p.page} ──\n${p.text}`).join('\n\n');
    navigator.clipboard.writeText(text).catch(() => {});
    showToast('📋 All text copied!');
  };

  window.etCopyPage = (pageNum) => {
    const p = extractedPages.find(p=>p.page===pageNum);
    if (!p) return;
    navigator.clipboard.writeText(p.text).catch(() => {});
    showToast(`📋 Page ${pageNum} copied!`);
  };

  window.etDownload = () => {
    if (!extractedPages.length) return;
    const text  = extractedPages.map(p=>`── Page ${p.page} ──\n${p.text}`).join('\n\n');
    const blob  = new Blob([text], { type:'text/plain' });
    const fname = (STATE.extracttext.files[0]?.name.replace('.pdf','') || 'extracted') + '_text.txt';
    downloadBlob(blob, fname);
  };

  function showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
      background:rgba(34,211,184,0.95);color:#000;font-weight:700;font-size:0.88rem;
      padding:9px 22px;border-radius:50px;z-index:9999;animation:fadeUp 0.2s ease both;`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
  }

  window.resetET = () => {
    STATE.extracttext = {}; extractedPages = []; totalPdf = 0;
    document.getElementById('fl-extracttext').innerHTML='';
    document.getElementById('etOptions').style.display='none';
    document.getElementById('etResult').style.display='none';
    document.getElementById('etBtn').disabled=true;
    hideProg('extracttext');
  };
};
