// ── CREATE BLANK PDF ──────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Generates a brand-new PDF with the number of pages, size and background colour you choose. No upload needed.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Page Settings</div>
      <div class="ctrl-row">
        <label>Page size</label>
        <select class="inp" id="blankSize" style="width:auto" onchange="updateBlankPreview()">
          <option value="a4" selected>A4 (210 × 297 mm)</option>
          <option value="a3">A3 (297 × 420 mm)</option>
          <option value="a5">A5 (148 × 210 mm)</option>
          <option value="letter">Letter (8.5 × 11 in)</option>
          <option value="legal">Legal (8.5 × 14 in)</option>
          <option value="custom">Custom…</option>
        </select>
        <select class="inp" id="blankOrient" style="width:auto" onchange="updateBlankPreview()">
          <option value="portrait" selected>Portrait</option>
          <option value="landscape">Landscape</option>
        </select>
      </div>
      <div id="blankCustomWrap" style="display:none">
        <div class="ctrl-row">
          <label>Width</label>
          <input class="inp" type="number" id="blankW" value="595" min="10" style="width:90px">
          <label style="min-width:auto">Height</label>
          <input class="inp" type="number" id="blankH" value="842" min="10" style="width:90px">
          <select class="inp" id="blankUnit" style="width:auto">
            <option value="pt" selected>pt</option>
            <option value="mm">mm</option>
            <option value="in">in</option>
          </select>
        </div>
      </div>
      <div class="ctrl-row">
        <label>Number of pages</label>
        <input class="inp" type="number" id="blankPages" value="1" min="1" max="200" style="width:90px">
      </div>
      <div class="ctrl-row">
        <label>Background</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-gold btn-sm blank-bg-btn" data-bg="white" onclick="setBlankBg('white',this)" style="background:#fff;color:#222;border-color:#ccc">⬜ White</button>
          <button class="btn btn-ghost btn-sm blank-bg-btn" data-bg="cream" onclick="setBlankBg('cream',this)" style="background:#fdf6e3;color:#222;border-color:#e8d9b5">🟡 Cream</button>
          <button class="btn btn-ghost btn-sm blank-bg-btn" data-bg="gray"  onclick="setBlankBg('gray',this)"  style="background:#f0f0f0;color:#222;border-color:#ccc">⬛ Light Gray</button>
          <button class="btn btn-ghost btn-sm blank-bg-btn" data-bg="dark"  onclick="setBlankBg('dark',this)"  style="background:#1a1a2e;color:#fff;border-color:#333">🌑 Dark</button>
        </div>
      </div>
      <div class="ctrl-row">
        <label>Add grid lines</label>
        <select class="inp" id="blankGrid" style="width:auto">
          <option value="none" selected>None (plain)</option>
          <option value="lines">Ruled lines</option>
          <option value="grid">Grid squares</option>
          <option value="dots">Dot grid</option>
        </select>
      </div>
      <div class="ctrl-row">
        <label>Filename</label>
        <input class="inp" id="blankFilename" value="blank" placeholder="Output filename" style="flex:1">
      </div>
    </div>

    <!-- Live preview -->
    <div class="ctrl-group" style="margin-bottom:14px">
      <div class="ctrl-group-title">Preview</div>
      <div style="display:flex;align-items:center;justify-content:center;padding:20px;background:var(--ink)">
        <canvas id="blankPreviewCanvas" style="max-width:200px;max-height:280px;box-shadow:0 6px 28px rgba(0,0,0,.5);border-radius:3px"></canvas>
      </div>
      <div style="font-size:0.76rem;color:var(--txt3);text-align:center;margin-top:6px" id="blankSizeLabel"></div>
    </div>

    ${progHTML('blank')}
    ${resHTML('blank')}
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-gold btn-lg" onclick="doCreateBlank()">➕ Create PDF & Download</button>
    </div>`;

  const SIZES = { a4:[595.28,841.89], a3:[841.89,1190.55], a5:[419.53,595.28], letter:[612,792], legal:[612,1008] };
  const PT    = { pt:1, mm:2.8346, in:72 };
  const BG    = { white:[1,1,1], cream:[0.992,0.965,0.89], gray:[0.941,0.941,0.941], dark:[0.102,0.102,0.18] };
  let   blankBg = 'white';

  window.setBlankBg = (bg, btn) => {
    blankBg = bg;
    document.querySelectorAll('.blank-bg-btn').forEach(b => b.style.outline='');
    btn.style.outline = '2px solid var(--gold)';
    drawPreview();
  };

  document.getElementById('blankSize').addEventListener('change', () => {
    document.getElementById('blankCustomWrap').style.display =
      document.getElementById('blankSize').value==='custom' ? '' : 'none';
    updateBlankPreview();
  });

  function getTargetPt() {
    const s = document.getElementById('blankSize').value;
    let w, h;
    if (s==='custom') {
      const unit = document.getElementById('blankUnit').value;
      const m    = PT[unit]||1;
      w = parseFloat(document.getElementById('blankW').value||595)*m;
      h = parseFloat(document.getElementById('blankH').value||842)*m;
    } else {
      [w,h] = SIZES[s]||[595.28,841.89];
    }
    const o = document.getElementById('blankOrient').value;
    return o==='landscape' ? [Math.max(w,h),Math.min(w,h)] : [Math.min(w,h),Math.max(w,h)];
  }

  function drawPreview() {
    const [w,h] = getTargetPt();
    const canvas = document.getElementById('blankPreviewCanvas');
    const maxW   = 180, maxH = 260;
    const scale  = Math.min(maxW/w, maxH/h);
    canvas.width  = w*scale; canvas.height = h*scale;
    const ctx    = canvas.getContext('2d');
    const [r,g,b] = BG[blankBg] || [1,1,1];
    ctx.fillStyle = `rgb(${r*255},${g*255},${b*255})`;
    ctx.fillRect(0,0,canvas.width,canvas.height);

    const grid = document.getElementById('blankGrid').value;
    const lineColor = blankBg==='dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
    ctx.strokeStyle = lineColor;
    ctx.lineWidth   = 0.5;

    if (grid==='lines') {
      const gap = 18*scale;
      for (let y=gap; y<canvas.height; y+=gap) {
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
      }
    } else if (grid==='grid') {
      const gap = 18*scale;
      for (let y=gap; y<canvas.height; y+=gap) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }
      for (let x=gap; x<canvas.width;  x+=gap) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
    } else if (grid==='dots') {
      const gap = 18*scale;
      ctx.fillStyle = lineColor;
      for (let y=gap; y<canvas.height; y+=gap) {
        for (let x=gap; x<canvas.width; x+=gap) {
          ctx.beginPath(); ctx.arc(x,y,1,0,Math.PI*2); ctx.fill();
        }
      }
    }
    document.getElementById('blankSizeLabel').textContent = `${w.toFixed(0)} × ${h.toFixed(0)} pt`;
  }

  window.updateBlankPreview = drawPreview;
  setTimeout(drawPreview, 50);

  ['blankGrid','blankOrient'].forEach(id => document.getElementById(id)?.addEventListener('change', drawPreview));

  window.doCreateBlank = async () => {
    const numPages  = Math.min(200, Math.max(1, parseInt(document.getElementById('blankPages').value)||1));
    const [w,h]     = getTargetPt();
    const [r,g,b]   = BG[blankBg] || [1,1,1];
    const gridMode  = document.getElementById('blankGrid').value;
    const fname     = (document.getElementById('blankFilename').value.trim() || 'blank') + '.pdf';

    showProg('blank', 10, 'Creating PDF…');
    try {
      const doc = await PDFLib.PDFDocument.create();
      for (let i=0; i<numPages; i++) {
        showProg('blank', 10 + Math.round((i/numPages)*85), `Creating page ${i+1}…`);
        const page = doc.addPage([w,h]);
        page.drawRectangle({ x:0, y:0, width:w, height:h, color: PDFLib.rgb(r,g,b) });

        const lc = blankBg==='dark' ? PDFLib.rgb(1,1,1) : PDFLib.rgb(0,0,0);
        const lo = blankBg==='dark' ? 0.1 : 0.08;

        if (gridMode==='lines') {
          for (let y=18; y<h; y+=18) page.drawLine({ start:{x:0,y}, end:{x:w,y}, thickness:0.4, color:lc, opacity:lo });
        } else if (gridMode==='grid') {
          for (let y=18; y<h; y+=18) page.drawLine({ start:{x:0,y}, end:{x:w,y}, thickness:0.3, color:lc, opacity:lo });
          for (let x=18; x<w; x+=18) page.drawLine({ start:{x,y:0}, end:{x,y:h}, thickness:0.3, color:lc, opacity:lo });
        } else if (gridMode==='dots') {
          for (let y=18; y<h; y+=18)
            for (let x=18; x<w; x+=18)
              page.drawCircle({ x, y, size:0.8, color:lc, opacity:lo*2 });
        }
      }

      showProg('blank', 97, 'Saving…');
      const out = await doc.save();
      downloadBytes(out, fname);
      logHistory('Create Blank PDF', '➕', [], out.length);
      showProg('blank', 100); setTimeout(() => hideProg('blank'), 500);
      showRes('blank', `${numPages}-page blank PDF created (${fmtSz(out.length)}).`,
        `<button class="btn btn-gold" onclick="doCreateBlank()">⬇ Download Again</button>`);
    } catch(e) { hideProg('blank'); alert('Error: ' + e.message); }
  };
};
