// ── MERGE PDF ─────────────────────────────────────────────────────────────
window.initTool = function(toolId, meta) {
  const mount = document.getElementById('toolBody');
  mount.innerHTML = `
    <div class="info-box"><strong>How to use:</strong> Upload two or more PDFs. Drag the file cards to reorder them. Click <strong>Merge & Download</strong>.</div>
    <div class="ctrl-group">
      <div class="ctrl-group-title">Upload PDFs (2 or more)</div>
      ${dz('merge', true, '.pdf,application/pdf', 'Drop PDFs here')}
      <div class="file-list" id="fl-merge"></div>
    </div>
    <div class="ctrl-group" id="mergeOrderWrap" style="display:none">
      <div class="ctrl-group-title">Drag to Reorder</div>
      <div id="mergeOrder" style="display:flex;flex-direction:column;gap:7px"></div>
    </div>
    ${progHTML('merge')}
    ${resHTML('merge')}
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-gold btn-lg" id="mergeBtn" onclick="doMerge()" disabled>🔗 Merge & Download</button>
      <button class="btn btn-ghost btn-sm" onclick="resetMerge()">↺ Reset</button>
    </div>`;

  STATE.merge = { files: [], multi: true };

  window.onFilesLoaded_merge = () => {
    const files = STATE.merge.files;
    document.getElementById('mergeBtn').disabled = files.length < 2;
    const wrap = document.getElementById('mergeOrderWrap');
    wrap.style.display = files.length > 1 ? '' : 'none';
    renderMergeOrder(files);
  };

  function renderMergeOrder(files) {
    const el = document.getElementById('mergeOrder');
    el.innerHTML = files.map((f, i) => `
      <div class="file-item" draggable="true" data-i="${i}"
        ondragstart="mergeDragStart(event,${i})"
        ondragover="event.preventDefault();this.style.borderColor='var(--gold)'"
        ondragleave="this.style.borderColor=''"
        ondrop="mergeDrop(event,${i});this.style.borderColor=''">
        <div style="cursor:grab;color:var(--txt3);font-size:1.1rem;padding:0 4px">⠿</div>
        <div class="fi-icon">📄</div>
        <div class="fi-info"><div class="fi-name">${f.name}</div><div class="fi-size">${fmtSz(f.size)}</div></div>
        <div style="color:var(--txt3);font-size:0.78rem;font-weight:600">#${i+1}</div>
      </div>`).join('');
  }

  let dragIdx = null;
  window.mergeDragStart = (e, i) => { dragIdx = i; e.dataTransfer.effectAllowed = 'move'; };
  window.mergeDrop = (e, i) => {
    if (dragIdx === null || dragIdx === i) return;
    const files = STATE.merge.files;
    const moved = files.splice(dragIdx, 1)[0];
    files.splice(i, 0, moved);
    dragIdx = null;
    renderMergeOrder(files);
    renderFL('merge', files);
  };

  window.doMerge = async () => {
    const files = STATE.merge.files;
    if (files.length < 2) return;
    const btn = document.getElementById('mergeBtn');
    btn.disabled = true;
    showProg('merge', 5, 'Starting…');
    try {
      const merged = await PDFLib.PDFDocument.create();
      for (let i = 0; i < files.length; i++) {
        showProg('merge', 5 + Math.round((i / files.length) * 88), `Merging file ${i+1} of ${files.length}…`);
        const ab  = await files[i].arrayBuffer();
        const src = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
        const copied = await merged.copyPages(src, src.getPageIndices());
        copied.forEach(p => merged.addPage(p));
      }
      showProg('merge', 96, 'Saving…');
      const out = await merged.save();
      downloadBytes(out, 'merged.pdf');
      logHistory('Merge PDF', '🔗', files, out.length);
      showProg('merge', 100); setTimeout(() => hideProg('merge'), 500);
      showRes('merge', `${files.length} PDFs merged into one (${fmtSz(out.length)}).`,
        `<button class="btn btn-gold" onclick="doMerge()">⬇ Download Again</button>
         <button class="btn btn-ghost" onclick="resetMerge()">↺ Merge More</button>`);
    } catch(e) {
      hideProg('merge');
      alert('Error: ' + e.message);
    } finally { btn.disabled = false; }
  };

  window.resetMerge = () => {
    STATE.merge = { files: [], multi: true };
    document.getElementById('fl-merge').innerHTML = '';
    document.getElementById('mergeOrderWrap').style.display = 'none';
    document.getElementById('mergeBtn').disabled = true;
    hideRes('merge'); hideProg('merge');
  };
};
