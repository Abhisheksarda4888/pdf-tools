// ── EDIT METADATA ─────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How it works:</strong> Reads the current document metadata and lets you edit it. Changes are written into the PDF using PDF-lib. Metadata is hidden inside the file and not visible on pages.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDF</div>
      ${dz('metadata', false, '.pdf,application/pdf', 'Drop PDF here')}
      <div class="file-list" id="fl-metadata"></div>
    </div>
    <div id="metaSection" style="display:none">
      <div class="ctrl-group">
        <div class="ctrl-group-title">Current Metadata <span style="font-size:0.72rem;color:var(--txt3);font-weight:400;text-transform:none;letter-spacing:0">(edit any field)</span></div>
        <div class="ctrl-row">
          <label>Title</label>
          <input class="inp" id="metaTitle" placeholder="Document title" style="flex:1">
        </div>
        <div class="ctrl-row">
          <label>Author</label>
          <input class="inp" id="metaAuthor" placeholder="Author name" style="flex:1">
        </div>
        <div class="ctrl-row">
          <label>Subject</label>
          <input class="inp" id="metaSubject" placeholder="Subject or description" style="flex:1">
        </div>
        <div class="ctrl-row">
          <label>Keywords</label>
          <input class="inp" id="metaKeywords" placeholder="keyword1, keyword2, keyword3" style="flex:1">
        </div>
        <div class="ctrl-row">
          <label>Creator</label>
          <input class="inp" id="metaCreator" placeholder="Application that created this" style="flex:1">
        </div>
        <div class="ctrl-row">
          <label>Producer</label>
          <input class="inp" id="metaProducer" placeholder="PDF producer" style="flex:1">
        </div>
      </div>
      <div class="ctrl-group" id="metaCurrentWrap" style="display:none">
        <div class="ctrl-group-title">Detected Existing Metadata</div>
        <div id="metaCurrentList" style="font-size:0.82rem;color:var(--txt2);line-height:1.8"></div>
      </div>
      <div class="ctrl-row" style="margin-top:4px">
        <label style="display:flex;align-items:center;gap:7px;cursor:pointer">
          <input type="checkbox" id="metaClearDates"> Clear creation & modification dates
        </label>
      </div>
      ${progHTML('metadata')}
      ${resHTML('metadata')}
      <div class="btn-row" style="margin-top:4px">
        <button class="btn btn-gold btn-lg" id="metaBtn" onclick="doMetadata()">🏷️ Save Metadata & Download</button>
        <button class="btn btn-ghost btn-sm" onclick="clearMetaFields()">🗑 Clear All Fields</button>
        <button class="btn btn-ghost btn-sm" onclick="resetMeta()">↺ Reset</button>
      </div>
    </div>`;

  window.onFilesLoaded_metadata = async () => {
    const file = STATE.metadata?.files?.[0]; if (!file) return;
    showProg('metadata', 20, 'Reading metadata…');
    try {
      const ab  = await file.arrayBuffer();
      const doc = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
      // Read existing metadata
      const existing = {
        title:    doc.getTitle()    || '',
        author:   doc.getAuthor()   || '',
        subject:  doc.getSubject()  || '',
        keywords: doc.getKeywords() || '',
        creator:  doc.getCreator()  || '',
        producer: doc.getProducer() || '',
      };
      // Populate fields
      document.getElementById('metaTitle').value    = existing.title;
      document.getElementById('metaAuthor').value   = existing.author;
      document.getElementById('metaSubject').value  = existing.subject;
      document.getElementById('metaKeywords').value = existing.keywords;
      document.getElementById('metaCreator').value  = existing.creator;
      document.getElementById('metaProducer').value = existing.producer;

      // Show current metadata summary
      const hasAny = Object.values(existing).some(v => v.trim());
      if (hasAny) {
        document.getElementById('metaCurrentWrap').style.display = '';
        document.getElementById('metaCurrentList').innerHTML = Object.entries(existing)
          .filter(([,v]) => v.trim())
          .map(([k,v]) => `<div><span style="color:var(--txt3);min-width:80px;display:inline-block;text-transform:capitalize">${k}:</span> <span style="color:var(--txt)">${v}</span></div>`)
          .join('');
      }

      hideProg('metadata');
      document.getElementById('metaSection').style.display = '';
    } catch(e) { hideProg('metadata'); alert('Error reading PDF: ' + e.message); }
  };

  window.clearMetaFields = () => {
    ['metaTitle','metaAuthor','metaSubject','metaKeywords','metaCreator','metaProducer']
      .forEach(id => { document.getElementById(id).value = ''; });
  };

  window.doMetadata = async () => {
    const file = STATE.metadata?.files?.[0]; if (!file) return;
    const btn  = document.getElementById('metaBtn'); btn.disabled = true;
    showProg('metadata', 10, 'Loading PDF…');
    try {
      const ab  = await file.arrayBuffer();
      const doc = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });

      const title    = document.getElementById('metaTitle').value.trim();
      const author   = document.getElementById('metaAuthor').value.trim();
      const subject  = document.getElementById('metaSubject').value.trim();
      const keywords = document.getElementById('metaKeywords').value.trim();
      const creator  = document.getElementById('metaCreator').value.trim();
      const producer = document.getElementById('metaProducer').value.trim();
      const clearDates = document.getElementById('metaClearDates').checked;

      if (title)    doc.setTitle(title);
      if (author)   doc.setAuthor(author);
      if (subject)  doc.setSubject(subject);
      if (keywords) doc.setKeywords([keywords]);
      if (creator)  doc.setCreator(creator);
      if (producer) doc.setProducer(producer);
      if (clearDates) {
        doc.setCreationDate(new Date(0));
        doc.setModificationDate(new Date());
      } else {
        doc.setModificationDate(new Date());
      }

      showProg('metadata', 80, 'Saving…');
      const out   = await doc.save();
      const fname = file.name.replace('.pdf','') + '_meta.pdf';
      downloadBytes(out, fname);
      logHistory('Edit Metadata', '🏷️', [file], out.length);
      showProg('metadata', 100); setTimeout(() => hideProg('metadata'), 500);
      showRes('metadata', 'Metadata updated and saved successfully.',
        `<button class="btn btn-gold" onclick="doMetadata()">⬇ Download Again</button>
         <button class="btn btn-ghost" onclick="resetMeta()">↺ Edit Another</button>`);
    } catch(e) { hideProg('metadata'); alert('Error: ' + e.message); }
    finally { btn.disabled = false; }
  };

  window.resetMeta = () => {
    STATE.metadata = {};
    document.getElementById('fl-metadata').innerHTML = '';
    document.getElementById('metaSection').style.display = 'none';
    document.getElementById('metaCurrentWrap').style.display = 'none';
    hideRes('metadata'); hideProg('metadata');
  };
};
