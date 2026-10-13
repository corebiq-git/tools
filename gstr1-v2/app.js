(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const SECTION_META = {
    'b2b,sez,de': {code:'B2B', title:'B2B, SEZ & Deemed Exports', description:'Registered recipient invoices', start:4, formulaCols:[11]},
    b2cs:{code:'B2CS',title:'B2C Small Supplies',description:'Supplies to unregistered persons',start:4},
    cdnr:{code:'CDNR',title:'Credit / Debit Notes',description:'Notes issued to registered recipients',start:4,formulaCols:[11]},
    exp:{code:'EXP',title:'Export Supplies',description:'Exports with or without payment of tax',start:4},
    exemp:{code:'NIL',title:'Nil / Exempted Supplies',description:'Nil-rated, exempted and non-GST supplies',start:4},
    'hsn(b2b)':{code:'HSN',title:'HSN Summary',description:'HSN-wise summary of outward supplies',start:4},
    docs:{code:'DOCS',title:'Documents Issued',description:'Serial numbers and cancelled documents',start:4},
    eco:{code:'ECO',title:'E-commerce Supplies',description:'Supplies through e-commerce operators',start:4}
  };
  const state = {workbook:null, sections:[], selectedSheet:'', issues:[], json:{}, formatted:true};
  const clean = v => v === null || v === undefined ? '' : v;
  const num = v => { if(typeof v==='number') return Number.isFinite(v)?v:0; if(v===null||v===undefined||String(v).trim()==='') return 0; const n=Number(String(v).replace(/[,₹\s]/g,'')); return Number.isFinite(n)?n:0; };
  const str = v => v===null||v===undefined?'':String(v).trim();
  const rowHasValues = row => row.some(v => v!==null && v!==undefined && String(v).trim()!=='');
  // Monetary values are rounded before they enter the JSON; never emit >2 decimal places.
  const money = v => Math.round((num(v) + Number.EPSILON) * 100) / 100;
  const hasPositiveAmount = (name, r) => {
    const indexes = {
      'b2b,sez,de':[4,11], b2cs:[4], cdnr:[8,11], exp:[3,8],
      exemp:[1,2,3], 'hsn(b2b)':[4,6,7,8,9,10], docs:[3,4], eco:[3,4,5,6,7]
    }[name] || [];
    return indexes.some(i => money(r[i]) > 0);
  };
  const cleanRows = (name, list) => list.filter(r => rowHasValues(r) && hasPositiveAmount(name, r));
  const stateCode = v => { const s=str(v); const m=s.match(/^\s*(\d{2})/); return m?m[1]:s.slice(0,2); };
  const getCell = (row,i) => clean(row[i]);
  const showToast = msg => { const t=$('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2400); };
  const visibleAllowed = name => { const n=String(name||'').trim().toLowerCase(); return !!SECTION_META[n] && !n.includes('dash') && !n.includes('help') && !n.includes('readme'); };
  function excelDate(v){
    if(v instanceof Date && !isNaN(v)) return `${String(v.getDate()).padStart(2,'0')}-${String(v.getMonth()+1).padStart(2,'0')}-${v.getFullYear()}`;
    if(typeof v==='number' && window.XLSX && XLSX.SSF){const d=XLSX.SSF.parse_date_code(v);if(d)return `${String(d.d).padStart(2,'0')}-${String(d.m).padStart(2,'0')}-${d.y}`;}
    const s=str(v); if(!s)return '';
    let m=s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/); if(m)return `${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}-${m[3]}`;
    m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if(m)return `${m[3].padStart(2,'0')}-${m[2].padStart(2,'0')}-${m[1]}`;
    return s;
  }
  function importWorkbook(wb){
    state.workbook=wb; state.sections=[];
    wb.SheetNames.forEach((name,index)=>{
      const sheetMeta = wb.Workbook && wb.Workbook.Sheets ? wb.Workbook.Sheets[index] : null;
      const isHidden = sheetMeta && Number(sheetMeta.Hidden || 0) !== 0;
      if(isHidden || !visibleAllowed(name)) return;
      const ws=wb.Sheets[name]; if(!ws) return;
      const matrix=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null,blankrows:false});
      const meta=SECTION_META[name];
      const headerIdx=3; const headers=(matrix[headerIdx]||[]).map((v,i)=>str(v)||`Column ${i+1}`);
      const dataRows=[];
      for(let ri=meta.start;ri<matrix.length;ri++){
        const row=matrix[ri]||[];
        if(rowHasValues(row) && hasPositiveAmount(name, row)) dataRows.push({excelRow:ri+1,values:headers.map((_,i)=>clean(row[i]))});
      }
      state.sections.push({name,index,headers,rows:dataRows,meta,worksheet:ws});
    });
    if(!state.sections.length){showToast('No supported visible GSTR-1 sheets found.');return;}
    state.selectedSheet=state.sections[0].name;
    $('fileName').textContent='Loaded: '+(wb.__filename||'GSTR-1 workbook');
    $('sheetSelect').innerHTML=state.sections.map(s=>`<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)} · ${s.rows.length}</option>`).join('');
    $('sheetSelect').value=state.selectedSheet; $('sheetSelect').disabled=false; $('validateBtn').disabled=false;
    $('copyBtn').disabled=false; $('downloadBtn').disabled=false;
    runValidation(); renderAll(); showToast('Workbook imported successfully');
  }
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function issue(sheet,row,level,message){return {sheetName:sheet.name,rowIndex:row.excelRow,identifier:str(row.values[0])||str(row.values[2])||`Row ${row.excelRow}`,level,message};}
  function isValidGSTIN(v){return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(str(v).toUpperCase());}
  function runValidation(){
    const issues=[];
    state.sections.forEach(sheet=>sheet.rows.forEach(row=>{
      const r=row.values; const add=(lvl,msg)=>issues.push(issue(sheet,row,lvl,msg));
      if(sheet.name==='b2b,sez,de'){
        if(!str(r[0])) add('error','Recipient GSTIN is required.'); else if(!isValidGSTIN(r[0])) add('warning','GSTIN format may be invalid; check the 15-character GSTIN.');
        if(!str(r[2])) add('error','Invoice number is required.');
        if(!str(r[3])) add('warning','Invoice date is missing.');
        if(num(r[4])<=0) add('warning','Invoice value is zero or negative.');
        if(r[10]===''||r[10]===null||r[10]===undefined) add('warning','Tax rate is not specified.');
      } else if(sheet.name==='b2cs'){
        if(!str(r[1])) add('error','Place of Supply is required.');
        if(num(r[4])<=0) add('warning','Taxable value is zero.');
      } else if(sheet.name==='cdnr'){
        if(!str(r[0])) add('error','Recipient GSTIN is required for CDNR.'); else if(!isValidGSTIN(r[0])) add('warning','Recipient GSTIN format may be invalid.');
        if(!str(r[2])) add('error','Note number is required.');
        if(!['C','D','CREDIT','DEBIT'].includes(str(r[4]).toUpperCase())) add('warning','Note type should be C (Credit) or D (Debit).');
      } else if(sheet.name==='hsn(b2b)'){
        if(!str(r[0])) add('error','HSN code is required.');
        if(!str(r[2])) add('warning','UQC should be specified.');
      }
    }));
    state.issues=issues;
    $('errorCount').textContent=issues.filter(i=>i.level==='error').length;
    $('warningCount').textContent=issues.filter(i=>i.level==='warning').length;
    $('issueBadge').textContent=issues.length;
    return issues;
  }
  function rowsFor(name){return state.sections.find(s=>s.name===name)?.rows||[];}
  function buildJson(){
    const rows=name=>cleanRows(name, rowsFor(name).map(x=>x.values));
    // The workbook Dashboard contains the supplier GSTIN, tax period and JSON version.
    let gstin='', fp='', version='GST3.2.4';
    const dash=state.workbook?.Sheets?.Dashboard;
    if(dash){
      const matrix=XLSX.utils.sheet_to_json(dash,{header:1,raw:true,defval:null,blankrows:false});
      const metaRow=matrix[3]||[];
      gstin=str(metaRow[3]).toUpperCase();
      const period=metaRow[4];
      if(period instanceof Date && !isNaN(period)) fp=String(period.getMonth()+1).padStart(2,'0')+period.getFullYear();
      else { const d=excelDate(period); let m=d.match(/^(\d{2})-(\d{2})-(\d{4})$/); if(m)fp=m[2]+m[3]; else {m=str(period).match(/^(\d{1,2})[/-](\d{4})$/);if(m)fp=m[1].padStart(2,'0')+m[2];} }
      version=str(metaRow[5])||version;
    }
    const b2bGroups={};
    rows('b2b,sez,de').forEach(r=>{
      const ctin=str(r[0]).toUpperCase(); if(!ctin)return;
      if(!b2bGroups[ctin])b2bGroups[ctin]={ctin,cname:str(r[1]),inv:[]};
      const inv={inum:str(r[2]),idt:excelDate(r[3]),val:money(r[4]),pos:stateCode(r[5]),rchrg:str(r[6]||'N'),inv_typ:/regular/i.test(str(r[8]))?'R':(str(r[8])||'R'),itms:[{num:1,itm_det:{rt:money(r[10]),txval:money(r[11]),csamt:money(r[12])}}]};
      b2bGroups[ctin].inv.push(inv);
    });
    const b2cs=rows('b2cs').map(r=>({typ:str(r[0]||'OE'),pos:stateCode(r[1]),rt:money(r[3]),txval:money(r[4]),csamt:money(r[5])}));
    const cdnrGroups={};
    rows('cdnr').forEach(r=>{
      const ctin=str(r[0]).toUpperCase();if(!ctin)return;
      if(!cdnrGroups[ctin])cdnrGroups[ctin]={ctin,cname:str(r[1]),nt:[]};
      const noteType=str(r[4]).toUpperCase().startsWith('D')?'D':'C';
      cdnrGroups[ctin].nt.push({nt_num:str(r[2]),nt_dt:excelDate(r[3]),ntty:noteType,pos:stateCode(r[5]),rchrg:str(r[6]||'N'),inv_typ:/regular/i.test(str(r[7]))?'R':(str(r[7])||'R'),val:money(r[8]),itms:[{num:1,itm_det:{rt:money(r[10]),txval:money(r[11]),csamt:money(r[12])}}]});
    });
    const exp=rows('exp').map(r=>({exp_typ:str(r[0]||'WOPAY'),inv:[{inum:str(r[1]),idt:excelDate(r[2]),val:money(r[3]),sbpcode:str(r[4]),sbnum:str(r[5]),sbdt:excelDate(r[6]),itms:[{num:1,itm_det:{rt:money(r[7]),txval:money(r[8]),csamt:money(r[9])}}]}]}));
    const nilRows=rows('exemp');
    const nil={inv:nilRows.map(r=>{
      const desc=str(r[0]).toLowerCase();
      const sply_ty=desc.includes('inter-state')?(desc.includes('registered')?'INTERB2B':'INTERB2C'):(desc.includes('registered')?'INTRAB2B':'INTRAB2C');
      return {sply_ty,nil_amt:money(r[1]),expt_amt:money(r[2]),ngsup_amt:money(r[3])};
    })};
    const hsn={hsn_b2b:rows('hsn(b2b)').map((r,i)=>({num:i+1,hsn_sc:str(r[0]),desc:str(r[1]),uqc:str(r[2]),qty:money(r[3]),val:money(r[4]),rt:money(r[5]),txval:money(r[6]),iamt:money(r[7]),camt:money(r[8]),samt:money(r[9]),csamt:money(r[10])}))};
    const docsRows=rows('docs');
    const docs={doc_det:docsRows.map((r,i)=>{const total=money(r[3]),cancelled=money(r[4]);return {doc_num:i+1,docs:[{num:1,from:str(r[1]),to:str(r[2]),totnum:total,canc:cancelled,net_issue:money(total-cancelled)}]};})};
    const eco=rows('eco').map(r=>({sup_typ:/52|collect/i.test(str(r[0]))?'TCS':'TCS',etin:str(r[1]),ename:str(r[2]),txval:money(r[3]),iamt:money(r[4]),camt:money(r[5]),samt:money(r[6]),csamt:money(r[7])}));
    return {gstin,fp,version,hash:'hash',b2b:Object.values(b2bGroups),b2cs,cdnr:Object.values(cdnrGroups),exp,nil,hsn,doc_issue:docs,eco};
  }
  function renderAll(){
    $('sectionCount').textContent=state.sections.length;
    $('rowCount').textContent=state.sections.reduce((n,s)=>n+s.rows.length,0);
    $('sectionCards').innerHTML=state.sections.map(s=>`<article class="section-card"><div class="card-top"><span class="section-code">${escapeHtml(s.meta.code)}</span><span class="pill">Visible sheet</span></div><h3>${escapeHtml(s.meta.title)}</h3><p>${escapeHtml(s.meta.description)}</p><div class="card-bottom"><div><strong>${s.rows.length}</strong><div class="issue-meta">data rows</div></div><button class="btn secondary open-sheet" data-sheet="${escapeHtml(s.name)}">View data</button></div></article>`).join('');
    state.json=buildJson(); renderSheet(); renderIssues(); renderJson();
  }
  function renderSheet(){const s=state.sections.find(x=>x.name===state.selectedSheet);if(!s){$('tableWrap').innerHTML='<div class="empty">No sheet selected.</div>';return;}
    const head=s.headers.map(h=>`<th>${escapeHtml(h)}</th>`).join('');
    const body=s.rows.slice(0,500).map(r=>`<tr>${s.headers.map((_,i)=>`<td title="${escapeHtml(r.values[i]??'')}">${escapeHtml(r.values[i]??'')}</td>`).join('')}</tr>`).join('');
    $('tableWrap').innerHTML=`<table class="data-table"><thead><tr><th>Excel row</th>${head}</tr></thead><tbody>${s.rows.length? s.rows.slice(0,500).map(r=>`<tr><td>${r.excelRow}</td>${s.headers.map((_,i)=>`<td title="${escapeHtml(r.values[i]??'')}">${escapeHtml(r.values[i]??'')}</td>`).join('')}</tr>`).join(''):'<tr><td colspan="99">No data rows</td></tr>'}</tbody></table>${s.rows.length>500?'<div class="issue-meta" style="padding:10px">Showing first 500 non-empty rows for mobile performance.</div>':''}`;
  }
  function renderIssues(){const filter=$('validationFilter').value;const arr=state.issues.filter(i=>filter==='all'||i.level===filter);$('issuesList').innerHTML=arr.length?arr.map(i=>`<article class="issue ${i.level}"><div class="issue-head"><div class="issue-title">${escapeHtml(i.identifier)}</div><span class="level">${i.level}</span></div><div class="issue-meta">${escapeHtml(i.sheetName)} · Excel row ${i.rowIndex}</div><ul><li>${escapeHtml(i.message)}</li></ul></article>`).join(''):'<div class="empty"><b>No matching issues</b><p>There are no issues for this filter. This is not a guarantee of GST portal acceptance.</p></div>';}
  function serializeJson(obj){return JSON.stringify(obj,null,2).replace(/(\"(?:val|rt|txval|csamt|nil_amt|expt_amt|ngsup_amt|qty|iamt|camt|samt)\"\s*:\s*)(-?\d+(?:\.\d+)?)/g,(_,key,value)=>key+Number(value).toFixed(2));}
  function renderJson(){const text=serializeJson(state.json);$('jsonOutput').textContent=text;$('jsonMeta').textContent=`${state.sections.length} visible sections scanned · ${text.length.toLocaleString('en-IN')} characters`;}
  function switchTab(name){document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`));}
  function downloadJson(){const blob=new Blob([serializeJson(state.json)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`GSTR1_${state.json.fp||'return'}_JSON.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);showToast('JSON file saved');}
  async function copyJson(){try{await navigator.clipboard.writeText(serializeJson(state.json));showToast('JSON copied to clipboard');}catch(e){const range=document.createRange();range.selectNodeContents($('jsonOutput'));const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);showToast('Select and copy the JSON text');}}
  function readFile(file){if(!file)return;if(!window.XLSX){showToast('Excel reader library did not load. Connect to internet and reload.');return;}const reader=new FileReader();reader.onload=e=>{try{const wb=XLSX.read(e.target.result,{type:'array',cellDates:true});wb.__filename=file.name;importWorkbook(wb);}catch(err){console.error(err);showToast('Could not read workbook. Please check the Excel file.');}};reader.onerror=()=>showToast('Could not open this file.');reader.readAsArrayBuffer(file);}
  $('loadBtn').addEventListener('click',()=>$('fileInput').click());$('browseBtn').addEventListener('click',()=>$('fileInput').click());$('dropzone').addEventListener('click',e=>{if(!e.target.closest('button'))$('fileInput').click();});$('fileInput').addEventListener('change',e=>readFile(e.target.files[0]));
  $('dropzone').addEventListener('dragover',e=>{e.preventDefault();$('dropzone').style.background='#f0f6ff';});$('dropzone').addEventListener('dragleave',()=>$('dropzone').style.background='');$('dropzone').addEventListener('drop',e=>{e.preventDefault();$('dropzone').style.background='';readFile(e.dataTransfer.files[0]);});
  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
  $('sheetSelect').addEventListener('change',e=>{state.selectedSheet=e.target.value;renderSheet();});$('sectionCards').addEventListener('click',e=>{const b=e.target.closest('.open-sheet');if(!b)return;state.selectedSheet=b.dataset.sheet;$('sheetSelect').value=state.selectedSheet;renderSheet();switchTab('sheets');});
  $('validateBtn').addEventListener('click',()=>{runValidation();renderIssues();showToast('Validation completed');});$('validationFilter').addEventListener('change',renderIssues);$('copyBtn').addEventListener('click',copyJson);$('downloadBtn').addEventListener('click',downloadJson);$('formatBtn').addEventListener('click',()=>{state.json=buildJson();renderJson();showToast('JSON formatted');});
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
