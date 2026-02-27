// ── SIGN PDF ──────────────────────────────────────────────────────────────
// Free-drag, resizable signature with pixel-accurate PDF placement
// ─────────────────────────────────────────────────────────────────────────

window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');

  mount.innerHTML = `
    <div class="info-box">
      <strong>How to use:</strong> Draw your signature below (or upload an image). Load your PDF, then
      <strong>drag the signature to the exact position</strong> you need. Resize using the corner handle. Apply when ready.
    </div>

    <!-- STEP 1: Signature -->
    <div class="ctrl-group" style="margin-bottom:14px">
      <div class="ctrl-group-title">Step 1 — Create Your Signature</div>
      <div class="tabs" id="sigTabs">
        <button class="tab-btn active" onclick="switchSigTab('draw')">✏️ Draw</button>
        <button class="tab-btn" onclick="switchSigTab('type')">🔤 Type</button>
        <button class="tab-btn" onclick="switchSigTab('upload')">📷 Upload</button>
      </div>

      <!-- Draw tab -->
      <div class="tab-pane active" id="tab-draw">
        <div class="sig-pad-wrap" id="sigPadWrap">
          <canvas id="sigPad" height="160"></canvas>
          <div class="sig-pad-label">Draw your signature here</div>
        </div>
        <div class="btn-row">
          <button class="btn btn-ghost btn-sm" onclick="clearSigPad()">🗑 Clear</button>
          <button class="btn btn-teal btn-sm" onclick="useSigDraw()">✓ Use This Signature</button>
        </div>
      </div>

      <!-- Type tab -->
      <div class="tab-pane" id="tab-type">
        <div class="ctrl-row">
          <label>Your name</label>
          <input class="inp" id="sigTypeText" placeholder="e.g. Abhishek" style="flex:1" oninput="updateTypedSig()">
        </div>
        <div class="ctrl-row">
          <label>Font style</label>
          <select class="inp" id="sigTypeFont" onchange="updateTypedSig()" style="flex:1">
            <option value="cursive">Handwriting</option>
            <option value="'Dancing Script',cursive">Dancing Script</option>
            <option value="Georgia,serif">Serif Formal</option>
            <option value="'Barlow Condensed',sans-serif">Bold Modern</option>
          </select>
        </div>
        <div style="background:var(--ink3);border:1px solid var(--border);border-radius:var(--r);padding:16px;text-align:center;min-height:70px;display:flex;align-items:center;justify-content:center;margin-bottom:12px">
          <span id="sigTypePreview" style="font-size:2rem;color:var(--txt)">Abhishek</span>
        </div>
        <div class="btn-row">
          <button class="btn btn-teal btn-sm" onclick="useSigType()">✓ Use This Signature</button>
        </div>
      </div>

      <!-- Upload tab -->
      <div class="tab-pane" id="tab-upload">
        <div class="drop-zone" style="padding:28px" onclick="document.getElementById('sigImgInput').click()"
          ondragover="event.preventDefault();this.classList.add('drag')"
          ondragleave="this.classList.remove('drag')"
          ondrop="event.preventDefault();this.classList.remove('drag');handleSigUpload(event.dataTransfer.files)">
          <div class="dz-icon" style="width:44px;height:44px;font-size:1.2rem">🖼️</div>
          <h3 style="font-size:1rem">Drop signature image</h3>
          <p>PNG with transparent background works best</p>
          <input type="file" id="sigImgInput" accept="image/*" style="display:none" onchange="handleSigUpload(this.files)">
        </div>
      </div>
    </div>

    <!-- STEP 2: PDF -->
    <div class="ctrl-group" style="margin-bottom:14px">
      <div class="ctrl-group-title">Step 2 — Load Your PDF</div>
      ${dz('sign', false, '.pdf,application/pdf', 'Drop PDF to sign')}
      <div class="file-list" id="fl-sign"></div>
    </div>

    <!-- STEP 3: Place -->
    <div id="placeSection" style="display:none">
      <div class="ctrl-group" style="margin-bottom:14px">
        <div class="ctrl-group-title">Step 3 — Place & Position Signature</div>
        <div class="warn-box">
          <strong>Drag</strong> the signature to your desired position. <strong>Resize</strong> using the bottom-right corner handle. <strong>Switch pages</strong> using the toolbar below.
        </div>
        <div id="signViewerWrap"></div>
        <div class="ctrl-row" style="margin-top:10px">
          <label>Apply to page</label>
          <select class="inp" id="sigPageSelect" style="width:auto"></select>
          <label style="min-width:auto">or</label>
          <label><input type="checkbox" id="sigAllPages" style="margin-right:5px">All pages</label>
        </div>
      </div>

      ${progHTML('sign')}
      ${resHTML('sign')}

      <div class="btn-row" style="margin-top:4px">
        <button class="btn btn-gold btn-lg" id="applySignBtn" onclick="applySignature()" disabled>
          ✍️ Apply Signature & Download
        </button>
        <button class="btn btn-ghost btn-sm" onclick="resetSignTool()">↺ Start Over</button>
      </div>
    </div>
  `;

  // ── SIGNATURE PAD SETUP ──────────────────────────────────────────────
  const sigPad   = document.getElementById('sigPad');
  const sigCtx   = sigPad.getContext('2d');
  let sigDrawing = false;
  let sigDataURL = null;
  let pdfBytes   = null;
  let pdfJsDoc   = null;

  function resizeSigPad() {
    const wrap = document.getElementById('sigPadWrap');
    if (!wrap) return;
    const w = wrap.clientWidth;
    sigPad.width  = w;
    sigPad.height = 160;
    sigPad.style.width  = w + 'px';
    sigPad.style.height = '160px';
    sigCtx.strokeStyle = '#eeeaf8';
    sigCtx.lineWidth   = 2.5;
    sigCtx.lineCap     = 'round';
    sigCtx.lineJoin    = 'round';
  }
  resizeSigPad();

  const getPos = (e, canvas) => {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - r.left) * (canvas.width / r.width), y: (src.clientY - r.top) * (canvas.height / r.height) };
  };

  sigPad.addEventListener('mousedown', e => {
    sigDrawing = true;
    const p = getPos(e, sigPad);
    sigCtx.beginPath(); sigCtx.moveTo(p.x, p.y);
  });
  sigPad.addEventListener('mousemove', e => {
    if (!sigDrawing) return;
    const p = getPos(e, sigPad);
    sigCtx.lineTo(p.x, p.y); sigCtx.stroke();
  });
  sigPad.addEventListener('mouseup',    () => { sigDrawing = false; });
  sigPad.addEventListener('mouseleave', () => { sigDrawing = false; });
  sigPad.addEventListener('touchstart', e => { e.preventDefault(); sigDrawing = true; const p = getPos(e, sigPad); sigCtx.beginPath(); sigCtx.moveTo(p.x, p.y); }, { passive: false });
  sigPad.addEventListener('touchmove',  e => { e.preventDefault(); if (!sigDrawing) return; const p = getPos(e, sigPad); sigCtx.lineTo(p.x, p.y); sigCtx.stroke(); }, { passive: false });
  sigPad.addEventListener('touchend',   () => { sigDrawing = false; });

  window.clearSigPad = () => { sigCtx.clearRect(0, 0, sigPad.width, sigPad.height); sigDataURL = null; };

  window.useSigDraw = () => {
    sigDataURL = sigPad.toDataURL('image/png');
    showToast('✅ Signature captured! Now load your PDF.');
    if (pdfJsDoc) showPlaceSection();
  };

  window.updateTypedSig = () => {
    const txt  = document.getElementById('sigTypeText').value || 'Signature';
    const font = document.getElementById('sigTypeFont').value;
    const prev = document.getElementById('sigTypePreview');
    if (prev) { prev.textContent = txt; prev.style.fontFamily = font; }
  };

  window.useSigType = () => {
    const txt  = document.getElementById('sigTypeText').value || 'Signature';
    const font = document.getElementById('sigTypeFont').value;
    const tc   = document.createElement('canvas');
    tc.width = 400; tc.height = 120;
    const ctx  = tc.getContext('2d');
    ctx.font   = `72px ${font}`;
    ctx.fillStyle = '#1a1a1a';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, 10, 60);
    sigDataURL = tc.toDataURL('image/png');
    showToast('✅ Signature ready! Now load your PDF.');
    if (pdfJsDoc) showPlaceSection();
  };

  window.handleSigUpload = (files) => {
    if (!files || !files[0]) return;
    const reader = new FileReader();
    reader.onload = e => {
      sigDataURL = e.target.result;
      showToast('✅ Signature image loaded! Now load your PDF.');
      if (pdfJsDoc) showPlaceSection();
    };
    reader.readAsDataURL(files[0]);
  };

  window.switchSigTab = (tab) => {
    document.querySelectorAll('.tab-btn').forEach((b,i) => {
      const tabs = ['draw','type','upload'];
      b.classList.toggle('active', tabs[i] === tab);
    });
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    const pane = document.getElementById('tab-' + tab);
    if (pane) pane.classList.add('active');
  };

  // ── PDF LOADING ───────────────────────────────────────────────────────
  window.onFilesLoaded_sign = async () => {
    const file = STATE.sign?.files?.[0];
    if (!file) return;
    pdfBytes = await file.arrayBuffer();
    const loadTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
    pdfJsDoc = await loadTask.promise;

    // populate page selector
    const sel = document.getElementById('sigPageSelect');
    if (sel) {
      sel.innerHTML = '';
      for (let i = 1; i <= pdfJsDoc.numPages; i++) {
        sel.innerHTML += `<option value="${i}">Page ${i}</option>`;
      }
    }

    if (sigDataURL) showPlaceSection();
    else {
      showToast('📄 PDF loaded! Now create your signature above.');
      document.getElementById('placeSection').style.display = '';
    }
    document.getElementById('applySignBtn').disabled = !sigDataURL;
  };

  function showPlaceSection() {
    const sec = document.getElementById('placeSection');
    if (sec) sec.style.display = '';
    document.getElementById('applySignBtn').disabled = false;

    WLP.buildViewer('signViewerWrap', pdfJsDoc, {
      overlayMode: true,
      onPageRender: (pageNum, canvas) => {
        OVERLAY.clearAll();
        if (sigDataURL) addSigOverlay();
      }
    });
    setTimeout(addSigOverlay, 500);
  }

  function addSigOverlay() {
    if (!sigDataURL) return;
    OVERLAY.clearAll();
    OVERLAY.addItem({
      type: 'signature',
      content: `<img src="${sigDataURL}" style="width:100%;height:100%;object-fit:contain;display:block;pointer-events:none;border-radius:3px">`,
      x: 40, y: 40, w: 180, h: 70,
      canDelete: false,
      style: 'background:rgba(255,255,255,0.04);'
    });
  }

  // ── APPLY SIGNATURE ───────────────────────────────────────────────────
  window.applySignature = async () => {
    if (!sigDataURL || !pdfBytes) {
      showToast('⚠️ Please create a signature and load a PDF first.', 'warn'); return;
    }

    const btn = document.getElementById('applySignBtn');
    btn.disabled = true; btn.textContent = '⏳ Processing…';
    showProg('sign', 10, 'Loading PDF…');

    try {
      const pdfDoc    = await PDFLib.PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const pages     = pdfDoc.getPages();
      const canvas    = WLP.getCanvas();
      const allPages  = document.getElementById('sigAllPages')?.checked;
      const selPage   = parseInt(document.getElementById('sigPageSelect')?.value || '1');

      // Get signature image bytes
      const sigResp   = await fetch(sigDataURL);
      const sigBytes  = await sigResp.arrayBuffer();
      const sigImg    = sigDataURL.includes('png')
        ? await pdfDoc.embedPng(sigBytes)
        : await pdfDoc.embedJpg(sigBytes);

      showProg('sign', 40, 'Embedding signature…');

      // Get scale factors from overlay
      const items = OVERLAY.items;
      if (!items.length) { showToast('⚠️ No signature placed on page.', 'warn'); return; }

      const item  = items[0];
      const dW    = canvas.offsetWidth;
      const dH    = canvas.offsetHeight;

      const targetPages = allPages ? pages : [pages[selPage - 1]];

      targetPages.forEach((page, idx) => {
        showProg('sign', 40 + Math.round((idx / targetPages.length) * 50), `Signing page ${idx+1}…`);
        const { width: pW, height: pH } = page.getSize();
        const scaleX = pW / dW;
        const scaleY = pH / dH;

        const sigW = item.el.offsetWidth  * scaleX;
        const sigH = item.el.offsetHeight * scaleY;
        const sigX = item.x * scaleX;
        const sigY = pH - (item.y * scaleY) - sigH;

        page.drawImage(sigImg, { x: sigX, y: sigY, width: sigW, height: sigH });
      });

      showProg('sign', 95, 'Saving PDF…');
      const outBytes = await pdfDoc.save();
      const fname    = (STATE.sign.files[0].name.replace('.pdf','') || 'document') + '_signed.pdf';
      downloadBytes(outBytes, fname);
      logHistory('Sign PDF', '✍️', STATE.sign.files, outBytes.length);

      showProg('sign', 100, 'Done!');
      setTimeout(() => hideProg('sign'), 500);
      showRes('sign', `Signature applied to ${targetPages.length} page(s). Downloading now!`,
        `<a href="#" class="btn btn-gold" onclick="applySignature();return false">⬇ Download Again</a>
         <button class="btn btn-ghost" onclick="resetSignTool()">↺ Sign Another</button>`);

    } catch(err) {
      hideProg('sign');
      showToast('❌ Error: ' + err.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = '✍️ Apply Signature & Download';
    }
  };

  window.resetSignTool = () => {
    STATE.sign = {};
    pdfBytes   = null;
    pdfJsDoc   = null;
    document.getElementById('placeSection').style.display = 'none';
    document.getElementById('fl-sign').innerHTML = '';
    hideRes('sign'); hideProg('sign');
    clearSigPad();
  };

  // Toast helper
  function showToast(msg, type) {
    const existing = document.getElementById('wlpToast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.id = 'wlpToast';
    t.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
      background:${type==='warn'?'rgba(240,180,41,0.95)':type==='error'?'rgba(248,113,113,0.95)':'rgba(34,211,184,0.95)'};
      color:#000;font-weight:600;font-size:0.88rem;padding:10px 22px;border-radius:50px;
      z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.4);animation:fadeUp 0.25s ease both;
      max-width:90vw;text-align:center`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { if (t.parentNode) t.remove(); }, 3200);
  }

  // init typed sig preview
  window.updateTypedSig();
};
