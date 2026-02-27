// ── HTML → PDF ────────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Paste HTML, preview it live, then use <strong>Ctrl+P → Save as PDF</strong> in the preview window. Uses the browser's built-in print engine for accurate rendering.</div>

    <div class="ctrl-group">
      <div class="ctrl-group-title">HTML Input</div>
      <div class="tabs">
        <button class="tab-btn active" onclick="h2pTab('code',this)">📝 Paste HTML</button>
        <button class="tab-btn" onclick="h2pTab('upload',this)">📄 Upload .html File</button>
        <button class="tab-btn" onclick="h2pTab('template',this)">🎨 Templates</button>
      </div>
      <!-- Code tab -->
      <div id="h2p-tab-code">
        <textarea class="code-area" id="h2pCode" style="min-height:200px;font-family:monospace;font-size:0.82rem">&lt;!DOCTYPE html&gt;
&lt;html&gt;
&lt;head&gt;
  &lt;meta charset="UTF-8"&gt;
  &lt;style&gt;
    body { font-family: Arial, sans-serif; padding: 40px; color: #222; }
    h1   { color: #1a1a2e; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; }
    p    { line-height: 1.7; }
  &lt;/style&gt;
&lt;/head&gt;
&lt;body&gt;
  &lt;h1&gt;My Document&lt;/h1&gt;
  &lt;p&gt;Start editing this HTML to create your PDF content.&lt;/p&gt;
&lt;/body&gt;
&lt;/html&gt;</textarea>
      </div>
      <!-- Upload tab -->
      <div id="h2p-tab-upload" style="display:none">
        ${dz('html2pdf', false, '.html,.htm,text/html', 'Drop HTML file here')}
        <div class="file-list" id="fl-html2pdf"></div>
      </div>
      <!-- Templates tab -->
      <div id="h2p-tab-template" style="display:none">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-top:8px">
          ${[
            { name:'Simple Letter',    icon:'✉️', id:'letter'   },
            { name:'Invoice',          icon:'🧾', id:'invoice'  },
            { name:'Resume / CV',      icon:'📋', id:'resume'   },
            { name:'Report Cover',     icon:'📊', id:'report'   },
            { name:'Table of Data',    icon:'📈', id:'table'    },
          ].map(t=>`
            <button class="btn btn-ghost" style="padding:16px 12px;text-align:left;height:auto;display:flex;flex-direction:column;gap:6px" onclick="loadH2PTemplate('${t.id}')">
              <span style="font-size:1.4rem">${t.icon}</span>
              <span style="font-weight:600;font-size:0.84rem">${t.name}</span>
            </button>`).join('')}
        </div>
      </div>
    </div>

    <div class="ctrl-group">
      <div class="ctrl-group-title">Page Setup (for print)</div>
      <div class="ctrl-row">
        <label>Page size</label>
        <select class="inp" id="h2pSize" style="width:auto">
          <option value="A4" selected>A4</option>
          <option value="Letter">Letter</option>
          <option value="A3">A3</option>
          <option value="Legal">Legal</option>
        </select>
        <select class="inp" id="h2pOrient" style="width:auto">
          <option value="portrait" selected>Portrait</option>
          <option value="landscape">Landscape</option>
        </select>
      </div>
    </div>

    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-gold btn-lg" onclick="h2pPreview()">👁 Preview & Print to PDF</button>
      <button class="btn btn-ghost btn-sm" onclick="h2pReset()">↺ Reset</button>
    </div>

    <div class="warn-box" style="margin-top:14px">
      <strong>How to save as PDF:</strong> Click "Preview & Print to PDF" → a new window opens → press <kbd style="background:var(--ink3);border:1px solid var(--border2);padding:2px 6px;border-radius:4px;font-size:0.8rem">Ctrl+P</kbd> (or <kbd style="background:var(--ink3);border:1px solid var(--border2);padding:2px 6px;border-radius:4px;font-size:0.8rem">⌘+P</kbd> on Mac) → choose <strong>"Save as PDF"</strong> as the printer.
    </div>`;

  window.h2pTab = (tab, btn) => {
    ['code','upload','template'].forEach(t => {
      document.getElementById(`h2p-tab-${t}`).style.display = t===tab ? '' : 'none';
    });
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  };

  window.onFilesLoaded_html2pdf = async () => {
    const file = STATE.html2pdf?.files?.[0]; if (!file) return;
    const text = await file.text();
    document.getElementById('h2pCode').value = text;
    h2pTab('code', document.querySelector('.tab-btn'));
  };

  const TEMPLATES = {
    letter: `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{font-family:'Georgia',serif;padding:60px;color:#222;max-width:700px;margin:0 auto}
.header{margin-bottom:40px}.date{color:#666;margin-bottom:30px}
h2{font-size:1rem;font-weight:400;margin-bottom:20px}p{line-height:1.8;margin-bottom:16px}
.sign{margin-top:50px}</style></head><body>
<div class="header"><strong>Your Name</strong><br>Your Address<br>City, State</div>
<div class="date">${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</div>
<h2>To Whom It May Concern,</h2>
<p>I am writing to express my sincere interest in...</p>
<p>Please find enclosed the relevant documents for your consideration.</p>
<p>I look forward to hearing from you at your earliest convenience.</p>
<div class="sign"><p>Yours sincerely,</p><br><p><strong>Your Name</strong></p></div>
</body></html>`,

    invoice: `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;padding:40px;color:#222}
.top{display:flex;justify-content:space-between;margin-bottom:40px}
h1{color:#1a1a2e;font-size:2rem;margin:0}.inv-num{color:#888;font-size:0.9rem}
table{width:100%;border-collapse:collapse;margin:24px 0}
th{background:#1a1a2e;color:#fff;padding:10px 12px;text-align:left;font-size:0.85rem}
td{padding:10px 12px;border-bottom:1px solid #eee;font-size:0.9rem}
.total-row td{font-weight:bold;font-size:1rem;border-top:2px solid #1a1a2e}
</style></head><body>
<div class="top"><div><h1>INVOICE</h1><div class="inv-num">INV-001 &nbsp;·&nbsp; ${new Date().toLocaleDateString()}</div></div>
<div style="text-align:right"><strong>Your Company</strong><br>email@company.com</div></div>
<strong>Bill To:</strong><p>Client Name<br>Client Address</p>
<table><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
<tbody>
<tr><td>Service Item One</td><td>1</td><td>₹5,000</td><td>₹5,000</td></tr>
<tr><td>Service Item Two</td><td>2</td><td>₹2,500</td><td>₹5,000</td></tr>
<tr class="total-row"><td colspan="3" style="text-align:right">Total</td><td>₹10,000</td></tr>
</tbody></table>
<p style="color:#888;font-size:0.82rem">Payment due within 30 days. Thank you for your business!</p>
</body></html>`,

    resume: `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;padding:40px 50px;color:#222;max-width:750px;margin:0 auto}
h1{font-size:2rem;margin:0;color:#1a1a2e}
.subtitle{color:#555;margin-bottom:20px;font-size:0.95rem}
h2{font-size:0.95rem;text-transform:uppercase;letter-spacing:0.12em;color:#1a1a2e;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:24px}
.job{margin-bottom:14px}.job-title{font-weight:700}.job-co{color:#555;font-size:0.88rem}
ul{margin:6px 0;padding-left:18px}li{margin-bottom:4px;font-size:0.9rem;line-height:1.5}
</style></head><body>
<h1>Your Full Name</h1>
<div class="subtitle">📍 City, State &nbsp;·&nbsp; 📧 email@example.com &nbsp;·&nbsp; 🔗 linkedin.com/in/yourname</div>
<h2>Experience</h2>
<div class="job"><div class="job-title">Senior Role Title</div>
<div class="job-co">Company Name &nbsp;·&nbsp; 2021–Present</div>
<ul><li>Led initiatives that improved efficiency by 30%</li><li>Managed a team of 8 across two projects</li></ul></div>
<h2>Education</h2>
<div class="job"><div class="job-title">B.Tech / B.E. / MBA</div>
<div class="job-co">University Name &nbsp;·&nbsp; 2017–2021</div></div>
<h2>Skills</h2>
<p>JavaScript · Python · React · Node.js · SQL · Communication · Leadership</p>
</body></html>`,

    report: `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;padding:0;margin:0;color:#222}
.cover{background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px}
h1{font-size:2.8rem;margin-bottom:12px;font-weight:900}
.sub{font-size:1.1rem;opacity:0.7;margin-bottom:40px}
.meta{font-size:0.88rem;opacity:0.5}
</style></head><body>
<div class="cover">
  <div style="font-size:3rem;margin-bottom:20px">📊</div>
  <h1>Quarterly Report</h1>
  <div class="sub">Q4 2024 · Business Performance Overview</div>
  <div class="meta">Prepared by: Your Name &nbsp;·&nbsp; ${new Date().toLocaleDateString()}</div>
</div>
</body></html>`,

    table: `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;padding:40px;color:#222}
h1{color:#1a1a2e;margin-bottom:6px}p{color:#666;font-size:0.9rem;margin-bottom:20px}
table{width:100%;border-collapse:collapse}
th{background:#1a1a2e;color:#fff;padding:10px 14px;text-align:left;font-size:0.85rem;font-weight:600}
tr:nth-child(even) td{background:#f8f8f8}
td{padding:9px 14px;border-bottom:1px solid #eee;font-size:0.88rem}
</style></head><body>
<h1>Data Report</h1><p>Generated on ${new Date().toLocaleDateString()}</p>
<table><thead><tr><th>#</th><th>Name</th><th>Category</th><th>Value</th><th>Status</th></tr></thead>
<tbody>
${Array.from({length:10},(_,i)=>`<tr><td>${i+1}</td><td>Item ${i+1}</td><td>Category ${(i%3)+1}</td><td>₹${((i+1)*1500).toLocaleString()}</td><td style="color:${i%2?'#16a34a':'#dc2626'}">${i%2?'Active':'Pending'}</td></tr>`).join('')}
</tbody></table>
</body></html>`,
  };

  window.loadH2PTemplate = (id) => {
    const t = TEMPLATES[id]; if (!t) return;
    document.getElementById('h2pCode').value = t;
    h2pTab('code', document.querySelector('.tab-btn'));
  };

  window.h2pPreview = () => {
    const code   = document.getElementById('h2pCode').value.trim();
    if (!code)   { alert('Paste some HTML first.'); return; }
    const size   = document.getElementById('h2pSize').value;
    const orient = document.getElementById('h2pOrient').value;
    const css    = `<style>@page{size:${size} ${orient};margin:0}</style>`;
    const win    = window.open('', '_blank');
    if (!win)    { alert('Pop-up blocked! Allow pop-ups for this site.'); return; }
    // inject print style
    const injected = code.includes('</head>')
      ? code.replace('</head>', css + '</head>')
      : css + code;
    win.document.write(injected);
    win.document.close();
    setTimeout(() => win.print(), 600);
    logHistory('HTML → PDF', '🌐', [], 0);
  };

  window.h2pReset = () => {
    document.getElementById('h2pCode').value = '';
  };
};
