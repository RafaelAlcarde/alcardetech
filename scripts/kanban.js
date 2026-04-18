/* Neofluxx Kanban – UI v2.3.0
 * - Botão lateral fixo na barra esquerda
 * - Kanban ocupa o painel central (como telas nativas do Chatwoot)
 * - Conversas abertas → coluna CONVERSAS por padrão
 * - Drag & Drop entre colunas (posição salva em localStorage)
 * - Dblclick no card abre a conversa na mesma aba
 * - Cards com: avatar, canal (apenas pill ao lado do nome), prioridade, responsável, time, tempo, preview, labels
 * - NOVO: Busca prévias de mensagens via API oficial do Chatwoot
 */
(function () {
  console.log('🎉 KANBAN v4.3 - AUTO-REFRESH! 🎉');
  
  if (window.__neo_kanban_v23) return;
  window.__neo_kanban_v23 = true;

  const ACCOUNT_ID = 1;
  const API_BASE = `/api/v1/accounts/${ACCOUNT_ID}`;
  const API_TOKEN = 'S7yhZL6iKzfySks1BKzTF6ut';
  const PER_PAGE = 80;
  const AUTO_REFRESH_INTERVAL = 120000; // 2 minutos em ms
  const CUSTOM_COLUMNS = []; // Deixe vazio para usar atributo do Chatwoot

  const STORAGE_KEY = `neo_kanban_columns_account_${ACCOUNT_ID}`;
  const COLUMN_NAMES_KEY = `neo_kanban_column_names_account_${ACCOUNT_ID}`;

  let pageOpen = false;
  let conversationCache = {};
  let messageCache = {};
  let dragState = { id: null, fromCol: null };
  let columnMap = loadColumnMap();
  let columnNames = {};
  let page;
  let autoRefreshTimer = null;
  let autoRefreshCountdown = null;
  let secondsUntilRefresh = 0;
  
  (async function initKanban() {
    columnNames = await loadDynamicColumns();
    console.log('[KANBAN] ✅ Colunas:', Object.keys(columnNames).length);
    
    // Cria a página após carregar as colunas
    createKanbanPage();
    
    // Adiciona event listeners
    setupEventListeners();

    // Event listener do botão fechar
    page.querySelector('#neo-close-btn').addEventListener('click', closePage);

    // Chama após criar a página
    makeColumnNameEditable();

    // Event listener do botão atualizar
    const refreshBtnEl = page.querySelector('#neo-refresh-btn');
    if (refreshBtnEl) refreshBtnEl.onclick = () => fetchConversations(true);

    // Abre automaticamente quando estiver pronto
    openPage();
  })();
  
  function createKanbanPage() {
    page = document.createElement('div');
    page.id = 'neo-kanban-page';
    page.className = 'neo-hidden';
    page.innerHTML = `
      <div id="neo-kanban-header">
        <h3><span class="neo-dot"></span>KANBAN – NEOFLUXX</h3>
        <button id="neo-close-btn">✕ Fechar</button>
      </div>
      <div id="neo-kanban-controls">
        <button id="neo-refresh-btn">↻ Atualizar agora</button>
        <span class="neo-status" id="neo-status-msg">Pronto para carregar conversas.</span>
        <span class="neo-sync-time" id="neo-last-sync"></span>
      </div>
      <div id="neo-kanban-board">
        ${generateColumnsHTML()}
      </div>
    `;
    
    // Injeta CSS dinâmico para as colunas
    const dynamicStyle = document.createElement('style');
    dynamicStyle.id = 'neo-kanban-dynamic-styles';
    dynamicStyle.textContent = generateColumnStyles();
    document.head.appendChild(dynamicStyle);
  }
  
  function setupEventListeners() {
    if (!page) return;
    
    const refreshBtn = page.querySelector('#neo-refresh-btn');
    const closeBtn = page.querySelector('#neo-close-btn');
    
    if (refreshBtn) {
      let isRefreshing = false;
      refreshBtn.addEventListener('click', async () => {
        if (isRefreshing) return;
        
        isRefreshing = true;
        refreshBtn.disabled = true;
        refreshBtn.textContent = '⏳ Atualizando...';
        
        try {
          columnNames = await loadDynamicColumns();
          
          const boardEl = page.querySelector('#neo-kanban-board');
          if (boardEl) {
            boardEl.innerHTML = generateColumnsHTML();
            attachDragEventsToColumns();
            setupColumnNameEdit();
          }
          
          const oldStyle = document.getElementById('neo-kanban-dynamic-styles');
          if (oldStyle) oldStyle.remove();
          
          const dynamicStyle = document.createElement('style');
          dynamicStyle.id = 'neo-kanban-dynamic-styles';
          dynamicStyle.textContent = generateColumnStyles();
          document.head.appendChild(dynamicStyle);
          
          await fetchConversations(true);
          
          // Reseta o timer do auto-refresh
          startAutoRefresh();
          
        } catch (error) {
          console.error('[KANBAN] ❌ Erro:', error);
        } finally {
          isRefreshing = false;
          refreshBtn.disabled = false;
          refreshBtn.textContent = '↻ Atualizar agora';
        }
      });
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', closePage);
    }
    
    // Setup drag and drop
    attachDragEventsToColumns();
    
    // Setup edição de nomes das colunas
    setupColumnNameEdit();
  }
  
  function setupColumnNameEdit() {
    if (!page) return;
    
    const colNames = page.querySelectorAll('.neo-col-name');
    colNames.forEach(nameEl => {
      nameEl.addEventListener('dblclick', () => {
        const colId = nameEl.dataset.col;
        if (!colId) return;
        
        const currentName = columnNames[colId];
        const newName = prompt('Novo nome da coluna:', currentName);
        
        if (newName && newName.trim()) {
          columnNames[colId] = newName.toUpperCase();
          saveColumnNames();
          nameEl.textContent = columnNames[colId];
          console.log(`[KANBAN] Coluna "${colId}" renomeada para "${columnNames[colId]}"`);
        }
      });
    });
  }

  /* ---------- BUSCAR COLUNAS DO ATRIBUTO PERSONALIZADO ---------- */
  async function loadColumnsFromAttribute() {
    try {
      const response = await fetch(`${API_BASE}/custom_attribute_definitions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': API_TOKEN
        }
      });

      if (!response.ok) {
        console.warn('[KANBAN] ⚠️ Erro ao buscar atributos:', response.status);
        return null;
      }

      const definitions = await response.json();
      
      const kanbanColunasAttr = definitions.find(attr => 
        attr.attribute_key === 'kanban_colunas' && 
        attr.attribute_display_type === 'list'
      );
      
      if (kanbanColunasAttr && kanbanColunasAttr.attribute_values && kanbanColunasAttr.attribute_values.length > 0) {
        return kanbanColunasAttr.attribute_values;
      } else {
        console.warn('[KANBAN] ⚠️ Atributo kanban_colunas não encontrado');
        return null;
      }
      
    } catch (e) {
      console.error('[KANBAN] ❌ Erro ao buscar atributos:', e);
      return null;
    }
  }

  async function loadDynamicColumns() {
    const customCols = await loadColumnsFromAttribute();
    
    if (customCols && customCols.length > 0) {
      const cols = {};
      customCols.forEach((name) => {
        const id = name.toLowerCase().replace(/\s+/g, '_');
        cols[id] = name.toUpperCase();
      });
      return cols;
    }
    
    console.log('[KANBAN] ⚠️ Usando colunas padrão');
    return {
      conversas: 'CONVERSAS',
      em_atendimento: 'EM ATENDIMENTO',
      aguardando: 'AGUARDANDO CLIENTE'
    };
  }

  function getAccountId() {
    const match = window.location.pathname.match(/\/app\/accounts\/(\d+)/);
    return match ? match[1] : null;
  }

  /* ---------- localStorage para nomes das colunas ---------- */
  function loadColumnNames() {
    try {
      const raw = localStorage.getItem(COLUMN_NAMES_KEY);
      if (!raw) return {
        conversas: 'CONVERSAS',
        em_atendimento: 'EM ATENDIMENTO',
        aguardando: 'AGUARDANDO CLIENTE'
      };
      return JSON.parse(raw);
    } catch (e) {
      console.warn('[KANBAN] Erro ao ler nomes das colunas:', e);
      return {
        conversas: 'CONVERSAS',
        em_atendimento: 'EM ATENDIMENTO',
        aguardando: 'AGUARDANDO CLIENTE'
      };
    }
  }

  function saveColumnNames() {
    try {
      localStorage.setItem(COLUMN_NAMES_KEY, JSON.stringify(columnNames));
    } catch (e) {
      console.warn('[KANBAN] Erro ao salvar nomes das colunas:', e);
    }
  }

  /* ---------- FUNÇÕES DE POSICIONAMENTO ---------- */

  function getMainContainer() {
    return (
      document.querySelector('#app main .router-view') ||
      document.querySelector('#app main .main-view') ||
      document.querySelector('#app main .app-content') ||
      document.querySelector('#app main') ||
      document.querySelector('.router-view') ||
      document.querySelector('.app-content') ||
      document.querySelector('main')
    );
  }

  function positionKanbanPage(pageEl) {
    // Não faz NADA - deixa o CSS fazer o trabalho
    // O elemento já está com position: fixed e inset definidos no CSS
  }

  /* ---------- ATUALIZAR ATRIBUTO VIA API ---------- */
  async function updateKanbanPosition(conversationId, columnId) {
    try {
      console.log(`[KANBAN] 💾 Salvando posição: conversa ${conversationId} → coluna ${columnId}`);
      
      const response = await fetch(`${API_BASE}/conversations/${conversationId}/custom_attributes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': API_TOKEN
        },
        body: JSON.stringify({
          custom_attributes: {
            kanban_posicao: columnId
          }
        })
      });
      
      if (response.ok) {
        console.log(`[KANBAN] ✅ Posição salva com sucesso!`);
        return true;
      } else {
        const errorText = await response.text();
        console.warn('[KANBAN] ⚠️ Erro ao salvar posição:', response.status, errorText);
        return false;
      }
    } catch (e) {
      console.error('[KANBAN] ❌ Erro ao salvar posição:', e);
      return false;
    }
  }

  /* ---------- BUSCAR ATRIBUTOS PERSONALIZADOS ---------- */
  let customColumns = null; // Cache das colunas customizadas
  
  async function fetchCustomAttributes() {
    try {
      const accountId = window.location.pathname.match(/\/accounts\/(\d+)/)?.[1];
      if (!accountId) return null;
      
      const response = await fetch(`/api/v1/accounts/${accountId}/custom_attribute_definitions`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      
      // Procura o atributo kanban_colunas
      const kanbanAttr = data.find(attr => 
        attr.attribute_key === 'kanban_colunas' && 
        attr.attribute_display_type === 'list'
      );
      
      if (kanbanAttr && kanbanAttr.attribute_values) {
        console.log('[KANBAN] ✅ Atributo kanban_colunas encontrado:', kanbanAttr.attribute_values);
        return kanbanAttr.attribute_values;
      }
      
      return null;
    } catch (e) {
      console.warn('[KANBAN] Erro ao buscar atributos personalizados:', e);
      return null;
    }
  }
  
  /* ---------- localStorage ---------- */
  function loadColumnMap() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      console.warn('[KANBAN] Erro ao ler columnMap do localStorage:', e);
      return {};
    }
  }
  function saveColumnMap() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(columnMap));
    } catch (e) {
      console.warn('[KANBAN] Erro ao salvar columnMap:', e);
    }
  }
  function cleanColumnMap(validIds) {
    const set = new Set(validIds);
    let changed = false;
    Object.keys(columnMap).forEach(id => {
      if (!set.has(Number(id))) {
        delete columnMap[id];
        changed = true;
      }
    });
    if (changed) saveColumnMap();
  }

  /* ---------- ESTILOS ---------- */
  const style = document.createElement('style');
  style.textContent = `
    /* Box-sizing isolado no escopo do Kanban */
    #neo-kanban-page * { box-sizing: border-box; }
    
    /* Estilos do botão sidebar */
    
    /* Hover - fundo cinza suave igual Configurações */ .flex.items-center:hover {
      background-color: #f1f5f9 !important;
      transition: background-color 0.15s ease;
    }
    
    /* Estado ativo - fundo um pouco mais escuro */

    #neo-kanban-page {
      width: 100%;
      height: 100%;
      min-height: calc(100vh - 80px);
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      font-family: system-ui, -apple-system, BlinkMacSystemFont;
      background: #f5f5f7;
    }
    #neo-kanban-page.neo-hidden { display: none; }

    #neo-kanban-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      border-bottom: 1px solid rgba(148,163,184,0.35);
      background: #f8fafc;
    }
    #neo-kanban-header h3 {
      margin: 0;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .neo-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #22c55e;
    }
    #neo-close-btn {
      font-size: 12px;
      cursor: pointer;
      opacity: 0.9;
    }
    #neo-close-btn:hover { opacity: 1; }

    #neo-kanban-body {
      flex: 1;
      padding: 10px 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    #neo-kanban-board {
      flex: 1;
      display: flex;
      gap: 12px;
      overflow-x: auto;
    }

    .neo-col {
      flex: 1 1 0;
      min-width: 260px;
      border-radius: 16px;
      border: 1px solid rgba(148,163,184,0.25);
      display: flex;
      flex-direction: column;
      max-height: 100%;
      background: #ffffff;
      box-shadow: 0 10px 30px rgba(15,23,42,0.04);
      transition: border-color .15s, box-shadow .15s, transform .15s;
    }
    
    .neo-col.drag-over {
      border-color: #38bdf8;
      box-shadow: 0 0 0 2px rgba(56,189,248,0.4);
      transform: translateY(-1px);
    }

    .neo-col[data-col="conversas"] {
      background: linear-gradient(180deg, #e0f2fe 0%, #ffffff 40%);
    }
    .neo-col[data-col="em_atendimento"] {
      background: linear-gradient(180deg, #fef3c7 0%, #ffffff 40%);
    }
    .neo-col[data-col="aguardando"] {
      background: linear-gradient(180deg, #dcfce7 0%, #ffffff 40%);
    }

    .neo-col-header {
      padding: 12px 14px 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      text-transform: uppercase;
      letter-spacing: .06em;
      font-size: 11px;
      font-weight: 600;
    }
    .neo-col-header span:first-child {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .neo-col-header span:first-child::before {
      content: "";
      width: 6px;
      height: 18px;
      border-radius: 999px;
      display: inline-block;
    }
    .neo-col-name {
      cursor: text;
      padding: 2px 4px;
      border-radius: 4px;
      transition: background 0.15s;
    }
    .neo-col-name:hover {
      background: rgba(255,255,255,0.15);
    }
    .neo-col[data-col="conversas"] .neo-col-header span:first-child::before {
      background: #3b82f6;
    }
    .neo-col[data-col="em_atendimento"] .neo-col-header span:first-child::before {
      background: #f97316;
    }
    .neo-col[data-col="aguardando"] .neo-col-header span:first-child::before {
      background: #16a34a;
    }

    .neo-badge {
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 10px;
      background: rgba(15,23,42,0.06);
    }

    .neo-list {
      padding: 8px 10px 10px;
      overflow-y: auto;
    }

    .neo-card {
      border-radius: 18px;
      border: 1px solid rgba(148,163,184,0.25);
      padding: 8px 10px 9px;
      margin-bottom: 8px;
      font-size: 11px;
      cursor: grab;
      transition: .15s;
      background: #ffffff;
      box-shadow: 0 6px 16px rgba(15,23,42,0.08);
      position: relative;
    }
    .neo-card:active { cursor: grabbing; }
    .neo-card.dragging { opacity: 0.35; }
    .neo-card:hover {
      border-color: #38bdf8;
      box-shadow: 0 10px 24px rgba(15,23,42,0.18);
      transform: translateY(-1px);
    }

    .neo-card-main {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .neo-avatar {
      width: 32px;
      height: 32px;
      border-radius: 999px;
      flex-shrink: 0;
      overflow: hidden;
      background: linear-gradient(135deg, #3b82f6, #0ea5e9);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #f9fafb;
      font-weight: 600;
      font-size: 12px;
    }
    .neo-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .neo-card-body { flex: 1; min-width: 0; }

    .neo-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      margin-bottom: 4px;
    }
    .neo-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      font-size: 11px;
      flex: 1;
      overflow: hidden;
    }
    .neo-title span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .neo-pill-col {
      padding: 2px 7px;
      border-radius: 999px;
      font-size: 9px;
      background: rgba(15,23,42,0.07);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .neo-meta-line {
      font-size: 10px;
      color: #64748b;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
    }

    .neo-preview {
      font-size: 10px;
      color: #475569;
      margin-bottom: 6px;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      line-height: 1.4;
    }

    .neo-labels-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 6px;
    }
    .neo-label {
      padding: 2px 7px;
      border-radius: 999px;
      font-size: 9px;
      background: rgba(15,23,42,0.05);
      border: 1px solid rgba(15,23,42,0.08);
    }

    .neo-open-btn {
      width: 100%;
      padding: 6px 10px;
      margin-top: 6px;
      border-radius: 8px;
      border: 1px solid rgba(56,189,248,0.3);
      background: linear-gradient(135deg, #38bdf8, #0ea5e9);
      color: #ffffff;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .neo-open-btn:hover {
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
      box-shadow: 0 4px 12px rgba(56,189,248,0.4);
      transform: translateY(-1px);
    }
    .neo-open-btn:active {
      transform: translateY(0);
    }

    .neo-unread-badge {
      position: absolute;
      top: 6px;
      right: 6px;
      background: #ef4444;
      color: #ffffff;
      font-size: 9px;
      font-weight: 600;
      padding: 3px 6px;
      border-radius: 999px;
      min-width: 18px;
      text-align: center;
    }

    .neo-channel-pill {
      padding: 2px 6px;
      border-radius: 999px;
      font-size: 9px;
      font-weight: 500;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .neo-channel-pill.ch-whatsapp { background: #dcfce7; color: #15803d; }
    .neo-channel-pill.ch-email { background: #dbeafe; color: #1e40af; }
    .neo-channel-pill.ch-api { background: #e0e7ff; color: #4338ca; }
    .neo-channel-pill.ch-telegram { background: #dbeafe; color: #0369a1; }
    .neo-channel-pill.ch-web { background: #f3e8ff; color: #6b21a8; }
    .neo-channel-pill.ch-facebook { background: #dbeafe; color: #1e3a8a; }
    .neo-channel-pill.ch-twitter { background: #e0f2fe; color: #0c4a6e; }
    .neo-channel-pill.ch-instagram { background: #fce7f3; color: #9f1239; }
    .neo-channel-pill.ch-line { background: #dcfce7; color: #14532d; }
    .neo-channel-pill.ch-sms { background: #fef3c7; color: #92400e; }

    .neo-prio {
      padding: 2px 7px;
      border-radius: 999px;
      font-size: 9px;
      font-weight: 600;
      white-space: nowrap;
    }
    .neo-prio-low { background: #dbeafe; color: #1e40af; }
    .neo-prio-medium { background: #fef3c7; color: #92400e; }
    .neo-prio-high { background: #fed7aa; color: #9a3412; }
    .neo-prio-urgent { background: #fee2e2; color: #991b1b; }

    .neo-empty {
      text-align: center;
      padding: 20px;
      color: #94a3b8;
      font-size: 11px;
    }

    .neo-tools {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid rgba(148,163,184,0.25);
      flex-wrap: wrap;
      position: relative;
      min-width: 0;
      overflow-x: auto;
    }
    .neo-tools button {
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid rgba(148,163,184,0.3);
      background: #f8fafc;
      cursor: pointer;
      font-size: 11px;
      flex-shrink: 0;
    }
    .neo-tools button:hover { background: #e2e8f0; }
    .neo-tools button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    
    .neo-status {
      font-size: 10px;
      color: #64748b;
      flex: 1;
      margin-left: 8px;
    }
    .neo-sync-time {
      font-size: 10px;
      color: #94a3b8;
    }
  `;
  document.head.appendChild(style);

  /* ---------- GERAR CSS DINÂMICO PARA COLUNAS ---------- */
  function generateColumnStyles() {
    if (!columnNames || typeof columnNames !== 'object') {
      console.warn('[KANBAN] ⚠️ columnNames não está definido');
      return '';
    }
    
    const colors = [
      { bg: '#e0e7ff', bar: '#6366f1' },  // Indigo
      { bg: '#fce7f3', bar: '#ec4899' },  // Rosa
      { bg: '#fef3c7', bar: '#f59e0b' },  // Amarelo
      { bg: '#dcfce7', bar: '#10b981' },  // Verde
      { bg: '#e0f2fe', bar: '#3b82f6' },  // Azul
      { bg: '#f3e8ff', bar: '#a855f7' },  // Roxo
      { bg: '#fed7aa', bar: '#f97316' },  // Laranja
      { bg: '#cffafe', bar: '#06b6d4' },  // Cyan
    ];
    
    let css = '';
    Object.keys(columnNames).forEach((colId, index) => {
      const colorIndex = index % colors.length;
      const color = colors[colorIndex];
      
      css += `
        .neo-col[data-col="${colId}"] {
          background: linear-gradient(180deg, ${color.bg} 0%, #ffffff 40%);
        }
        .neo-col[data-col="${colId}"] .neo-col-header span:first-child::before {
          background: ${color.bar};
        }
      `;
    });
    
    return css;
  }

  /* ---------- GERAR COLUNAS DINÂMICAS ---------- */
  function generateColumnsHTML() {
    let html = '';
    Object.keys(columnNames).forEach(colId => {
      const colName = columnNames[colId];
      html += `
        <div class="neo-col" data-col="${colId}">
          <div class="neo-col-header">
            <span class="neo-col-name" data-col="${colId}">${colName}</span>
            <span class="neo-badge" data-count="${colId}">0</span>
          </div>
          <div class="neo-list"></div>
        </div>
      `;
    });
    return html;
  }

  // Page será criado assincronamente após carregar colunas

  /* ---------- STATUS E REFERÊNCIAS ---------- */
  function getStatusElements() {
    if (!page) return { statusMsgEl: null, lastSyncEl: null };
    return {
      statusMsgEl: page.querySelector('#neo-status-msg'),
      lastSyncEl: page.querySelector('#neo-last-sync')
    };
  }

  /* ---------- ABRIR/FECHAR KANBAN ---------- */
  function openPage() {
    if (!page) {
      console.warn('[KANBAN] Aguardando inicialização...');
      return;
    }
    
    const main = getMainContainer();
    if (!main) return;
    
    // Esconde o conteúdo original
    const children = Array.from(main.children);
    children.forEach(child => {
      if (child.id !== 'neo-kanban-page') {
        child.style.display = 'none';
      }
    });
    
    // Adiciona o Kanban se não estiver lá
    if (!main.contains(page)) {
      main.appendChild(page);
    }
    
    page.classList.remove('neo-hidden');
    pageOpen = true;
    

    
    fetchConversations(true);
    startAutoRefresh();
    console.log('[KANBAN] ✅ Aberto');
  }

  function closePage() {
    const main = getMainContainer();
    if (!main) return;
    
    page.classList.add('neo-hidden');
    pageOpen = false;
    stopAutoRefresh();
    
    const kanbanLi = null; // sidebar gerenciada pelo Neofluxx Studio
    if (kanbanLi) {
      kanbanLi.classList.remove('active');
      setActiveStyle(kanbanLi, false);
    }
    
    const children = Array.from(main.children);
    children.forEach(child => {
      if (child.id !== 'neo-kanban-page') {
        child.style.display = '';
      }
    });
    
    console.log('[KANBAN] ✅ Fechado');
  }

  /* ---------- AUTO-REFRESH ---------- */
  function startAutoRefresh() {
    stopAutoRefresh();
    
    secondsUntilRefresh = AUTO_REFRESH_INTERVAL / 1000;
    updateCountdownDisplay();
    
    // Countdown a cada segundo
    autoRefreshCountdown = setInterval(() => {
      secondsUntilRefresh--;
      updateCountdownDisplay();
      
      if (secondsUntilRefresh <= 0) {
        secondsUntilRefresh = AUTO_REFRESH_INTERVAL / 1000;
      }
    }, 1000);
    
    // Refresh a cada intervalo
    autoRefreshTimer = setInterval(() => {
      if (!dragState.id) { // Só atualiza se não estiver arrastando
        console.log('[KANBAN] 🔄 Auto-refresh');
        fetchConversations(false);
      }
    }, AUTO_REFRESH_INTERVAL);
    
    console.log('[KANBAN] ⏰ Auto-refresh ativado (2 min)');
  }

  function stopAutoRefresh() {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }
    if (autoRefreshCountdown) {
      clearInterval(autoRefreshCountdown);
      autoRefreshCountdown = null;
    }
    updateCountdownDisplay();
  }

  function updateCountdownDisplay() {
    const lastSyncEl = document.getElementById('neo-last-sync');
    if (!lastSyncEl) return;
    
    if (autoRefreshCountdown && secondsUntilRefresh > 0) {
      const minutes = Math.floor(secondsUntilRefresh / 60);
      const seconds = secondsUntilRefresh % 60;
      lastSyncEl.textContent = `Próxima atualização em ${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
      lastSyncEl.textContent = '';
    }
  }

  // event listener movido para dentro do initKanban

  // Reposiciona quando a janela é redimensionada
  // Debounce no resize (como no script que funciona)
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (!page.classList.contains('neo-hidden')) {
        positionKanbanPage(page);
      }
    }, 150);
  });

  /* ---------- EDIÇÃO DE NOMES DAS COLUNAS ---------- */
  function makeColumnNameEditable() {
    page.querySelectorAll('.neo-col-name').forEach(nameEl => {
      nameEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const colId = nameEl.dataset.col;
        const currentName = columnNames[colId];
        
        // Cria input para edição
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.className = 'neo-col-name-input';
        input.style.cssText = `
          width: 100%;
          background: rgba(255,255,255,0.9);
          border: 1px solid #38bdf8;
          border-radius: 4px;
          padding: 4px 6px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        `;
        
        // Substitui o span pelo input
        nameEl.style.display = 'none';
        nameEl.parentNode.insertBefore(input, nameEl);
        input.focus();
        input.select();
        
        // Função para salvar
        const save = () => {
          const newName = input.value.trim();
          if (newName && newName !== currentName) {
            columnNames[colId] = newName.toUpperCase();
            saveColumnNames();
            nameEl.textContent = columnNames[colId];
          }
          input.remove();
          nameEl.style.display = '';
        };
        
        // Salva ao pressionar Enter ou perder foco
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            save();
          } else if (e.key === 'Escape') {
            input.remove();
            nameEl.style.display = '';
          }
        });
      });
      
      // Adiciona cursor pointer para indicar que é editável
      nameEl.style.cursor = 'text';
      nameEl.title = 'Duplo clique para editar';
    });
  }


  /* ---------- FUNÇÕES AUXILIARES ---------- */
  function getColumn(conv) {
    // Prioridade 1: Atributo do backend (se existir e for válido)
    const kanbanPos = conv.custom_attributes?.kanban_posicao;
    if (kanbanPos) {
      const normalizedId = kanbanPos.toLowerCase().replace(/\s+/g, '_');
      
      // Verifica se a coluna existe
      if (columnNames[normalizedId]) {
        // Sincroniza localStorage com backend
        columnMap[conv.id] = normalizedId;
        return normalizedId;
      } else {
        console.warn(`[KANBAN] ⚠️ Coluna ${normalizedId} do backend não existe mais`);
      }
    }
    
    // Prioridade 2: localStorage (quando backend não tem ou é inválido)
    const localSaved = columnMap[conv.id];
    if (localSaved && columnNames[localSaved]) {
      return localSaved;
    }
    
    // Fallback: Primeira coluna disponível
    const firstCol = Object.keys(columnNames)[0];
    return firstCol || 'coluna1';
  }

  function openConversationInSameSession(convId) {
    const origin = window.location.origin;
    const path = window.location.pathname;
    const parts = path.split('/');
    let accountPart = '';
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === 'accounts' && i + 1 < parts.length) {
        accountPart = parts[i + 1];
        break;
      }
    }
    if (!accountPart) {
      accountPart = String(ACCOUNT_ID);
    }
    const convUrl = `${origin}/app/accounts/${accountPart}/conversations/${convId}`;
    window.location.href = convUrl;
  }

  function clearBoard() {
    page.querySelectorAll('.neo-list').forEach(el => { el.innerHTML = ''; });
  }

  function formatRelative(raw) {
    if (!raw) return '-';
    let value = raw;

    // trata timestamp numérico (segundos ou ms)
    if (typeof value === 'number') {
      if (value < 1e12) value = value * 1000;
    }

    const d = new Date(value);
    if (isNaN(d.getTime())) return '-';

    const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `${diffMin} min atrás`;
    const h = Math.round(diffMin / 60);
    if (h < 24) return `${h} h atrás`;
    const dDias = Math.round(h / 24);
    return `${dDias} d atrás`;
  }

  function getAvatar(conv, name) {
    const sender = conv.meta?.sender;
    if (sender?.thumbnail) {
      return `<div class="neo-avatar"><img src="${sender.thumbnail}" alt="${name}"/></div>`;
    }
    const initial = name.charAt(0).toUpperCase();
    return `<div class="neo-avatar">${initial}</div>`;
  }

  function getChannelPill(conv) {
    let type = conv.channel || conv.meta?.channel || '';
    if (typeof type === 'object' && type.channel_type) type = type.channel_type;
    type = String(type).toLowerCase();
    const map = {
      'channel::whatsapp': { txt: 'WhatsApp', cls: 'ch-whatsapp' },
      'channel::web_widget': { txt: 'Web', cls: 'ch-web' },
      'channel::email': { txt: 'Email', cls: 'ch-email' },
      'channel::api': { txt: 'API', cls: 'ch-api' },
      'channel::telegram': { txt: 'Telegram', cls: 'ch-telegram' },
      'channel::facebook': { txt: 'Facebook', cls: 'ch-facebook' },
      'channel::twitter': { txt: 'Twitter', cls: 'ch-twitter' },
      'channel::instagram': { txt: 'Instagram', cls: 'ch-instagram' },
      'channel::line': { txt: 'Line', cls: 'ch-line' },
      'channel::sms': { txt: 'SMS', cls: 'ch-sms' },
    };
    const info = map[type];
    if (!info) {
      if (type.includes('whatsapp')) return '<span class="neo-channel-pill ch-whatsapp">WhatsApp</span>';
      if (type.includes('email')) return '<span class="neo-channel-pill ch-email">Email</span>';
      if (type.includes('api')) return '<span class="neo-channel-pill ch-api">API</span>';
      return '';
    }
    return `<span class="neo-channel-pill ${info.cls}">${info.txt}</span>`;
  }

  function getPriorityInfo(conv) {
    const raw = conv.priority || conv.meta?.priority;
    if (!raw || raw === 'none') return null;
    const key = String(raw).toLowerCase();
    const map = {
      low: { text: 'BAIXA', cls: 'neo-prio-low' },
      medium: { text: 'MÉDIA', cls: 'neo-prio-medium' },
      high: { text: 'ALTA', cls: 'neo-prio-high' },
      urgent: { text: 'URGENTE', cls: 'neo-prio-urgent' },
    };
    const info = map[key] || { text: raw.toUpperCase(), cls: 'neo-prio-medium' };
    return info;
  }

  function getUnreadCount(conv) {
    return (
      conv.unread_count ||
      conv.meta?.unread_count ||
      conv.meta?.messages_unread_count ||
      0
    );
  }

  function getAssigneeName(conv) {
    return (
      conv.assignee?.name ||
      conv.meta?.assignee?.name ||
      conv.meta?.assigned_agent?.name ||
      conv.meta?.agent?.name ||
      ''
    );
  }

  function getTeamName(conv) {
    const team = conv.team || conv.meta?.team;
    if (!team) return '';
    if (typeof team === 'string') return team;
    return team.name || '';
  }

  /* ---------- BUSCAR ÚLTIMA MENSAGEM VIA API ---------- */
  async function fetchLastMessage(conversationId) {
    // Verifica se já tem no cache
    if (messageCache[conversationId]) {
      return messageCache[conversationId];
    }

    try {
      const url = `${API_BASE}/conversations/${conversationId}/messages`;
      
      // Usa o mesmo token para buscar mensagens
      const resp = await fetch(url, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': API_TOKEN,
        },
      });

      if (!resp.ok) {
        console.warn(`[KANBAN] Erro ao buscar mensagens da conversa ${conversationId}:`, resp.status);
        return 'Não foi possível carregar a prévia.';
      }

      const data = await resp.json();
      
      // A API retorna um objeto com a propriedade 'payload' que contém o array de mensagens
      let messages = [];
      if (data.payload && Array.isArray(data.payload)) {
        messages = data.payload;
      } else if (Array.isArray(data)) {
        messages = data;
      }

      if (messages.length === 0) {
        const preview = 'Nenhuma mensagem ainda.';
        messageCache[conversationId] = preview;
        return preview;
      }

      // Filtra mensagens que não são de atividade (ignora mensagens do sistema)
      const userMessages = messages.filter(msg => 
        msg.message_type !== 'activity' && 
        msg.content && 
        msg.content.trim() !== ''
      );

      if (userMessages.length === 0) {
        const preview = 'Sem mensagens de usuário.';
        messageCache[conversationId] = preview;
        return preview;
      }

      // Pega a última mensagem não-atividade
      const lastMsg = userMessages[userMessages.length - 1];
      let content = lastMsg.content || '';

      // Remove HTML tags e limpa o texto
      content = String(content)
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Limita o tamanho
      if (content.length > 120) {
        content = content.slice(0, 117) + '...';
      }

      const preview = content || 'Mensagem sem conteúdo.';
      messageCache[conversationId] = preview;
      return preview;

    } catch (err) {
      console.error(`[KANBAN] Erro ao buscar mensagens da conversa ${conversationId}:`, err);
      return 'Erro ao carregar prévia.';
    }
  }

  /* ---------- RENDERIZAR BOARD ---------- */
  async function renderBoard(conversations) {
    clearBoard();
    conversationCache = {};
    messageCache = {}; // Limpa cache de mensagens ao recarregar
    conversations.forEach(c => { conversationCache[c.id] = c; });

    // Cria referências dinâmicas para todas as colunas
    const cols = {};
    const counters = {};
    Object.keys(columnNames).forEach(colId => {
      cols[colId] = page.querySelector(`.neo-col[data-col="${colId}"] .neo-list`);
      counters[colId] = 0;
    });

    // Primeiro renderiza os cards com "Carregando prévia..."
    const cardElements = [];
    
    conversations.forEach(conv => {
      const colKey = getColumn(conv);
      counters[colKey] = (counters[colKey] || 0) + 1;

      const colEl = cols[colKey];
      if (!colEl) {
        console.warn(`[KANBAN] Coluna "${colKey}" não encontrada para conversa ${conv.id}`);
        return;
      }

      const name =
        conv.meta?.sender?.name ||
        conv.contact?.name ||
        'Contato';

      const updated = formatRelative(conv.updated_at || conv.last_activity_at || conv.timestamp);
      const assigneeName = getAssigneeName(conv) || 'Sem responsável';
      const teamName = getTeamName(conv);
      const labels = conv.labels || [];
      const unread = getUnreadCount(conv);
      const avatarHtml = getAvatar(conv, name);
      const channelPill = getChannelPill(conv);
      const priorityInfo = getPriorityInfo(conv);

      let labelsHtml = '';
      if (labels.length) {
        const first = labels.slice(0, 3);
        labelsHtml =
          first.map(l => `<span class="neo-label">${l}</span>`).join(' ');
        if (labels.length > 3) {
          labelsHtml += `<span class="neo-label">+${labels.length - 3}</span>`;
        }
      }

      let colPillText = '';
      if (colKey === 'em_atendimento') colPillText = 'em atendimento';
      else if (colKey === 'aguardando') colPillText = 'aguardando';

      const prioHtml = priorityInfo
        ? `<span class="neo-prio ${priorityInfo.cls}">${priorityInfo.text}</span>`
        : '';

      const metaParts = [];
      if (assigneeName) metaParts.push(`<span>${assigneeName}</span>`);
      if (teamName) metaParts.push(`<span>Time ${teamName}</span>`);
      if (updated && updated !== '-') metaParts.push(`<span>${updated}</span>`);
      let metaHtml = metaParts.join('<span> • </span>');
      if (prioHtml) {
        metaHtml += metaHtml ? ` <span>•</span> ${prioHtml}` : prioHtml;
      }

      const card = document.createElement('div');
      card.className = 'neo-card';
      card.dataset.col = colKey;
      card.dataset.convId = conv.id;

      card.innerHTML = `
        ${unread > 0 ? `<div class="neo-unread-badge">${unread}</div>` : ''}
        <div class="neo-card-main">
          ${avatarHtml}
          <div class="neo-card-body">
            <div class="neo-title-row">
              <div class="neo-title">
                <span>${name}</span>
                ${channelPill}
              </div>
              ${colPillText ? `<span class="neo-pill-col">${colPillText}</span>` : ''}
            </div>
            <div class="neo-meta-line">${metaHtml}</div>
            <div class="neo-preview">Carregando prévia...</div>
            ${
              labelsHtml
                ? `<div class="neo-labels-row">${labelsHtml}</div>`
                : ''
            }
            <button class="neo-open-btn" data-conv-id="${conv.id}">Abrir conversa</button>
          </div>
        </div>
      `;

      // Botão para abrir conversa
      const openBtn = card.querySelector('.neo-open-btn');
      openBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        openConversationInSameSession(conv.id);
      });

      makeCardDraggable(card, conv.id, colKey);
      colEl.appendChild(card);
      
      cardElements.push({ card, convId: conv.id });
    });

    // Atualiza os contadores dinamicamente
    Object.keys(columnNames).forEach(colId => {
      const badgeEl = page.querySelector(`[data-count="${colId}"]`);
      if (badgeEl) badgeEl.textContent = counters[colId] || 0;
    });

    // Aplica estilos vazios dinamicamente
    Object.keys(columnNames).forEach(colId => {
      const colEl = page.querySelector(`.neo-col[data-col="${colId}"] .neo-list`);
      if (colEl && colEl.children.length === 0) {
        const div = document.createElement('div');
        div.className = 'neo-empty';
        div.textContent = 'Nenhuma conversa aqui agora.';
        colEl.appendChild(div);
      }
    });

    attachDragEventsToColumns();

    // Agora busca as prévias em background
    for (const { card, convId } of cardElements) {
      fetchLastMessage(convId).then(preview => {
        const previewEl = card.querySelector('.neo-preview');
        if (previewEl) {
          previewEl.textContent = preview;
        }
      });
    }
  }

  function makeCardDraggable(card, convId, colKey) {
    card.setAttribute('draggable', 'true');
    card.addEventListener('dragstart', e => {
      dragState.id = convId;
      dragState.fromCol = colKey;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });
  }

  function attachDragEventsToColumns() {
    if (!page) {
      console.warn('[KANBAN] ⚠️ Page não existe, não pode anexar eventos de drag');
      return;
    }
    
    const cols = page.querySelectorAll('.neo-col');
    if (!cols || cols.length === 0) {
      console.warn('[KANBAN] ⚠️ Nenhuma coluna encontrada');
      return;
    }
    
    cols.forEach(col => {
      col.addEventListener('dragover', e => {
        e.preventDefault();
        col.classList.add('drag-over');
      });
      col.addEventListener('dragleave', () => {
        col.classList.remove('drag-over');
      });
      col.addEventListener('drop', async e => {
        e.preventDefault();
        col.classList.remove('drag-over');
        const targetCol = col.dataset.col;
        if (dragState.id && targetCol) {
          console.log(`[KANBAN] 🎯 Movendo card ${dragState.id} para ${targetCol}`);
          
          // Salva no localStorage (fallback/cache local)
          columnMap[dragState.id] = targetCol;
          saveColumnMap();
          
          // Salva no backend via API (assíncrono, não bloqueia UI)
          updateKanbanPosition(dragState.id, targetCol).then(saved => {
            if (saved) {
              console.log(`[KANBAN] ✅ Posição sincronizada com backend`);
            }
          });
          
          // Atualiza o cache local imediatamente para UI instantânea
          if (conversationCache[dragState.id]) {
            conversationCache[dragState.id].custom_attributes = conversationCache[dragState.id].custom_attributes || {};
            conversationCache[dragState.id].custom_attributes.kanban_posicao = targetCol;
          }
          
          // Re-renderiza com o cache atualizado
          const list = Object.values(conversationCache);
          renderBoard(list);
        }
        dragState.id = null;
        dragState.fromCol = null;
      });
    });
  }

  /* ---------- FETCH CONVERSAS ---------- */
  async function fetchConversations(showSpinner = true) {
    try {
      const { statusMsgEl, lastSyncEl } = getStatusElements();
      const refreshBtn = page?.querySelector('#neo-refresh-btn');
      
      if (showSpinner && refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Atualizando...';
      }
      if (statusMsgEl) statusMsgEl.textContent = 'Consultando API...';

      const url = `${API_BASE}/conversations?status=open&per_page=${PER_PAGE}`;

      const resp = await fetch(url, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': API_TOKEN,
        },
      });

      if (!resp.ok) {
        if (statusMsgEl) statusMsgEl.textContent = `Erro API ${resp.status}`;
        console.error('[KANBAN] Erro ao buscar conversas:', resp.status, resp.statusText);
        renderBoard([]);
        return;
      }

      const data = await resp.json();
      console.log('[KANBAN] payload bruto:', data);

      let root = data;
      if (root && root.data && typeof root.data === 'object') {
        root = root.data;
        console.log('[KANBAN] root normalizado:', root);
      }

      let conversations = [];
      if (Array.isArray(root.payload)) conversations = root.payload;
      else if (Array.isArray(root.data)) conversations = root.data;
      else if (Array.isArray(root.conversations)) conversations = root.conversations;
      else if (root.meta && Array.isArray(root.meta.conversations)) conversations = root.meta.conversations;
      else if (Array.isArray(root)) conversations = root;

      if (!Array.isArray(conversations)) conversations = [];
      
      // 🔍 Busca custom_attributes de cada conversa
      if (conversations.length > 0) {
        console.log('[KANBAN] 🔍 Buscando custom_attributes de', conversations.length, 'conversas...');
        
        conversations = await Promise.all(
          conversations.map(async (conv) => {
            try {
              const detailResp = await fetch(`${API_BASE}/conversations/${conv.id}`, {
                headers: {
                  'Content-Type': 'application/json',
                  'api_access_token': API_TOKEN,
                }
              });
              
              if (detailResp.ok) {
                const detail = await detailResp.json();
                return {
                  ...conv,
                  custom_attributes: detail.custom_attributes || {}
                };
              }
            } catch (e) {
              console.warn(`[KANBAN] ⚠️ Erro ao buscar custom_attributes da conversa ${conv.id}`);
            }
            return conv;
          })
        );
        
        console.log('[KANBAN] ✅ Custom attributes carregados!');
      }

      cleanColumnMap(conversations.map(c => c.id));

      if (statusMsgEl) statusMsgEl.textContent = `${conversations.length} conversas carregadas.`;
      
      // Renderiza todas as conversas sem filtros
      await renderBoard(conversations);

      const now = new Date();
      if (lastSyncEl) {
        lastSyncEl.textContent =
          'Última atualização: ' +
          now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }
    } catch (err) {
      const { statusMsgEl } = getStatusElements();
      console.error('[KANBAN] Erro geral:', err);
      if (statusMsgEl) statusMsgEl.textContent = 'Erro geral (ver console).';
      renderBoard([]);
    } finally {
      const refreshBtn = page?.querySelector('#neo-refresh-btn');
      if (showSpinner && refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.textContent = 'Atualizar agora';
      }
    }
  }

  // Expõe abertura para o menu Neofluxx Studio
  window.nfx_kanban_open = openPage;

  setInterval(() => {
    if (pageOpen) {
      fetchConversations(false);
    }
  }, AUTO_REFRESH_INTERVAL);
})();