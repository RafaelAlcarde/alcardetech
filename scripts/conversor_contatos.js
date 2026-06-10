/**
 * Neofluxx — Conversor de Contatos v1.0
 * Importa planilha XLS/CSV, mapeia colunas, deduplica, etiqueta e importa direto.
 */
(function () {
  if (window.__nfxConversor_v1) return;
  window.__nfxConversor_v1 = true;

  const VERSION = 'v2.1';
  const log = (...a) => console.log('[CW-B2-TOOL]', ...a);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const uniq = arr => [...new Set((arr || []).map(s => (s || '').trim()).filter(Boolean))];

  let shouldCancel = false;
  let savedMapping = null;
  let savedLabel = null;
  let isImporting = false;

  // ============================================================
  // ACCOUNT
  // ============================================================
  function accountId() {
    return parseInt((location.pathname.match(/accounts\/(\d+)/) || [])[1]) || null;
  }

  // ============================================================
  // API
  // ============================================================
  async function api(path, method = 'GET', body = null) {
    const acc = accountId();
    if (!acc) throw new Error('AccountId não detectado.');
    const url = `/api/v1/accounts/${acc}/${path}`;
    const resp = await window.axios({ url, method: method.toLowerCase(), data: body || undefined, withCredentials: true });
    return resp.data ?? {};
  }

  async function fetchLabels() {
    const data = await api('labels', 'GET');
    const list = data?.payload || data?.data || data || [];
    return Array.isArray(list) ? list.map(l => l.title || l.name || '').filter(Boolean) : [];
  }

  async function ensureLabel(title) {
    const data = await api('labels', 'GET');
    const list = data?.payload || data?.data || data || [];
    let found = Array.isArray(list) ? list.find(l => (l.title || l.name) === title) : null;
    if (!found) {
      const created = await api('labels', 'POST', { title, color: '#00c48c' });
      const payload = created?.payload || created?.data || created || {};
      found = payload.label || payload || {};
    }
    return found.title || found.name || title;
  }

  function getContactId(obj) {
    return obj?.id || obj?.contact_id || obj?.payload?.id || obj?.payload?.contact_id ||
           obj?.payload?.contact?.id || obj?.data?.id || obj?.data?.contact?.id ||
           obj?.resource?.id || obj?.resource?.contact?.id || obj?.contact?.id || null;
  }

  async function getContactLabels(contactId) {
    try {
      const data = await api(`contacts/${contactId}/labels`, 'GET');
        const labels = data?.payload || data?.data || data || [];
      if (Array.isArray(labels)) return labels.map(l => typeof l === 'string' ? l : (l?.title || l?.name || '')).filter(Boolean);
      return [];
    } catch (e) { return []; }
  }

  async function findContactByPhone(phone) {
    const res = await api(`contacts/search?q=${encodeURIComponent(phone)}`, 'GET');
    const arr = res?.payload || res?.data || [];
    const c = Array.isArray(arr) ? arr[0] : null;
    if (!c) return null;
    const contactId = getContactId(c);
    if (!contactId) return null;
    const labels = await getContactLabels(contactId);
    return { id: contactId, labels: uniq(labels) };
  }

  async function attachLabel(contactId, label, existingLabels = []) {
    const normalizedLabel = normalizeLabel(label);
    const normalizedExisting = (existingLabels || []).map(l => normalizeLabel(l));
    const merged = uniq([...normalizedExisting, normalizedLabel]);
    const result = await api(`contacts/${contactId}/labels`, 'POST', { labels: merged });
    const has = normalizedExisting.some(l => l === normalizedLabel);
    return { alreadyHad: has };
  }

  // ============================================================
  // DADOS
  // ============================================================
  function normalizeLabel(str) {
    if (!str) return '';
    return str
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')   // remove acentos
      .replace(/[^a-z0-9\s-]/g, '')      // remove caracteres especiais
      .trim()
      .replace(/\s+/g, '-')              // espaços → hífen
      .replace(/-+/g, '-');              // hífens duplos → simples
  }

  function formatPhone(v) {
    const first = String(v).split(/[;,]/)[0].trim();
    let s = first.replace(/\D/g, '');
    if (!s) return '';
    if (!s.startsWith('55')) s = '55' + s;
    return '+' + s;
  }

  function toTitleCase(str) {
    if (!str) return '';
    const s = String(str);
    const upper = s.replace(/[^a-zA-ZÀ-ÿ]/g, '');
    if (!upper.length) return s;
    if (upper !== upper.toUpperCase() && upper !== upper.toLowerCase()) return s;
    return s.toLowerCase().replace(/(^|\s|-)(\S)/g, (_, sep, char) => sep + char.toUpperCase());
  }

  // ============================================================
  // SHEETJS — carrega dinamicamente
  // ============================================================
  function loadSheetJS() {
    return new Promise((resolve, reject) => {
      if (window.XLSX) { resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // ============================================================
  // CSS
  // ============================================================
  function injectCSS() {
    if (document.getElementById('nfx-conv-style')) return;
    const style = document.createElement('style');
    style.id = 'nfx-conv-style';
    style.textContent = `
      #nfx-conv-overlay {
        display:none; position:fixed; inset:0; z-index:99999;
        background:rgba(0,0,0,0.55); align-items:center; justify-content:center;
      }
      #nfx-conv-overlay.open { display:flex; }
      #nfx-conv-box {
        background:#fff; border-radius:12px; width:90vw; max-width:780px;
        max-height:90vh; display:flex; flex-direction:column; overflow:hidden;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        animation:nfxConvIn 0.2s ease;
      }
      @keyframes nfxConvIn { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }
      #nfx-conv-header {
        display:flex; align-items:center; justify-content:space-between;
        padding:14px 20px; border-bottom:1px solid #e2e5ea; flex-shrink:0;
      }
      #nfx-conv-title { font-size:16px; font-weight:600; color:#00c48c; }
      #nfx-conv-version { font-size:11px; color:#aaa; margin-left:8px; font-family:monospace; }
      #nfx-conv-close {
        width:28px; height:28px; border-radius:50%; border:1px solid #e2e5ea;
        background:transparent; cursor:pointer; font-size:16px; color:#5a6170;
        display:flex; align-items:center; justify-content:center;
      }
      #nfx-conv-close:hover { background:rgba(229,57,53,.1); color:#e53935; border-color:#e53935; }
      #nfx-conv-body { overflow-y:auto; padding:20px; flex:1; }

      .nfx-subtitle { font-size:13px; color:#6b7280; margin-bottom:4px; line-height:1.5; }
      .nfx-info-box {
        background:#f9fafb; border:0.5px solid #e2e5ea; border-radius:8px;
        padding:12px 16px; margin-bottom:16px;
      }
      .nfx-info-row { display:flex; align-items:flex-start; gap:8px; font-size:13px; color:#6b7280; margin-bottom:6px; line-height:1.5; }
      .nfx-info-row:last-child { margin-bottom:0; }
      .nfx-info-row code { background:#e5e7eb; border-radius:4px; padding:1px 5px; font-size:12px; color:#1a1a2e; }
      .nfx-info-row strong { color:#1a1a2e; font-weight:500; }

      .nfx-drop {
        border:1.5px dashed #d1d5db; border-radius:10px; padding:40px;
        text-align:center; cursor:pointer; transition:all 0.2s; background:#fff;
      }
      .nfx-drop:hover, .nfx-drop.drag { border-color:#00c48c; background:rgba(0,196,140,0.05); }
      .nfx-drop-icon { font-size:40px; display:block; margin-bottom:12px; }
      .nfx-drop-title { font-size:15px; font-weight:500; color:#1a1a2e; margin-bottom:4px; }
      .nfx-drop-sub { font-size:13px; color:#9ca3af; }
      .nfx-drop-sub span { color:#00c48c; cursor:pointer; }

      .nfx-sec-label {
        font-size:11px; font-weight:600; letter-spacing:.08em; text-transform:uppercase;
        color:#9ca3af; margin-bottom:10px;
      }
      .nfx-map-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px; }
      .nfx-field {
        background:#fff; border:0.5px solid #e2e5ea; border-radius:8px; padding:12px;
        transition:border-color 0.15s;
      }
      .nfx-field:focus-within { border-color:#00c48c; }
      .nfx-field label {
        display:flex; align-items:center; gap:5px; font-size:11px; font-weight:600;
        letter-spacing:.06em; text-transform:uppercase; color:#9ca3af; margin-bottom:6px;
      }
      .nfx-dot { width:5px; height:5px; border-radius:50%; background:#00c48c; flex-shrink:0; }
      .nfx-opt { color:#c4c9d4; font-weight:400; text-transform:none; letter-spacing:0; font-size:10px; }
      .nfx-field select, .nfx-field input[type=text] {
        width:100%; background:#f9fafb; border:0.5px solid #e2e5ea; border-radius:6px;
        color:#1a1a2e; font-family:monospace; font-size:13px; padding:7px 26px 7px 8px;
        outline:none; transition:border-color 0.15s; -webkit-appearance:none; appearance:none;
        background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%23999' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
        background-repeat:no-repeat; background-position:right 8px center;
      }
      .nfx-field input[type=text] { background-image:none; padding-right:8px; }
      .nfx-field select:focus, .nfx-field input[type=text]:focus { border-color:#00c48c; }

      .nfx-label-opts { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px; }
      .nfx-label-opt {
        background:#fff; border:0.5px solid #e2e5ea; border-radius:8px; padding:12px;
        transition:border-color 0.15s;
      }
      .nfx-label-opt.selected { border-color:#00c48c; }
      .nfx-label-opt.disabled { opacity:.4; pointer-events:none; }
      .nfx-label-opt label {
        display:block; font-size:11px; font-weight:600; letter-spacing:.06em;
        text-transform:uppercase; color:#9ca3af; margin-bottom:6px;
      }
      .nfx-label-opt select, .nfx-label-opt input[type=text] {
        width:100%; background:#f9fafb; border:0.5px solid #e2e5ea; border-radius:6px;
        color:#1a1a2e; font-family:monospace; font-size:13px; padding:7px 26px 7px 8px;
        outline:none; -webkit-appearance:none; appearance:none;
        background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%23999' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
        background-repeat:no-repeat; background-position:right 8px center;
      }
      .nfx-label-opt input[type=text] { background-image:none; padding-right:8px; }
      .nfx-btn-create-label {
        margin-top:6px; background:none; border:0.5px dashed #d1d5db; border-radius:6px;
        color:#00c48c; font-size:12px; font-family:inherit; padding:5px 10px;
        cursor:pointer; width:100%; text-align:left; transition:background 0.15s;
      }
      .nfx-btn-create-label:hover { background:rgba(0,196,140,0.06); }

      .nfx-preview-box {
        background:#fff; border:0.5px solid #e2e5ea; border-radius:8px;
        overflow:hidden; margin-bottom:16px;
      }
      .nfx-preview-header {
        display:flex; align-items:center; justify-content:space-between;
        padding:8px 14px; border-bottom:0.5px solid #e2e5ea;
      }
      .nfx-badge {
        font-size:12px; font-weight:500; color:#00c48c;
        background:rgba(0,196,140,0.08); border:0.5px solid rgba(0,196,140,0.25);
        border-radius:20px; padding:2px 10px; font-family:monospace;
      }
      .nfx-table-wrap { overflow-x:auto; }
      .nfx-table { width:100%; border-collapse:collapse; font-size:13px; }
      .nfx-table th {
        padding:8px 14px; text-align:left; font-size:11px; font-weight:600;
        letter-spacing:.06em; text-transform:uppercase; color:#9ca3af;
        border-bottom:0.5px solid #e2e5ea; white-space:nowrap;
      }
      .nfx-table td {
        padding:8px 14px; color:#6b7280; border-bottom:0.5px solid #e2e5ea;
        white-space:nowrap; max-width:180px; overflow:hidden; text-overflow:ellipsis;
      }
      .nfx-table td:first-child { color:#1a1a2e; font-weight:500; }
      .nfx-table td.phone { font-family:monospace; font-size:12px; color:#00c48c; }
      .nfx-table tr:last-child td { border-bottom:none; }
      .nfx-more { padding:8px 14px; font-size:12px; color:#9ca3af; font-style:italic; }

      .nfx-warn {
        display:flex; align-items:flex-start; gap:8px; padding:10px 14px;
        background:rgba(245,166,35,0.07); border:0.5px solid rgba(245,166,35,0.3);
        border-radius:8px; font-size:12px; color:#92600a; line-height:1.5;
        margin-bottom:12px;
      }

      .nfx-filename-wrap {
        display:flex; align-items:center; gap:8px; margin-bottom:12px;
      }
      .nfx-filename-wrap label {
        font-size:11px; font-weight:600; letter-spacing:.08em; text-transform:uppercase;
        color:#9ca3af; white-space:nowrap;
      }
      .nfx-filename-wrap input {
        flex:1; background:#fff; border:0.5px solid #d1d5db; border-radius:8px;
        color:#1a1a2e; font-family:monospace; font-size:13px; padding:8px 10px; outline:none;
        transition:border-color 0.15s;
      }
      .nfx-filename-wrap input:focus { border-color:#00c48c; }
      .nfx-filename-ext { font-size:13px; color:#9ca3af; font-family:monospace; white-space:nowrap; }

      .nfx-actions { display:flex; gap:8px; margin-bottom:12px; }
      .nfx-btn-primary {
        flex:1; background:#00c48c; color:#003d2b; border:none; border-radius:8px;
        padding:11px 20px; font-family:inherit; font-size:14px; font-weight:600;
        cursor:pointer; transition:all 0.15s; display:flex; align-items:center;
        justify-content:center; gap:6px;
      }
      .nfx-btn-primary:hover { opacity:.88; }
      .nfx-btn-secondary {
        background:#fff; color:#6b7280; border:0.5px solid #d1d5db; border-radius:8px;
        padding:11px 16px; font-family:inherit; font-size:13px; cursor:pointer;
        transition:all 0.15s;
      }
      .nfx-btn-secondary:hover { background:#f9fafb; color:#1a1a2e; }
      .nfx-btn-csv {
        background:#fff; color:#1a1a2e; border:0.5px solid #d1d5db; border-radius:8px;
        padding:11px 16px; font-family:inherit; font-size:13px; font-weight:500;
        cursor:pointer; transition:all 0.15s; display:flex; align-items:center; gap:6px;
      }
      .nfx-btn-csv:hover { background:#f9fafb; }

      .nfx-toast {
        display:none; margin-top:10px; padding:10px 14px; border-radius:8px;
        font-size:13px; align-items:center; gap:8px;
      }
      .nfx-toast.show { display:flex; }
      .nfx-toast.success { background:rgba(0,196,140,0.08); border:0.5px solid rgba(0,196,140,0.3); color:#00c48c; }
      .nfx-toast.error { background:rgba(220,50,50,0.07); border:0.5px solid rgba(220,50,50,0.25); color:#c0392b; }

      /* Step 2 */
      .nfx-step2-card {
        background:#fff; border:0.5px solid #e2e5ea; border-radius:8px;
        padding:16px; margin-bottom:12px;
      }
      .nfx-stat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
      .nfx-stat-box { background:#f9fafb; border-radius:8px; padding:12px; text-align:center; }
      .nfx-stat-num { font-size:22px; font-weight:500; color:#1a1a2e; margin:0; }
      .nfx-stat-num.green { color:#00c48c; }
      .nfx-stat-label { font-size:11px; color:#6b7280; margin:4px 0 0; }
      .nfx-progress-track { background:#f3f4f6; border-radius:99px; height:6px; overflow:hidden; margin-bottom:8px; }
      .nfx-progress-fill { height:100%; background:#00c48c; border-radius:99px; width:0%; transition:width 0.3s; }
      .nfx-progress-stats { display:flex; gap:12px; font-size:12px; color:#6b7280; flex-wrap:wrap; margin-top:4px; }
      .nfx-result-box {
        background:rgba(0,196,140,0.07); border:0.5px solid rgba(0,196,140,0.3);
        border-radius:8px; padding:16px; margin-bottom:12px; display:none;
      }
      .nfx-result-box.has-errors { background:rgba(220,50,50,0.07); border-color:rgba(220,50,50,0.25); }
      .nfx-errors-list {
        display:none; margin-top:10px; background:#f9fafb; border-radius:6px;
        padding:10px 12px; font-size:12px; color:#6b7280; max-height:120px;
        overflow-y:auto; line-height:1.8;
      }
      .nfx-version { text-align:right; font-size:11px; color:#d1d5db; font-family:monospace; margin-top:8px; }
    `;
    document.head.appendChild(style);
  }

  // ============================================================
  // ESTADO
  // ============================================================
  let rows = [], headers = [];

  const FIELDS = [
    { id: 'col-name',    header: 'name',         label: 'Nome',     required: true,  isPhone: false, pattern: /nome|name/ },
    { id: 'col-phone',   header: 'phone_number',  label: 'Telefone', required: true,  isPhone: true,  pattern: /tel|fone|phone|cel|whats|mobile/ },
    { id: 'col-email',   header: 'email',         label: 'Email',    required: false, isPhone: false, pattern: /email|e-mail|mail/ },
    { id: 'col-city',    header: 'location',      label: 'Cidade',   required: false, isPhone: false, pattern: /cidade|city|cid/ },
    { id: 'col-company', header: 'company_name',  label: 'Empresa',  required: false, isPhone: false, pattern: /empresa|company|companhia|razao|razão/ },
  ];

  function getMapping(modal) {
    const m = {};
    FIELDS.forEach(f => { m[f.id] = modal.querySelector('#' + f.id)?.value || ''; });
    m['col-labels'] = modal.querySelector('#col-labels')?.value || '';
    return m;
  }

  function getActiveLabel(modal) {
    const colVal = modal.querySelector('#col-labels')?.value || '';
    const neoVal = modal.querySelector('#neo-labels')?.value || '';
    const newVal = (modal.querySelector('#label-new')?.value || '').trim();
    if (colVal !== '') return { type: 'column', value: colVal };
    if (newVal) return { type: 'new', value: normalizeLabel(newVal) };
    if (neoVal) return { type: 'existing', value: neoVal };
    return { type: 'none', value: '' };
  }

  function processValue(field, rawVal) {
    if (field.isPhone) return formatPhone(rawVal);
    return toTitleCase(rawVal);
  }

  function getDedupedRows(modal) {
    const m = getMapping(modal);
    const seen = new Set();
    const deduped = [];
    rows.forEach(r => {
      const phone = formatPhone(r[m['col-phone']]);
      if (phone && seen.has(phone)) return;
      if (phone) seen.add(phone);
      deduped.push(r);
    });
    return deduped;
  }

  function getLabelValue(row, mapping, activeLabel) {
    if (activeLabel.type === 'column' && mapping['col-labels'] !== '') {
      const idx = parseInt(mapping['col-labels']);
      return normalizeLabel(row[idx] || '');
    }
    if (activeLabel.type === 'existing' || activeLabel.type === 'new') return activeLabel.value;
    return '';
  }

  // ============================================================
  // MODAL HTML
  // ============================================================
  function buildModal() {
    const overlay = document.createElement('div');
    overlay.id = 'nfx-conv-overlay';
    overlay.innerHTML = `
      <div id="nfx-conv-box">
        <div id="nfx-conv-header">
          <div>
            <span id="nfx-conv-title">Conversor e Importador de Contatos</span>
            <span id="nfx-conv-version">${VERSION}</span>
          </div>
          <button id="nfx-conv-close">✕</button>
        </div>
        <div id="nfx-conv-body">

          <!-- STEP 1: Upload -->
          <div id="nfx-step-upload">
            <p class="nfx-subtitle" style="margin-bottom:12px;">Importe contatos da sua planilha direto na Neofluxx ou baixe o CSV para importar manualmente.</p>
            <div class="nfx-info-box">
              <p class="nfx-sec-label" style="margin-bottom:10px;">Como usar</p>
              <div class="nfx-info-row"><span style="color:#00c48c;font-weight:600;margin-right:6px;">●</span>A primeira linha da planilha deve conter os cabeçalhos das colunas para que o mapeamento funcione corretamente.</div>
              <div class="nfx-info-row"><span style="color:#00c48c;font-weight:600;margin-right:6px;">●</span>O DDD é obrigatório no número de telefone (ex: <code>11900000000</code>) — o código +55 é adicionado automaticamente.</div>
              <div class="nfx-info-row"><span style="color:#00c48c;font-weight:600;margin-right:6px;">●</span>Etiquetas são opcionais mas recomendadas para segmentar contatos em campanhas — serão criadas automaticamente se não existirem na plataforma.</div>
              <div class="nfx-info-row"><span style="color:#00c48c;font-weight:600;margin-right:6px;">●</span>Ao baixar o CSV para importar manualmente na Neofluxx, faça um arquivo por vez, na ordem numerada.</div>
            </div>
            <div class="nfx-drop" id="nfx-drop">
              <span class="nfx-drop-icon">📊</span>
              <p class="nfx-drop-title">Arraste sua planilha aqui</p>
              <p class="nfx-drop-sub">ou <span id="nfx-drop-click">clique para selecionar</span> · .xlsx, .xls, .csv</p>
            </div>
            <input type="file" id="nfx-file-input" accept=".xlsx,.xls,.csv" style="display:none">
          </div>

          <!-- STEP 2: Map + Preview -->
          <div id="nfx-step-map" style="display:none;">
            <div id="nfx-file-badge" style="display:flex;align-items:center;gap:12px;background:#f9fafb;border:0.5px solid #e2e5ea;border-radius:8px;padding:10px 14px;margin-bottom:16px;">
              <span style="font-size:20px;">📄</span>
              <div style="flex:1;min-width:0;">
                <div id="nfx-badge-name" style="font-size:14px;font-weight:500;color:#1a1a2e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>
                <div id="nfx-badge-meta" style="font-size:12px;color:#9ca3af;margin-top:2px;"></div>
              </div>
              <button id="btn-trocar-arquivo" style="background:none;border:0.5px solid #e2e5ea;border-radius:6px;color:#6b7280;font-size:12px;font-family:inherit;padding:5px 12px;cursor:pointer;white-space:nowrap;">↩ Trocar arquivo</button>
            </div>
            <p class="nfx-sec-label">Mapeamento de colunas</p>
            <div class="nfx-map-grid">
              <div class="nfx-field">
                <label><span class="nfx-dot"></span> Nome</label>
                <select id="col-name"></select>
              </div>
              <div class="nfx-field">
                <label><span class="nfx-dot"></span> Telefone</label>
                <select id="col-phone"></select>
              </div>
              <div class="nfx-field">
                <label>Email <span class="nfx-opt">(opcional)</span></label>
                <select id="col-email"></select>
              </div>
              <div class="nfx-field">
                <label>Cidade <span class="nfx-opt">(opcional)</span></label>
                <select id="col-city"></select>
              </div>
              <div class="nfx-field" style="grid-column:span 2;">
                <label>Empresa <span class="nfx-opt">(opcional)</span></label>
                <select id="col-company"></select>
              </div>
            </div>

            <p class="nfx-sec-label">Etiquetas <span style="font-weight:400;text-transform:none;letter-spacing:0;color:#c4c9d4;">(opcional)</span></p>
            <div class="nfx-label-opts">
              <div class="nfx-label-opt" id="opt-planilha">
                <label>📋 Da planilha</label>
                <select id="col-labels"></select>
              </div>
              <div class="nfx-label-opt" id="opt-neofluxx">
                <label>☁ Da Neofluxx</label>
                <select id="neo-labels"><option value="">Carregando...</option></select>
                <button class="nfx-btn-create-label" id="btn-create-label" style="display:none;">+ Criar nova etiqueta</button>
                <input type="text" id="label-new" placeholder="Nome da nova etiqueta..." maxlength="50" style="display:none;margin-top:8px;" />
              </div>
            </div>
            <div class="nfx-warn" id="label-warn" style="display:none;">
              ⚠ As etiquetas precisam estar criadas previamente na Neofluxx. Se uma etiqueta não existir na plataforma, o lote inteiro será rejeitado e nenhum contato será importado.
            </div>

            <p class="nfx-sec-label">Preview</p>
            <div class="nfx-preview-box">
              <div class="nfx-preview-header">
                <span class="nfx-sec-label" style="margin:0;">Primeiras linhas</span>
                <span class="nfx-badge" id="preview-count">0 contatos</span>
              </div>
              <div id="dup-warn" style="display:none; padding:8px 14px; border-bottom:0.5px solid #fde68a; background:rgba(245,166,35,0.06); font-size:12px; color:#92600a;">
                ⚠ <span id="dup-warn-text"></span>
              </div>
              <div class="nfx-table-wrap">
                <table class="nfx-table" id="preview-table"></table>
              </div>
              <div id="preview-more" style="display:none;" class="nfx-more"></div>
            </div>

            <div class="nfx-filename-wrap">
              <label>Nome do arquivo</label>
              <input type="text" id="filename-input" placeholder="contatos_neofluxx" maxlength="60" />
              <span class="nfx-filename-ext">_01.csv</span>
            </div>

            <div class="nfx-actions">
              <button class="nfx-btn-primary" id="btn-import-direto">☁ Importar direto na Neofluxx</button>
              <button class="nfx-btn-csv" id="btn-download-csv">⬇ Só baixar CSV</button>
              <button class="nfx-btn-secondary" id="btn-reset">↩</button>
            </div>
            <div class="nfx-toast" id="map-toast"><span id="map-toast-text"></span></div>
          </div>

          <!-- STEP 3: Importar direto -->
          <div id="nfx-step-import" style="display:none;">
            <div class="nfx-step2-card">
              <p class="nfx-sec-label" style="margin-bottom:12px;">Resumo da importação</p>
              <div class="nfx-stat-grid">
                <div class="nfx-stat-box"><p class="nfx-stat-num" id="s2-total">0</p><p class="nfx-stat-label">contatos</p></div>
                <div class="nfx-stat-box"><p class="nfx-stat-num green" id="s2-label">—</p><p class="nfx-stat-label">etiqueta</p></div>
                <div class="nfx-stat-box"><p class="nfx-stat-num" id="s2-dupes">0</p><p class="nfx-stat-label">duplicatas removidas</p></div>
              </div>
            </div>
            <div class="nfx-step2-card" id="import-progress-card" style="display:none;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-size:13px;color:#6b7280;" id="import-status">Aguardando...</span>
                <span style="font-size:13px;font-weight:500;color:#00c48c;" id="import-pct">0%</span>
              </div>
              <div class="nfx-progress-track"><div class="nfx-progress-fill" id="import-bar"></div></div>
              <div class="nfx-progress-stats">
                <span id="s2-criados">✦ 0 novos</span>
                <span id="s2-atualizados">↺ 0 atualizados</span>
                <span id="s2-jatem">= 0 já tinham</span>
                <span id="s2-erros" style="color:#ef4444;">✕ 0 erros</span>
              </div>
              <button id="btn-cancel" style="margin-top:10px;background:none;border:0.5px solid #d1d5db;border-radius:6px;color:#6b7280;font-size:12px;font-family:inherit;padding:5px 12px;cursor:pointer;">⏹ Cancelar</button>
            </div>
            <div class="nfx-result-box" id="import-result">
              <p style="font-size:14px;font-weight:500;color:#00c48c;margin:0 0 12px;" id="result-title">✓ Importação concluída!</p>
              <div class="nfx-stat-grid">
                <div class="nfx-stat-box"><p class="nfx-stat-num" id="r-criados">0</p><p class="nfx-stat-label">novos criados</p></div>
                <div class="nfx-stat-box"><p class="nfx-stat-num" id="r-atualizados">0</p><p class="nfx-stat-label">atualizados</p></div>
                <div class="nfx-stat-box"><p class="nfx-stat-num" id="r-erros">0</p><p class="nfx-stat-label">erros</p></div>
              </div>
              <div class="nfx-errors-list" id="errors-list"></div>
            </div>
            <div class="nfx-actions" id="import-actions">
              <button class="nfx-btn-primary" id="btn-confirm-import">☁ Confirmar importação</button>
              <button class="nfx-btn-secondary" id="btn-back">← Voltar</button>
            </div>
            <div class="nfx-version">${VERSION}</div>
          </div>

        </div>
      </div>
    `;
    return overlay;
  }

  // ============================================================
  // LÓGICA UI
  // ============================================================
  function populateSelects(modal) {
    const lower = headers.map(h => h.toLowerCase());
    FIELDS.forEach(f => {
      const sel = modal.querySelector('#' + f.id);
      if (!sel) return;
      sel.innerHTML = '';
      if (!f.required) sel.innerHTML = '<option value="">— nenhum —</option>';
      headers.forEach((h, j) => {
        const opt = document.createElement('option');
        opt.value = j;
        opt.textContent = h || 'Coluna ' + (j + 1);
        sel.appendChild(opt);
      });
      if (f.required) {
        const found = lower.findIndex(h => f.pattern.test(h));
        if (found >= 0) sel.value = found;
      }
      sel.addEventListener('change', () => renderPreview(modal));
    });

    // col-labels — sem auto-seleção, sempre inicia em nenhum
    const colLabels = modal.querySelector('#col-labels');
    colLabels.innerHTML = '<option value="">— nenhum —</option>';
    headers.forEach((h, j) => {
      const opt = document.createElement('option');
      opt.value = j;
      opt.textContent = h || 'Coluna ' + (j + 1);
      colLabels.appendChild(opt);
    });
  }

  async function loadNeoLabels(modal) {
    const sel = modal.querySelector('#neo-labels');
    try {
      const labels = await fetchLabels();
      sel.innerHTML = '<option value="">— selecione —</option>';
      labels.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l; opt.textContent = l;
        sel.appendChild(opt);
      });
      modal.querySelector('#btn-create-label').style.display = 'block';
    } catch (e) {
      sel.innerHTML = '<option value="">Erro ao carregar</option>';
    }
  }

  function renderPreview(modal) {
    const m = getMapping(modal);
    const deduped = getDedupedRows(modal);
    const dupCount = rows.length - deduped.length;

    modal.querySelector('#preview-count').textContent = deduped.length.toLocaleString('pt-BR') + ' contatos';

    const dupWarn = modal.querySelector('#dup-warn');
    if (dupCount > 0) {
      modal.querySelector('#dup-warn-text').textContent =
        dupCount + ' contato' + (dupCount > 1 ? 's duplicados serão removidos.' : ' duplicado será removido.') +
        ' O CSV será gerado com ' + deduped.length + ' contatos.';
      dupWarn.style.display = 'block';
    } else {
      dupWarn.style.display = 'none';
    }

    const activeLabel = getActiveLabel(modal);
    const activeCols = FIELDS.filter(f => m[f.id] !== '');
    const hasLabelCol = m['col-labels'] !== '';
    const showLabel = hasLabelCol || (activeLabel.value !== '');

    let html = '<tr>' + activeCols.map(f => `<th>${f.label}</th>`).join('') + (showLabel ? '<th>Etiquetas</th>' : '') + '</tr>';
    deduped.slice(0, 5).forEach(r => {
      html += '<tr>';
      activeCols.forEach(f => {
        const raw = r[m[f.id]];
        const val = processValue(f, raw);
        html += `<td class="${f.isPhone ? 'phone' : ''}">${val}</td>`;
      });
      if (showLabel) {
        const lv = getLabelValue(r, m, activeLabel);
        html += `<td>${lv}</td>`;
      }
      html += '</tr>';
    });
    modal.querySelector('#preview-table').innerHTML = html;

    const more = modal.querySelector('#preview-more');
    if (deduped.length > 5) {
      more.style.display = 'block';
      more.textContent = '+ ' + (deduped.length - 5).toLocaleString('pt-BR') + ' linhas adicionais';
    } else {
      more.style.display = 'none';
    }
  }

  // ============================================================
  // DOWNLOAD CSV
  // ============================================================
  const LIMIT_MAX = 1000;
  const LIMIT_BATCH = 500;

  function downloadCSV(modal) {
    const m = getMapping(modal);
    const deduped = getDedupedRows(modal);
    const activeLabel = getActiveLabel(modal);

    if (deduped.length > LIMIT_MAX) {
      showMapToast(modal, '⛔ Planilha excede o limite de ' + LIMIT_MAX + ' contatos.', 'error');
      return;
    }

    const cols = FIELDS.filter(f => m[f.id] !== '');
    const hasLabelCol = m['col-labels'] !== '';
    const allCols = [...cols];
    // Adiciona coluna de labels se: vem da planilha OU vem do dropdown/nova
    if (hasLabelCol || activeLabel.value) {
      allCols.push({ id: 'col-labels', header: 'labels', isPhone: false, isRaw: true });
    }

    const total = deduped.length;
    const fname = (modal.querySelector('#filename-input').value.trim() || 'contatos_neofluxx').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const pad = String(Math.ceil(total / LIMIT_BATCH)).length;

    for (let i = 0; i < total; i += LIMIT_BATCH) {
      const batch = deduped.slice(i, i + LIMIT_BATCH);
      const num = String(Math.floor(i / LIMIT_BATCH) + 1).padStart(pad, '0');
      let csv = allCols.map(f => f.header).join(',') + '\n';
      batch.forEach(r => {
        const vals = allCols.map(f => {
          if (f.id === 'col-labels') {
            return getLabelValue(r, m, activeLabel);
          }
          const raw = r[m[f.id]];
          const val = processValue(f, raw);
          if (f.isPhone) return val;
          return '"' + String(val).replace(/"/g, '""') + '"';
        });
        csv += vals.join(',') + '\n';
      });
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fname + '_' + num + '.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    const batches = Math.ceil(total / LIMIT_BATCH);
    setTimeout(() => showMapToast(modal, '✓ ' + total.toLocaleString('pt-BR') + ' contatos exportados em ' + batches + ' arquivo' + (batches > 1 ? 's' : '') + '.', 'success'), 300);
  }

  function showMapToast(modal, msg, type) {
    const t = modal.querySelector('#map-toast');
    const txt = modal.querySelector('#map-toast-text');
    t.className = 'nfx-toast show ' + type;
    txt.textContent = msg;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 5000);
  }

  // ============================================================
  // IMPORTAR DIRETO
  // ============================================================
  function goImport(modal) {
    savedMapping = getMapping(modal);
    savedLabel = getActiveLabel(modal);
    const deduped = getDedupedRows(modal);
    const label = savedLabel;
    const dupes = rows.length - deduped.length;

    // Mostrar valor real da etiqueta, não o índice nem o cabeçalho
    let labelDisplay = '—';
    if (label.type === 'column' && label.value !== '') {
      const idx = parseInt(label.value);
      // Pega o primeiro valor não vazio da coluna como exemplo
      const sample = deduped.find(r => r[idx] && String(r[idx]).trim());
      labelDisplay = sample ? normalizeLabel(String(sample[idx])) : (headers[idx] || '—');
    } else if (label.value) {
      labelDisplay = label.value;
    }

    modal.querySelector('#s2-total').textContent = deduped.length.toLocaleString('pt-BR');
    modal.querySelector('#s2-label').textContent = labelDisplay;
    modal.querySelector('#s2-dupes').textContent = dupes.toLocaleString('pt-BR');

    modal.querySelector('#nfx-step-map').style.display = 'none';
    modal.querySelector('#nfx-step-import').style.display = 'block';
    modal.querySelector('#import-result').style.display = 'none';
    modal.querySelector('#import-progress-card').style.display = 'none';
    modal.querySelector('#btn-confirm-import').style.display = 'flex';
    modal.querySelector('#import-actions').style.display = 'flex';
    modal.querySelector('#btn-back').textContent = '← Voltar';
    modal.querySelector('#btn-back').disabled = false;
  }

  async function startImport(modal) {
    const m = savedMapping || getMapping(modal);
    const labelInfo = savedLabel || getActiveLabel(modal);
    shouldCancel = false;
    isImporting = false;

    const deduped = getDedupedRows(modal);
    // Se labels vêm da planilha, garantir que todas existem na plataforma antes de importar
    if (labelInfo.type === 'column' && m['col-labels'] !== '') {
      const uniqueLabels = [...new Set(deduped.map(r => normalizeLabel(r[parseInt(m['col-labels'])] || '')).filter(Boolean))];
      for (const lbl of uniqueLabels) {
        try { await ensureLabel(lbl); } catch(e) { log('Erro ao garantir etiqueta:', lbl, e); }
      }
    }

    const contacts = deduped.map((r, idx) => {
      const labelVal = labelInfo.type === 'column'
        ? normalizeLabel(r[parseInt(m['col-labels'])] || '')
        : labelInfo.value;
        return {
        name: toTitleCase(r[m['col-name']] || 'Sem nome'),
        phone_number: formatPhone(r[m['col-phone']]),
        email: m['col-email'] !== '' ? String(r[m['col-email']] || '').trim() : '',
        city: m['col-city'] !== '' ? toTitleCase(r[m['col-city']] || '') : '',
        company_name: m['col-company'] !== '' ? toTitleCase(r[m['col-company']] || '') : '',
        label: labelVal,
        rowIndex: idx + 2,
      };
    }).filter(c => c.phone_number);

    if (!contacts.length) return;

    isImporting = true;
    modal.querySelector('#btn-confirm-import').style.display = 'none';
    modal.querySelector('#btn-back').disabled = true;
    modal.querySelector('#import-progress-card').style.display = 'block';

    let labelTitle = '';
    if (labelInfo.type === 'new' && labelInfo.value) {
      try { labelTitle = await ensureLabel(labelInfo.value); }
      catch (e) { log('Erro ao criar etiqueta:', e); return; }
    }

    const total = contacts.length;
    let processed = 0, criados = 0, atualizados = 0, jatem = 0;
    const errors = [];
    const BATCH_SIZE = total > 200 ? 1 : 2;
    const BATCH_DELAY = total > 200 ? 600 : 350;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      if (shouldCancel) break;
      const batch = contacts.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async c => {
        try {
          const existing = await findContactByPhone(c.phone_number);
          let contactId, existingLabels = [];
          if (existing?.id) {
            contactId = existing.id;
            existingLabels = existing.labels || [];
            atualizados++;
          } else {
            const nc = { name: c.name, phone_number: c.phone_number };
            if (c.email) nc.email = c.email;
            const attrs = {};
            if (c.city) attrs.location = c.city;
            if (c.company_name) attrs.company_name = c.company_name;
            if (Object.keys(attrs).length) nc.additional_attributes = attrs;
            const newC = await api('contacts', 'POST', nc);
            contactId = getContactId(newC);
            if (contactId) criados++;
          }
          if (contactId && c.label) {
            const lbl = labelTitle || c.label;
            const res = await attachLabel(contactId, lbl, existingLabels);
            if (res.alreadyHad) jatem++;
          }
        } catch (err) {
          errors.push(`Linha ${c.rowIndex}: ${c.name} (${c.phone_number}) — ${err.message || 'Erro'}`);
        }
      }));

      processed += batch.length;
      const pct = Math.round((processed / total) * 100);
      modal.querySelector('#import-bar').style.width = pct + '%';
      modal.querySelector('#import-pct').textContent = pct + '%';
      modal.querySelector('#import-status').textContent = `Importando ${processed} de ${total}...`;
      modal.querySelector('#s2-criados').textContent = `✦ ${criados} novos`;
      modal.querySelector('#s2-atualizados').textContent = `↺ ${atualizados} atualizados`;
      modal.querySelector('#s2-jatem').textContent = `= ${jatem} já tinham`;
      modal.querySelector('#s2-erros').textContent = `✕ ${errors.length} erros`;
      await wait(BATCH_DELAY);
    }

    modal.querySelector('#import-progress-card').style.display = 'none';
    const resultBox = modal.querySelector('#import-result');
    resultBox.style.display = 'block';
    modal.querySelector('#btn-confirm-import').style.display = 'none';
    modal.querySelector('#import-actions').style.display = 'flex';

    const hasErrors = errors.length > 0;
    resultBox.className = 'nfx-result-box' + (hasErrors ? ' has-errors' : '');
    const titleEl = modal.querySelector('#result-title');
    titleEl.style.color = hasErrors ? '#ef4444' : '#00c48c';
    titleEl.textContent = shouldCancel ? '⏸ Cancelado' : hasErrors ? '⚠ Concluído com erros' : '✓ Importação concluída!';
    modal.querySelector('#r-criados').textContent = criados;
    modal.querySelector('#r-atualizados').textContent = atualizados;
    modal.querySelector('#r-erros').textContent = errors.length;

    if (hasErrors) {
      const el = modal.querySelector('#errors-list');
      el.style.display = 'block';
      el.innerHTML = errors.map(e => `<div>• ${e}</div>`).join('');
    }

    isImporting = false;
    modal.querySelector('#btn-back').disabled = false;
    modal.querySelector('#btn-back').textContent = '↩ Nova importação';
  }

  // ============================================================
  // RESET
  // ============================================================
  function resetTool(modal) {
    rows = []; headers = [];
    savedMapping = null; savedLabel = null;
    modal.querySelector('#nfx-file-input').value = '';
    modal.querySelector('#nfx-step-map').style.display = 'none';
    modal.querySelector('#nfx-step-import').style.display = 'none';
    modal.querySelector('#nfx-step-upload').style.display = 'block';
    shouldCancel = false;
  }

  // ============================================================
  // ABRIR MODAL
  // ============================================================
  function openModal() {
    if (document.getElementById('nfx-conv-overlay')) {
      const existingOverlay = document.getElementById('nfx-conv-overlay');
      existingOverlay.classList.add('open');
      loadNeoLabels(existingOverlay);
      return;
    }

    const overlay = buildModal();
    document.body.appendChild(overlay);
    overlay.classList.add('open');
    const modal = overlay;

    // Pré-carregar SheetJS e etiquetas da Neofluxx
    loadSheetJS().catch(e => log('Erro ao carregar SheetJS:', e));
    loadNeoLabels(modal);

    // Fechar
    const closeModal = () => { overlay.classList.remove('open'); resetTool(modal); };
    modal.querySelector('#nfx-conv-close').addEventListener('click', () => {
      if (isImporting) {
        if (confirm('Importação em andamento. Deseja cancelar e sair?')) {
          shouldCancel = true;
          isImporting = false;
          closeModal();
        }
      } else {
        closeModal();
      }
    });
    overlay.addEventListener('click', e => {
      // Bloqueia fechar clicando fora em todas as telas exceto upload
      const isOnUpload = modal.querySelector('#nfx-step-upload').style.display !== 'none';
      if (e.target === overlay && isOnUpload) closeModal();
    });

    // Drop zone
    const drop = modal.querySelector('#nfx-drop');
    const fileInput = modal.querySelector('#nfx-file-input');
    drop.addEventListener('click', () => fileInput.click());
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
    drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('drag'); handleFile(e.dataTransfer.files[0], modal); });
    fileInput.addEventListener('change', () => handleFile(fileInput.files[0], modal));

    // Mapeamento
    FIELDS.forEach(f => {
      const sel = modal.querySelector('#' + f.id);
      if (sel) sel.addEventListener('change', () => renderPreview(modal));
    });

    // Labels — planilha vs neofluxx
    const colLabels = modal.querySelector('#col-labels');
    const neoLabels = modal.querySelector('#neo-labels');
    const labelNew = modal.querySelector('#label-new');
    const optP = modal.querySelector('#opt-planilha');
    const optN = modal.querySelector('#opt-neofluxx');

    colLabels.addEventListener('change', () => {
      if (colLabels.value !== '') {
        optN.classList.add('disabled'); optP.classList.add('selected');
      } else {
        optN.classList.remove('disabled'); optP.classList.remove('selected');
      }
      renderPreview(modal);
    });

    neoLabels.addEventListener('change', () => {
      if (neoLabels.value !== '') {
        optP.classList.add('disabled'); optN.classList.add('selected');
        labelNew.style.display = 'none'; labelNew.value = '';
      } else {
        optP.classList.remove('disabled'); optN.classList.remove('selected');
      }
      renderPreview(modal);
    });

    modal.querySelector('#btn-create-label').addEventListener('click', () => {
      if (labelNew.style.display === 'none') {
        labelNew.style.display = 'block';
        neoLabels.value = ''; neoLabels.disabled = true; neoLabels.style.opacity = '.4';
        labelNew.focus();
      } else {
        labelNew.style.display = 'none'; labelNew.value = '';
        neoLabels.disabled = false; neoLabels.style.opacity = '1';
      }
    });

    labelNew.addEventListener('input', () => {
      if (labelNew.value.trim()) {
        optP.classList.add('disabled'); optN.classList.add('selected');
      } else {
        optP.classList.remove('disabled'); optN.classList.remove('selected');
      }
      renderPreview(modal);
    });

    // Botões step map
    modal.querySelector('#btn-import-direto').addEventListener('click', () => goImport(modal));
    modal.querySelector('#btn-download-csv').addEventListener('click', () => downloadCSV(modal));
    modal.querySelector('#btn-reset').addEventListener('click', () => resetTool(modal));
    modal.querySelector('#btn-trocar-arquivo').addEventListener('click', () => resetTool(modal));

    // Botões step import
    modal.querySelector('#btn-confirm-import').addEventListener('click', () => startImport(modal));
    modal.querySelector('#btn-cancel').addEventListener('click', () => { shouldCancel = true; });
    modal.querySelector('#btn-back').addEventListener('click', () => {
      modal.querySelector('#nfx-step-import').style.display = 'none';
      modal.querySelector('#nfx-step-map').style.display = 'block';
      modal.querySelector('#import-result').style.display = 'none';
      modal.querySelector('#import-progress-card').style.display = 'none';
      modal.querySelector('#btn-confirm-import').style.display = 'flex';
      modal.querySelector('#import-actions').style.display = 'flex';
      modal.querySelector('#btn-back').textContent = '← Voltar';
      modal.querySelector('#btn-back').disabled = false;
      loadNeoLabels(modal);
    });
  }

  // ============================================================
  // LER ARQUIVO
  // ============================================================
  async function handleFile(file, modal) {
    if (!file) return;
    await loadSheetJS();
    const reader = new FileReader();
    reader.onload = e => {
      const wb = XLSX.read(e.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (!data || data.length < 2) return;
      headers = data[0].map(String);
      rows = data.slice(1).filter(r => r.some(c => c !== ''));
      populateSelects(modal);
      renderPreview(modal);
      // Preencher badge do arquivo
      const badgeName = modal.querySelector('#nfx-badge-name');
      const badgeMeta = modal.querySelector('#nfx-badge-meta');
      if (badgeName) badgeName.textContent = file.name;
      if (badgeMeta) badgeMeta.textContent = (file.size / 1024).toFixed(0) + ' KB · ' + rows.length.toLocaleString('pt-BR') + ' linhas';
      modal.querySelector('#nfx-step-upload').style.display = 'none';
      modal.querySelector('#nfx-step-map').style.display = 'block';
    };
    reader.readAsBinaryString(file);
  }

  // ============================================================
  // INIT
  // ============================================================
  injectCSS();

  window['nfx_conversor_contatos_open'] = function () {
    openModal();
  };

  log(`Iniciado na conta ${accountId()}.`);

})();