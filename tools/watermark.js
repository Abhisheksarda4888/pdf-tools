// ── WATERMARK PDF ─────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Adds a diagonal text watermark across every page using PDF-lib. Fully customisable — text, size, colour, opacity and rotation.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF</div>
      ${dz('watermark', false, '.pdf,application/pdf', 'Drop PDF here')}
      <div class="file-list" id="fl-watermark"></div>
    </div>
    <div class="ctrl-group" id="wmOptions" style="display:none">
      <div class="ctrl-group-title">Watermark Settings</div>
      <div class="ctrl-row">
        <label>Watermark text</label>
        <input class="inp" id="wmText" value="CONFIDENTIAL" style="flex:1" oninput="updateWmPreview()">
      </div>
      <div class="ctrl-row">
        <label>Font size</label>
        <input type="range" class="inp" id="wmSize" min="20" max="120" value="60" style="width:140px" oninput="document.getElementById('wmSizeVal').textContent=this.value+'pt';updateWmPreview()">
        <span id="wmSizeVal" style="font-size:0.82rem;color:var(--gold);font-weight:700;min-width:40px">60pt</span>
      </div>
      <div class="ctrl-row">
        <label>Opacity</label>
        <input type="range" class="inp" id="wmOpacity" min="5" max="60" value="18" style="width:140px" oninput="document.getElementById('wmOpVal').textContent=this.value+'%';updateWmPreview()">
        <span id="wmOpVal" style="font-size:0.82rem;color:var(--gold);font-weight:700;min-width:36px">18%</span>
      </div>
      <div class="ctrl-row">
        <label>Rotation</label>
        <input type="range" class="inp" id="wmRotation" min="-90" max="90" value="45" style="width:140px" oninput="document.getElementById('wmRotVal').textContent=this.value+'°';updateWmPreview()">
        <span id="wmRotVal" style="font-size:0.82rem;color:var(--gold);font-weight:700;min-width:36px">45°</span>
      </div>
      <div class="ctrl-row">
        <label>Colour</label>
        <div style="display:flex;gap:7px;flex-wrap:wrap">
          <button class="btn btn-sm wm-col-btn btn-gold" data-c="gray"   onclick="setWmColor('gray',this)"  style="background:#888;border-color:#888;color:#fff">Gray</button>
          <button class="btn btn-sm wm-col-btn btn-ghost" data-c="red"    onclick="setWmColor('red',this)"   style="background:rgba(248,113,113,0.1);border-color:rgba(248,113,113,0.3);color:var(--rose)">Red</button>
          <button class="btn btn-sm wm-col-btn btn-ghost" data-c="blue"   onclick="setWmColor('blue',this)"  style="background:rgba(96,165,250,0.1);border-color:rgba(96,165,250,0.3);color:var(--blue)">Blue</button>
          <button class="btn btn-sm wm-col-btn btn-ghost" data-c="black"  onclick="setWmColor('black',this)" style="background:rgba(0,0,0,0.3);border-color:rgba(255,255,255,0.1);color:var(--txt)">Black</button>
        </div>
      </div>
      <div class="ctrl-row">
        <label>Position</label>
        <select class="inp" id="wmPosition" style="width:auto" onchange="updateWmPreview()">
          <option value="center" selected>Center (diagonal)</option>
          <option value="tile">Tiled (repeat)</option>
          <option value="top">Top only</option>
          <option value="bottom">Bottom only</option>
        </select>
      </div>
      <!-- Live preview -->
      <div style="margin-top:14px">
        <div style="font-size:0.68rem;color:var(--txt3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Preview</div>
        <div id="wmPreview" style="background:#fff;border-radius:var(--r);height:100px;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center">
          <div style="background:linear-gradient(135deg,#e8e8e8,#f5f5f5);width:100%;height:100%;display:flex;align-items:center;justify-content:center">
            <div style="width:70%;height:4px;background:#ddd;border-radius:2px;box-shadow:0 8px 0 #ddd,0 16px 0 #ddd,0 24px 0 #ddd;margin-top:-12px"></div>
          </div>
          <div id="wmPreviewText" style="position:absolute;font-family:'Barlow Condensed',sans-serif;font-weight:900;pointer-events:none;transform:rotate(45deg);white-space:nowrap"></div>
        </div>
      </div>
    </div>
    ${progHTML('watermark')}
    ${resHTML('watermark')}
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-gold btn-lg" id="wmBtn" onclick="doWatermark()" disabled>💧 Add Watermark & Download</button>
      <button class="btn btn-ghost btn-sm" onclick="resetWm()">↺ Reset</button>
    </div>`;

  const COLORS = { gray:'#888888', red:'#ef4444', blue:'#3b82f6', black:'#111111' };
  let wmColor = 'gray';

  window.setWmColor = (c, btn) => {
    wmColor = c;
    document.querySelectorAll('.wm-col-btn').forEach(b => b.style.outline = '');
    btn.style.outline = '2px solid var(--gold)';
    updateWmPreview();
  };

  window.updateWmPreview = () => {
    const el  = document.getElementById('wmPreviewText'); if (!el) return;
    const txt = document.getElementById('wmText')?.value || 'WATERMARK';
    const sz  = parseInt(document.getElementById('wmSize')?.value || 60) * 0.35;
    const op  = parseInt(document.getElementById('wmOpacity')?.value || 18) / 100;
    const rot = parseInt(document.getElementById('wmRotation')?.value || 45);
    const hex = COLORS[wmColor] || '#888888';
    el.textContent  = txt;
    el.style.fontSize   = sz + 'px';
    el.style.color      = hex;
    el.style.opacity    = op;
    el.style.transform  = `rotate(${rot}deg)`;
  };

  window.onFilesLoaded_watermark = () => {
    document.getElementById('wmOptions').style.display = '';
    document.getElementById('wmBtn').disabled = false;
    updateWmPreview();
  };

  window.doWatermark = async () => {
    const file = STATE.watermark?.files?.[0]; if (!file) return;
    const btn  = document.getElementById('wmBtn'); btn.disabled = true;
    showProg('watermark', 5, 'Loading…');
    try {
      const ab   = await file.arrayBuffer();
      const doc  = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
      const pages= doc.getPages();
      const txt  = document.getElementById('wmText').value || 'WATERMARK';
      const sz   = parseInt(document.getElementById('wmSize').value);
      const op   = parseInt(document.getElementById('wmOpacity').value) / 100;
      const rot  = parseInt(document.getElementById('wmRotation').value);
      const pos  = document.getElementById('wmPosition').value;
      const hex  = COLORS[wmColor] || '#888888';
      const r    = parseInt(hex.slice(1,3),16)/255;
      const g    = parseInt(hex.slice(3,5),16)/255;
      const b    = parseInt(hex.slice(5,7),16)/255;
      const color= PDFLib.rgb(r,g,b);
      const font = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);

      pages.forEach((page, idx) => {
        showProg('watermark', 10 + Math.round((idx/pages.length)*84), `Watermarking page ${idx+1}…`);
        const { width: pW, height: pH } = page.getSize();
        const drawOpts = { font, size: sz, color, opacity: op, rotate: PDFLib.degrees(rot) };

        if (pos === 'center') {
          const tw = font.widthOfTextAtSize(txt, sz);
          page.drawText(txt, { ...drawOpts, x: pW/2 - tw/2, y: pH/2 - sz/2 });
        } else if (pos === 'tile') {
          const tw = font.widthOfTextAtSize(txt, sz);
          const gapX = tw + 60, gapY = sz + 60;
          for (let y = 0; y < pH + gapY; y += gapY) {
            for (let x = -gapX; x < pW + gapX; x += gapX) {
              page.drawText(txt, { ...drawOpts, x, y });
            }
          }
        } else if (pos === 'top') {
          const tw = font.widthOfTextAtSize(txt, sz);
          page.drawText(txt, { ...drawOpts, rotate: PDFLib.degrees(0), x: pW/2 - tw/2, y: pH - sz - 20 });
        } else {
          const tw = font.widthOfTextAtSize(txt, sz);
          page.drawText(txt, { ...drawOpts, rotate: PDFLib.degrees(0), x: pW/2 - tw/2, y: 20 });
        }
      });

      showProg('watermark', 96, 'Saving…');
      const out   = await doc.save();
      const fname = file.name.replace('.pdf','') + '_watermarked.pdf';
      downloadBytes(out, fname);
      logHistory('Watermark PDF', '💧', [file], out.length);
      showProg('watermark', 100); setTimeout(() => hideProg('watermark'), 500);
      showRes('watermark', `Watermark added to ${pages.length} page${pages.length!==1?'s':''}.`,
        `<button class="btn btn-gold" onclick="doWatermark()">⬇ Download Again</button>
         <button class="btn btn-ghost" onclick="resetWm()">↺ Watermark Another</button>`);
    } catch(e) { hideProg('watermark'); alert('Error: ' + e.message); }
    finally { btn.disabled = false; }
  };

  window.resetWm = () => {
    STATE.watermark = {};
    document.getElementById('fl-watermark').innerHTML = '';
    document.getElementById('wmOptions').style.display = 'none';
    document.getElementById('wmBtn').disabled = true;
    hideRes('watermark'); hideProg('watermark');
  };

  // init preview
  setTimeout(updateWmPreview, 80);
};
