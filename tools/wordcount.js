// ── WORD & PAGE COUNT ─────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Extracts all text and counts words, characters, sentences and estimates reading time. Works on text-based PDFs only.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF</div>
      ${dz('wordcount', false, '.pdf,application/pdf', 'Drop PDF here')}
      <div class="file-list" id="fl-wordcount"></div>
    </div>
    <div id="wcResult" style="display:none"></div>`;

  window.onFilesLoaded_wordcount = async () => {
    const file = STATE.wordcount?.files?.[0]; if (!file) return;
    showProg('wordcount', 10, 'Extracting text…');
    try {
      const ab    = await file.arrayBuffer();
      const pdfJs = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise;
      const total = pdfJs.numPages;
      const pageCounts = [];
      let   allText    = '';

      for (let i = 1; i <= total; i++) {
        showProg('wordcount', 10 + Math.round((i/total)*80), `Analysing page ${i}…`);
        const pg      = await pdfJs.getPage(i);
        const content = await pg.getTextContent();
        const text    = content.items.map(it => it.str).join(' ').replace(/ +/g,' ').trim();
        const words   = text ? text.split(/\s+/).filter(Boolean).length : 0;
        const chars   = text.length;
        pageCounts.push({ page: i, words, chars, text });
        allText += text + ' ';
      }

      const totalWords = pageCounts.reduce((a,p) => a + p.words, 0);
      const totalChars = allText.trim().length;
      const totalCharsNoSpace = allText.replace(/\s/g,'').length;
      const sentences  = (allText.match(/[.!?]+/g)||[]).length;
      const paragraphs = (allText.match(/\n{2,}/g)||[]).length + 1;
      const readMins   = Math.max(1, Math.round(totalWords / 238));
      const uniqueWords= new Set(allText.toLowerCase().match(/\b[a-z]{2,}\b/g)||[]).size;

      hideProg('wordcount');

      const bigStat = (icon, val, lbl, color='var(--gold)') =>
        `<div style="background:var(--ink3);border:1px solid var(--border);border-radius:var(--r2);padding:18px 16px;text-align:center">
          <div style="font-size:1.3rem;margin-bottom:6px">${icon}</div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.8rem;font-weight:800;color:${color};line-height:1">${typeof val==='number'?val.toLocaleString():val}</div>
          <div style="font-size:0.68rem;color:var(--txt3);text-transform:uppercase;letter-spacing:0.1em;margin-top:3px;font-weight:600">${lbl}</div>
        </div>`;

      // Top 5 pages by word count
      const topPages = [...pageCounts].sort((a,b)=>b.words-a.words).slice(0,5);

      document.getElementById('wcResult').style.display = '';
      document.getElementById('wcResult').innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-bottom:20px">
          ${bigStat('📝', totalWords,         'Total Words',         'var(--gold)')}
          ${bigStat('📄', total,              'Pages',               'var(--teal)')}
          ${bigStat('🔤', totalChars,         'Characters',          'var(--violet)')}
          ${bigStat('⏱',  readMins + ' min',  'Reading Time',        'var(--rose)')}
          ${bigStat('🔡', totalCharsNoSpace,  'Chars (no spaces)',   'var(--gold)')}
          ${bigStat('💬', sentences,          'Sentences',           'var(--teal)')}
          ${bigStat('📚', uniqueWords,        'Unique Words',        'var(--violet)')}
          ${bigStat('📃', (totalWords/total).toFixed(0), 'Avg Words/Page', 'var(--rose)')}
        </div>

        <div class="ctrl-group" style="margin-bottom:14px">
          <div class="ctrl-group-title">Words Per Page</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${pageCounts.map(p => `
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:0.76rem;color:var(--txt3);width:54px;flex-shrink:0">Page ${p.page}</span>
                <div style="flex:1;height:7px;background:var(--ink4);border-radius:20px;overflow:hidden">
                  <div style="height:100%;border-radius:20px;background:linear-gradient(90deg,var(--gold),var(--teal));width:${totalWords?Math.round(p.words/Math.max(...pageCounts.map(x=>x.words))*100):0}%;transition:width 0.8s"></div>
                </div>
                <span style="font-size:0.76rem;color:var(--txt2);font-weight:700;width:44px;text-align:right;flex-shrink:0">${p.words.toLocaleString()}</span>
              </div>`).join('')}
          </div>
        </div>

        <div class="ctrl-group">
          <div class="ctrl-group-title">Top 5 Pages by Word Count</div>
          ${topPages.map((p,i) => `
            <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">
              <span style="font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:800;color:var(--gold);width:20px">#${i+1}</span>
              <span style="font-size:0.82rem;color:var(--txt2);flex:1">Page ${p.page}</span>
              <span style="font-size:0.82rem;font-weight:700;color:var(--txt)">${p.words.toLocaleString()} words</span>
            </div>`).join('')}
        </div>

        <div class="btn-row" style="margin-top:16px">
          <button class="btn btn-ghost btn-sm" onclick="resetWC()">↺ Count Another</button>
        </div>`;

      // animate bars
      setTimeout(() => {
        document.querySelectorAll('#wcResult [style*="transition"]').forEach(b => {
          const w = b.style.width; b.style.width='0';
          requestAnimationFrame(() => setTimeout(() => b.style.width=w, 30));
        });
      }, 100);

      logHistory('Word & Page Count', '🔢', [file], 0);
    } catch(e) { hideProg('wordcount'); alert('Error: ' + e.message); }
  };

  window.resetWC = () => {
    STATE.wordcount = {};
    document.getElementById('fl-wordcount').innerHTML = '';
    document.getElementById('wcResult').style.display = 'none';
    hideProg('wordcount');
  };
};
