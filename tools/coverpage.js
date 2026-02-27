// ── ADD COVER PAGE ────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Generates a styled cover page and prepends it to your PDF. Choose a theme, fill in the title and details, preview live, then download.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF (to prepend cover to)</div>
      ${dz('coverpage', false, '.pdf,application/pdf', 'Drop PDF here')}
      <div class="file-list" id="fl-coverpage"></div>
    </div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Cover Content</div>
      <div class="ctrl-row">
        <label>Title</label>
        <input class="inp" id="cvTitle" value="Document Title" style="flex:1" oninput="updateCoverPreview()">
      </div>
      <div class="ctrl-row">
        <label>Subtitle</label>
        <input class="inp" id="cvSubtitle" placeholder="Optional subtitle" style="flex:1" oninput="updateCoverPreview()">
      </div>
      <div class="ctrl-row">
        <label>Author</label>
        <input class="inp" id="cvAuthor" placeholder="Author name" style="flex:1" oninput="updateCoverPreview()">
      </div>
      <div class="ctrl-row">
        <label>Date</label>
        <input class="inp" id="cvDate" style="flex:1" oninput="updateCoverPreview()">
      </div>
      <div class="ctrl-row">
        <label>Tagline</label>
        <input class="inp" id="cvTagline" placeholder="Optional tagline or department" style="flex:1" oninput="updateCoverPreview()">
      </div>
    </div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Theme</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;margin-bottom:14px" id="cvThemeGrid"></div>
    </div>
    <!-- Live preview -->
    <div class="ctrl-group" style="margin-bottom:14px">
      <div class="ctrl-group-title">Live Preview</div>
      <div style="display:flex;align-items:center;justify-content:center;padding:20px;background:var(--ink)">
        <canvas id="coverPreview" style="max-width:220px;max-height:310px;box-shadow:0 8px 32px rgba(0,0,0,.6);border-radius:4px"></canvas>
      </div>
    </div>
    ${progHTML('coverpage')}
    ${resHTML('coverpage')}
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-gold btn-lg" id="coverBtn" onclick="doCoverPage()">🎨 Add Cover & Download</button>
      <button class="btn btn-ghost btn-sm" onclick="resetCover()">↺ Reset</button>
    </div>`;

  // Set default date
  document.getElementById('cvDate').value = new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});

  const THEMES = [
    { id:'navy',    name:'Navy',    bg1:'#0f172a', bg2:'#1e3a5f', accent:'#60a5fa', text:'#ffffff' },
    { id:'violet',  name:'Violet',  bg1:'#1a0533', bg2:'#4c1d95', accent:'#c084fc', text:'#ffffff' },
    { id:'teal',    name:'Teal',    bg1:'#042f2e', bg2:'#0d5c56', accent:'#2dd4bf', text:'#ffffff' },
    { id:'crimson', name:'Crimson', bg1:'#450a0a', bg2:'#991b1b', accent:'#fca5a5', text:'#ffffff' },
    { id:'slate',   name:'Slate',   bg1:'#0f172a', bg2:'#334155', accent:'#94a3b8', text:'#ffffff' },
    { id:'gold',    name:'Gold',    bg1:'#1c1400', bg2:'#78350f', accent:'#fbbf24', text:'#ffffff' },
    { id:'white',   name:'Clean',   bg1:'#f8fafc', bg2:'#e2e8f0', accent:'#1e293b', text:'#0f172a' },
    { id:'dark',    name:'Dark',    bg1:'#030712', bg2:'#111827', accent:'#6366f1', text:'#f9fafb' },
  ];

  let activeTheme = THEMES[0];

  // Build theme grid
  const grid = document.getElementById('cvThemeGrid');
  THEMES.forEach(t => {
    const btn = document.createElement('div');
    btn.style.cssText = `background:linear-gradient(135deg,${t.bg1},${t.bg2});border-radius:var(--r);padding:10px;cursor:pointer;border:2px solid transparent;transition:all 0.18s;text-align:center`;
    btn.innerHTML = `<div style="font-size:0.75rem;font-weight:700;color:${t.text}">${t.name}</div>
      <div style="width:20px;height:3px;background:${t.accent};border-radius:2px;margin:4px auto 0"></div>`;
    btn.onclick = () => {
      document.querySelectorAll('#cvThemeGrid > div').forEach(b => b.style.borderColor='transparent');
      btn.style.borderColor = 'var(--gold)';
      activeTheme = t; updateCoverPreview();
    };
    if (t.id === activeTheme.id) btn.style.borderColor = 'var(--gold)';
    grid.appendChild(btn);
  });

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16)/255;
    const g = parseInt(hex.slice(3,5),16)/255;
    const b = parseInt(hex.slice(5,7),16)/255;
    return [r,g,b];
  }

  window.updateCoverPreview = () => {
    const canvas = document.getElementById('coverPreview');
    const W = 210, H = 297; // A4 proportions in preview units
    const scale = 1;
    canvas.width  = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext('2d');
    const t   = activeTheme;

    // Background gradient
    const grad = ctx.createLinearGradient(0,0,W,H);
    grad.addColorStop(0, t.bg1); grad.addColorStop(1, t.bg2);
    ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);

    // Decorative bar at top
    const [ar,ag,ab] = hexToRgb(t.accent);
    ctx.fillStyle = t.accent; ctx.fillRect(0,0,W,6);

    // Accent side bar
    ctx.fillStyle = `rgba(${ar*255},${ag*255},${ab*255},0.15)`;
    ctx.fillRect(0,0,4,H);

    // Title
    ctx.fillStyle = t.text;
    ctx.font = 'bold 18px Barlow,Arial';
    const title = document.getElementById('cvTitle').value || 'Document Title';
    wrapText(ctx, title, 20, 80, W-40, 22);

    // Accent line under title
    ctx.fillStyle = t.accent; ctx.fillRect(20,110,50,2);

    // Subtitle
    const sub = document.getElementById('cvSubtitle').value;
    if (sub) { ctx.fillStyle=`rgba(${ar*255>200?'0,0,0':'255,255,255'},0.7)`; ctx.font='11px Arial'; ctx.fillText(sub,20,128,W-40); }

    // Bottom section
    ctx.fillStyle = `rgba(0,0,0,0.25)`; ctx.fillRect(0,H-55,W,55);
    ctx.fillStyle = t.text; ctx.font = 'bold 10px Arial';
    const author = document.getElementById('cvAuthor').value;
    const date   = document.getElementById('cvDate').value;
    const tag    = document.getElementById('cvTagline').value;
    if (author) ctx.fillText(author, 20, H-36, W-40);
    if (date)   { ctx.font='9px Arial'; ctx.fillStyle=t.accent; ctx.fillText(date, 20, H-20, W-40); }
    if (tag)    { ctx.font='9px Arial'; ctx.fillStyle=`rgba(255,255,255,0.5)`; ctx.fillText(tag, 20, H-8, W-40); }

    // Decorative circle
    ctx.beginPath(); ctx.arc(W-30, 50, 22, 0, Math.PI*2);
    ctx.fillStyle = `rgba(${ar*255},${ag*255},${ab*255},0.12)`; ctx.fill();
    ctx.beginPath(); ctx.arc(W-30, 50, 14, 0, Math.PI*2);
    ctx.fillStyle = `rgba(${ar*255},${ag*255},${ab*255},0.18)`; ctx.fill();
  };

  function wrapText(ctx, text, x, y, maxW, lineH) {
    const words = text.split(' ');
    let   line  = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, y); line = word; y += lineH;
      } else { line = test; }
    }
    ctx.fillText(line, x, y);
  }

  window.onFilesLoaded_coverpage = () => {
    document.getElementById('coverBtn').disabled = false;
  };

  window.doCoverPage = async () => {
    const file = STATE.coverpage?.files?.[0];
    const btn  = document.getElementById('coverBtn'); btn.disabled = true;
    showProg('coverpage', 5, 'Generating cover…');
    try {
      const t       = activeTheme;
      const newDoc  = await PDFLib.PDFDocument.create();
      const W = 595.28, H = 841.89; // A4

      const [bg1r,bg1g,bg1b] = hexToRgb(t.bg1);
      const [bg2r,bg2g,bg2b] = hexToRgb(t.bg2);
      const [acr,acg,acb]    = hexToRgb(t.accent);
      const [txr,txg,txb]    = hexToRgb(t.text);

      const coverPage = newDoc.addPage([W,H]);

      // Render cover via canvas and embed as image
      const canvas = document.createElement('canvas');
      canvas.width  = W * 2; canvas.height = H * 2; // 2x for quality
      const ctx = canvas.getContext('2d');
      const sc  = 2;

      const grad = ctx.createLinearGradient(0,0,W*sc,H*sc);
      grad.addColorStop(0, t.bg1); grad.addColorStop(1, t.bg2);
      ctx.fillStyle = grad; ctx.fillRect(0,0,W*sc,H*sc);

      ctx.fillStyle = t.accent; ctx.fillRect(0,0,W*sc,12*sc);
      ctx.fillStyle = `rgba(${acr*255},${acg*255},${acb*255},0.12)`;
      ctx.fillRect(0,0,8*sc,H*sc);

      ctx.fillStyle = t.text;
      const title = document.getElementById('cvTitle').value || 'Document Title';
      ctx.font = `bold ${36*sc}px Barlow,Arial`;
      wrapText(ctx, title, 60*sc, 200*sc, (W-120)*sc, 44*sc);

      ctx.fillStyle = t.accent; ctx.fillRect(60*sc,280*sc,100*sc,4*sc);

      const sub = document.getElementById('cvSubtitle').value;
      if (sub) {
        ctx.fillStyle = `rgba(${txr*255},${txg*255},${txb*255},0.7)`;
        ctx.font = `${22*sc}px Arial`;
        ctx.fillText(sub, 60*sc, 320*sc, (W-120)*sc);
      }

      // Bottom area
      ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(0,(H-140)*sc,W*sc,140*sc);
      ctx.fillStyle=t.text; ctx.font=`bold ${18*sc}px Arial`;
      const author=document.getElementById('cvAuthor').value;
      const date  =document.getElementById('cvDate').value;
      const tag   =document.getElementById('cvTagline').value;
      if (author) ctx.fillText(author,60*sc,(H-90)*sc,(W-120)*sc);
      if (date)   { ctx.fillStyle=t.accent; ctx.font=`${16*sc}px Arial`; ctx.fillText(date,60*sc,(H-56)*sc); }
      if (tag)    { ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font=`${14*sc}px Arial`; ctx.fillText(tag,60*sc,(H-24)*sc); }

      // Decorative circles
      ctx.beginPath(); ctx.arc((W-80)*sc,100*sc,60*sc,0,Math.PI*2);
      ctx.fillStyle=`rgba(${acr*255},${acg*255},${acb*255},0.1)`; ctx.fill();
      ctx.beginPath(); ctx.arc((W-80)*sc,100*sc,35*sc,0,Math.PI*2);
      ctx.fillStyle=`rgba(${acr*255},${acg*255},${acb*255},0.15)`; ctx.fill();

      const dataUrl  = canvas.toDataURL('image/jpeg',0.95);
      const imgBytes = await fetch(dataUrl).then(r=>r.arrayBuffer());
      const embedded = await newDoc.embedJpg(imgBytes);
      coverPage.drawImage(embedded, {x:0,y:0,width:W,height:H});

      showProg('coverpage', 50, 'Attaching PDF…');

      // Merge with original if uploaded
      if (file) {
        const ab  = await file.arrayBuffer();
        const src = await PDFLib.PDFDocument.load(ab, { ignoreEncryption:true });
        const copied = await newDoc.copyPages(src, src.getPageIndices());
        copied.forEach(p => newDoc.addPage(p));
      }

      showProg('coverpage', 92, 'Saving…');
      const out   = await newDoc.save();
      const base  = file ? file.name.replace('.pdf','') : 'document';
      downloadBytes(out, base + '_with_cover.pdf');
      logHistory('Add Cover Page', '🎨', file?[file]:[], out.length);
      showProg('coverpage', 100); setTimeout(() => hideProg('coverpage'), 500);
      showRes('coverpage',
        `Cover page added${file?' and merged with your PDF':' (standalone cover)'} (${fmtSz(out.length)}).`,
        `<button class="btn btn-gold" onclick="doCoverPage()">⬇ Download Again</button>
         <button class="btn btn-ghost" onclick="resetCover()">↺ Create Another</button>`);
    } catch(e) { hideProg('coverpage'); alert('Error: ' + e.message); }
    finally { btn.disabled = false; }
  };

  window.resetCover = () => {
    STATE.coverpage = {};
    document.getElementById('fl-coverpage').innerHTML='';
    document.getElementById('coverBtn').disabled=true;
    hideRes('coverpage'); hideProg('coverpage');
  };

  // Init preview
  setTimeout(updateCoverPreview, 80);
  ['cvTitle','cvSubtitle','cvAuthor','cvDate','cvTagline'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateCoverPreview);
  });
};
