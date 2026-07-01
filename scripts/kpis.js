(() => {
  'use strict';

  // ─── CONFIG ───────────────────────────────────────────────────────────────
  const KPI_ROUTE    = 'neofluxx-kpi';
  const BTN_ID       = 'neo-kpi-fab';
  const PANEL_ID     = 'neo-kpi-panel';
  const GRAPH_VER    = 'v21.0';

  // ─── TABELA DE PREÇOS META BRASIL 2026 (por mensagem entregue) ───────────
  // Fonte: Meta rate card 2026 — valores em USD
  const META_PRICES = {
    MARKETING:      0.0625,  // US$ 0,0625 por msg entregue
    UTILITY:        0.0068,  // US$ 0,0068 por msg entregue (tier 1)
    AUTHENTICATION: 0.0068,  // US$ 0,0068 por msg entregue
    SERVICE:        0.0000,  // gratuito
  };

  const calcCost = (delivered, category) => {
    const price = META_PRICES[category?.toUpperCase()] ?? META_PRICES.MARKETING;
    return delivered * price;
  };

  const fmtUSD = (val) => {
    if (val === 0) return 'US$ 0,00';
    return 'US$ ' + val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const fmtBRL = (val) => {
    if (val === 0) return 'R$ 0,00';
    return 'R$ ' + val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // ─── COTAÇÃO USD/BRL ──────────────────────────────────────────────────────
  // Cache em memória por sessão (5 min) — evita reconsultar a cada troca de período.
  let _usdBrlCache = { rate: null, fetchedAt: 0 };
  const USD_BRL_CACHE_MS = 5 * 60 * 1000;

  const fetchUsdBrlRate = async () => {
    const now = Date.now();
    if (_usdBrlCache.rate && (now - _usdBrlCache.fetchedAt) < USD_BRL_CACHE_MS) {
      return _usdBrlCache.rate;
    }
    try {
      const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
      const data = await res.json();
      const bid = parseFloat(data?.USDBRL?.bid);
      if (!bid || Number.isNaN(bid)) return null;
      _usdBrlCache = { rate: bid, fetchedAt: now };
      return bid;
    } catch (e) {
      console.warn('[NeoKPI] Erro ao buscar cotação USD/BRL:', e.message);
      return null; // fallback silencioso — painel segue mostrando só USD
    }
  };


  const getAccountId = () => {
    const m = location.pathname.match(/accounts\/(\d+)/);
    return m ? m[1] : '1';
  };

  const kpiPath = () => `/app/accounts/${getAccountId()}/campaigns/${KPI_ROUTE}`;

  const isKpiRoute = () => location.pathname.includes(`/campaigns/${KPI_ROUTE}`);

  const SUPABASE_URL = 'https://stsstxdxmlwniezzmbxe.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0c3N0eGR4bWx3bmllenptYnhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMjIwNzcsImV4cCI6MjA4OTc5ODA3N30.1XwU-rpiGmlyEGBzT97w9FqfMkRtO2_K0WPhEpLwsV4';

  // Cache em memória por sessão — evita reconsultar o Supabase a cada troca de período
  let _wabaListCache = null;

  const fetchWabaList = async () => {
    if (_wabaListCache) return _wabaListCache;
    const accountId = getAccountId();
    if (!accountId) return null;
    const tenantKey = 'account-' + accountId;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/tenants?tenant_key=eq.${tenantKey}&select=waba_id,phone_id,token,waba_nome&order=waba_nome.asc`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Accept-Profile': 'public',
          }
        }
      );
      const data = await res.json();
      if (!data || data.length === 0) return null;
      _wabaListCache = data.map(row => ({
        wabaId:   row.waba_id,
        phoneId:  row.phone_id,
        token:    row.token,
        wabaNome: row.waba_nome || row.waba_id,
      }));
      return _wabaListCache;
    } catch (e) {
      console.warn('[NeoKPI] Erro ao buscar WABAs do Supabase:', e.message);
      return null;
    }
  };

  // ─── DATE HELPERS ─────────────────────────────────────────────────────────
  const toYMD = (d) => {
    // Usa timezone de São Paulo (UTC-3) para evitar problema de data
    return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      .split('/').reverse().join('-');
  };

  const getDateRange = (preset, custom) => {
    const now = new Date();
    if (preset === 'custom' && custom?.start && custom?.end) {
      return { start: custom.start, end: custom.end, displayStart: custom.start, displayEnd: custom.end };
    }
    if (preset === 'today') {
      const today = toYMD(now);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { start: today, end: toYMD(tomorrow), displayStart: today, displayEnd: today };
    }
    const days = preset === '30d' ? 30 : preset === '90d' ? 90 : 7;
    const end = new Date(now);
    end.setDate(end.getDate() + 1);
    const start = new Date(now);
    start.setDate(start.getDate() - days + 1);
    return { start: toYMD(start), end: toYMD(end), displayStart: toYMD(start), displayEnd: toYMD(now) };
  };

  // ─── META GRAPH API ───────────────────────────────────────────────────────
  const metaFetch = async (path, token) => {
    const url = `https://graph.facebook.com/${GRAPH_VER}/${path}&access_token=${token}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    return json;
  };

  const fetchTemplates = async (wabaId, token) => {
    const all = [];
    let url = `${wabaId}/message_templates?fields=name,status,category,language&limit=100`;
    while (url) {
      const data = await metaFetch(url, token);
      all.push(...(data.data || []));
      const after = data.paging?.cursors?.after;
      url = data.paging?.next && after
        ? `${wabaId}/message_templates?fields=name,status,category,language&limit=100&after=${after}`
        : null;
    }
    return all.filter(t => t.status === 'APPROVED');
  };

  const fetchTemplateAnalytics = async (wabaId, token, start, end, templateIds) => {
    if (!templateIds || templateIds.length === 0) return { dataPoints: [{ data_points: [] }], incomplete: false };
    const chunks = [];
    for (let i = 0; i < templateIds.length; i += 10) {
      chunks.push(templateIds.slice(i, i + 10));
    }

    let incomplete = false;

    const chunkResults = await Promise.all(chunks.map(async (chunk) => {
      const dps = [];
      try {
        const idsParam = encodeURIComponent(JSON.stringify(chunk));
        let url = `${wabaId}/template_analytics?start=${start}&end=${end}&granularity=DAILY&metric_types=SENT,DELIVERED,READ,CLICKED&template_ids=${idsParam}&limit=100`;
        while (url) {
          const data = await metaFetch(url, token);
          for (const item of (data.data || [])) {
            dps.push(...(item.data_points || []));
          }
          const after = data.paging?.cursors?.after;
          url = data.paging?.next && after
            ? `${wabaId}/template_analytics?start=${start}&end=${end}&granularity=DAILY&metric_types=SENT,DELIVERED,READ,CLICKED&template_ids=${idsParam}&limit=100&after=${after}`
            : null;
        }
      } catch (e) {
        incomplete = true;
        console.warn('[NeoKPI] Erro no chunk:', e.message);
      }
      return dps;
    }));

    const allResults = chunkResults.flat();
    return { dataPoints: [{ data_points: allResults }], incomplete };
  };

  // ─── AGGREGATE HELPERS ────────────────────────────────────────────────────

  // Filtra data_points de um analytics response por template_id
  const getDpForTemplate = (analyticsData, templateId) => {
    const allDp = [];
    for (const item of analyticsData) {
      for (const dp of (item.data_points || [])) {
        if (!templateId || dp.template_id === templateId) allDp.push(dp);
      }
    }
    return allDp;
  };

  // Soma métrica direta (sent, delivered, read)
  const sumMetric = (dataPoints, field) => {
    return dataPoints.reduce((acc, dp) => acc + (dp[field] || 0), 0);
  };

  // Soma cliques (clicked é array de objetos {button_content, count})
  const sumClicked = (dataPoints) => {
    return dataPoints.reduce((acc, dp) => {
      if (!dp.clicked) return acc;
      return acc + dp.clicked.reduce((s, c) => s + (c.count || 0), 0);
    }, 0);
  };

  // Agrega cliques por botão para tabela
  const aggregateButtons = (dataPoints) => {
    const map = {};
    for (const dp of dataPoints) {
      for (const btn of (dp.clicked || [])) {
        if (!map[btn.button_content]) map[btn.button_content] = 0;
        map[btn.button_content] += (btn.count || 0);
      }
    }
    return Object.entries(map)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  };


  const unixToYMD = (ts) => toYMD(new Date(ts * 1000));

  const buildDailyChart = (dataPoints, start, end) => {
    const days = [];
    const cur = new Date(start);
    const endDate = new Date(end);
    while (cur <= endDate) {
      days.push(toYMD(new Date(cur)));
      cur.setDate(cur.getDate() + 1);
    }
    const map = {};
    for (const dp of dataPoints) {
      const date = unixToYMD(dp.start);
      if (!map[date]) map[date] = { sent: 0, delivered: 0, read: 0, clicked: 0 };
      map[date].sent      += (dp.sent      || 0);
      map[date].delivered += (dp.delivered || 0);
      map[date].read      += (dp.read      || 0);
      map[date].clicked   += dp.clicked
        ? dp.clicked.reduce((s, c) => s + (c.count || 0), 0) : 0;
    }
    return days.map(d => ({ date: d, ...(map[d] || { sent: 0, delivered: 0, read: 0, clicked: 0 }) }));
  };

  // ─── CSS ──────────────────────────────────────────────────────────────────
  const injectCSS = () => {
    if (document.getElementById('neo-kpi-style')) return;
    const s = document.createElement('style');
    s.id = 'neo-kpi-style';
    s.textContent = `
      /* botão flutuante KPI removido — abertura via menu Neofluxx */

      #neo-kpi-overlay {
        display: flex;
        position: fixed;
        inset: 0;
        z-index: 9000;
        background: rgba(0,0,0,.55);
        align-items: center;
        justify-content: center;
      }

      @keyframes neoKpiFadeIn {
        from { opacity: 0; transform: scale(.97); }
        to   { opacity: 1; transform: scale(1); }
      }

      #${PANEL_ID}.light {
        --bg: #F3F4F6; --sf: #fff; --sf2: #F9FAFB; --sf3: #F3F4F6;
        --bd: #E5E7EB; --bd2: #D1D5DB;
        --tx: #111827; --tx2: #6B7280; --tx3: #9CA3AF;
        --ac: #2563EB; --acdim: rgba(37,99,235,.08); --acgl: rgba(37,99,235,.25);
        --red: #DC2626; --reddim: #FEF2F2; --redbd: #FECACA;
        --green: #065F46; --greenbg: #D1FAE5;
        --blue: #1E40AF; --bluebg: #DBEAFE;
        --amber: #92400E; --amberbg: #FEF3C7;
        --shadow: 0 20px 60px rgba(0,0,0,.3);
      }
      #${PANEL_ID}.dark {
        --bg: #0F0F11; --sf: #17171B; --sf2: #1E1E24; --sf3: #252530;
        --bd: #2A2A35; --bd2: #35354A;
        --tx: #F0F0F5; --tx2: #9090A8; --tx3: #55556A;
        --ac: #4F8EF7; --acdim: rgba(79,142,247,.12); --acgl: rgba(79,142,247,.3);
        --red: #FF5E5E; --reddim: rgba(255,94,94,.1); --redbd: rgba(255,94,94,.3);
        --green: #4ADE80; --greenbg: rgba(74,222,128,.12);
        --blue: #60A5FA; --bluebg: rgba(96,165,250,.12);
        --amber: #FBBF24; --amberbg: rgba(251,191,36,.12);
        --shadow: 0 20px 60px rgba(0,0,0,.6);
      }

      #${PANEL_ID} {
        font-family: 'DM Sans', -apple-system, sans-serif;
        padding: 28px 36px 40px 36px;
        width: 90vw;
        max-width: 1400px;
        height: 88vh;
        color: var(--tx);
        box-sizing: border-box;
        background: var(--bg);
        border-radius: 14px;
        overflow-y: auto;
        overflow-x: hidden;
        box-shadow: var(--shadow);
        animation: neoKpiFadeIn .2s ease;
      }

      .neo-kpi-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 24px;
        flex-wrap: wrap;
        gap: 12px;
      }
      .neo-kpi-title { font-size: 20px; font-weight: 700; color: var(--tx); }
      .neo-kpi-subtitle { font-size: 13px; color: var(--tx2); margin-top: 2px; }

      .neo-kpi-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

      .neo-kpi-period-btns { display: flex; gap: 4px; }
      .neo-kpi-period-btn {
        padding: 6px 12px;
        border-radius: 8px;
        border: 1px solid var(--bd);
        background: var(--sf);
        color: var(--tx2);
        font-size: 13px;
        cursor: pointer;
        font-weight: 500;
        transition: all .15s;
      }
      .neo-kpi-period-btn:hover { border-color: var(--ac); color: var(--ac); }
      .neo-kpi-period-btn.active { background: var(--ac); color: #fff; border-color: var(--ac); }

      .neo-kpi-btn {
        padding: 7px 14px;
        border-radius: 8px;
        border: 1px solid var(--bd);
        background: var(--sf);
        color: var(--tx2);
        font-size: 13px;
        cursor: pointer;
        font-weight: 500;
        transition: all .15s;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .neo-kpi-btn:hover { border-color: var(--bd2); background: var(--sf2); }
      .neo-kpi-btn.primary { background: var(--ac); color: #fff; border-color: var(--ac); }
      .neo-kpi-btn.primary:hover { filter: brightness(1.1); }
      .neo-kpi-btn.danger { background: var(--reddim); color: var(--red); border-color: var(--redbd); }
      .neo-kpi-btn.danger:hover { filter: brightness(1.1); }

      .neo-kpi-cards {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 12px;
        margin-bottom: 16px;
      }
      @media (max-width: 1100px) { .neo-kpi-cards { grid-template-columns: repeat(3,1fr); } }
      @media (max-width: 700px) { .neo-kpi-cards { grid-template-columns: repeat(2,1fr); } }

      .neo-kpi-cards.cols-4 { grid-template-columns: repeat(4, 1fr); }
      @media (max-width: 900px) { .neo-kpi-cards.cols-4 { grid-template-columns: repeat(2,1fr); } }

      .neo-kpi-card {
        background: var(--sf);
        border: 1px solid var(--bd);
        border-radius: 12px;
        padding: 18px 20px;
      }
      .neo-kpi-card.cost { background: var(--acdim); border-color: var(--acgl); }
      .neo-kpi-card-label { font-size: 12px; color: var(--tx2); font-weight: 500; margin-bottom: 8px; }
      .neo-kpi-card-value { font-size: 28px; font-weight: 700; color: var(--tx); line-height: 1; }
      .neo-kpi-card-sub { font-size: 12px; color: var(--tx2); margin-top: 4px; }
      .neo-kpi-card-delta { font-size: 12px; margin-top: 4px; font-weight: 600; }
      .neo-kpi-card-delta.up { color: var(--green); }
      .neo-kpi-card-delta.down { color: var(--red); }

      .neo-kpi-section {
        background: var(--sf);
        border: 1px solid var(--bd);
        border-radius: 12px;
        padding: 20px 24px;
        margin-bottom: 16px;
      }
      .neo-kpi-section-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--tx);
        margin-bottom: 14px;
      }

      .neo-kpi-table { width: 100%; border-collapse: collapse; font-size: 13px; }
      .neo-kpi-table th {
        text-align: left;
        padding: 8px 12px;
        color: var(--tx2);
        font-weight: 500;
        border-bottom: 1px solid var(--sf3);
        font-size: 12px;
      }
      .neo-kpi-table td {
        padding: 10px 12px;
        border-bottom: 1px solid var(--sf3);
        color: var(--tx2);
      }
      .neo-kpi-table tr:last-child td { border-bottom: none; }
      .neo-kpi-table tr.clickable { cursor: pointer; }
      .neo-kpi-table tr.clickable:hover td { background: var(--acdim); }
      .neo-kpi-table td.bold { font-weight: 600; color: var(--tx); }
      .neo-kpi-table td.muted { color: var(--tx3); }

      .neo-tag {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 99px;
        font-size: 11px;
        font-weight: 600;
      }
      .neo-tag.green { background: var(--greenbg); color: var(--green); }
      .neo-tag.blue { background: var(--bluebg); color: var(--blue); }
      .neo-tag.amber { background: var(--amberbg); color: var(--amber); }
      .neo-tag.red { background: var(--reddim); color: var(--red); }
      .neo-tag.gray { background: var(--sf3); color: var(--tx2); }

      .neo-kpi-chart-wrap { position: relative; height: 220px; margin-top: 8px; }

      .neo-kpi-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        color: var(--tx2);
        gap: 12px;
      }
      .neo-kpi-spinner {
        width: 32px; height: 32px;
        border: 3px solid var(--bd);
        border-top-color: var(--ac);
        border-radius: 50%;
        animation: neo-spin .7s linear infinite;
      }
      @keyframes neo-spin { to { transform: rotate(360deg); } }

      .neo-kpi-empty {
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; padding: 60px 20px; color: var(--tx3); gap: 8px;
      }
      .neo-kpi-empty svg { opacity: .4; }

      .neo-kpi-back {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 13px; color: var(--ac); cursor: pointer;
        margin-bottom: 16px; font-weight: 500;
        background: none; border: none; padding: 0;
      }
      .neo-kpi-back:hover { text-decoration: underline; }

      /* Shimmer loading */
      @keyframes neo-shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
      .neo-shimmer {
        background: linear-gradient(90deg, var(--sf3) 25%, var(--bd) 50%, var(--sf3) 75%);
        background-size: 800px 100%;
        animation: neo-shimmer 1.4s ease infinite;
        border-radius: 6px;
      }
      .neo-kpi-card.loading .neo-kpi-card-value {
        height: 36px; width: 80px;
        background: linear-gradient(90deg, var(--sf3) 25%, var(--bd) 50%, var(--sf3) 75%);
        background-size: 800px 100%;
        animation: neo-shimmer 1.4s ease infinite;
        border-radius: 6px; color: transparent;
      }
      .neo-kpi-card.loading .neo-kpi-card-label,
      .neo-kpi-card.loading .neo-kpi-card-sub {
        color: transparent;
      }

      /* Seção de erros */
      .neo-kpi-err-item {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 0; border-bottom: 1px solid var(--sf3); font-size: 13px;
      }
      .neo-kpi-err-item:last-child { border-bottom: none; }
      .neo-kpi-err-dot { width: 10px; height: 10px; border-radius: 50%; margin-right: 10px; flex-shrink: 0; }
      .neo-kpi-err-label { display: flex; align-items: center; color: var(--tx2); }
      .neo-kpi-err-count { font-weight: 600; color: var(--tx); min-width: 40px; text-align: right; }

      /* Modal */
      .neo-kpi-modal-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,.45);
        z-index: 99999;
        display: flex; align-items: center; justify-content: center;
      }
      .neo-kpi-modal {
        background: var(--sf, #fff);
        color: var(--tx, #111827);
        border-radius: 16px;
        padding: 28px;
        width: 460px;
        max-width: 95vw;
        box-shadow: 0 20px 60px rgba(0,0,0,.15);
      }
      .neo-kpi-modal h3 { font-size: 17px; font-weight: 700; color: var(--tx, #111827); margin-bottom: 6px; }
      .neo-kpi-modal p { font-size: 13px; color: var(--tx2, #6B7280); margin-bottom: 20px; }
      .neo-kpi-field { margin-bottom: 14px; }
      .neo-kpi-field label { display: block; font-size: 12px; font-weight: 600; color: var(--tx2, #374151); margin-bottom: 5px; }
      .neo-kpi-field input {
        width: 100%; padding: 9px 12px;
        border: 1px solid var(--bd2, #D1D5DB); border-radius: 8px;
        background: var(--sf2, #fff);
        font-size: 13px; color: var(--tx, #111827);
        outline: none; transition: border-color .15s;
        box-sizing: border-box;
      }
      .neo-kpi-field input:focus { border-color: var(--ac, #2563EB); box-shadow: 0 0 0 3px var(--acdim, rgba(37,99,235,.1)); }
      .neo-kpi-modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }

      .neo-kpi-date-row { display: flex; gap: 8px; align-items: center; }
      .neo-kpi-date-row input[type=date] {
        padding: 7px 10px; border: 1px solid var(--bd2);
        background: var(--sf); color: var(--tx);
        border-radius: 8px; font-size: 13px;
        outline: none; cursor: pointer;
      }
      .neo-kpi-date-row input[type=date]:focus { border-color: var(--ac); }

      .neo-kpi-legend { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 8px; }
      .neo-kpi-legend-item { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--tx2); }
      .neo-kpi-legend-dot { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }

      .neo-kpi-error-banner {
        background: var(--reddim); border: 1px solid var(--redbd);
        border-radius: 10px; padding: 14px 16px;
        color: var(--red); font-size: 13px; margin-bottom: 16px;
        display: flex; align-items: center; gap: 8px;
      }

      .neo-kpi-setup {
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; min-height: 60vh; text-align: center; gap: 16px;
      }
      .neo-kpi-setup-icon { font-size: 48px; opacity: .6; }
      .neo-kpi-setup h2 { font-size: 20px; font-weight: 700; color: var(--tx); }
      .neo-kpi-setup p { font-size: 14px; color: var(--tx2); max-width: 360px; line-height: 1.6; }
    `;
    document.head.appendChild(s);
  };

  // ─── DARK MODE DETECTION ──────────────────────────────────────────────────
  const isDark = () =>
    document.documentElement.classList.contains('dark') ||
    document.body.classList.contains('dark') ||
    document.querySelector('.app-wrapper')?.classList.contains('dark-theme') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  const applyTheme = () => {
    const el = document.getElementById(PANEL_ID);
    if (!el) return;
    el.classList.remove('light', 'dark');
    el.classList.add(isDark() ? 'dark' : 'light');
  };

  // ─── MODAL DE CONFIG ──────────────────────────────────────────────────────
  // ─── PANEL STATE ──────────────────────────────────────────────────────────
  let panelState = {
    view: 'overview',
    preset: '7d',
    customStart: '',
    customEnd: '',
    selectedTemplate: null,
    analytics: [],
    analyticsIncomplete: false,
    templates: [],
    loading: false,
    error: null,
    showCustom: false,
    showCostBreakdown: false,
    usdBrlRate: null,
    connected: null,
    wabaList: [],        // todas as WABAs do tenant
    selectedWabaIdx: 0, // índice da WABA ativa
  };

  // ─── RENDER HELPERS ───────────────────────────────────────────────────────
  const fmt = n => (n || 0).toLocaleString('pt-BR');

  const pct = (a, b) => {
    if (!b) return '—';
    const v = Math.round((a / b) * 100);
    return Math.min(v, 100) + '%';
  };

  const tagColor = (val, total) => {
    if (!total) return 'gray';
    const p = (val / total) * 100;
    if (p >= 70) return 'green';
    if (p >= 40) return 'blue';
    if (p >= 20) return 'amber';
    return 'red';
  };

  // ─── RENDER OVERVIEW ──────────────────────────────────────────────────────
  const renderOverview = (panel) => {
    const { analytics, templates, loading, error, analyticsIncomplete, showCostBreakdown, usdBrlRate } = panelState;

    // Todos os data_points juntos para totais consolidados
    const allDp = getDpForTemplate(analytics, null);
    const totalSent      = sumMetric(allDp, 'sent');
    const totalDelivered = sumMetric(allDp, 'delivered');
    const totalRead      = sumMetric(allDp, 'read');
    const totalClicked   = sumClicked(allDp);

    // Custo estimado — calcula por template usando categoria, e também por categoria agregada
    let totalCost = 0;
    const costByCategory = {};
    for (const t of templates) {
      const dp = getDpForTemplate(analytics, t.id);
      const delivered = sumMetric(dp, 'delivered');
      const c = calcCost(delivered, t.category);
      totalCost += c;
      const cat = (t.category || 'MARKETING').toUpperCase();
      costByCategory[cat] = (costByCategory[cat] || 0) + c;
    }
    const costPerMsg = totalDelivered > 0 ? totalCost / totalDelivered : 0;
    const categoryRows = Object.entries(costByCategory).sort((a, b) => b[1] - a[1]);

    // Apenas templates com envio no período entram na tabela de custo
    const sentTemplates = templates
      .map(t => ({ t, dp: getDpForTemplate(analytics, t.id) }))
      .filter(({ dp }) => sumMetric(dp, 'sent') > 0);

    panel.innerHTML = `
      ${error ? `<div class="neo-kpi-error-banner">⚠️ ${error}</div>` : ''}
      ${!error && analyticsIncomplete ? `<div class="neo-kpi-error-banner">⚠️ Não foi possível carregar os dados de alguns templates — os totais e custos abaixo podem estar subestimados. Tente atualizar.</div>` : ''}

      <div class="neo-kpi-cards">
        <div class="neo-kpi-card ${loading ? 'loading' : ''}">
          <div class="neo-kpi-card-label">Mensagens enviadas</div>
          <div class="neo-kpi-card-value">${loading ? '000' : fmt(totalSent)}</div>
        </div>
        <div class="neo-kpi-card ${loading ? 'loading' : ''}">
          <div class="neo-kpi-card-label">Mensagens entregues</div>
          <div class="neo-kpi-card-value">${loading ? '000' : fmt(totalDelivered)}</div>
          <div class="neo-kpi-card-sub">${loading ? '' : pct(totalDelivered, totalSent)} de entrega</div>
        </div>
        <div class="neo-kpi-card ${loading ? 'loading' : ''}">
          <div class="neo-kpi-card-label">Mensagens lidas</div>
          <div class="neo-kpi-card-value">${loading ? '000' : fmt(totalRead)}</div>
          <div class="neo-kpi-card-sub">${loading ? '' : pct(totalRead, totalDelivered)} de leitura</div>
        </div>
        <div class="neo-kpi-card ${loading ? 'loading' : ''}">
          <div class="neo-kpi-card-label">Cliques em botões</div>
          <div class="neo-kpi-card-value">${loading ? '000' : fmt(totalClicked)}</div>
          <div class="neo-kpi-card-sub">${loading ? '' : pct(totalClicked, totalDelivered)} CTR</div>
        </div>
        <div class="neo-kpi-card cost ${loading ? 'loading' : ''}">
          <div class="neo-kpi-card-label" style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
            <span style="display:flex;align-items:center;gap:4px;">
              Custo estimado
              <span title="Estimativa com base na tabela de preços da Meta e cotação do dólar do dia. Não substitui a fatura oficial. Podem ocorrer variações." style="cursor:help;color:var(--tx3);font-size:11px;border:1px solid var(--bd2);border-radius:50%;width:13px;height:13px;display:inline-flex;align-items:center;justify-content:center;line-height:1;flex-shrink:0;">i</span>
            </span>
            ${!loading && categoryRows.length > 0 ? `
              <button id="neo-cost-toggle" style="background:none;border:none;cursor:pointer;color:var(--ac);font-size:11px;font-weight:600;padding:0;white-space:nowrap;">
                ${showCostBreakdown ? 'ocultar ▲' : 'por categoria ▼'}
              </button>
            ` : ''}
          </div>
          <div class="neo-kpi-card-value">${loading ? '000' : '≈ ' + fmtUSD(totalCost)}</div>
          ${!loading && usdBrlRate ? `<div class="neo-kpi-card-sub">≈ ${fmtBRL(totalCost * usdBrlRate)}</div>` : ''}
          <div class="neo-kpi-card-sub">${loading ? '' : (costPerMsg > 0 ? fmtUSD(costPerMsg) + ' / msg entregue' : 'rate card Meta')}</div>
          ${!loading && showCostBreakdown && categoryRows.length > 0 ? `
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--bd);display:flex;flex-direction:column;gap:6px;">
              ${categoryRows.map(([cat, val]) => `
                <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;">
                  <span class="neo-tag gray" style="font-size:10px;">${cat}</span>
                  <span style="color:var(--tx);font-weight:600;">${fmtUSD(val)}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>

      <div class="neo-kpi-section">
        <div class="neo-kpi-section-title">Performance por template</div>
        ${loading ? `<div class="neo-kpi-loading"><div class="neo-kpi-spinner"></div><span>Carregando dados da Meta...</span></div>` : ''}
        ${!loading && templates.length === 0 ? `
          <div class="neo-kpi-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>
            <span>Nenhum template aprovado encontrado</span>
          </div>
        ` : ''}
        ${!loading && templates.length > 0 && sentTemplates.length === 0 ? `
          <div class="neo-kpi-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>
            <span>Nenhum template com envios no período</span>
          </div>
        ` : ''}
        ${!loading && sentTemplates.length > 0 ? `
          <table class="neo-kpi-table">
            <thead>
              <tr>
                <th>Template</th>
                <th>Categoria</th>
                <th>Enviadas</th>
                <th>Entregues</th>
                <th>Lidas</th>
                <th>Cliques</th>
                <th>Taxa leitura</th>
                <th>Custo est.</th>
              </tr>
            </thead>
            <tbody>
              ${sentTemplates.map(({ t, dp }) => {
                const sent      = sumMetric(dp, 'sent');
                const delivered = sumMetric(dp, 'delivered');
                const read      = sumMetric(dp, 'read');
                const clicked   = sumClicked(dp);
                const readPct   = pct(read, delivered);
                const color     = tagColor(read, delivered);
                const cost      = calcCost(delivered, t.category);
                return `
                  <tr class="clickable" data-tid="${t.id}" data-tname="${t.name}" data-tcat="${t.category || 'MARKETING'}">
                    <td class="bold">${t.name}</td>
                    <td><span class="neo-tag gray">${t.category || '—'}</span></td>
                    <td>${fmt(sent)}</td>
                    <td>${fmt(delivered)}</td>
                    <td>${fmt(read)}</td>
                    <td>${fmt(clicked)}</td>
                    <td><span class="neo-tag ${color}">${readPct}</span></td>
                    <td style="color:var(--tx2);font-size:12px;">${fmtUSD(cost)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        ` : ''}
      </div>
    `;

    // Click na linha → drill-down
    panel.querySelectorAll('tr.clickable').forEach(row => {
      row.addEventListener('click', () => {
        panelState.view = 'detail';
        panelState.selectedTemplate = {
          id:       row.dataset.tid,
          name:     row.dataset.tname,
          category: row.dataset.tcat,
        };
        renderPanel();
      });
    });

    // Toggle do breakdown de custo por categoria
    const costToggle = document.getElementById('neo-cost-toggle');
    if (costToggle) {
      costToggle.onclick = () => {
        panelState.showCostBreakdown = !panelState.showCostBreakdown;
        renderPanel();
      };
    }
  };

  // ─── RENDER DETAIL ────────────────────────────────────────────────────────
  const renderDetail = (panel) => {
    const { selectedTemplate, analytics, loading, usdBrlRate } = panelState;

    const { start, end, displayStart, displayEnd } = getDateRange(panelState.preset, {
      start: panelState.customStart, end: panelState.customEnd
    });

    // Filtra data_points apenas deste template
    const dps = getDpForTemplate(analytics, selectedTemplate?.id);

    const sent      = sumMetric(dps, 'sent');
    const delivered = sumMetric(dps, 'delivered');
    const read      = sumMetric(dps, 'read');
    const clicked   = sumClicked(dps);
    const daily     = buildDailyChart(dps, start, end);
    const buttons   = aggregateButtons(dps);
    const cost      = calcCost(delivered, selectedTemplate?.category);
    const costPerMsg = delivered > 0 ? cost / delivered : 0;

    panel.innerHTML = `
      <button class="neo-kpi-back" id="neo-back">
        ← Voltar para visão geral
      </button>

      <div style="margin-bottom:16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
        <div>
          <div style="font-size:18px;font-weight:700;color:var(--tx);">${selectedTemplate?.name || '—'}</div>
          <div style="font-size:13px;color:var(--tx2);margin-top:2px;">Detalhes do template · ${displayStart} até ${displayEnd}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-left:auto;">
          <div class="neo-kpi-card" style="padding:10px 14px;border-left:3px solid var(--ac);min-width:140px;">
            <div class="neo-kpi-card-label">Valor estimado · ${displayStart} até ${displayEnd}</div>
            <div style="font-size:18px;font-weight:700;color:var(--tx);">${fmtUSD(cost)}</div>
            ${usdBrlRate ? `<div style="font-size:12px;color:var(--tx2);margin-top:2px;">≈ ${fmtBRL(cost * usdBrlRate)}</div>` : ''}
            <div style="font-size:11px;color:var(--tx3);margin-top:3px;">Tarifa: ${fmtUSD(META_PRICES[selectedTemplate?.category?.toUpperCase()] ?? META_PRICES.MARKETING)}/msg · BR 2026</div>
          </div>
          <div class="neo-kpi-card" style="padding:10px 14px;border-left:3px solid var(--green);min-width:140px;">
            <div class="neo-kpi-card-label">Custo por entregue</div>
            <div style="font-size:18px;font-weight:700;color:var(--tx);">${fmtUSD(costPerMsg)}</div>
            ${usdBrlRate ? `<div style="font-size:12px;color:var(--tx2);margin-top:2px;">≈ ${fmtBRL(costPerMsg * usdBrlRate)}</div>` : ''}
            <div style="font-size:11px;color:var(--tx3);margin-top:3px;">${fmt(delivered)} msgs entregues</div>
          </div>
        </div>
      </div>

      <div class="neo-kpi-cards cols-4">
        <div class="neo-kpi-card ${loading ? 'loading' : ''}">
          <div class="neo-kpi-card-label">Enviadas</div>
          <div class="neo-kpi-card-value">${loading ? '000' : fmt(sent)}</div>
        </div>
        <div class="neo-kpi-card ${loading ? 'loading' : ''}">
          <div class="neo-kpi-card-label">Entregues</div>
          <div class="neo-kpi-card-value">${loading ? '000' : fmt(delivered)}</div>
          <div class="neo-kpi-card-sub">${loading ? '' : pct(delivered, sent)}</div>
        </div>
        <div class="neo-kpi-card ${loading ? 'loading' : ''}">
          <div class="neo-kpi-card-label">Lidas</div>
          <div class="neo-kpi-card-value">${loading ? '000' : fmt(read)}</div>
          <div class="neo-kpi-card-sub">${loading ? '' : pct(read, delivered)}</div>
        </div>
        <div class="neo-kpi-card ${loading ? 'loading' : ''}">
          <div class="neo-kpi-card-label">Cliques</div>
          <div class="neo-kpi-card-value">${loading ? '000' : fmt(clicked)}</div>
          <div class="neo-kpi-card-sub">${loading ? '' : pct(clicked, delivered) + ' CTR'}</div>
        </div>
      </div>

      ${loading ? `
        <div class="neo-kpi-loading" style="padding:40px;">
          <div class="neo-kpi-spinner"></div>
          <span>Buscando dados na Meta...</span>
        </div>
      ` : `
      <div style="display:grid;grid-template-columns:1.6fr 1fr;gap:16px;margin-bottom:16px;">
        <div class="neo-kpi-section" style="margin:0;">
          <div class="neo-kpi-section-title">Desempenho diário</div>
          <div class="neo-kpi-legend">
            <div class="neo-kpi-legend-item"><span class="neo-kpi-legend-dot" style="background:#E05252"></span>Enviadas</div>
            <div class="neo-kpi-legend-item"><span class="neo-kpi-legend-dot" style="background:#6C5CE7"></span>Entregues</div>
            <div class="neo-kpi-legend-item"><span class="neo-kpi-legend-dot" style="background:#00B894"></span>Lidas</div>
            <div class="neo-kpi-legend-item"><span class="neo-kpi-legend-dot" style="background:#2563EB"></span>Cliques</div>
          </div>
          <div class="neo-kpi-chart-wrap">
            <canvas id="neo-kpi-chart-detail"></canvas>
          </div>
        </div>

        <div class="neo-kpi-section" style="margin:0;">
          <div class="neo-kpi-section-title">Cliques por botão</div>
          ${buttons.length === 0 ? `
            <div class="neo-kpi-empty" style="padding:30px 10px;">
              <span style="font-size:13px;color:var(--tx3);">Sem cliques no período</span>
            </div>
          ` : `
            <table class="neo-kpi-table">
              <thead>
                <tr>
                  <th>Botão</th>
                  <th style="text-align:right;">Cliques</th>
                  <th style="text-align:right;">CTR</th>
                </tr>
              </thead>
              <tbody>
                ${buttons.map(b => `
                  <tr>
                    <td class="bold">${b.label}</td>
                    <td style="text-align:right;">${fmt(b.count)}</td>
                    <td style="text-align:right;">${pct(b.count, delivered)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
      `}
    `;

    document.getElementById('neo-back').onclick = () => {
      panelState.view = 'overview';
      panelState.selectedTemplate = null;
      renderPanel();
    };

    // Gráfico — só renderiza quando não está carregando
    if (!loading) {
    loadChartJS(() => {
      const ctx = document.getElementById('neo-kpi-chart-detail');
      if (!ctx) return;
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: daily.map(d => {
            const [,m,day] = d.date.split('-');
            return `${day}/${m}`;
          }),
          datasets: [
            { label: 'Enviadas',  data: daily.map(d=>d.sent),      borderColor:'#E05252', backgroundColor:'transparent', tension:.4, pointRadius:3, borderWidth:2 },
            { label: 'Entregues', data: daily.map(d=>d.delivered),  borderColor:'#6C5CE7', backgroundColor:'transparent', tension:.4, pointRadius:3, borderWidth:2 },
            { label: 'Lidas',     data: daily.map(d=>d.read),       borderColor:'#00B894', backgroundColor:'transparent', tension:.4, pointRadius:3, borderWidth:2 },
            { label: 'Cliques',   data: daily.map(d=>d.clicked),    borderColor:'#2563EB', backgroundColor:'transparent', tension:.4, pointRadius:3, borderWidth:2 },
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 } } },
            y: { grid: { color: 'rgba(0,0,0,.05)' }, ticks: { font: { size: 11 }, precision: 0 } }
          }
        }
      });
    }); // fim loadChartJS
    } // fim if (!loading)
  };

  // ─── CHART.JS LOADER ──────────────────────────────────────────────────────
  const loadChartJS = (cb) => {
    if (window.Chart) { cb(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
    s.onload = cb;
    document.head.appendChild(s);
  };

  // ─── LOAD DATA ────────────────────────────────────────────────────────────
  const loadData = async () => {
    panelState.loading = true;
    panelState.error = null;
    panelState.analyticsIncomplete = false;
    renderPanel();

    // Busca lista de WABAs (cacheada após primeira chamada)
    const wabaList = await fetchWabaList();
    if (!wabaList) {
      panelState.connected = false;
      panelState.loading = false;
      renderPanel();
      return;
    }
    panelState.wabaList = wabaList;
    panelState.connected = true;

    // WABA ativa conforme seleção do usuário
    const cfg = wabaList[panelState.selectedWabaIdx] || wabaList[0];

    const { start, end } = getDateRange(panelState.preset, {
      start: panelState.customStart, end: panelState.customEnd
    });

    // Cotação USD/BRL — paralela, nunca bloqueia
    fetchUsdBrlRate().then(rate => {
      panelState.usdBrlRate = rate;
      if (!panelState.loading) renderPanel();
    });

    try {
      const templates = await fetchTemplates(cfg.wabaId, cfg.token);
      panelState.templates = templates;
      const templateIds = templates.map(t => t.id);
      const { dataPoints, incomplete } = await fetchTemplateAnalytics(cfg.wabaId, cfg.token, start, end, templateIds);
      panelState.analytics = dataPoints;
      panelState.analyticsIncomplete = incomplete;
    } catch (e) {
      panelState.error = e.message || 'Erro ao buscar dados da Meta.';
    }

    panelState.loading = false;
    renderPanel();
  };

  // ─── RENDER PANEL (main) ──────────────────────────────────────────────────
  const renderPanel = () => {
    let panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    const { connected } = panelState;

    // Tela de "não conectado" — tenant não encontrado no Supabase
    if (connected === false) {
      panel.innerHTML = `
        <div class="neo-kpi-setup">
          <div class="neo-kpi-setup-icon">📡</div>
          <h2>Meta Insights · Neofluxx</h2>
          <p>Não foi possível encontrar as credenciais WhatsApp Business para esta conta. Verifique se o tenant está configurado corretamente.</p>
        </div>
      `;
      return;
    }

    // Tela de carregamento inicial (ainda buscando config do Supabase)
    if (connected === null && panelState.loading) {
      panel.innerHTML = `
        <div class="neo-kpi-loading" style="min-height:60vh;">
          <div class="neo-kpi-spinner"></div>
          <span>Conectando ao WhatsApp Business...</span>
        </div>
      `;
      return;
    }

    const range = getDateRange(panelState.preset, {
      start: panelState.customStart, end: panelState.customEnd
    });
    const { start, end, displayStart, displayEnd } = range;

    // Dropdown de WABA (só aparece se houver mais de uma)
    const wabaDropdown = panelState.wabaList.length > 1 ? `
      <select id="neo-waba-select" style="
        padding:5px 10px; border-radius:8px; border:1px solid var(--bd);
        background:var(--sf); color:var(--tx); font-size:13px; font-weight:500;
        cursor:pointer; outline:none; max-width:180px;
      ">
        ${panelState.wabaList.map((w, i) => `
          <option value="${i}" ${i === panelState.selectedWabaIdx ? 'selected' : ''}>${w.wabaNome}</option>
        `).join('')}
      </select>
    ` : '';

    // Badge de status
    const badgeHTML = connected
      ? `<span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:#059669;background:rgba(5,150,105,.1);border:1px solid rgba(5,150,105,.25);border-radius:99px;padding:3px 10px;">
           <span style="width:7px;height:7px;border-radius:50%;background:#059669;display:inline-block;"></span>Sincronizado
         </span>`
      : `<span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:var(--tx3);background:var(--sf3);border:1px solid var(--bd);border-radius:99px;padding:3px 10px;">
           <span style="width:7px;height:7px;border-radius:50%;background:var(--tx3);display:inline-block;"></span>Desconectado
         </span>`;

    // Header sempre visível
    const headerHTML = `
      <div class="neo-kpi-header">
        <div>
          <div class="neo-kpi-title">Meta Insights</div>
          <div class="neo-kpi-subtitle">WhatsApp Business · ${displayStart} até ${displayEnd} <span style="color:#F59E0B;font-size:11px;margin-left:6px;">⚠ ${panelState.preset === 'today' ? 'Dados do dia atual processados com delay pela Meta' : 'Dados do dia atual podem ser parciais'}</span></div>
        </div>
        <div class="neo-kpi-actions">
          <div class="neo-kpi-period-btns">
            <button class="neo-kpi-period-btn ${panelState.preset==='today'?'active':''}" data-p="today">Hoje</button>
            <button class="neo-kpi-period-btn ${panelState.preset==='7d'?'active':''}"  data-p="7d">7d</button>
            <button class="neo-kpi-period-btn ${panelState.preset==='30d'?'active':''}" data-p="30d">30d</button>
            <button class="neo-kpi-period-btn ${panelState.preset==='90d'?'active':''}" data-p="90d">90d</button>
            <button class="neo-kpi-period-btn ${panelState.preset==='custom'?'active':''}" data-p="custom">Período</button>
          </div>
          ${panelState.preset === 'custom' ? `
            <div class="neo-kpi-date-row">
              <input type="date" id="neo-dt-start" value="${panelState.customStart}" />
              <span style="color:var(--tx3);font-size:13px;">até</span>
              <input type="date" id="neo-dt-end" value="${panelState.customEnd}" />
              <button class="neo-kpi-btn primary" id="neo-dt-apply">Aplicar</button>
            </div>
          ` : ''}
          ${wabaDropdown}
          ${badgeHTML}
          <button class="neo-kpi-btn" id="neo-refresh">↻ Atualizar</button>
          <button class="neo-kpi-btn" id="neo-close" title="Fechar painel" style="padding:7px 10px;">✕</button>
        </div>
      </div>
    `;

    const contentEl = document.createElement('div');
    panel.innerHTML = headerHTML;
    contentEl.id = 'neo-kpi-content';
    panel.appendChild(contentEl);

    // Eventos do header
    panel.querySelectorAll('.neo-kpi-period-btn').forEach(btn => {
      btn.onclick = () => {
        panelState.preset = btn.dataset.p;
        if (panelState.preset !== 'custom') loadData();
        else renderPanel();
      };
    });

    const startInp = document.getElementById('neo-dt-start');
    const endInp   = document.getElementById('neo-dt-end');
    if (startInp) startInp.onchange = e => { panelState.customStart = e.target.value; };
    if (endInp)   endInp.onchange   = e => { panelState.customEnd   = e.target.value; };

    const applyBtn = document.getElementById('neo-dt-apply');
    if (applyBtn) applyBtn.onclick = () => {
      if (panelState.customStart && panelState.customEnd) loadData(); // Ajuste 2: Aplicar já carrega
    };

    document.getElementById('neo-refresh').onclick = loadData;

    const wabaSelect = document.getElementById('neo-waba-select');
    if (wabaSelect) {
      wabaSelect.onchange = (e) => {
        panelState.selectedWabaIdx = parseInt(e.target.value);
        panelState.analytics = [];
        panelState.templates = [];
        loadData();
      };
    }

    // Botão fechar — remove painel instantaneamente, sem reload
    document.getElementById('neo-close').onclick = closePanel;

    // Conteúdo
    if (panelState.view === 'detail') {
      renderDetail(contentEl);
    } else {
      renderOverview(contentEl);
    }
  };

  // ─── INJECT PANEL INTO ROUTE ──────────────────────────────────────────────
  const closePanel = () => {
    const overlayEl = document.getElementById('neo-kpi-overlay');
    if (overlayEl) overlayEl.remove();
    document.removeEventListener('keydown', onEscClose);
    // Navega via SPA sem reload
    const accountId = getAccountId();
    history.pushState({}, '', `/app/accounts/${accountId}/conversations`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const onEscClose = (e) => { if (e.key === 'Escape') closePanel(); };

  const mountPanel = () => {
    if (document.getElementById(PANEL_ID)) return;

    const overlay = document.createElement('div');
    overlay.id = 'neo-kpi-overlay';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closePanel(); });
    document.addEventListener('keydown', onEscClose);

    const host = document.createElement('div');
    host.id = PANEL_ID;
    host.classList.add(isDark() ? 'dark' : 'light');

    overlay.appendChild(host);
    document.body.appendChild(overlay);
    renderPanel();
    loadData();

    const themeObs = new MutationObserver(applyTheme);
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    themeObs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  };

  // botão flutuante KPI removido — abertura via window.nfx_kpis_open()

  // ─── TICK (route watcher) ─────────────────────────────────────────────────
  const tick = () => {
    if (isKpiRoute()) {
      mountPanel();
    }
  };

  // ─── INIT ─────────────────────────────────────────────────────────────────
  const init = () => {
    injectCSS();
    tick();

    // Observar mudanças de rota (SPA)
    const _push = history.pushState.bind(history);
    history.pushState = (...args) => { _push(...args); tick(); };
    window.addEventListener('popstate', tick);

    // MutationObserver para garantir FAB e painel
    const obs = new MutationObserver(() => {
      if (isKpiRoute() && !document.getElementById(PANEL_ID)) mountPanel();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  };

  // Expõe abertura para o menu Neofluxx
  window.nfx_kpis_open = () => {
    if (!location.pathname.includes(KPI_ROUTE)) {
      history.pushState({}, '', kpiPath());
      window.dispatchEvent(new PopStateEvent('popstate'));
      tick();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();