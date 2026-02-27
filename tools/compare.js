// ── COMPARE PDFs ──────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Extracts and compares text from two PDFs. Shows added lines (green), removed lines (red) and matching content. Works on text-based PDFs.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <div class="ctrl-group">
        <div class="ctrl-group-title">📄 PDF A (Original)</div>
        ${dz('compare_a', false, '.pdf,application/pdf', 'Drop first PDF')}
        <div class="file-list" id="fl-compare_a"></div>
        <div style="font-size:0.78rem;color:var(--txt3);margin-top:6px" id="cmpAInfo"></div>
      </div>
      <div class="ctrl-group">
        <div class="ctrl-group-title">📄 PDF B (Revised)</div>
        ${dz('compare_b', false, '.pdf,application/pdf', 'Drop second PDF')}
        <div class="file-list" id="fl-compare_b"></div>
        <div style="font-size:0.78rem;color:var(--txt3);margin-top:6px" id="cmpBInfo"></div>
      </div>
    </div>
    <div class="ctrl-group" id="cmpOptions" style="display:none">
      <div class="ctrl-group-title">Compare Options</div>
      <div class="ctrl-row">
        <label>Compare by</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <label style="min-width:auto;display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="radio" name="cmpMode" value="line" checked> Lines
          </label>
          <label style="min-width:auto;display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="radio" name="cmpMode" value="word"> Words
          </label>
          <label style="min-width:auto;display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="radio" name="cmpMode" value="page"> Page-by-page text
          </label>
        </div>
      </div>
      <div class="ctrl-row">
        <label><input type="checkbox" id="cmpIgnoreCase" style="margin-right:5px">Ignore case</label>
        <label><input type="checkbox" id="cmpIgnoreWS"   style="margin-right:5px">Ignore extra whitespace</label>
      </div>
    </div>
    ${progHTML('compare')}
    <div id="cmpResult" style="display:none"></div>
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-gold btn-lg" id="cmpBtn" onclick="doCompare()" disabled>⚖️ Compare PDFs</button>
      <button class="btn btn-ghost btn-sm" onclick="resetCmp()">↺ Reset</button>
    </div>`;

  // Use separate STATE keys for each slot
  STATE.compare_a = STATE.compare_a || {};
  STATE.compare_b = STATE.compare_b || {};

  async function loadText(key) {
    const file = STATE[key]?.files?.[0]; if (!file) return null;
    const ab   = await file.arrayBuffer();
    const pdfJs= await pdfjsLib.getDocument({ data: ab.slice(0) }).promise;
    const parts = [];
    for (let i=1; i<=pdfJs.numPages; i++) {
      const pg  = await pdfJs.getPage(i);
      const ct  = await pg.getTextContent();
      parts.push({ page: i, text: ct.items.map(it=>it.str).join(' ').replace(/ +/g,' ').trim() });
    }
    return { pages: parts, total: pdfJs.numPages };
  }

  function checkReady() {
    const aOk = !!STATE.compare_a?.files?.[0];
    const bOk = !!STATE.compare_b?.files?.[0];
    document.getElementById('cmpOptions').style.display = (aOk && bOk) ? '' : 'none';
    document.getElementById('cmpBtn').disabled = !(aOk && bOk);
  }

  window.onFilesLoaded_compare_a = async () => {
    const f = STATE.compare_a?.files?.[0]; if (!f) return;
    const ab  = await f.arrayBuffer();
    const doc = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
    document.getElementById('cmpAInfo').textContent = `${doc.getPageCount()} pages · ${fmtSz(f.size)}`;
    checkReady();
  };

  window.onFilesLoaded_compare_b = async () => {
    const f = STATE.compare_b?.files?.[0]; if (!f) return;
    const ab  = await f.arrayBuffer();
    const doc = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
    document.getElementById('cmpBInfo').textContent = `${doc.getPageCount()} pages · ${fmtSz(f.size)}`;
    checkReady();
  };

  // Simple LCS-based diff
  function diffLines(aLines, bLines) {
    const result = [];
    let ai=0, bi=0;
    // Build LCS table
    const m=aLines.length, n=bLines.length;
    const dp = Array.from({length:m+1},()=>new Int32Array(n+1));
    for(let i=m-1;i>=0;i--) for(let j=n-1;j>=0;j--)
      dp[i][j] = aLines[i]===bLines[j] ? dp[i+1][j+1]+1 : Math.max(dp[i+1][j],dp[i][j+1]);
    while(ai<m||bi<n){
      if(ai<m&&bi<n&&aLines[ai]===bLines[bi]){ result.push({type:'same',text:aLines[ai]}); ai++;bi++; }
      else if(bi<n&&(ai>=m||dp[ai+1]?.[bi]<=dp[ai]?.[bi+1]??0)){ result.push({type:'add',text:bLines[bi]}); bi++; }
      else { result.push({type:'rem',text:aLines[ai]}); ai++; }
    }
    return result;
  }

  window.doCompare = async () => {
    const btn = document.getElementById('cmpBtn'); btn.disabled = true;
    showProg('compare', 5, 'Loading PDF A…');
    try {
      const aData = await loadText('compare_a');
      showProg('compare', 40, 'Loading PDF B…');
      const bData = await loadText('compare_b');
      showProg('compare', 70, 'Comparing…');

      const mode       = document.querySelector('input[name="cmpMode"]:checked').value;
      const ignCase    = document.getElementById('cmpIgnoreCase').checked;
      const ignWS      = document.getElementById('cmpIgnoreWS').checked;

      const normalize  = t => {
        if (ignCase) t = t.toLowerCase();
        if (ignWS)   t = t.replace(/\s+/g,' ').trim();
        return t;
      };

      let aFull = aData.pages.map(p=>p.text).join('\n');
      let bFull = bData.pages.map(p=>p.text).join('\n');

      let diff;
      if (mode === 'word') {
        const aW = normalize(aFull).split(/\s+/).filter(Boolean);
        const bW = normalize(bFull).split(/\s+/).filter(Boolean);
        diff     = diffLines(aW, bW);
      } else if (mode === 'page') {
        diff = aData.pages.map((ap, i) => {
          const bp = bData.pages[i];
          if (!bp) return { type:'rem', text:`[Page ${ap.page} only in A]` };
          const an = normalize(ap.text), bn = normalize(bp.text);
          if (an === bn) return { type:'same', text:`Page ${ap.page}: identical` };
          return { type:'diff', textA: ap.text, textB: bp.text, page: ap.page };
        });
      } else {
        const aL = normalize(aFull).split('\n').filter(l=>l.trim());
        const bL = normalize(bFull).split('\n').filter(l=>l.trim());
        diff     = diffLines(aL, bL);
      }

      hideProg('compare');

      const added   = diff.filter(d=>d.type==='add').length;
      const removed = diff.filter(d=>d.type==='rem').length;
      const same    = diff.filter(d=>d.type==='same').length;
      const total   = diff.length;
      const similar = total ? Math.round((same/total)*100) : 100;

      const diffHtml = diff.slice(0, 600).map(d => {
        if (d.type==='same')  return `<div style="padding:2px 10px;font-size:0.8rem;color:var(--txt3)">${escHtml(d.text)}</div>`;
        if (d.type==='add')   return `<div style="padding:2px 10px;font-size:0.8rem;background:rgba(34,197,94,0.08);color:#4ade80;border-left:3px solid #4ade80">+ ${escHtml(d.text)}</div>`;
        if (d.type==='rem')   return `<div style="padding:2px 10px;font-size:0.8rem;background:rgba(248,113,113,0.08);color:var(--rose);border-left:3px solid var(--rose)">− ${escHtml(d.text)}</div>`;
        if (d.type==='diff')  return `<div style="padding:6px 10px;background:rgba(167,139,250,0.06);border-left:3px solid var(--violet);margin:4px 0">
          <div style="font-size:0.72rem;color:var(--txt3);margin-bottom:4px">Page ${d.page} differs:</div>
          <div style="font-size:0.78rem;color:var(--rose)">A: ${escHtml((d.textA||'').slice(0,200))}</div>
          <div style="font-size:0.78rem;color:#4ade80">B: ${escHtml((d.textB||'').slice(0,200))}</div>
        </div>`;
        return '';
      }).join('');

      document.getElementById('cmpResult').style.display = '';
      document.getElementById('cmpResult').innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;margin-bottom:16px">
          <div style="background:var(--ink3);border:1px solid var(--border);border-radius:var(--r2);padding:14px;text-align:center">
            <div style="font-size:1.6rem;font-weight:800;font-family:'Barlow Condensed',sans-serif;color:var(--gold)">${similar}%</div>
            <div style="font-size:0.68rem;color:var(--txt3);text-transform:uppercase;letter-spacing:0.1em;margin-top:2px">Similarity</div>
          </div>
          <div style="background:var(--ink3);border:1px solid var(--border);border-radius:var(--r2);padding:14px;text-align:center">
            <div style="font-size:1.6rem;font-weight:800;font-family:'Barlow Condensed',sans-serif;color:#4ade80">+${added}</div>
            <div style="font-size:0.68rem;color:var(--txt3);text-transform:uppercase;letter-spacing:0.1em;margin-top:2px">Added</div>
          </div>
          <div style="background:var(--ink3);border:1px solid var(--border);border-radius:var(--r2);padding:14px;text-align:center">
            <div style="font-size:1.6rem;font-weight:800;font-family:'Barlow Condensed',sans-serif;color:var(--rose)">−${removed}</div>
            <div style="font-size:0.68rem;color:var(--txt3);text-transform:uppercase;letter-spacing:0.1em;margin-top:2px">Removed</div>
          </div>
          <div style="background:var(--ink3);border:1px solid var(--border);border-radius:var(--r2);padding:14px;text-align:center">
            <div style="font-size:1.6rem;font-weight:800;font-family:'Barlow Condensed',sans-serif;color:var(--teal)">${same}</div>
            <div style="font-size:0.68rem;color:var(--txt3);text-transform:uppercase;letter-spacing:0.1em;margin-top:2px">Unchanged</div>
          </div>
        </div>
        <div class="ctrl-group">
          <div class="ctrl-group-title">Diff View ${diff.length>600?'<span style="font-size:0.72rem;font-weight:400;color:var(--txt3)">(showing first 600 items)</span>':''}</div>
          <div style="font-family:monospace;background:var(--ink);border:1px solid var(--border);border-radius:var(--r);max-height:380px;overflow-y:auto;padding:6px 0">${diffHtml||'<div style="padding:20px;text-align:center;color:var(--txt3)">No differences found — files appear identical.</div>'}</div>
        </div>
        <div class="btn-row" style="margin-top:14px">
          <button class="btn btn-ghost btn-sm" onclick="resetCmp()">↺ Compare Others</button>
        </div>`;

      logHistory('Compare PDFs', '⚖️', [STATE.compare_a.files[0], STATE.compare_b.files[0]], 0);
    } catch(e) { hideProg('compare'); alert('Error: ' + e.message); }
    finally { btn.disabled = false; }
  };

  function escHtml(s) {
    return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  window.resetCmp = () => {
    STATE.compare_a = {}; STATE.compare_b = {};
    ['fl-compare_a','fl-compare_b','cmpAInfo','cmpBInfo'].forEach(id => {
      const el = document.getElementById(id); if(el) el.innerHTML='';
    });
    document.getElementById('cmpOptions').style.display = 'none';
    document.getElementById('cmpResult').style.display  = 'none';
    document.getElementById('cmpBtn').disabled = true;
    hideProg('compare');
  };
};
