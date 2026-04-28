<script>
(function () {
  'use strict';

  // ============================================================
  // CONFIGURAÇÃO — edite aqui para adicionar/remover features
  // type: 'script' — aparece no menu, executa ao clicar
  // type: 'modal'  — aparece no menu, abre iframe ao clicar
  // type: 'auto'   — não aparece no menu, executa ao carregar
  // ============================================================
  const FEATURES = [
    { id: 'portal_disparo',    label: 'Portal Disparo',    type: 'script', url: 'https://raw.githubusercontent.com/RafaelAlcarde/alcardetech/refs/heads/main/scripts/portal_disparo.js' },
    { id: 'kanban',            label: 'Kanban',            type: 'script', url: 'https://raw.githubusercontent.com/RafaelAlcarde/alcardetech/refs/heads/main/scripts/kanban.js' },
    { id: 'template_builder',  label: 'Template Builder',  type: 'script', url: 'https://raw.githubusercontent.com/RafaelAlcarde/alcardetech/refs/heads/main/scripts/template_builder.js' },
    { id: 'kpis',              label: 'KPIs',              type: 'script', url: 'https://raw.githubusercontent.com/RafaelAlcarde/alcardetech/refs/heads/main/scripts/kpis.js' },
    { id: 'disparo_campanha',  label: 'Disparo Campanha',  type: 'modal',  url: 'https://webhooks.neofluxx.com/form/65ae30a5-3e39-4e55-b932-44c038d009ea' },
    { id: 'etiquetar_contatos',label: 'Etiquetar Contatos',type: 'auto',   url: 'https://raw.githubusercontent.com/RafaelAlcarde/alcardetech/refs/heads/main/scripts/etiquetar_contatos.js' },
    { id: 'anexar_imagens',    label: 'Anexar Imagens',    type: 'auto',   url: 'https://raw.githubusercontent.com/RafaelAlcarde/alcardetech/refs/heads/main/scripts/template_anexar_imagens.js' },

  ];

  // ============================================================
  // SUPABASE
  // ============================================================
  const SUPABASE_URL  = 'https://stsstxdxmlwniezzmbxe.supabase.co';
  const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0c3N0eGR4bWx3bmllenptYnhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMjIwNzcsImV4cCI6MjA4OTc5ODA3N30.1XwU-rpiGmlyEGBzT97w9FqfMkRtO2_K0WPhEpLwsV4';

  // Pega o account_id da URL do Chatwoot
  function getAccountId() {
    const m = location.pathname.match(/accounts\/(\d+)/);
    return m ? m[1] : null;
  }

  // Busca permissões do tenant no Supabase
  async function fetchPermissions() {
    const accountId = getAccountId();
    if (!accountId) return null;

    const tenantKey = 'account-' + accountId;

    try {
      const res = await fetch(
        SUPABASE_URL + '/rest/v1/tenants_permissoes?tenant_key=eq.' + tenantKey + '&select=template_builder,kpis,disparo_campanha&limit=1',
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
          }
        }
      );
      const data = await res.json();
      return data && data.length > 0 ? data[0] : null;
    } catch (err) {
      console.warn('[Neofluxx] Erro ao buscar permissões:', err);
      return null;
    }
  }

  // Permissões em memória
  let permissions = {};
  let permissionsLoaded = false;

  function isAllowed(featureId) {
    // se não conseguiu ler o Supabase, bloqueia tudo
    if (!permissionsLoaded) return false;
    // features sem coluna no supabase = liberado para todos
    if (!(featureId in permissions)) return true;
    return permissions[featureId] === true;
  }

  async function init() {
    injectModalStyles();

    // Busca permissões antes de montar o menu
    const perms = await fetchPermissions();
    if (perms) { permissions = perms; permissionsLoaded = true; }

    injectSidebar();
    runAutoFeatures();
  }

  // Executa automaticamente todas as features do tipo 'auto'
  async function runAutoFeatures() {
    const autoFeatures = FEATURES.filter(function(f) { return f.type === 'auto'; });
    for (var i = 0; i < autoFeatures.length; i++) {
      await loadAndRun(autoFeatures[i]);
    }
  }

  function injectModalStyles() {
    if (document.getElementById('nfx-modal-style')) return;
    const style = document.createElement('style');
    style.id = 'nfx-modal-style';
    style.textContent = `
      #nfx-iframe-overlay {
        display: none; position: fixed; inset: 0; z-index: 99999;
        background: rgba(0,0,0,0.55); align-items: center; justify-content: center;
      }
      #nfx-iframe-overlay.open { display: flex; }
      #nfx-iframe-box {
        background: #fff; border-radius: 12px; overflow: hidden;
        width: 90vw; max-width: 860px; height: 88vh;
        display: flex; flex-direction: column;
        animation: nfxFadeIn 0.2s ease;
      }
      @keyframes nfxFadeIn { from { opacity:0; transform:scale(.97) } to { opacity:1; transform:scale(1) } }
      #nfx-iframe-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 16px; border-bottom: 1px solid #e2e5ea;
        font-family: -apple-system, sans-serif; font-size: 14px; font-weight: 500; color: #1a1a2e;
      }
      #nfx-iframe-close {
        width: 28px; height: 28px; border-radius: 50%; border: 1px solid #e2e5ea;
        background: transparent; cursor: pointer; font-size: 16px; color: #5a6170;
        display: flex; align-items: center; justify-content: center; transition: all .15s;
      }
      #nfx-iframe-close:hover { background: rgba(229,57,53,.1); color: #e53935; border-color: #e53935; }
      #nfx-iframe-box iframe { flex: 1; border: none; width: 100%; height: 100%; }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'nfx-iframe-overlay';
    overlay.innerHTML = `
      <div id="nfx-iframe-box">
        <div id="nfx-iframe-header">
          <span id="nfx-iframe-title">Neofluxx Studio</span>
          <button id="nfx-iframe-close" onclick="document.getElementById('nfx-iframe-overlay').classList.remove('open')">✕</button>
        </div>
        <iframe id="nfx-iframe-src" src="" allowfullscreen></iframe>
      </div>
    `;
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.classList.remove('open');
    });
    document.body.appendChild(overlay);
  }

  function openModal(feature) {
    const overlay = document.getElementById('nfx-iframe-overlay');
    const iframe  = document.getElementById('nfx-iframe-src');
    const title   = document.getElementById('nfx-iframe-title');
    if (!overlay || !iframe) return;
    title.textContent = feature.label;
    iframe.src = feature.url;
    overlay.classList.add('open');
  }

  function injectSidebar() {
    const mainAside = document.querySelector('aside');
    if (!mainAside) { setTimeout(injectSidebar, 500); return; }

    const navContainer = mainAside.children[1];
    if (!navContainer) { setTimeout(injectSidebar, 500); return; }

    const navList = navContainer.children[0];
    if (!navList) { setTimeout(injectSidebar, 500); return; }

    if (document.getElementById('nfx-root')) return;

    const style = document.createElement('style');
    style.textContent = `
      #nfx-root { user-select: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      #nfx-divider { height: 1px; background: #e2e5ea; margin: 4px 8px; }
      #nfx-btn {
        display: flex; align-items: center; gap: 10px;
        padding: 8px 12px; border-radius: 8px; cursor: pointer;
        background: #E6FDF4; border: 0.5px solid #00DD7D;
        transition: background 0.15s; margin: 0 4px;
      }
      #nfx-btn:hover { background: #ccf9e8; }
      #nfx-btn .nfx-label { font-size: 14px; color: #008F52; font-weight: 500; flex: 1; }
      #nfx-chevron { transition: transform 0.2s; margin-left: auto; }
      #nfx-chevron.open { transform: rotate(180deg); }
      #nfx-submenu { overflow: hidden; max-height: 0; transition: max-height 0.25s ease; }
      #nfx-submenu.open { max-height: 400px; }

      .nfx-item {
        display: flex; align-items: center; gap: 10px;
        padding: 7px 12px 7px 28px; border-radius: 8px;
        cursor: pointer; font-size: 13px; color: #5a6170;
        transition: background 0.12s, color 0.12s; margin: 0 4px;
      }
      .nfx-item:hover { background: rgba(0,221,125,0.08); color: #008F52; }

      .nfx-item.disabled {
        opacity: 0.4; cursor: not-allowed;
      }
      .nfx-item.disabled:hover { background: transparent; color: #5a6170; }

      #nfx-toast {
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        background: #008F52; color: #fff; padding: 8px 18px; border-radius: 20px;
        font-size: 13px; z-index: 99999; opacity: 0; transition: opacity 0.2s; pointer-events: none;
      }
      #nfx-toast.show { opacity: 1; }
    `;
    document.head.appendChild(style);

    const toast = document.createElement('div');
    toast.id = 'nfx-toast';
    document.body.appendChild(toast);

    const root = document.createElement('div');
    root.id = 'nfx-root';
    root.innerHTML = `
      <div id="nfx-divider"></div>
      <div id="nfx-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00DD7D" stroke-width="1.5">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
        <span class="nfx-label">Neofluxx Studio</span>
        <svg id="nfx-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00DD7D" stroke-width="2">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </div>
      <div id="nfx-submenu"></div>
    `;

    // Monta apenas features visíveis no menu (script e modal)
    const submenu = root.querySelector('#nfx-submenu');
    FEATURES.filter(function(f) { return f.type !== 'auto'; }).forEach(function(feature) {
      const allowed = isAllowed(feature.id);
      const item = document.createElement('div');
      item.className = 'nfx-item' + (allowed ? '' : ' disabled');
      item.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
        ${feature.label}

      `;
      if (allowed) {
        item.onclick = function() { handleFeature(feature); };
      }
      submenu.appendChild(item);
    });

    root.querySelector('#nfx-btn').onclick = function() {
      document.getElementById('nfx-submenu').classList.toggle('open');
      document.getElementById('nfx-chevron').classList.toggle('open');
    };

    navList.appendChild(root);

    const observer = new MutationObserver(function() {
      if (!document.getElementById('nfx-root')) injectSidebar();
    });
    observer.observe(navList, { childList: true, subtree: false });
  }

  function handleFeature(feature) {
    if (feature.type === 'modal') {
      openModal(feature);
    } else {
      loadAndRun(feature);
    }
  }

  async function loadAndRun(feature) {
    var openFn = window['nfx_' + feature.id + '_open'];
    if (typeof openFn === 'function') { openFn(); return; }

    if (feature.type !== 'auto') showToast('Carregando ' + feature.label + '...');

    try {
      const res  = await fetch(feature.url + '?t=' + Date.now());
      const text = await res.text();
      localStorage.setItem('nfx_cache_' + feature.id, text);
      runScript(text, feature.id, feature.type);
    } catch (err) {
      console.warn('[Neofluxx] Erro ao buscar, tentando cache...', err);
      const cached = localStorage.getItem('nfx_cache_' + feature.id);
      if (cached) {
        runScript(cached, feature.id, feature.type);
      } else {
        if (feature.type !== 'auto') showToast('Erro ao carregar ' + feature.label);
        console.error('[Neofluxx] Sem cache para ' + feature.id);
      }
    }
  }

  function runScript(scriptContent, featureId, featureType) {
    try {
      const clean = scriptContent.replace(/<script[^>]*>/gi, '').replace(/<\/script>/gi, '').trim();
      const fn = new Function(clean);
      fn();
      if (featureType !== 'auto') {
        setTimeout(function() {
          var openFn = window['nfx_' + featureId + '_open'];
          if (typeof openFn === 'function') openFn();
        }, 100);
      }
    } catch (err) {
      console.error('[Neofluxx] Erro ao executar script ' + featureId + ':', err);
      if (featureType !== 'auto') showToast('Erro: ' + err.message);
    }
  }

  function showToast(msg) {
    const t = document.getElementById('nfx-toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function() { t.classList.remove('show'); }, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
</script>
