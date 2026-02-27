// ── ADD HEADER / FOOTER ───────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Adds custom text to the header and/or footer of every page. Supports dynamic tokens: <strong>{page}</strong> = page number, <strong>{total}</strong> = total pages, <strong>{date}</strong> = today's date.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF</div>
      ${dz('header', false, '.pdf,application/pdf', 'Drop PDF here')}
      <div class="file-list" id="fl-header"></div>
    </div>
    <div class="ctrl-group" id="hfOptions" style="display:none">
      <div class="ctrl-group-title">Header Settings</div>
      <div class="ctrl-row">
        <label style="display:flex;align-items:center;gap:7px;cursor:pointer">
          <input type="checkbox" id="hfEnableHeader" checked onchange="toggleHF()"> Enable Header
        </label>
      </div>
      <div id="headerFields">
        <div class="ctrl-row">
          <label>Left</label>
          <input class="inp" id="hfHL" placeholder="e.g. Company Name" style="flex:1">
        </div>
        <div class="ctrl-row">
          <label>Centre</label>
          <input class="inp" id="hfHC" placeholder="e.g. {date}" style="flex:1">
        </div>
        <div class="ctrl-row">
          <label>Right</label>
          <input class="inp" id="hfHR" placeholder="e.g. Page {page} of {total}" style="flex:1">
        </div>
      </div>

      <div class="ctrl-group-title" style="margin-top:14px">Footer Settings</div>
      <div class="ctrl-row">
        <label style="display:flex;align-items:center;gap:7px;cursor:pointer">
          <input type="checkbox" id="hfEnableFooter" checked onchange="toggleHF()"> Enable Footer
        </label>
      </div>
      <div id="footerFields">
        <div class="ctrl-row">
          <label>Left</label>
          <input class="inp" id="hfFL" placeholder="e.g. Confidential" style="flex:1">
        </div>
        <div class="ctrl-row">
          <label>Centre</label>
          <input class="inp" id="hfFC" placeholder="e.g. {page} of {total}" style="flex:1">
        </div>
        <div class="ctrl-row">
          <label>Right</label>
          <input class="inp" id="hfFR" placeholder="e.g. {date}" style="flex:1">
        </div>
      </div>

      <div class="ctrl-group-title" style="margin-top:14px">Style</div>
      <div class="ctrl-row">
        <label>Font size</label>
        <input type="range" class="inp" id="hfSize" min="7" max="18" value="10" style="width:130px" oninput="document.getElementById('hfSizeVal').textContent=this.value+'pt'">
        <span id="hfSizeVal" style="font-size:0.82rem;color:var(--gold);font-weight:700;min-width:36px">10pt</span>
      </div>
      <div class="ctrl-row">
        <label>Margin from edge</label>
        <input type="range" class="inp" id="hfMargin" min="8" max="40" value="15" style="width:130px" oninput="document.getElementById('hfMarginVal').textContent=this.value+'pt'">
        <span id="hfMarginVal" style="font-size:0.82rem;color:var(--gold);font-weight:700;min-width:36px">15pt</span>
      </div>
      <div class="ctrl-row">
        <label>Skip first page</label>
        <label style="min-width:auto;display:flex;align-items:center;gap:6px;cursor:pointer">
          <input type="checkbox" id="hfSkip"> Skip cover page (page 1)
        </label>
      </div>
      <div class="info-box" style="margin-top:10px">
        Tokens: <strong>{page}</strong> = current page number &nbsp;·&nbsp; <strong>{total}</strong> = total pages &nbsp;·&nbsp; <strong>{date}</strong> = today's date
      </div>
    </div>
    ${progHTML('header')}
    ${resHTML('header')}
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-gold btn-lg" id="hfBtn" onclick="doHF()" disabled>🔖 Add Header/Footer & Download</button>
      <button class="btn btn-ghost btn-sm" onclick="resetHF()">↺ Reset</button>
    </div>`;

  window.toggleHF = () => {
    document.getElementById('headerFields').style.opacity = document.getElementById('hfEnableHeader').checked ? '1' : '0.4';
    document.getElementById('footerFields').style.opacity = document.getElementById('hfEnableFooter').checked ? '1' : '0.4';
  };

  window.onFilesLoaded_header = () => {
    document.getElementById('hfOptions').style.display = '';
    document.getElementById('hfBtn').disabled = false;
  };

  function resolveToken(str, page, total) {
    const today = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
    return str.replace(/\{page\}/gi, page).replace(/\{total\}/gi, total).replace(/\{date\}/gi, today);
  }

  window.doHF = async () => {
    const file = STATE.header?.files?.[0]; if (!file) return;
    const btn  = document.getElementById('hfBtn'); btn.disabled = true;
    showProg('header', 5, 'Loading…');
    try {
      const ab    = await file.arrayBuffer();
      const doc   = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
      const pages = doc.getPages();
      const font  = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
      const sz    = parseInt(document.getElementById('hfSize').value);
      const marg  = parseInt(document.getElementById('hfMargin').value);
      const skip  = document.getElementById('hfSkip').checked;
      const total = pages.length;
      const doH   = document.getElementById('hfEnableHeader').checked;
      const doF   = document.getElementById('hfEnableFooter').checked;
      const HL    = document.getElementById('hfHL').value;
      const HC    = document.getElementById('hfHC').value;
      const HR    = document.getElementById('hfHR').value;
      const FL    = document.getElementById('hfFL').value;
      const FC    = document.getElementById('hfFC').value;
      const FR    = document.getElementById('hfFR').value;

      pages.forEach((page, idx) => {
        showProg('header', 10 + Math.round((idx/total)*85), `Processing page ${idx+1}…`);
        if (skip && idx === 0) return;
        const { width: pW, height: pH } = page.getSize();
        const pageNum = idx + 1;
        const color   = PDFLib.rgb(0.3, 0.3, 0.3);

        const drawPos = (text, x, y) => {
          if (!text) return;
          const resolved = resolveToken(text, pageNum, total);
          const tw = font.widthOfTextAtSize(resolved, sz);
          // x: 'left', 'center', 'right'
          let px;
          if (x === 'left')   px = marg;
          else if (x === 'right') px = pW - tw - marg;
          else px = pW/2 - tw/2;
          page.drawText(resolved, { x: px, y, size: sz, font, color });
        };

        if (doH) {
          const y = pH - marg - sz;
          drawPos(HL, 'left',   y);
          drawPos(HC, 'center', y);
          drawPos(HR, 'right',  y);
        }
        if (doF) {
          const y = marg;
          drawPos(FL, 'left',   y);
          drawPos(FC, 'center', y);
          drawPos(FR, 'right',  y);
        }
      });

      showProg('header', 96, 'Saving…');
      const out   = await doc.save();
      const fname = file.name.replace('.pdf','') + '_headerfooter.pdf';
      downloadBytes(out, fname);
      logHistory('Add Header/Footer', '🔖', [file], out.length);
      showProg('header', 100); setTimeout(() => hideProg('header'), 500);
      showRes('header', `Header/footer added to ${total} pages.`,
        `<button class="btn btn-gold" onclick="doHF()">⬇ Download Again</button>
         <button class="btn btn-ghost" onclick="resetHF()">↺ Add to Another</button>`);
    } catch(e) { hideProg('header'); alert('Error: ' + e.message); }
    finally { btn.disabled = false; }
  };

  window.resetHF = () => {
    STATE.header = {};
    document.getElementById('fl-header').innerHTML = '';
    document.getElementById('hfOptions').style.display = 'none';
    document.getElementById('hfBtn').disabled = true;
    hideRes('header'); hideProg('header');
  };
};
