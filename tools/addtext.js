// ── ADD TEXT ──────────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Load a PDF, configure your text style, then click <strong>Add Text Box</strong> to place it. Drag to exact position. Resize with corner handle. Add as many boxes as needed.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF</div>
      ${dz('addtext', false, '.pdf,application/pdf', 'Drop PDF here')}
      <div class="file-list" id="fl-addtext"></div>
    </div>
    <div id="addtextSection" style="display:none">
      <div class="ctrl-group">
        <div class="ctrl-group-title">Text Settings</div>
        <div class="ctrl-row">
          <label>Text content</label>
          <input class="inp" id="atText" value="Your text here" style="flex:1">
        </div>
        <div class="ctrl-row">
          <label>Font size</label>
          <input type="range" class="inp" id="atSize" min="8" max="72" value="16" style="width:130px" oninput="document.getElementById('atSizeVal').textContent=this.value+'pt';updateAtPreview()">
          <span id="atSizeVal" style="font-size:0.82rem;color:var(--gold);font-weight:700;min-width:36px">16pt</span>
        </div>
        <div class="ctrl-row">
          <label>Colour</label>
          <div style="display:flex;gap:7px;flex-wrap:wrap">
            <button class="btn btn-sm at-col-btn" style="background:#1a1a1a;color:#fff;border:2px solid var(--gold)" data-c="black"  onclick="setAtColor('black',this)">Black</button>
            <button class="btn btn-sm at-col-btn" style="background:#fff;color:#000;border:1px solid var(--border2)"  data-c="white"  onclick="setAtColor('white',this)">White</button>
            <button class="btn btn-sm at-col-btn" style="background:rgba(248,113,113,0.15);color:var(--rose);border:1px solid rgba(248,113,113,0.3)" data-c="red" onclick="setAtColor('red',this)">Red</button>
            <button class="btn btn-sm at-col-btn" style="background:rgba(96,165,250,0.15);color:var(--blue);border:1px solid rgba(96,165,250,0.3)" data-c="blue" onclick="setAtColor('blue',this)">Blue</button>
          </div>
        </div>
        <div class="ctrl-row">
          <label>Style</label>
          <div style="display:flex;gap:7px">
            <label style="min-width:auto;display:flex;align-items:center;gap:5px;cursor:pointer">
              <input type="checkbox" id="atBold"> <strong>Bold</strong>
            </label>
            <label style="min-width:auto;display:flex;align-items:center;gap:5px;cursor:pointer">
              <input type="checkbox" id="atItalic"> <em>Italic</em>
            </label>
          </div>
        </div>
        <div class="ctrl-row">
          <label>Apply to page</label>
          <select class="inp" id="atPageSel" style="width:auto"></select>
        </div>
        <div class="btn-row" style="margin-top:8px">
          <button class="btn btn-teal btn-sm" onclick="addAtBox()">➕ Add Text Box</button>
          <button class="btn btn-ghost btn-sm" onclick="clearAtBoxes()">🗑 Clear All Boxes</button>
          <span style="font-size:0.78rem;color:var(--txt3);align-self:center" id="atBoxCount">0 boxes</span>
        </div>
      </div>
      <div class="ctrl-group">
        <div class="ctrl-group-title">Position on Page — Drag to Exact Spot</div>
        <div id="addtextViewerWrap"></div>
      </div>
      ${progHTML('addtext')}
      ${resHTML('addtext')}
      <div class="btn-row" style="margin-top:4px">
        <button class="btn btn-gold btn-lg" id="atBtn" onclick="doAddText()">📝 Apply Text & Download</button>
        <button class="btn btn-ghost btn-sm" onclick="resetAt()">↺ Reset</button>
      </div>
    </div>`;

  const COLORS = { black:[0,0,0], white:[1,1,1], red:[0.94,0.27,0.27], blue:[0.24,0.65,0.98] };
  let atColor   = 'black';
  let pdfBytes  = null;
  let pdfJsDoc  = null;
  // boxes: [{ page, text, size, color, bold, x, y, w, h }]
  let atBoxes   = [];

  window.setAtColor = (c, btn) => {
    atColor = c;
    document.querySelectorAll('.at-col-btn').forEach(b => b.style.outline = '');
    btn.style.outline = '2px solid var(--gold)';
  };

  window.onFilesLoaded_addtext = async () => {
    const file = STATE.addtext?.files?.[0]; if (!file) return;
    pdfBytes = await file.arrayBuffer();
    pdfJsDoc = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise;
    const sel = document.getElementById('atPageSel');
    sel.innerHTML = '';
    for (let i=1; i<=pdfJsDoc.numPages; i++) sel.innerHTML += `<option value="${i}">Page ${i}</option>`;
    document.getElementById('addtextSection').style.display = '';
    buildAtViewer();
  };

  function buildAtViewer() {
    WLP.buildViewer('addtextViewerWrap', pdfJsDoc, { overlayMode: true });
    OVERLAY.init('vStage');
  }

  window.addAtBox = () => {
    const txt  = document.getElementById('atText').value || 'Text';
    const sz   = parseInt(document.getElementById('atSize').value);
    const bold = document.getElementById('atBold').checked;
    const page = parseInt(document.getElementById('atPageSel').value);
    const cssColor = atColor === 'white' ? '#ffffff' : atColor === 'red' ? '#f87171' : atColor === 'blue' ? '#60a5fa' : '#111111';
    const bgColor  = atColor === 'white' ? 'rgba(0,0,0,0.5)' : 'transparent';

    // Navigate to target page
    if (WLP._vCur !== page) WLP._vRender(page);

    OVERLAY.addItem({
      type: 'text',
      data: { text: txt, size: sz, color: atColor, bold, page },
      content: `<div style="font-size:${sz}px;color:${cssColor};font-weight:${bold?'700':'400'};white-space:nowrap;padding:3px 6px;background:${bgColor};border-radius:3px;pointer-events:none">${txt}</div>`,
      x: 40, y: 40, w: Math.max(120, txt.length * sz * 0.6),
    });
    atBoxes.push({ page, text: txt, size: sz, color: atColor, bold });
    updateAtCount();
  };

  window.clearAtBoxes = () => {
    OVERLAY.clearAll(); atBoxes = []; updateAtCount();
  };

  function updateAtCount() {
    const el = document.getElementById('atBoxCount');
    if (el) el.textContent = OVERLAY.items.length + ' box' + (OVERLAY.items.length !== 1 ? 'es' : '');
  }

  window.doAddText = async () => {
    if (!pdfBytes || !OVERLAY.items.length) {
      alert('Add at least one text box first.'); return;
    }
    const btn = document.getElementById('atBtn'); btn.disabled = true;
    showProg('addtext', 5, 'Loading…');
    try {
      const doc   = await PDFLib.PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const pages = doc.getPages();
      const font  = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
      const fontB = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
      const canvas= WLP.getCanvas();
      const dW    = canvas.offsetWidth;
      const dH    = canvas.offsetHeight;

      OVERLAY.items.forEach((item, idx) => {
        showProg('addtext', 10 + Math.round((idx/OVERLAY.items.length)*85), `Embedding text ${idx+1}…`);
        const page = pages[(item.data?.page || WLP._vCur) - 1];
        if (!page) return;
        const { width: pW, height: pH } = page.getSize();
        const scaleX = pW / dW;
        const scaleY = pH / dH;
        const x = item.x * scaleX;
        const y = pH - (item.y * scaleY) - (item.data.size * scaleY * 1.4);
        const [r,g,b] = COLORS[item.data.color] || [0,0,0];
        page.drawText(item.data.text, {
          x, y,
          size:  item.data.size,
          font:  item.data.bold ? fontB : font,
          color: PDFLib.rgb(r, g, b),
        });
      });

      showProg('addtext', 96, 'Saving…');
      const out   = await doc.save();
      const fname = STATE.addtext.files[0].name.replace('.pdf','') + '_text.pdf';
      downloadBytes(out, fname);
      logHistory('Add Text', '📝', STATE.addtext.files, out.length);
      showProg('addtext', 100); setTimeout(() => hideProg('addtext'), 500);
      showRes('addtext', `${OVERLAY.items.length} text item${OVERLAY.items.length!==1?'s':''} added to PDF.`,
        `<button class="btn btn-gold" onclick="doAddText()">⬇ Download Again</button>
         <button class="btn btn-ghost" onclick="resetAt()">↺ Start Over</button>`);
    } catch(e) { hideProg('addtext'); alert('Error: ' + e.message); }
    finally { btn.disabled = false; }
  };

  window.resetAt = () => {
    STATE.addtext = {}; pdfBytes = null; pdfJsDoc = null; atBoxes = [];
    document.getElementById('fl-addtext').innerHTML = '';
    document.getElementById('addtextSection').style.display = 'none';
    hideRes('addtext'); hideProg('addtext');
  };

  window.updateAtPreview = () => {};
};
