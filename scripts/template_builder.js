(function () {
  'use strict';

  const STORAGE_KEY = 'neofluxx_waba_config';

  const N8N_CONFIG = {
    webhookUrl: 'https://SEU-N8N/webhook/template-builder',
    get tenantKey() {
      const match = window.location.pathname.match(/accounts\/(\d+)/);
      return match ? `account-${match[1]}` : 'default';
    },
    apiKey: ''
  };

  function isDark() {
    return document.documentElement.classList.contains('dark') ||
           document.body.classList.contains('dark') ||
           document.querySelector('.app-wrapper')?.classList.contains('dark-theme') ||
           window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  const style = document.createElement('style');
  style.id = 'nfx-tb-style';
  style.textContent = `
    #nfx-fab{position:fixed;bottom:28px;right:28px;z-index:99998;width:52px;height:52px;border-radius:50%;background:#25d366;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(37,211,102,.4);transition:transform .2s,box-shadow .2s}
    #nfx-fab:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(37,211,102,.55)}
    #nfx-fab svg{width:24px;height:24px;fill:#fff}
    #nfx-overlay{display:none;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);align-items:center;justify-content:center}
    #nfx-overlay.open{display:flex}
    #nfx-modal{width:960px;max-width:96vw;height:88vh;border-radius:14px;overflow:hidden;display:grid;grid-template-rows:52px 1fr;grid-template-columns:200px 1fr 280px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;animation:nfxIn .2s ease}
    @keyframes nfxIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
    #nfx-modal.light{background:#f5f7fa;color:#1a1a2e;--bg:#f5f7fa;--sf:#fff;--sf2:#f0f2f5;--sf3:#e8eaed;--bd:#e2e5ea;--bd2:#d0d4db;--tx:#1a1a2e;--tx2:#5a6170;--tx3:#9aa0ad;--ac:#25d366;--ac2:#128c7e;--adim:rgba(37,211,102,.1);--agl:rgba(37,211,102,.3);--red:#e53935;--amb:#f5a623;--bl:#1976d2}
    #nfx-modal.dark{background:#0f0f11;color:#f0f0f5;--bg:#0f0f11;--sf:#17171b;--sf2:#1e1e24;--sf3:#252530;--bd:#2a2a35;--bd2:#35354a;--tx:#f0f0f5;--tx2:#9090a8;--tx3:#55556a;--ac:#25d366;--ac2:#128c7e;--adim:rgba(37,211,102,.12);--agl:rgba(37,211,102,.25);--red:#ff5e5e;--amb:#f5a623;--bl:#4f8ef7}
    #nfx-topbar{grid-column:1/-1;display:flex;align-items:center;padding:0 16px;gap:12px;border-bottom:1px solid var(--bd);background:var(--sf)}
    .nfx-sp{flex:1}
    .nfx-pill{display:flex;align-items:center;gap:6px;padding:3px 10px;border-radius:20px;background:var(--adim);border:1px solid var(--agl);font-size:11px;color:var(--ac)}
    .nfx-dot{width:5px;height:5px;border-radius:50%;background:var(--ac);animation:nfxPulse 2s infinite}
    @keyframes nfxPulse{0%,100%{opacity:1}50%{opacity:.3}}
    .nfx-tbtn{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:7px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:11px;cursor:pointer;transition:all .15s}
    .nfx-tbtn:hover{background:var(--sf2);color:var(--tx)}
    #nfx-xbtn{width:28px;height:28px;border-radius:50%;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
    #nfx-xbtn:hover{background:rgba(255,94,94,.15);color:var(--red);border-color:var(--red)}
    #nfx-sidebar{background:var(--sf);border-right:1px solid var(--bd);padding:12px 8px;display:flex;flex-direction:column;gap:2px;overflow-y:auto}
    .nfx-ns{font-size:10px;color:var(--tx3);letter-spacing:.07em;text-transform:uppercase;padding:8px 8px 4px}
    .nfx-ni{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:12px;color:var(--tx2);transition:all .15s;border:1px solid transparent}
    .nfx-ni:hover{background:var(--sf2);color:var(--tx)}
    .nfx-ni.active{background:var(--adim);color:var(--ac);border-color:var(--agl)}
    .nfx-ni svg{width:15px;height:15px;flex-shrink:0}
    .nfx-nb{margin-left:auto;font-size:10px;padding:1px 6px;border-radius:10px;background:var(--sf3);color:var(--tx3)}
    .nfx-ni.active .nfx-nb{background:var(--adim);color:var(--ac)}
    #nfx-main{overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:14px;background:var(--bg)}
    .nfx-title{font-size:16px;font-weight:600;color:var(--tx)}
    .nfx-sub{font-size:11px;color:var(--tx2);margin-top:2px}
    .nfx-sec{background:var(--sf);border:1px solid var(--bd);border-radius:10px;overflow:hidden}
    .nfx-sh{padding:10px 14px;border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:8px}
    .nfx-sn{width:20px;height:20px;border-radius:50%;background:var(--adim);border:1px solid var(--agl);display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--ac);font-weight:600;flex-shrink:0}
    .nfx-st{font-size:12px;font-weight:600;color:var(--tx)}
    .nfx-sb{padding:14px}
    .nfx-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .nfx-f{display:flex;flex-direction:column;gap:4px}
    .nfx-f label{font-size:11px;color:var(--tx2);font-weight:500}
    .nfx-req{color:var(--ac)}
    .nfx-hint{font-size:10px;color:var(--tx3);line-height:1.5}
    .nfx-hint code{background:var(--sf2);border-radius:3px;padding:1px 4px;font-family:monospace;font-size:10px;color:var(--tx2)}
    .nfx-inp,.nfx-sel,.nfx-ta{background:var(--sf2);border:1px solid var(--bd);border-radius:7px;padding:7px 10px;color:var(--tx);font-size:12px;transition:border .15s;width:100%;box-sizing:border-box;font-family:inherit}
    .nfx-inp:focus,.nfx-sel:focus,.nfx-ta:focus{outline:none;border-color:var(--ac);box-shadow:0 0 0 3px var(--adim)}
    .nfx-inp::placeholder,.nfx-ta::placeholder{color:var(--tx3)}
    .nfx-sel{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center}
    .nfx-ta{resize:vertical;min-height:80px;line-height:1.6;font-family:monospace;font-size:12px}
    .nfx-cc{font-size:10px;color:var(--tx3);text-align:right}
    .nfx-cc.wa rn{color:var(--amb)}.nfx-cc.over{color:var(--red)}
    .nfx-ttabs{display:flex;gap:5px;flex-wrap:wrap}
    .nfx-tt{padding:5px 10px;border-radius:20px;border:1px solid var(--bd2);background:var(--sf2);color:var(--tx2);font-size:11px;cursor:pointer;transition:all .15s}
    .nfx-tt:hover{color:var(--tx);background:var(--sf3)}
    .nfx-tt.active{background:var(--adim);border-color:var(--agl);color:var(--ac)}
    .nfx-vs{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}
    .nfx-vc{padding:2px 7px;border-radius:4px;background:var(--sf3);border:1px solid var(--bd2);font-size:10px;font-family:monospace;color:var(--tx2);cursor:pointer;transition:all .15s}
    .nfx-vc:hover{border-color:var(--agl);color:var(--ac);background:var(--adim)}
    .nfx-bl{display:flex;flex-direction:column;gap:6px}
    .nfx-br{display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--sf2);border:1px solid var(--bd);border-radius:7px}
    .nfx-brl{flex:1;font-size:11px;color:var(--tx)}
    .nfx-brt{font-size:10px;padding:2px 7px;border-radius:10px}
    .nfx-btq{background:var(--adim);color:var(--ac);border:1px solid var(--agl)}
    .nfx-btc{background:rgba(79,142,247,.15);color:var(--bl);border:1px solid rgba(79,142,247,.3)}
    .nfx-bdel{width:20px;height:20px;border-radius:4px;border:1px solid var(--bd2);background:transparent;color:var(--tx3);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0;padding:0;line-height:1}
    .nfx-bdel:hover{background:rgba(255,94,94,.1);border-color:var(--red);color:var(--red)}
    .nfx-abr{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}
    .nfx-ab{display:flex;align-items:center;gap:5px;padding:6px 10px;border-radius:7px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:11px;cursor:pointer;transition:all .15s}
    .nfx-ab:hover{background:var(--sf2);color:var(--tx)}
    .nfx-uz{border:1px dashed var(--bd2);border-radius:7px;padding:10px;text-align:center;color:var(--tx3);font-size:11px}
    .nfx-note{display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border-radius:8px;background:rgba(245,166,35,.07);border:1px solid rgba(245,166,35,.25);font-size:11px;color:var(--tx2);line-height:1.5}
    .nfx-warn{display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border-radius:7px;background:rgba(229,57,53,.07);border:1px solid rgba(229,57,53,.25);font-size:11px;color:var(--red);line-height:1.5;margin-top:6px;display:none}
    .nfx-ni-icon{color:var(--amb);flex-shrink:0;margin-top:1px}
    .nfx-ff{display:flex;justify-content:flex-end;gap:8px;padding-top:4px}
    .nfx-bp{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:7px;background:var(--ac);border:none;color:#000;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit}
    .nfx-bp:hover:not(:disabled){background:#1db954;box-shadow:0 0 14px var(--agl)}
    .nfx-bp:disabled{opacity:.6;cursor:not-allowed}
    .nfx-bs{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:7px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:12px;cursor:pointer;transition:all .15s;font-family:inherit}
    .nfx-bs:hover{background:var(--sf2);color:var(--tx)}
    #nfx-preview{background:var(--sf);border-left:1px solid var(--bd);display:flex;flex-direction:column;overflow:hidden}
    .nfx-ph{padding:12px 14px;border-bottom:1px solid var(--bd);display:flex;align-items:center;justify-content:space-between}
    #nfx-pbody{flex:1;padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:12px}
    .nfx-phone{width:100%;max-width:228px;margin:0 auto;background:#efeae2;border-radius:18px;overflow:hidden;border:1px solid #d4c9b8}
    .nfx-pbar{background:#075e54;padding:10px 12px;display:flex;align-items:center;justify-content:center}
    .nfx-pbar-title{font-size:12px;font-weight:600;color:#fff;text-align:center}
    .nfx-pbar-sub{font-size:9px;color:rgba(255,255,255,.7);text-align:center;margin-top:1px}
    .nfx-pchat{padding:10px;min-height:150px;background:#efeae2;background-image:url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000' fill-opacity='0.03'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")}
    .nfx-bub{background:#fff;border-radius:0 8px 8px 8px;padding:8px 10px;max-width:95%;box-shadow:0 1px 2px rgba(0,0,0,.1)}
    .nfx-bub.nfx-has-btns{border-radius:0 8px 0 0;box-shadow:none}
    .nfx-wt{font-size:11px;color:#111;line-height:1.5}
    .nfx-vh{background:rgba(37,211,102,.15);color:#128c7e;border-radius:3px;padding:0 3px;font-family:monospace;font-size:10px}
    .nfx-wfr{margin-top:4px;display:flex;justify-content:flex-end;font-size:9px;color:#8696a0;gap:3px;align-items:center}
    .nfx-wht{margin-bottom:6px}
    .nfx-whtxt{font-size:13px;font-weight:600;color:#111;margin-bottom:4px}
    .nfx-whm{width:100%;border-radius:6px;overflow:hidden;margin-bottom:6px}
    .nfx-whm img{width:100%;height:auto;display:block;max-height:160px;object-fit:cover}
    .nfx-whm-ph{width:100%;height:80px;background:#d0c9be;display:flex;align-items:center;justify-content:center;font-size:24px}
    .nfx-wft{border-top:1px solid rgba(0,0,0,.08);margin-top:6px;padding-top:5px;font-size:10px;color:#667781}
    .nfx-wb{width:100%;background:#fff;border:none;border-top:1px solid #e9e9e9;padding:8px;text-align:center;font-size:11px;color:#00a5f4;cursor:default;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:5px;box-sizing:border-box;border-radius:0}
    .nfx-wb:last-child{border-radius:0 0 8px 8px}
    .nfx-pbtns-wrap{max-width:95%;background:#fff;border-radius:0 0 8px 8px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.1)}
    .nfx-ve{display:flex;align-items:center;gap:6px;padding:0;background:transparent;border:none;border-radius:0}
    .nfx-vk{font-family:monospace;font-size:10px;color:var(--ac);white-space:nowrap;min-width:32px}
    .nfx-ve input{flex:1;font-size:11px;padding:2px 6px;border:1px solid var(--bd);border-radius:5px;background:var(--sf);color:var(--tx);font-family:inherit;outline:none;transition:border .15s;width:100%;box-sizing:border-box}
    .nfx-ve input:focus{border-color:var(--ac);box-shadow:0 0 0 2px var(--adim)}
    .nfx-vartype-box{display:flex;align-items:center;gap:10px;margin-top:10px;padding:10px 12px;background:var(--sf2);border:1px solid var(--bd);border-radius:8px}
    .nfx-vartype-label{font-size:11px;color:var(--tx2);font-weight:500;white-space:nowrap}
    .nfx-vartype-opts{display:flex;gap:6px}
    .nfx-vto{display:flex;align-items:center;gap:5px;padding:5px 12px;border-radius:20px;border:1px solid var(--bd2);background:var(--sf);color:var(--tx2);font-size:11px;cursor:pointer;transition:all .15s;user-select:none}
    .nfx-vto:hover{background:var(--sf3);color:var(--tx)}
    .nfx-vto.active{background:var(--adim);border-color:var(--agl);color:var(--ac)}
    .nfx-vto-dot{width:7px;height:7px;border-radius:50%;border:1.5px solid currentColor;transition:all .15s;flex-shrink:0}
    .nfx-vto.active .nfx-vto-dot{background:var(--ac);border-color:var(--ac)}
    .nfx-lv{display:none;flex-direction:column;gap:10px}
    .nfx-tc{background:var(--sf);border:1px solid var(--bd);border-radius:10px;padding:12px 14px;display:flex;align-items:flex-start;gap:12px}
    .nfx-ti{flex:1}
    .nfx-tn{font-size:13px;font-weight:600;color:var(--tx)}
    .nfx-tm{font-size:11px;color:var(--tx2);margin-top:2px}
    .nfx-sb2{font-size:10px;padding:3px 9px;border-radius:10px;font-weight:500;white-space:nowrap}
    .nfx-AP{background:var(--adim);color:var(--ac);border:1px solid var(--agl)}
    .nfx-PE{background:rgba(245,166,35,.12);color:var(--amb);border:1px solid rgba(245,166,35,.3)}
    .nfx-RE{background:rgba(255,94,94,.1);color:var(--red);border:1px solid rgba(255,94,94,.3)}
    .nfx-PA{background:var(--sf3);color:var(--tx3);border:1px solid var(--bd2)}
    .nfx-ltb{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
    .nfx-ld{text-align:center;color:var(--tx3);font-size:12px;padding:24px}
    .nfx-rr{margin-top:6px;padding:6px 8px;border-radius:6px;background:rgba(255,94,94,.08);border:1px solid rgba(255,94,94,.2);font-size:10px;color:var(--red);line-height:1.5}
    #nfx-cfg-ov{display:none;position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.6);align-items:center;justify-content:center}
    #nfx-cfg-ov.open{display:flex}
    #nfx-cfg-m{width:420px;max-width:94vw;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    #nfx-cfg-m.light{background:#fff;color:#1a1a2e;--bd:#e2e5ea;--sf:#fff;--sf2:#f0f2f5;--tx:#1a1a2e;--tx2:#5a6170;--tx3:#9aa0ad;--ac:#25d366;--adim:rgba(37,211,102,.1);--agl:rgba(37,211,102,.3);--red:#e53935}
    #nfx-cfg-m.dark{background:#17171b;color:#f0f0f5;--bd:#2a2a35;--sf:#17171b;--sf2:#1e1e24;--tx:#f0f0f5;--tx2:#9090a8;--tx3:#55556a;--ac:#25d366;--adim:rgba(37,211,102,.12);--agl:rgba(37,211,102,.25);--red:#ff5e5e}
    .nfx-ch{padding:14px 16px;border-bottom:1px solid var(--bd);display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:600}
    .nfx-cb{padding:16px;display:flex;flex-direction:column;gap:12px}
    .nfx-cf{padding:12px 16px;border-top:1px solid var(--bd);display:flex;gap:8px;justify-content:flex-end}
    .nfx-cb label{font-size:11px;color:var(--tx2);font-weight:500;display:block;margin-bottom:4px}
    .nfx-cb input{background:var(--sf2);border:1px solid var(--bd);border-radius:7px;padding:7px 10px;color:var(--tx);font-size:12px;width:100%;box-sizing:border-box;font-family:inherit}
    .nfx-cb input:focus{outline:none;border-color:var(--ac);box-shadow:0 0 0 3px var(--adim)}
    .nfx-tr{padding:6px 10px;border-radius:6px;font-size:11px;margin-top:4px;display:none}
    .nfx-tr.ok{background:var(--adim);color:var(--ac);border:1px solid var(--agl);display:block}
    .nfx-tr.err{background:rgba(255,94,94,.1);color:var(--red);border:1px solid rgba(255,94,94,.3);display:block}
    @keyframes nfxSpin{to{transform:rotate(360deg)}}
    .nfx-spin{display:inline-block;width:12px;height:12px;border:2px solid rgba(0,0,0,.25);border-top-color:#000;border-radius:50%;animation:nfxSpin .7s linear infinite}
    #nfx-main::-webkit-scrollbar,#nfx-pbody::-webkit-scrollbar{width:4px}
    #nfx-main::-webkit-scrollbar-track,#nfx-pbody::-webkit-scrollbar-track{background:transparent}
    #nfx-main::-webkit-scrollbar-thumb,#nfx-pbody::-webkit-scrollbar-thumb{background:var(--bd2);border-radius:2px}
    .nfx-field-err{font-size:10px;color:var(--red);margin-top:3px;display:none}
  `;
  document.head.appendChild(style);

  let buttons     = [];
  let headerType  = 'none';
  let varType     = 'text';
  let varExamples = {};
  let config      = Object.assign({}, N8N_CONFIG, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));

  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function tc()   { return isDark() ? 'dark' : 'light'; }

  function applyTheme() {
    const m = document.getElementById('nfx-modal');
    const c = document.getElementById('nfx-cfg-m');
    if (m) { m.classList.remove('dark','light'); m.classList.add(tc()); }
    if (c) { c.classList.remove('dark','light'); c.classList.add(tc()); }
  }

  function getConfig() {
    return Object.assign({}, N8N_CONFIG, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
  }

  function saveConfig(next) {
    config = Object.assign({}, N8N_CONFIG, next || {});
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    return config;
  }

  function buildN8NHeaders(extra) {
    const cfg = getConfig();
    const headers = Object.assign({ Accept:'application/json' }, extra || {});
    if (cfg.apiKey) headers['x-api-key'] = cfg.apiKey;
    return headers;
  }

  async function n8nRequest(action, payload, file) {
    const cfg = getConfig();
    if (!cfg.webhookUrl) throw new Error('Configure a URL do webhook do n8n.');
    if (!cfg.tenantKey) throw new Error('Configure a chave da empresa / tenant no n8n.');
    if (file) {
      const form = new FormData();
      form.append('action', action);
      form.append('tenant_key', cfg.tenantKey);
      form.append('payload', JSON.stringify(payload || {}));
      form.append('file', file, file.name || 'upload.bin');
      const res = await fetch(cfg.webhookUrl, { method:'POST', headers:buildN8NHeaders(), body:form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || data.message || `HTTP ${res.status}`);
      return data;
    }
    const res = await fetch(cfg.webhookUrl, {
      method: 'POST',
      headers: buildN8NHeaders({ 'Content-Type':'application/json' }),
      body: JSON.stringify({ action, tenant_key: cfg.tenantKey, payload: payload || {} })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(data.error || data.message || `HTTP ${res.status}`);
    return data;
  }

  const fab = document.createElement('button');
  fab.id = 'nfx-fab';
  fab.title = 'Template Builder';
  fab.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 9h-2V5h2v6zm0 4h-2v-2h2v2z"/></svg>`;
  fab.onclick = openBuilder;
  document.body.appendChild(fab);

  const overlay = document.createElement('div');
  overlay.id = 'nfx-overlay';
  overlay.innerHTML = buildHTML();
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeBuilder(); });

  function openBuilder() { applyTheme(); overlay.classList.add('open'); updatePreview(); }
  function closeBuilder() { overlay.classList.remove('open'); }

  function buildHTML() {
    return `
    <div id="nfx-modal" class="${tc()}">
      <div id="nfx-topbar">
        <span style="font-size:13px;font-weight:600;color:var(--tx)">Template Builder</span>
        <span style="font-size:10px;color:var(--tx3)">/ WhatsApp Business</span>
        <div class="nfx-sp"></div>
        <div class="nfx-pill"><div class="nfx-dot"></div><span id="nfx-stxt">aguardando configuração</span></div>
        <button class="nfx-tbtn" onclick="nfxOpenCfg()">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          Conf. n8n
        </button>
        <button id="nfx-xbtn" onclick="nfxClose()">✕</button>
      </div>

      <div id="nfx-sidebar">
        <div class="nfx-ns">Criar</div>
        <div class="nfx-ni active" id="nfx-nav-c" onclick="nfxView('create')">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 13h4" stroke-linecap="round"/></svg>
          Novo template
        </div>
        <div class="nfx-ns" style="margin-top:8px">Gerenciar</div>
        <div class="nfx-ni" id="nfx-nav-l" onclick="nfxView('list')">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Meus templates
          <span class="nfx-nb" id="nfx-lb">—</span>
        </div>
      </div>

      <div id="nfx-main">
        <div id="nfx-cv" style="display:flex;flex-direction:column;gap:14px">
          <div><div class="nfx-title">Novo template</div><div class="nfx-sub">Preencha e envie para aprovação da Meta</div></div>

          <div class="nfx-sec">
            <div class="nfx-sh"><div class="nfx-sn">1</div><div class="nfx-st">Identificação</div></div>
            <div class="nfx-sb">
              <div class="nfx-g2">
                <div class="nfx-f" style="grid-column:span 2">
                  <label>Nome do template <span class="nfx-req">*</span></label>
                  <input class="nfx-inp" id="nfx-name" autocomplete="off" placeholder="ex: boas_vindas_cliente" oninput="nfxNameChg(this)"/>
                  <div class="nfx-hint">Apenas letras minúsculas, números e underscores ( _ )</div>
                  <div class="nfx-field-err" id="nfx-name-err">⚠ Use apenas letras minúsculas, números e underscores. Espaços e caracteres especiais não são permitidos.</div>
                </div>
                <div class="nfx-f">
                  <label>Categoria <span class="nfx-req">*</span></label>
                  <select class="nfx-sel" id="nfx-cat" onchange="nfxPrev()">
                    <option value="MARKETING">MARKETING</option>
                    <option value="UTILITY">UTILITY</option>
                    <option value="AUTHENTICATION">AUTHENTICATION</option>
                  </select>
                </div>
                <div class="nfx-f">
                  <label>Idioma</label>
                  <select class="nfx-sel" id="nfx-lang"><option value="pt_BR">🇧🇷 Português (BR)</option></select>
                </div>
              </div>
            </div>
          </div>

          <div class="nfx-sec">
            <div class="nfx-sh"><div class="nfx-sn">2</div><div class="nfx-st">Tipo de variável</div></div>
            <div class="nfx-sb">
              <div class="nfx-vartype-box" style="margin-top:0">
                <span class="nfx-vartype-label">Variáveis no template:</span>
                <div class="nfx-vartype-opts">
                  <div class="nfx-vto active" id="nfx-vto-none" onclick="nfxSetVarType('none')"><div class="nfx-vto-dot"></div>Sem variável</div>
                  <div class="nfx-vto" id="nfx-vto-number" onclick="nfxSetVarType('number')"><div class="nfx-vto-dot"></div>Número</div>
                </div>
              </div>
              <div class="nfx-hint" style="margin-top:8px">Use <code>{{1}}</code>, <code>{{2}}</code>... no corpo da mensagem para inserir variáveis</div>
            </div>
          </div>

          <div class="nfx-sec">
            <div class="nfx-sh"><div class="nfx-sn">3</div><div class="nfx-st">Cabeçalho <span style="font-size:10px;color:var(--tx3);font-weight:400">(opcional)</span></div></div>
            <div class="nfx-sb">
              <div class="nfx-ttabs">
                <div class="nfx-tt active" onclick="nfxHdr('none',this)">Nenhum</div>
                <div class="nfx-tt" onclick="nfxHdr('text',this)">Texto</div>
                <div class="nfx-tt" onclick="nfxHdr('image',this)">🖼 Imagem</div>
                <div class="nfx-tt" onclick="nfxHdr('video',this)">▶ Vídeo</div>
                <div class="nfx-tt" onclick="nfxHdr('document',this)">📄 Documento</div>
              </div>
              <div id="nfx-htxt" style="display:none;margin-top:10px">
                <input class="nfx-inp" id="nfx-hval" placeholder="Texto do cabeçalho (máx. 60 caracteres)" maxlength="60" oninput="nfxPrev()"/>
              </div>
              <div id="nfx-hmedia" style="display:none;margin-top:10px;flex-direction:column;gap:8px">
                <div class="nfx-uz" onclick="document.getElementById('nfx-file-input').click()" style="cursor:pointer">
                  <div style="font-size:16px;margin-bottom:2px">↑</div>
                  <div style="font-size:11px;color:var(--tx2)">Clique para selecionar arquivo</div>
                  <div style="font-size:10px;color:var(--tx3);margin-top:1px">JPG, PNG, MP4, PDF</div>
                </div>
                <input type="file" id="nfx-file-input" accept="image/*,video/*,application/pdf" style="display:none" onchange="nfxFileSelected(this)"/>
                <div id="nfx-file-info" style="display:none;align-items:center;gap:8px;padding:6px 10px;background:var(--adim);border:1px solid var(--agl);border-radius:7px;font-size:11px;color:var(--ac)">
                  <span id="nfx-file-name"></span>
                  <span id="nfx-file-status" style="margin-left:4px"></span>
                  <button onclick="nfxClearFile()" style="margin-left:auto;background:none;border:none;color:var(--ac);cursor:pointer;font-size:14px;padding:0;line-height:1">×</button>
                </div>
              </div>
            </div>
          </div>

          <div class="nfx-sec">
            <div class="nfx-sh"><div class="nfx-sn">4</div><div class="nfx-st">Corpo da mensagem <span class="nfx-req">*</span></div></div>
            <div class="nfx-sb">
              <div class="nfx-f">
                <label>Texto</label>
                <textarea class="nfx-ta" id="nfx-body" placeholder="Olá {{1}}, seu pedido foi confirmado!" oninput="nfxBodyChg(this)"></textarea>
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <div class="nfx-hint">Use <code>{{1}}</code> <code>{{2}}</code> para variáveis</div>
                  <div class="nfx-cc" id="nfx-bc">0/1024</div>
                </div>
                <div class="nfx-hint" style="margin-top:2px">Para negrito: <code>*texto*</code></div>
                <div class="nfx-vs" id="nfx-vs"></div>
                <div class="nfx-warn" id="nfx-var-warn">⚠ Use apenas números: <code>{{1}}</code>, <code>{{2}}</code>... Formato com texto como <code>{{nome}}</code> é rejeitado pela Meta.</div>
                <div class="nfx-field-err" id="nfx-var-dup-err">⚠ Variável duplicada — cada variável deve aparecer apenas uma vez no texto.</div>
                <div class="nfx-field-err" id="nfx-var-pos-err">⚠ Variável não pode estar no início ou no final do texto. Adicione texto antes e depois.</div>
              </div>
            </div>
          </div>

          <div class="nfx-sec">
            <div class="nfx-sh"><div class="nfx-sn">5</div><div class="nfx-st">Rodapé <span style="font-size:10px;color:var(--tx3);font-weight:400">(opcional)</span></div></div>
            <div class="nfx-sb">
              <input class="nfx-inp" id="nfx-foot" placeholder="ex: Responda PARAR para cancelar" maxlength="60" oninput="nfxPrev()"/>
              <div class="nfx-hint" style="margin-top:4px">Máx. 60 caracteres</div>
            </div>
          </div>

          <div class="nfx-sec">
            <div class="nfx-sh"><div class="nfx-sn">6</div><div class="nfx-st">Botões <span style="font-size:10px;color:var(--tx3);font-weight:400">(opcional — máx. 10)</span></div></div>
            <div class="nfx-sb">
              <div class="nfx-bl" id="nfx-bl"></div>
              <div class="nfx-abr">
                <button class="nfx-ab" onclick="nfxAddBtn('QUICK_REPLY')">+ Personalizado</button>
                <button class="nfx-ab" onclick="nfxAddBtn('URL')">+ Acessar site</button>
              </div>
            </div>
          </div>

          <div class="nfx-note"><span class="nfx-ni-icon">⚠</span>Templates passam por aprovação da Meta e podem levar até 24h. Após aprovação ficam disponíveis automaticamente.</div>

          <div class="nfx-ff">
            <button class="nfx-bs" onclick="nfxClear()">Limpar</button>
            <button class="nfx-bp" id="nfx-submit-btn" onclick="nfxSubmit()">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Enviar para Meta
            </button>
          </div>
        </div>

        <div class="nfx-lv" id="nfx-lv">
          <div class="nfx-ltb">
            <div><div class="nfx-title">Meus templates</div><div class="nfx-sub">Templates da sua conta WhatsApp Business</div></div>
            <button class="nfx-bs" id="nfx-refresh-btn" onclick="nfxLoad()">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Atualizar
            </button>
          </div>
          <div id="nfx-tlist"><div class="nfx-ld">Clique em "Atualizar" para carregar</div></div>
        </div>
      </div>

      <div id="nfx-preview">
        <div class="nfx-ph">
          <span style="font-size:12px;font-weight:600;color:var(--tx)">Preview</span>
          <span style="font-size:10px;color:var(--tx3)">tempo real</span>
        </div>
        <div id="nfx-pbody">
          <div class="nfx-phone">
            <div class="nfx-pbar">
              <div><div class="nfx-pbar-title">Prévia do Modelo</div><div class="nfx-pbar-sub">WhatsApp Business</div></div>
            </div>
            <div class="nfx-pchat">
              <div class="nfx-bub">
                <div id="nfx-ph2" class="nfx-wht" style="display:none"></div>
                <div class="nfx-wt" id="nfx-pb">Digite o corpo da mensagem...</div>
                <div id="nfx-pf" class="nfx-wft" style="display:none"></div>
                <div class="nfx-wfr">
                  <span>agora</span>
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="#53bdeb"><path d="M1 5l3 3 5-7M6 8l2-2 3-3"/></svg>
                </div>
              </div>
              <div class="nfx-pbtns-wrap"><div id="nfx-pbtns"></div></div>
            </div>
          </div>
          <div id="nfx-vbox" style="display:none">
            <div style="font-size:10px;color:var(--tx3);margin-bottom:6px">Preencha para visualizar no preview</div>
            <div id="nfx-vlist" style="display:flex;flex-direction:column;gap:6px"></div>
          </div>
        </div>
      </div>
    </div>

    <div id="nfx-cfg-ov">
      <div id="nfx-cfg-m" class="${tc()}">
        <div class="nfx-ch">
          <span>⚙ Configuração n8n</span>
          <button class="nfx-ib" onclick="nfxCloseCfg()" style="border:none;background:transparent;cursor:pointer;font-size:16px;color:var(--tx2)">✕</button>
        </div>
        <div class="nfx-cb">
          <div><label>Webhook do n8n <span class="nfx-req">*</span></label><input type="text" id="nfx-wh" placeholder="https://SEU-N8N/webhook/template-builder"/><div class="nfx-hint" style="margin-top:4px">Credenciais da Meta ficam no n8n. O script envia apenas os dados do builder.</div></div>
          <div><label>API key (opcional)</label><input type="password" id="nfx-apik" placeholder="Opcional para proteger o webhook"/></div>
          <div id="nfx-tr" class="nfx-tr"></div>
        </div>
        <div class="nfx-cf">
          <button class="nfx-bs" onclick="nfxTest()">Testar conexão</button>
          <button class="nfx-bp" onclick="nfxSaveCfg()">Salvar</button>
        </div>
      </div>
    </div>
    `;
  }

  window.nfxClose = closeBuilder;

  window.nfxOpenCfg = function() {
    const c = getConfig();
    document.getElementById('nfx-wh').value     = c.webhookUrl||'';
    document.getElementById('nfx-apik').value   = c.apiKey||'';
    document.getElementById('nfx-tr').className = 'nfx-tr';
    document.getElementById('nfx-cfg-ov').classList.add('open');
  };

  window.nfxCloseCfg = function() {
    document.getElementById('nfx-cfg-ov').classList.remove('open');
  };

  window.nfxSaveCfg = function() {
    const webhookUrl = document.getElementById('nfx-wh').value.trim();
    const apiKey     = document.getElementById('nfx-apik').value.trim();
    const tenantKey  = N8N_CONFIG.tenantKey;
    if (!webhookUrl) { alert('Preencha o webhook do n8n.'); return; }
    saveConfig({ webhookUrl, tenantKey, apiKey });
    const s = document.getElementById('nfx-stxt');
    if (s) s.textContent = 'Sincronizado';
    window.nfxCloseCfg();
  };

  window.nfxTest = async function() {
    const webhookUrl = document.getElementById('nfx-wh').value.trim();
    const apiKey     = document.getElementById('nfx-apik').value.trim();
    const tenantKey  = N8N_CONFIG.tenantKey;
    const r = document.getElementById('nfx-tr');
    if (!webhookUrl) { r.className='nfx-tr err'; r.textContent='Preencha o webhook do n8n.'; return; }
    r.className='nfx-tr'; r.textContent='Testando...'; r.style.display='block';
    try {
      saveConfig({ webhookUrl, tenantKey, apiKey });
      const d = await n8nRequest('test_connection', {});
      r.className='nfx-tr ok'; r.textContent=`✓ ${d.message || 'Webhook conectado'}`;
      const s = document.getElementById('nfx-stxt');
      if (s) s.textContent = 'Sincronizado';
    } catch(e) { r.className='nfx-tr err'; r.textContent=`✗ Erro: ${e.message}`; }
  };

  window.nfxView = function(v) {
    document.getElementById('nfx-cv').style.display  = v==='create'?'flex':'none';
    document.getElementById('nfx-lv').style.display  = v==='list'?'flex':'none';
    document.getElementById('nfx-preview').style.display = v==='create'?'flex':'none';
    document.getElementById('nfx-nav-c').className = 'nfx-ni'+(v==='create'?' active':'');
    document.getElementById('nfx-nav-l').className = 'nfx-ni'+(v==='list'?' active':'');
    if (v==='list') nfxLoad();
  };

  window.nfxSetVarType = function(type) {
    varType = type;
    ['none','number'].forEach(t => {
      const el = document.getElementById('nfx-vto-'+t);
      if (el) el.classList.toggle('active', t===type);
    });
  };

  // Ajuste 6a: validação do nome em tempo real
  window.nfxNameChg = function(el) {
    const val = el.value;
    const valid = /^[a-z0-9_]*$/.test(val);
    const err = document.getElementById('nfx-name-err');
    if (err) err.style.display = (!valid && val.length > 0) ? 'block' : 'none';
    el.style.borderColor = (!valid && val.length > 0) ? 'var(--red)' : '';
    updatePreview();
  };

  window.nfxFileSelected = async function(input) {
    const file = input.files[0]; if (!file) return;
    const info     = document.getElementById('nfx-file-info');
    const nameEl   = document.getElementById('nfx-file-name');
    const statusEl = document.getElementById('nfx-file-status');
    window._nfxSelectedFile = file;
    window._nfxMediaHandle = null;
    if (nameEl) nameEl.textContent = file.name;
    if (statusEl) { statusEl.textContent = 'Arquivo selecionado'; statusEl.style.color = 'var(--tx3)'; }
    if (info) info.style.display = 'flex';
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => {
        const ph2 = document.getElementById('nfx-ph2');
        if (ph2) { ph2.style.display='block'; ph2.innerHTML=`<div class="nfx-whm"><img src="${e.target.result}" alt="preview"/></div>`; }
      };
      reader.readAsDataURL(file);
    } else {
      const ph2 = document.getElementById('nfx-ph2');
      if (ph2) { ph2.style.display='block'; ph2.innerHTML=`<div class="nfx-whm"><div class="nfx-whm-ph">📎 ${esc(file.name)}</div></div>`; }
    }
    updatePreview();
  };

  window.nfxClearFile = function() {
    const input = document.getElementById('nfx-file-input');
    if (input) input.value = '';
    const info = document.getElementById('nfx-file-info');
    if (info) info.style.display = 'none';
    window._nfxMediaHandle = null;
    window._nfxSelectedFile = null;
    const ph2 = document.getElementById('nfx-ph2');
    if (ph2) { ph2.style.display='none'; ph2.innerHTML=''; }
    updatePreview();
  };

  window.nfxHdr = function(type, el) {
    headerType = type;
    document.querySelectorAll('.nfx-tt').forEach(t=>t.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('nfx-htxt').style.display = type==='text'?'block':'none';
    const hm = document.getElementById('nfx-hmedia');
    hm.style.display = ['image','video','document'].includes(type)?'flex':'none';
    if (!['image','video','document'].includes(type)) window.nfxClearFile();
    updatePreview();
  };

  window.nfxBodyChg = function(el) {
    const val = el.value;
    const len = val.length;
    const c = document.getElementById('nfx-bc');
    c.textContent = len+'/1024';
    c.className = 'nfx-cc'+(len>1024?' over':len>900?' warn':'');

    // Autocomplete {{N}} sequencial
    const cursor = el.selectionStart;
    if (val.slice(cursor-2, cursor) === '{{') {
      const existing = [...new Set((val.match(/\{\{(\d+)\}\}/g)||[]))].map(v=>parseInt(v.replace(/[{}]/g,'')));
      let next = 1;
      while (existing.includes(next)) next++;
      const before = val.slice(0, cursor);
      const after  = val.slice(cursor);
      el.value = before + next + '}}' + after;
      el.selectionStart = el.selectionEnd = cursor + (next+'}}').length;
    }

    // Validação variável inválida (texto em vez de número)
    const invalid = el.value.match(/\{\{[^0-9}\s][^}]*\}\}/g);
    const warn = document.getElementById('nfx-var-warn');
    if (warn) warn.style.display = invalid ? 'flex' : 'none';

    // Validação variável duplicada
    const allVars = el.value.match(/\{\{\d+\}\}/g) || [];
    const dupVars = allVars.filter((v,i) => allVars.indexOf(v) !== i);
    const dupErr = document.getElementById('nfx-var-dup-err');
    if (dupErr) dupErr.style.display = dupVars.length > 0 ? 'block' : 'none';

    // Validação variável no início ou fim
    const posErr = document.getElementById('nfx-var-pos-err');
    if (posErr) {
      const trimmed = el.value.trim();
      const bad = /^\{\{\d+\}\}/.test(trimmed) || /\{\{\d+\}\}$/.test(trimmed);
      posErr.style.display = bad ? 'block' : 'none';
    }

    updateVarsStrip(el.value);
    updatePreview();
  };

  window.nfxPrev = updatePreview;

  window.nfxExInput = function(key, val) {
    varExamples[key] = val;
    renderPreviewBody();
  };

  window.nfxAddBtn = function(type) {
    if (buttons.length>=10) { alert('Máximo de 10 botões.'); return; }
    const def = { QUICK_REPLY:'Resposta rápida', URL:'Acessar site' };
    const label = prompt('Texto do botão:', def[type]||'Botão');
    if (!label) return;
    const b = { type, label };
    if (type==='URL') b.url = prompt('URL:', 'https://')||'';
    buttons.push(b); renderBtns(); updatePreview();
  };

  window.nfxRmBtn = function(i) { buttons.splice(i,1); renderBtns(); updatePreview(); };

  window.nfxClear = function() {
    if (!confirm('Limpar o formulário?')) return;
    ['nfx-name','nfx-body','nfx-foot','nfx-hval'].forEach(id=>{ const el=document.getElementById(id); if(el){ el.value=''; el.style.borderColor=''; } });
    buttons=[]; varExamples={}; varType='none';
    renderBtns();
    window.nfxSetVarType('none');
    window.nfxHdr('none', document.querySelector('.nfx-tt'));
    ['nfx-var-warn','nfx-var-pos-err','nfx-name-err'].forEach(id=>{ const el=document.getElementById(id); if(el) el.style.display='none'; });
    updatePreview();
  };

  window.nfxSubmit = async function() {
    const cfg = getConfig();
    if (!cfg.webhookUrl || !cfg.tenantKey) { alert('Configure o webhook do n8n primeiro (⚙ Conf. n8n).'); return; }
    const name = (document.getElementById('nfx-name').value||'').trim().replace(/\s/g,'_').toLowerCase();
    const body = (document.getElementById('nfx-body').value||'').trim();
    if (!name) { alert('Informe o nome do template.'); return; }
    if (!/^[a-z0-9_]+$/.test(name)) { alert('O nome do template deve conter apenas letras minúsculas, números e underscores.'); return; }
    if (!body) { alert('O corpo da mensagem é obrigatório.'); return; }
    const invalid = body.match(/\{\{[^0-9}\s][^}]*\}\}/g);
    if (invalid) { alert('Corrija as variáveis inválidas antes de enviar.\nUse apenas {{1}}, {{2}}...'); return; }
    const allVars = body.match(/\{\{\d+\}\}/g) || [];
    const dupVars = allVars.filter((v,i) => allVars.indexOf(v) !== i);
    if (dupVars.length > 0) { alert(`Variável duplicada: ${[...new Set(dupVars)].join(', ')}. Cada variável deve aparecer apenas uma vez.`); return; }
    if (/^\{\{\d+\}\}/.test(body) || /\{\{\d+\}\}$/.test(body)) {
      alert('Variável não pode estar no início ou no final do texto. Adicione texto antes e depois da variável.'); return;
    }
    const btnLabels = buttons.map(b => b.label.trim().toLowerCase());
    const dupBtns = btnLabels.filter((l,i) => btnLabels.indexOf(l) !== i);
    if (dupBtns.length > 0) { alert('Botões não podem ter o mesmo texto. Altere o nome de cada botão.'); return; }

    const btn = document.getElementById('nfx-submit-btn');
    btn.disabled = true;
    btn.innerHTML = `<span class="nfx-spin"></span> Enviando...`;

    try {
      const payload = {
        name,
        language: document.getElementById('nfx-lang')?.value || 'pt_BR',
        category: document.getElementById('nfx-cat').value,
        headerType,
        components: buildComps(),
        buttons,
        varExamples
      };

      let result;
      if (['image','video','document'].includes(headerType) && window._nfxSelectedFile) {
        btn.innerHTML = `<span class="nfx-spin"></span> Enviando mídia...`;
        result = await n8nRequest('create_template', payload, window._nfxSelectedFile);
      } else {
        result = await n8nRequest('create_template', payload);
      }

      alert(`✓ Template "${name}" enviado!\nID: ${result.template_id || result.id || '-'}\nStatus: ${result.status || 'PENDING'}`);
      window.nfxClear();
    } catch(e) {
      alert(`✗ Erro ao enviar: ${e.message}`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" stroke-linecap="round" stroke-linejoin="round"/></svg> Enviar para Meta`;
    }
  };

  window.nfxLoad = async function() {
    const cfg = getConfig();
    const container = document.getElementById('nfx-tlist');
    const btn = document.getElementById('nfx-refresh-btn');
    if (!cfg.webhookUrl || !cfg.tenantKey) { container.innerHTML='<div class="nfx-ld">Configure o webhook do n8n primeiro.</div>'; return; }
    container.innerHTML='<div class="nfx-ld">Carregando templates...</div>';
    if (btn) { btn.disabled=true; btn.innerHTML='<span class="nfx-spin" style="border-top-color:var(--tx2)"></span> Atualizando...'; }
    try {
      const d = await n8nRequest('list_templates', {});
      const tpls = d.data || d.templates || [];
      const lb = document.getElementById('nfx-lb');
      if (lb) lb.textContent = tpls.length;
      container.innerHTML = tpls.length ? tpls.map(tplCard).join('') : '<div class="nfx-ld">Nenhum template encontrado.</div>';
    } catch(e) {
      container.innerHTML=`<div class="nfx-ld" style="color:var(--red)">Erro: ${esc(e.message)}</div>`;
    } finally {
      if (btn) { btn.disabled=false; btn.innerHTML='<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" stroke-linecap="round" stroke-linejoin="round"/></svg> Atualizar'; }
    }
  };

  function renderBtns() {
    const list = document.getElementById('nfx-bl'); if (!list) return;
    const tl = { QUICK_REPLY:'personalizado', URL:'link' };
    list.innerHTML = buttons.map((b,i)=>`
      <div class="nfx-br">
        <span class="nfx-brl">${esc(b.label)}${b.url?' → '+esc(b.url):''}</span>
        <span class="nfx-brt ${b.type==='QUICK_REPLY'?'nfx-btq':'nfx-btc'}">${tl[b.type]||b.type}</span>
        <button class="nfx-bdel" onclick="nfxRmBtn(${i})">×</button>
      </div>`).join('');
  }

  function updateVarsStrip(text) {
    const vars = [...new Set((text.match(/\{\{\d+\}\}/g)||[]))].sort();
    const strip = document.getElementById('nfx-vs'); if (!strip) return;
    strip.innerHTML = vars.length ? '<span style="font-size:10px;color:var(--tx3)">vars:</span>' : '';
    vars.forEach(v => {
      const chip = document.createElement('div');
      chip.className='nfx-vc'; chip.textContent=v;
      chip.onclick = () => {
        const ta=document.getElementById('nfx-body'); const s=ta.selectionStart;
        ta.value=ta.value.slice(0,s)+v+ta.value.slice(ta.selectionEnd);
        ta.selectionStart=ta.selectionEnd=s+v.length; ta.focus(); updatePreview();
      };
      strip.appendChild(chip);
    });
  }

  function renderPreviewBody() {
    const pb = document.getElementById('nfx-pb'); if (!pb) return;
    const body = document.getElementById('nfx-body')?.value||'';
    if (!body) { pb.innerHTML='<span style="color:#999;font-size:11px">Digite o corpo...</span>'; return; }
    let result = esc(body);
    result = result.replace(/\{\{(\d+)\}\}/g, (match, num) => {
      const val = varExamples[`{{${num}}}`];
      if (val && val.trim()) return `<span class="nfx-vh">${esc(val)}</span>`;
      return `<span class="nfx-vh">${match}</span>`;
    });
    result = result.replace(/\*(.+?)\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
    pb.innerHTML = result;
  }

  function updatePreview() {
    const hdr   = document.getElementById('nfx-hval')?.value||'';
    const body  = document.getElementById('nfx-body')?.value||'';
    const foot  = document.getElementById('nfx-foot')?.value||'';
    const ph2   = document.getElementById('nfx-ph2');
    const pf    = document.getElementById('nfx-pf');
    const pbtns = document.getElementById('nfx-pbtns');
    const vbox  = document.getElementById('nfx-vbox');
    const vlist = document.getElementById('nfx-vlist');

    if (ph2) {
      if (headerType==='text' && hdr) {
        ph2.style.display='block';
        ph2.innerHTML=`<div class="nfx-whtxt">${esc(hdr)}</div>`;
      } else if (['image','video','document'].includes(headerType)) {
        ph2.style.display='block';
        if (!ph2.querySelector('img,.nfx-whm')) {
          const ico={image:'🖼',video:'▶',document:'📄'};
          ph2.innerHTML=`<div class="nfx-whm"><div class="nfx-whm-ph">${ico[headerType]}</div></div>`;
        }
      } else {
        ph2.style.display='none';
      }
    }

    renderPreviewBody();
    if (pf) { pf.style.display=foot?'block':'none'; pf.textContent=foot; }
    if (pbtns) {
      const ico={URL:'🔗 ',QUICK_REPLY:''};
      pbtns.innerHTML=buttons.map(b=>`<button class="nfx-wb">${ico[b.type]||''}${esc(b.label)}</button>`).join('');
      const bub = document.querySelector('.nfx-bub');
      if (bub) bub.classList.toggle('nfx-has-btns', buttons.length > 0);
    }

    const vars=[...new Set((body.match(/\{\{\d+\}\}/g)||[]))].sort();
    if (vbox&&vlist) {
      if (vars.length) {
        vbox.style.display='block';
        const prev={};
        vlist.querySelectorAll('.nfx-ve').forEach(row => {
          const k=row.getAttribute('data-key');
          const inp=row.querySelector('input');
          if (k&&inp) prev[k]=inp.value;
        });
        // Ajuste 2 e 3: autocomplete off, tamanho automático, sem valor pré-preenchido
        vlist.innerHTML=vars.map(v=>{
          const curVal=prev[v]!==undefined?prev[v]:(varExamples[v]||'');
          return `<div class="nfx-ve" data-key="${v}">
            <span class="nfx-vk">${v}</span>
            <input type="text" autocomplete="off" placeholder="Ex: João" value="${esc(curVal)}" oninput="nfxExInput('${v}',this.value)" size="${Math.max(10, curVal.length+2)}"/>
          </div>`;
        }).join('');
        // Sincroniza varExamples com valores reais dos campos (evita autocomplete silencioso)
        setTimeout(() => {
          vlist.querySelectorAll('.nfx-ve').forEach(row => {
            const k = row.getAttribute('data-key');
            const inp = row.querySelector('input');
            if (k && inp && inp.value !== (varExamples[k]||'')) {
              varExamples[k] = inp.value;
              renderPreviewBody();
            }
          });
        }, 100);
      } else {
        vbox.style.display='none';
      }
    }
  }

  function buildComps() {
    const body = document.getElementById('nfx-body').value;
    const hdr  = document.getElementById('nfx-hval')?.value||'';
    const foot = document.getElementById('nfx-foot')?.value||'';
    const comps=[];
    if (headerType==='text'&&hdr) {
      comps.push({type:'HEADER',format:'TEXT',text:hdr});
    } else if (['image','video','document'].includes(headerType)) {
      comps.push({type:'HEADER', format:headerType.toUpperCase()});
    }
    if (body) {
      const vars=[...new Set((body.match(/\{\{\d+\}\}/g)||[]))];
      const bc={type:'BODY',text:body};
      if (vars.length) bc.example={body_text:[vars.map(v=>varExamples[v]||'exemplo')]};
      comps.push(bc);
    }
    if (foot) comps.push({type:'FOOTER',text:foot});
    if (buttons.length) comps.push({type:'BUTTONS',buttons:buttons.map(b=>{
      const o={type:b.type,text:b.label};
      if(b.url)o.url=b.url;
      return o;
    })});
    return comps;
  }

  function tplCard(t) {
    const sm={APPROVED:'Aprovado',PENDING:'Pendente',REJECTED:'Rejeitado',PAUSED:'Pausado'};
    const sc={APPROVED:'AP',PENDING:'PE',REJECTED:'RE',PAUSED:'PA'};
    const bc=(t.components||[]).find(c=>c.type==='BODY');
    const prev=bc?esc(bc.text).substring(0,80)+(bc.text.length>80?'...':''):'—';
    const reason=t.rejected_reason&&t.rejected_reason!=='NONE'?`<div class="nfx-rr">✗ Motivo: ${esc(t.rejected_reason)}</div>`:'';
    return `<div class="nfx-tc">
      <div class="nfx-ti">
        <div class="nfx-tn">${esc(t.name)}</div>
        <div class="nfx-tm">${esc(t.category)} • ${esc(t.language)}</div>
        <div class="nfx-tm" style="margin-top:3px;font-size:10px">${prev}</div>
        ${reason}
      </div>
      <span class="nfx-sb2 nfx-${sc[t.status]||'PA'}">${sm[t.status]||t.status}</span>
    </div>`;
  }

  // Init
  (function(){ const s=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'); if(s.tenantKey){ delete s.tenantKey; localStorage.setItem(STORAGE_KEY,JSON.stringify(s)); } })();
  if (config.webhookUrl&&config.tenantKey) {
    const s=document.getElementById('nfx-stxt');
    if (s) s.textContent='Sincronizado';
  }
  const obs=new MutationObserver(applyTheme);
  obs.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  obs.observe(document.body,{attributes:true,attributeFilter:['class']});

})();
