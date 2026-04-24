(function () {
  'use strict';

  const STORAGE_KEY = 'neofluxx_disparo_config';

  const CONFIG = {
    webhookUrl: 'SEU_N8N_WEBHOOK_URL',
    get tenantKey() {
      const match = window.location.pathname.match(/accounts\/(\d+)/);
      return match ? `account-${match[1]}` : 'default';
    },
    get accountId() {
      const match = window.location.pathname.match(/accounts\/(\d+)/);
      return match ? parseInt(match[1]) : null;
    }
  };

  function isDark() {
    return document.documentElement.classList.contains('dark') ||
           document.body.classList.contains('dark') ||
           document.querySelector('.app-wrapper')?.classList.contains('dark-theme') ||
           window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function tc() { return isDark() ? 'dark' : 'light'; }
  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function getConfig() {
    return Object.assign({}, CONFIG, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
  }

  function saveConfig(next) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next || {}));
  }

  // ─── CSS ────────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.id = 'nfx-disparo-style';
  style.textContent = `
    #nfxd-overlay{display:none;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);align-items:center;justify-content:center}
    #nfxd-overlay.open{display:flex}
    #nfxd-modal{width:980px;max-width:96vw;height:90vh;border-radius:14px;overflow:hidden;display:grid;grid-template-rows:52px 1fr;grid-template-columns:200px 1fr 300px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;animation:nfxdIn .2s ease}
    @keyframes nfxdIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
    #nfxd-modal.light{background:#f5f7fa;color:#1a1a2e;--bg:#f5f7fa;--sf:#fff;--sf2:#f0f2f5;--sf3:#e8eaed;--bd:#e2e5ea;--bd2:#d0d4db;--tx:#1a1a2e;--tx2:#5a6170;--tx3:#9aa0ad;--ac:#25d366;--ac2:#128c7e;--adim:rgba(37,211,102,.1);--agl:rgba(37,211,102,.3);--red:#e53935;--amb:#f5a623;--bl:#1976d2;--warn-bg:#fff8e1;--warn-bd:#f5a623}
    #nfxd-modal.dark{background:#0f0f11;color:#f0f0f5;--bg:#0f0f11;--sf:#17171b;--sf2:#1e1e24;--sf3:#252530;--bd:#2a2a35;--bd2:#35354a;--tx:#f0f0f5;--tx2:#9090a8;--tx3:#55556a;--ac:#25d366;--ac2:#128c7e;--adim:rgba(37,211,102,.12);--agl:rgba(37,211,102,.25);--red:#ff5e5e;--amb:#f5a623;--bl:#4f8ef7;--warn-bg:rgba(245,166,35,.08);--warn-bd:rgba(245,166,35,.3)}
    #nfxd-topbar{grid-column:1/-1;display:flex;align-items:center;padding:0 16px;gap:12px;border-bottom:1px solid var(--bd);background:var(--sf)}
    .nfxd-sp{flex:1}
    .nfxd-pill{display:flex;align-items:center;gap:6px;padding:3px 10px;border-radius:20px;background:var(--adim);border:1px solid var(--agl);font-size:11px;color:var(--ac)}
    .nfxd-dot{width:5px;height:5px;border-radius:50%;background:var(--ac);animation:nfxdPulse 2s infinite}
    @keyframes nfxdPulse{0%,100%{opacity:1}50%{opacity:.3}}
    .nfxd-tbtn{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:7px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:11px;cursor:pointer;transition:all .15s}
    .nfxd-tbtn:hover{background:var(--sf2);color:var(--tx)}
    #nfxd-xbtn{width:28px;height:28px;border-radius:50%;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
    #nfxd-xbtn:hover{background:rgba(255,94,94,.15);color:var(--red);border-color:var(--red)}
    #nfxd-sidebar{background:var(--sf);border-right:1px solid var(--bd);padding:12px 8px;display:flex;flex-direction:column;gap:2px;overflow-y:auto}
    .nfxd-ns{font-size:10px;color:var(--tx3);letter-spacing:.07em;text-transform:uppercase;padding:8px 8px 4px}
    .nfxd-ni{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:12px;color:var(--tx2);transition:all .15s;border:1px solid transparent}
    .nfxd-ni:hover{background:var(--sf2);color:var(--tx)}
    .nfxd-ni.active{background:var(--adim);color:var(--ac);border-color:var(--agl)}
    .nfxd-ni svg{width:15px;height:15px;flex-shrink:0}
    .nfxd-nb{margin-left:auto;font-size:10px;padding:1px 6px;border-radius:10px;background:var(--sf3);color:var(--tx3)}
    .nfxd-ni.active .nfxd-nb{background:var(--adim);color:var(--ac)}
    #nfxd-main{overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:14px;background:var(--bg)}
    .nfxd-title{font-size:16px;font-weight:600;color:var(--tx)}
    .nfxd-sub{font-size:11px;color:var(--tx2);margin-top:2px}
    .nfxd-sec{background:var(--sf);border:1px solid var(--bd);border-radius:10px;overflow:hidden}
    .nfxd-sh{padding:10px 14px;border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:8px}
    .nfxd-sn{width:20px;height:20px;border-radius:50%;background:var(--adim);border:1px solid var(--agl);display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--ac);font-weight:600;flex-shrink:0}
    .nfxd-sn.done{background:var(--ac);color:#000}
    .nfxd-st{font-size:12px;font-weight:600;color:var(--tx)}
    .nfxd-sb{padding:14px}
    .nfxd-f{display:flex;flex-direction:column;gap:4px}
    .nfxd-f label{font-size:11px;color:var(--tx2);font-weight:500}
    .nfxd-req{color:var(--ac)}
    .nfxd-hint{font-size:10px;color:var(--tx3);line-height:1.5;margin-top:3px}
    .nfxd-inp{background:var(--sf2);border:1px solid var(--bd);border-radius:7px;padding:7px 10px;color:var(--tx);font-size:12px;transition:border .15s;width:100%;box-sizing:border-box;font-family:inherit}
    .nfxd-inp:focus{outline:none;border-color:var(--ac);box-shadow:0 0 0 3px var(--adim)}
    .nfxd-inp::placeholder{color:var(--tx3)}
    .nfxd-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .nfxd-pub-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
    .nfxd-pub-card{border:1px solid var(--bd);border-radius:10px;padding:14px 12px;cursor:pointer;transition:all .15s;background:var(--sf);text-align:center}
    .nfxd-pub-card:hover{border-color:var(--bd2);background:var(--sf2)}
    .nfxd-pub-card.sel{border:1.5px solid var(--ac);background:var(--adim)}
    .nfxd-pub-icon{width:36px;height:36px;border-radius:10px;margin:0 auto 8px;display:flex;align-items:center;justify-content:center}
    .nfxd-pub-label{font-size:13px;font-weight:600;color:var(--tx)}
    .nfxd-pub-desc{font-size:10px;color:var(--tx3);margin-top:2px}
    .nfxd-tpl-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .nfxd-tpl-card{border:1px solid var(--bd);border-radius:10px;padding:12px;cursor:pointer;transition:all .15s;background:var(--sf)}
    .nfxd-tpl-card:hover{border-color:var(--bd2);background:var(--sf2)}
    .nfxd-tpl-card.sel{border:1.5px solid var(--ac);background:var(--adim)}
    .nfxd-tpl-name{font-size:10px;font-weight:600;color:var(--tx2);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px}
    .nfxd-wpp-mock{background:#E9F7EF;border-radius:8px;padding:8px 10px}
    .nfxd-wpp-img{width:100%;height:64px;background:#E9F7EF;border-radius:5px;margin-bottom:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:1px dashed #A5D6A7}
    .nfxd-wpp-img img{width:100%;height:100%;object-fit:cover;border-radius:5px}
    .nfxd-wpp-text{font-size:11px;color:#1a3a1a;line-height:1.5}
    .nfxd-wpp-cta{margin-top:6px;border-top:1px solid #A5D6A7;padding-top:5px;font-size:10px;color:#1D9E75;text-align:center}
    .nfxd-img-preview{width:100%;height:120px;border-radius:8px;overflow:hidden;border:1px solid var(--bd);background:var(--sf2);display:flex;align-items:center;justify-content:center;margin-top:8px}
    .nfxd-img-preview img{width:100%;height:100%;object-fit:cover}
    .nfxd-img-preview .nfxd-ph{font-size:11px;color:var(--tx3);text-align:center;padding:12px}
    .nfxd-ff{display:flex;justify-content:flex-end;gap:8px;padding-top:4px}
    .nfxd-bp{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:7px;background:var(--ac);border:none;color:#000;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit}
    .nfxd-bp:hover:not(:disabled){background:#1db954;box-shadow:0 0 14px var(--agl)}
    .nfxd-bp:disabled{opacity:.5;cursor:not-allowed}
    .nfxd-bs{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:7px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:12px;cursor:pointer;transition:all .15s;font-family:inherit}
    .nfxd-bs:hover{background:var(--sf2);color:var(--tx)}
    #nfxd-preview{background:var(--sf);border-left:1px solid var(--bd);display:flex;flex-direction:column;overflow:hidden}
    .nfxd-ph2{padding:12px 14px;border-bottom:1px solid var(--bd);display:flex;align-items:center;justify-content:space-between}
    #nfxd-pbody{flex:1;padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:12px}
    .nfxd-phone{width:100%;max-width:240px;margin:0 auto;background:#efeae2;border-radius:18px;overflow:hidden;border:1px solid #d4c9b8}
    .nfxd-pbar{background:#075e54;padding:10px 12px;text-align:center}
    .nfxd-pbar-title{font-size:12px;font-weight:600;color:#fff}
    .nfxd-pbar-sub{font-size:9px;color:rgba(255,255,255,.7);margin-top:1px}
    .nfxd-pchat{padding:10px;min-height:160px;background:#efeae2;background-image:url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000' fill-opacity='0.03'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")}
    .nfxd-bub{background:#fff;border-radius:0 8px 8px 8px;padding:8px 10px;max-width:95%;box-shadow:0 1px 2px rgba(0,0,0,.1)}
    .nfxd-bub.has-btn{border-radius:0 8px 0 0;box-shadow:none}
    .nfxd-wt{font-size:11px;color:#111;line-height:1.5}
    .nfxd-wfr{margin-top:4px;display:flex;justify-content:flex-end;font-size:9px;color:#8696a0;gap:3px;align-items:center}
    .nfxd-wft{border-top:1px solid rgba(0,0,0,.08);margin-top:6px;padding-top:5px;font-size:10px;color:#667781}
    .nfxd-btns-wrap{max-width:95%;background:#fff;border-radius:0 0 8px 8px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.1)}
    .nfxd-wb{width:100%;background:#fff;border:none;border-top:1px solid #e9e9e9;padding:8px;text-align:center;font-size:11px;color:#00a5f4;display:flex;align-items:center;justify-content:center;gap:5px;box-sizing:border-box;cursor:default;font-family:inherit}
    .nfxd-wb:last-child{border-radius:0 0 8px 8px}
    .nfxd-pv-img-wrap{width:100%;border-radius:6px;overflow:hidden;margin-bottom:6px}
    .nfxd-pv-img-wrap img{width:100%;height:auto;display:block;max-height:140px;object-fit:cover}
    .nfxd-preview-info{background:var(--sf2);border:1px solid var(--bd);border-radius:8px;padding:10px 12px;font-size:11px;color:var(--tx2);line-height:1.6}
    .nfxd-preview-row{display:flex;gap:6px;margin-bottom:4px;align-items:flex-start}
    .nfxd-preview-label{font-size:10px;color:var(--tx3);min-width:64px;padding-top:1px}
    .nfxd-preview-val{font-size:11px;color:var(--tx);font-weight:500}
    .nfxd-badge{display:inline-block;font-size:10px;padding:2px 8px;border-radius:20px;font-weight:500}
    .nfxd-badge-ag{background:var(--warn-bg);color:var(--amb);border:1px solid var(--warn-bd)}
    .nfxd-badge-pr{background:rgba(25,118,210,.1);color:var(--bl);border:1px solid rgba(25,118,210,.3)}
    .nfxd-badge-ok{background:var(--adim);color:var(--ac);border:1px solid var(--agl)}
    .nfxd-badge-er{background:rgba(229,57,53,.08);color:var(--red);border:1px solid rgba(229,57,53,.25)}
    .nfxd-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
    .nfxd-metric{background:var(--sf2);border-radius:8px;padding:12px;text-align:center}
    .nfxd-metric-val{font-size:22px;font-weight:600;color:var(--tx)}
    .nfxd-metric-label{font-size:10px;color:var(--tx3);margin-top:2px}
    .nfxd-ld{text-align:center;color:var(--tx3);font-size:12px;padding:24px}
    .nfxd-empty{text-align:center;padding:32px;font-size:12px;color:var(--tx3)}
    .nfxd-step-indicator{display:flex;align-items:center;gap:6px;margin-bottom:16px}
    .nfxd-step{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--tx3)}
    .nfxd-step.active{color:var(--ac);font-weight:500}
    .nfxd-step.done{color:var(--tx2)}
    .nfxd-step-num{width:18px;height:18px;border-radius:50%;border:1px solid var(--bd2);display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0}
    .nfxd-step.active .nfxd-step-num{background:var(--adim);border-color:var(--agl);color:var(--ac)}
    .nfxd-step.done .nfxd-step-num{background:var(--ac);border-color:var(--ac);color:#000}
    .nfxd-step-sep{flex:1;height:1px;background:var(--bd);max-width:20px}
    .nfxd-loading{display:flex;align-items:center;justify-content:center;gap:8px;padding:20px;color:var(--tx3);font-size:12px}
    @keyframes nfxdSpin{to{transform:rotate(360deg)}}
    .nfxd-spin{display:inline-block;width:14px;height:14px;border:2px solid var(--bd2);border-top-color:var(--ac);border-radius:50%;animation:nfxdSpin .7s linear infinite;flex-shrink:0}
    #nfxd-main::-webkit-scrollbar,#nfxd-pbody::-webkit-scrollbar{width:4px}
    #nfxd-main::-webkit-scrollbar-track,#nfxd-pbody::-webkit-scrollbar-track{background:transparent}
    #nfxd-main::-webkit-scrollbar-thumb,#nfxd-pbody::-webkit-scrollbar-thumb{background:var(--bd2);border-radius:2px}
    #nfxd-cfg-ov{display:none;position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.6);align-items:center;justify-content:center}
    #nfxd-cfg-ov.open{display:flex}
    #nfxd-cfg-m{width:480px;max-width:94vw;max-height:88vh;border-radius:12px;overflow:hidden;overflow-y:auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    #nfxd-cfg-m.light{background:#fff;color:#1a1a2e;--bd:#e2e5ea;--sf:#fff;--sf2:#f0f2f5;--tx:#1a1a2e;--tx2:#5a6170;--tx3:#9aa0ad;--ac:#25d366;--adim:rgba(37,211,102,.1);--agl:rgba(37,211,102,.3);--red:#e53935}
    #nfxd-cfg-m.dark{background:#17171b;color:#f0f0f5;--bd:#2a2a35;--sf:#17171b;--sf2:#1e1e24;--tx:#f0f0f5;--tx2:#9090a8;--tx3:#55556a;--ac:#25d366;--adim:rgba(37,211,102,.12);--agl:rgba(37,211,102,.25);--red:#ff5e5e}
    .nfxd-ch{padding:14px 16px;border-bottom:1px solid var(--bd);display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:600}
    .nfxd-cb{padding:16px;display:flex;flex-direction:column;gap:12px}
    .nfxd-cf{padding:12px 16px;border-top:1px solid var(--bd);display:flex;gap:8px;justify-content:flex-end}
    .nfxd-cb label{font-size:11px;color:var(--tx2);font-weight:500;display:block;margin-bottom:4px}
    .nfxd-cb input{background:var(--sf2);border:1px solid var(--bd);border-radius:7px;padding:7px 10px;color:var(--tx);font-size:12px;width:100%;box-sizing:border-box;font-family:inherit}
    .nfxd-cb input:focus{outline:none;border-color:var(--ac);box-shadow:0 0 0 3px var(--adim)}
    .nfxd-tr{padding:6px 10px;border-radius:6px;font-size:11px;margin-top:4px;display:none}
    .nfxd-tr.ok{background:var(--adim);color:var(--ac);border:1px solid var(--agl);display:block}
    .nfxd-tr.err{background:rgba(255,94,94,.1);color:var(--red);border:1px solid rgba(255,94,94,.3);display:block}
    .nfxd-cfg-section{font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;padding:8px 0 4px;border-top:1px solid var(--bd);margin-top:8px}
    .nfxd-cfg-section:first-child{border-top:none;margin-top:0;padding-top:0}
    .nfxd-img-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}
    .nfxd-img-thumb{aspect-ratio:1;border-radius:8px;overflow:hidden;cursor:pointer;border:2px solid transparent;transition:all .15s;background:var(--sf2);position:relative}
    .nfxd-img-thumb:hover{border-color:var(--bd2)}
    .nfxd-img-thumb.sel{border-color:var(--ac)}
    .nfxd-img-thumb img{width:100%;height:100%;object-fit:cover;display:block}
    .nfxd-img-fname{position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.55);color:#fff;font-size:9px;padding:3px 5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:0;transition:opacity .15s}
    .nfxd-img-thumb:hover .nfxd-img-fname,.nfxd-img-thumb.sel .nfxd-img-fname{opacity:1}
    .nfxd-img-or{font-size:11px;color:var(--tx3);text-align:center;margin:10px 0 6px;display:flex;align-items:center;gap:8px}
    .nfxd-img-or::before,.nfxd-img-or::after{content:'';flex:1;height:1px;background:var(--bd)}
    .nfxd-cb-wrap{display:flex;align-items:center;justify-content:center;height:100%}
    .nfxd-cb-inp{width:14px;height:14px;cursor:pointer;accent-color:var(--ac);display:block}
    .nfxd-del-bar{display:none;align-items:center;gap:10px;padding:8px 12px;background:rgba(229,57,53,.08);border:1px solid rgba(229,57,53,.25);border-radius:8px;margin-bottom:10px}
    .nfxd-del-bar.visible{display:flex}
    .nfxd-del-info{font-size:12px;color:var(--red);flex:1}
    .nfxd-del-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:6px;background:var(--red);border:none;color:#fff;font-size:11px;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit}
    .nfxd-del-btn:hover{opacity:.85}
    .nfxd-del-cancel{display:inline-flex;align-items:center;padding:5px 10px;border-radius:6px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:11px;cursor:pointer;transition:all .15s;font-family:inherit}
    .nfxd-del-cancel:hover{background:var(--sf2)}
    .nfxd-hist-table th:first-child,.nfxd-hist-table td:first-child{width:36px;text-align:center;padding:0 8px;vertical-align:middle}
    .nfxd-hist-table th:nth-child(2),.nfxd-hist-table td:nth-child(2){width:20%}
    .nfxd-hist-table th:nth-child(3),.nfxd-hist-table td:nth-child(3){width:15%}
    .nfxd-hist-table th:nth-child(4),.nfxd-hist-table td:nth-child(4){width:26%}
    .nfxd-hist-table th:nth-child(5),.nfxd-hist-table td:nth-child(5){width:19%}
    .nfxd-hist-table th:nth-child(6),.nfxd-hist-table td:nth-child(6){width:13%}
    .nfxd-hist-table{width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed}
    .nfxd-hist-table th{font-size:10px;color:var(--tx3);font-weight:500;text-align:left;padding:6px 10px;border-bottom:1px solid var(--bd)}
    .nfxd-hist-table td{padding:9px 10px;border-bottom:1px solid var(--bd);color:var(--tx);vertical-align:middle;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .nfxd-hist-table tr:last-child td{border-bottom:none}
    .nfxd-hist-table tr:hover td{background:var(--sf2)}
    .nfxd-hist-table tr.sel-row td{background:rgba(229,57,53,.05)}
  `;
  document.head.appendChild(style);

  // ─── STATE ──────────────────────────────────────────────────────────────────
  let state = {
    view: 'nova',
    step: 1,
    publico: null,
    template: null,
    imgUrl: '',
    campanhas: [],
    templates: [],
    loadingTemplates: false,
    loadingCampanhas: false,
  };

  // ─── OVERLAY ────────────────────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'nfxd-overlay';
  overlay.innerHTML = buildHTML();
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  function openModal() { applyTheme(); overlay.classList.add('open'); if (state.view === 'historico') loadCampanhas(); }
  function closeModal() { overlay.classList.remove('open'); }

  function applyTheme() {
    const m = document.getElementById('nfxd-modal');
    const c = document.getElementById('nfxd-cfg-m');
    if (m) { m.classList.remove('dark','light'); m.classList.add(tc()); }
    if (c) { c.classList.remove('dark','light'); c.classList.add(tc()); }
  }

  // ─── HTML ────────────────────────────────────────────────────────────────────
  function buildHTML() {
    return `
    <div id="nfxd-modal" class="${tc()}">

      <div id="nfxd-topbar">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="flex-shrink:0"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="#25d366"/><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="#fff"/></svg>
        <span style="font-size:13px;font-weight:600;color:var(--tx)">Disparo WhatsApp</span>
        <span style="font-size:10px;color:var(--tx3)">/ Neofluxx</span>
        <div class="nfxd-sp"></div>
        <div class="nfxd-pill"><div class="nfxd-dot"></div><span id="nfxd-stxt">aguardando configuração</span></div>
        <button class="nfxd-tbtn" onclick="nfxdOpenCfg()">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          Configurar
        </button>
        <button id="nfxd-xbtn" onclick="nfxdClose()">✕</button>
      </div>

      <div id="nfxd-sidebar">
        <div class="nfxd-ns">Campanhas</div>
        <div class="nfxd-ni active" id="nfxd-nav-nova" onclick="nfxdView('nova')">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>
          Nova campanha
        </div>
        <div class="nfxd-ns" style="margin-top:8px">Relatórios</div>
        <div class="nfxd-ni" id="nfxd-nav-historico" onclick="nfxdView('historico')">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Histórico
          <span class="nfxd-nb" id="nfxd-hist-count">—</span>
        </div>
      </div>

      <div id="nfxd-main">

        <div id="nfxd-view-nova">
          <div><div class="nfxd-title">Nova campanha</div><div class="nfxd-sub">Siga os passos abaixo para agendar seu disparo</div></div>

          <div class="nfxd-step-indicator" id="nfxd-steps">
            <div class="nfxd-step active" id="nfxd-si-1"><div class="nfxd-step-num">1</div>Público</div>
            <div class="nfxd-step-sep"></div>
            <div class="nfxd-step" id="nfxd-si-2"><div class="nfxd-step-num">2</div>Template</div>
            <div class="nfxd-step-sep"></div>
            <div class="nfxd-step" id="nfxd-si-3"><div class="nfxd-step-num">3</div>Imagem</div>
            <div class="nfxd-step-sep"></div>
            <div class="nfxd-step" id="nfxd-si-4"><div class="nfxd-step-num">4</div>Agendar</div>
          </div>

          <div class="nfxd-sec" id="nfxd-sec-publico">
            <div class="nfxd-sh"><div class="nfxd-sn" id="nfxd-n1">1</div><div class="nfxd-st">Público alvo</div></div>
            <div class="nfxd-sb">
              <div class="nfxd-pub-grid">
                <div class="nfxd-pub-card" onclick="nfxdSelPub('Promoção','promo')" id="nfxd-pub-promo">
                  <div class="nfxd-pub-icon" style="background:#FFF3CD"><svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" stroke="#856404" stroke-width="1.8"/></svg></div>
                  <div class="nfxd-pub-label">Promoção</div>
                  <div class="nfxd-pub-desc">Lista de clientes promo</div>
                </div>
                <div class="nfxd-pub-card" onclick="nfxdSelPub('Confirmação','conf')" id="nfxd-pub-conf">
                  <div class="nfxd-pub-icon" style="background:#D4EDDA"><svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="#155724" stroke-width="1.8"/></svg></div>
                  <div class="nfxd-pub-label">Confirmação</div>
                  <div class="nfxd-pub-desc">Lista de confirmações</div>
                </div>
                <div class="nfxd-pub-card" onclick="nfxdSelPub('Cortesia','cortesia')" id="nfxd-pub-cortesia">
                  <div class="nfxd-pub-icon" style="background:#D1ECF1"><svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="#0c5460" stroke-width="1.8"/></svg></div>
                  <div class="nfxd-pub-label">Cortesia</div>
                  <div class="nfxd-pub-desc">Lista de cortesia</div>
                </div>
              </div>
            </div>
          </div>

          <div class="nfxd-sec" id="nfxd-sec-tpl" style="display:none">
            <div class="nfxd-sh"><div class="nfxd-sn" id="nfxd-n2">2</div><div class="nfxd-st">Template</div><button class="nfxd-bs" style="margin-left:auto;padding:4px 10px;font-size:11px" onclick="nfxdLoadTemplates()">↺ Atualizar</button></div>
            <div class="nfxd-sb">
              <div id="nfxd-tpl-container"><div class="nfxd-ld">Carregando templates...</div></div>
            </div>
          </div>

          <div class="nfxd-sec" id="nfxd-sec-img" style="display:none">
            <div class="nfxd-sh">
              <div class="nfxd-sn" id="nfxd-n3">3</div>
              <div class="nfxd-st">Imagem da campanha</div>
              <button class="nfxd-bs" style="margin-left:auto;padding:4px 10px;font-size:11px" onclick="nfxdLoadImages()">↺ Carregar do bucket</button>
            </div>
            <div class="nfxd-sb">
              <div id="nfxd-img-grid-container">
                <div style="font-size:11px;color:var(--tx3)">Clique em "Carregar do bucket" para ver as imagens disponíveis</div>
              </div>
              <div class="nfxd-img-or">ou cole uma URL</div>
              <div class="nfxd-f">
                <input class="nfxd-inp" id="nfxd-img-url" placeholder="https://..." oninput="nfxdImgUrlChg(this.value)"/>
                <div class="nfxd-hint">Link público da imagem (R2, Backblaze, etc.)</div>
              </div>
              <div class="nfxd-img-preview" id="nfxd-img-preview" style="display:none">
                <div class="nfxd-ph">Cole a URL acima para ver o preview</div>
              </div>
            </div>
          </div>

          <div class="nfxd-sec" id="nfxd-sec-agendar" style="display:none">
            <div class="nfxd-sh"><div class="nfxd-sn" id="nfxd-n4">4</div><div class="nfxd-st">Agendar disparo</div></div>
            <div class="nfxd-sb" style="display:flex;flex-direction:column;gap:10px">
              <div class="nfxd-f">
                <label>Nome da campanha <span class="nfxd-req">*</span></label>
                <input class="nfxd-inp" id="nfxd-nome" placeholder="Ex: Promo semana 23" oninput="nfxdUpdatePreviewInfo()"/>
              </div>
              <div class="nfxd-g2">
                <div class="nfxd-f">
                  <label>Data <span class="nfxd-req">*</span></label>
                  <input class="nfxd-inp" type="date" id="nfxd-data" oninput="nfxdUpdatePreviewInfo()"/>
                </div>
                <div class="nfxd-f">
                  <label>Horário <span class="nfxd-req">*</span></label>
                  <input class="nfxd-inp" type="time" id="nfxd-hora" oninput="nfxdUpdatePreviewInfo()"/>
                </div>
              </div>
            </div>
          </div>

          <div class="nfxd-ff" id="nfxd-actions" style="display:none">
            <button class="nfxd-bs" onclick="nfxdReset()">Limpar</button>
            <button class="nfxd-bp" id="nfxd-submit-btn" onclick="nfxdSubmit()">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Agendar disparo
            </button>
          </div>
        </div>

        <div id="nfxd-view-historico" style="display:none">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
            <div><div class="nfxd-title">Histórico de campanhas</div><div class="nfxd-sub">Campanhas agendadas e executadas</div></div>
            <button class="nfxd-bs" onclick="loadCampanhas()" style="font-size:11px;padding:5px 10px">↺ Atualizar</button>
          </div>
          <div class="nfxd-metrics">
            <div class="nfxd-metric"><div class="nfxd-metric-val" id="nfxd-m-total">—</div><div class="nfxd-metric-label">Total</div></div>
            <div class="nfxd-metric"><div class="nfxd-metric-val" id="nfxd-m-ok" style="color:#25d366">—</div><div class="nfxd-metric-label">Executadas</div></div>
            <div class="nfxd-metric"><div class="nfxd-metric-val" id="nfxd-m-ag" style="color:#f5a623">—</div><div class="nfxd-metric-label">Agendadas</div></div>
          </div>
          <div id="nfxd-hist-container"><div class="nfxd-ld">Carregando...</div></div>
        </div>

      </div>

      <div id="nfxd-preview">
        <div class="nfxd-ph2">
          <span style="font-size:12px;font-weight:600;color:var(--tx)">Preview</span>
          <span style="font-size:10px;color:var(--tx3)" id="nfxd-prev-status">aguardando seleção</span>
        </div>
        <div id="nfxd-pbody">
          <div class="nfxd-phone">
            <div class="nfxd-pbar">
              <div class="nfxd-pbar-title" id="nfxd-contact-name">Contato</div>
              <div class="nfxd-pbar-sub">WhatsApp Business</div>
            </div>
            <div class="nfxd-pchat">
              <div class="nfxd-bub" id="nfxd-bub">
                <div id="nfxd-pv-header" style="display:none"></div>
                <div class="nfxd-wt" id="nfxd-pv-body" style="color:#999;font-size:11px">Selecione o público e template...</div>
                <div id="nfxd-pv-footer" style="display:none"></div>
                <div class="nfxd-wfr"><span>agora</span><svg width="14" height="10" viewBox="0 0 14 10" fill="#53bdeb"><path d="M1 5l3 3 5-7M6 8l2-2 3-3"/></svg></div>
              </div>
              <div class="nfxd-btns-wrap" id="nfxd-pv-btns"></div>
            </div>
          </div>
          <div class="nfxd-preview-info" id="nfxd-info-box" style="display:none">
            <div class="nfxd-preview-row"><span class="nfxd-preview-label">Público</span><span class="nfxd-preview-val" id="nfxd-pi-pub">—</span></div>
            <div class="nfxd-preview-row"><span class="nfxd-preview-label">Template</span><span class="nfxd-preview-val" id="nfxd-pi-tpl">—</span></div>
            <div class="nfxd-preview-row"><span class="nfxd-preview-label">Campanha</span><span class="nfxd-preview-val" id="nfxd-pi-nome">—</span></div>
            <div class="nfxd-preview-row"><span class="nfxd-preview-label">Agendado</span><span class="nfxd-preview-val" id="nfxd-pi-dt">—</span></div>
          </div>
        </div>
      </div>

    </div>

    <div id="nfxd-cfg-ov">
      <div id="nfxd-cfg-m" class="${tc()}">
        <div class="nfxd-ch">
          <span>⚙ Configuração</span>
          <button onclick="nfxdCloseCfg()" style="border:none;background:transparent;cursor:pointer;font-size:16px;color:var(--tx2)">✕</button>
        </div>
        <div class="nfxd-cb">
          <div class="nfxd-cfg-section">n8n</div>
          <div>
            <label>Webhook URL <span style="color:#25d366">*</span></label>
            <input type="text" id="nfxd-cfg-wh" placeholder="https://SEU-N8N/webhook/disparo-whatsapp"/>
            <div style="font-size:10px;color:var(--tx3);margin-top:4px;line-height:1.5">
              Endpoint único para todas as ações — templates, campanhas e histórico. As credenciais ficam seguras no n8n.
            </div>
          </div>
          <div id="nfxd-cfg-tr" class="nfxd-tr"></div>
        </div>
        <div class="nfxd-cf">
          <button class="nfxd-bs" onclick="nfxdTestCfg()">Testar conexão</button>
          <button class="nfxd-bp" onclick="nfxdSaveCfg()">Salvar</button>
        </div>
      </div>
    </div>
    `;
  }

  // ─── NAV ────────────────────────────────────────────────────────────────────
  window.nfxdView = function(v) {
    state.view = v;
    document.getElementById('nfxd-view-nova').style.display = v === 'nova' ? 'flex' : 'none';
    document.getElementById('nfxd-view-nova').style.flexDirection = 'column';
    document.getElementById('nfxd-view-historico').style.display = v === 'historico' ? 'block' : 'none';
    document.getElementById('nfxd-preview').style.display = v === 'nova' ? 'flex' : 'none';
    document.getElementById('nfxd-preview').style.flexDirection = 'column';
    const modal = document.getElementById('nfxd-modal');
    modal.style.gridTemplateColumns = v === 'historico' ? '200px 1fr' : '200px 1fr 300px';
    document.getElementById('nfxd-nav-nova').className = 'nfxd-ni' + (v === 'nova' ? ' active' : '');
    document.getElementById('nfxd-nav-historico').className = 'nfxd-ni' + (v === 'historico' ? ' active' : '');
    if (v === 'historico') loadCampanhas();
  };

  // ─── PÚBLICO ────────────────────────────────────────────────────────────────
  window.nfxdSelPub = function(label, key) {
    state.publico = { label, key };
    state.template = null;
    state.step = 2;
    ['promo','conf','cortesia'].forEach(k => {
      document.getElementById('nfxd-pub-' + k).classList.toggle('sel', k === key);
    });
    document.getElementById('nfxd-n1').classList.add('done');
    document.getElementById('nfxd-sec-tpl').style.display = 'block';
    document.getElementById('nfxd-sec-img').style.display = 'none';
    document.getElementById('nfxd-sec-agendar').style.display = 'none';
    document.getElementById('nfxd-actions').style.display = 'none';
    nfxdUpdateSteps();
    nfxdUpdatePreviewInfo();
    nfxdLoadTemplates();
    document.getElementById('nfxd-pi-pub').textContent = label;
    document.getElementById('nfxd-info-box').style.display = 'block';
    document.getElementById('nfxd-sec-tpl').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // ─── TEMPLATES ──────────────────────────────────────────────────────────────
  window.nfxdLoadTemplates = async function() {
    const cfg = getConfig();
    const container = document.getElementById('nfxd-tpl-container');
    if (!cfg.webhookUrl || cfg.webhookUrl === 'SEU_N8N_WEBHOOK_URL') {
      container.innerHTML = '<div class="nfxd-ld">Configure o webhook do n8n primeiro (⚙ Configurar).</div>';
      return;
    }
    container.innerHTML = '<div class="nfxd-loading"><div class="nfxd-spin"></div>Carregando templates da WABA...</div>';
    state.loadingTemplates = true;
    try {
      const res = await fetch(cfg.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_templates', tenant_key: CONFIG.tenantKey, payload: {} })
      });
      const data = await res.json().catch(() => ({}));
      const templates = (data.data || data.templates || []).filter(t => t.status === 'APPROVED');
      state.templates = templates;
      state.templatesPage = 0;
      if (!templates.length) {
        container.innerHTML = '<div class="nfxd-ld">Nenhum template aprovado encontrado.</div>';
        return;
      }
      renderTemplateList(container);
    } catch (e) {
      container.innerHTML = `<div class="nfxd-ld" style="color:var(--red)">Erro ao carregar templates: ${esc(e.message)}</div>`;
    } finally {
      state.loadingTemplates = false;
    }
  };

  function renderTemplateList(container, filter) {
    const PAGE = 10;
    const all = state.templates || [];
    const filtered = filter !== undefined ? all.filter(t => t.name.toLowerCase().includes((filter||'').toLowerCase())) : all;
    const page = state.templatesPage || 0;
    const slice = filtered.slice(0, (page + 1) * PAGE);
    const hasMore = filtered.length > slice.length;
    const selId = state.template ? state.template.id : null;

    let searchEl = document.getElementById('nfxd-tpl-search');
    if (!searchEl) {
      container.innerHTML = `
        <div style="margin-bottom:10px;position:relative">
          <input class="nfxd-inp" id="nfxd-tpl-search" placeholder="Buscar template pelo nome..." oninput="nfxdSearchTpl(this.value)" style="padding-left:30px"/>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--tx3);pointer-events:none"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" stroke-linecap="round"/></svg>
        </div>
        <div id="nfxd-tpl-results"></div>`;
      searchEl = document.getElementById('nfxd-tpl-search');
    }

    if (filter !== undefined && searchEl.value !== filter) searchEl.value = filter;

    const results = document.getElementById('nfxd-tpl-results');
    if (!results) return;

    results.innerHTML = `
      ${filtered.length === 0 ? '<div class="nfxd-ld">Nenhum template encontrado.</div>' : ''}
      <div class="nfxd-tpl-grid">${slice.map(t => tplCard(t, t.id === selId)).join('')}</div>
      ${hasMore ? `<button class="nfxd-bs" style="width:100%;margin-top:10px;justify-content:center" onclick="nfxdMoreTpl()">Carregar mais (${filtered.length - slice.length} restantes)</button>` : ''}
    `;
  }

  window.nfxdSearchTpl = function(val) {
    state.templatesPage = 0;
    state.tplFilter = val;
    const container = document.getElementById('nfxd-tpl-container');
    if (container) renderTemplateList(container, val);
  };

  window.nfxdMoreTpl = function() {
    state.templatesPage = (state.templatesPage || 0) + 1;
    const container = document.getElementById('nfxd-tpl-container');
    if (container) renderTemplateList(container, state.tplFilter || '');
  };

  function tplCard(t, selected) {
    const body = (t.components || []).find(c => c.type === 'BODY');
    const header = (t.components || []).find(c => c.type === 'HEADER');
    const hasImg = header && header.format === 'IMAGE';
    const btns = (t.components || []).find(c => c.type === 'BUTTONS');
    const bodyText = body ? esc(body.text).substring(0, 100) + (body.text.length > 100 ? '...' : '') : '—';
    const btnHtml = btns ? `<div class="nfxd-wpp-cta">${esc(btns.buttons[0]?.text || '')}</div>` : '';
    const imgHtml = hasImg ? `<div class="nfxd-wpp-img">
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" style="margin-bottom:4px"><rect x="3" y="3" width="18" height="18" rx="3" stroke="#81C784" stroke-width="1.5"/><path d="M3 16l5-5 4 4 3-3 6 6" stroke="#81C784" stroke-width="1.5" stroke-linecap="round"/></svg>
      <span style="font-size:10px;color:#2E7D32;font-weight:500">Com imagem</span>
    </div>` : '';
    const tData = encodeURIComponent(JSON.stringify(t));
    return `<div class="nfxd-tpl-card${selected ? ' sel' : ''}" id="nfxd-tpl-${t.id}" onclick="nfxdSelTpl('${t.id}','${esc(t.name)}',decodeURIComponent('${tData}'))">
      <div class="nfxd-tpl-name">${esc(t.name)}</div>
      <div class="nfxd-wpp-mock">${imgHtml}<div class="nfxd-wpp-text">${bodyText}</div>${btnHtml}</div>
    </div>`;
  }

  window.nfxdSelTpl = function(id, name, dataStr) {
    const t = JSON.parse(dataStr);
    state.template = t;
    const header = (t.components || []).find(c => c.type === 'HEADER');
    const hasImg = header && header.format === 'IMAGE';
    state.templateHasImg = hasImg;
    if (!hasImg) { state.imgUrl = ''; }

    document.querySelectorAll('.nfxd-tpl-card').forEach(c => c.classList.remove('sel'));
    const el = document.getElementById('nfxd-tpl-' + id);
    if (el) el.classList.add('sel');
    document.getElementById('nfxd-n2').classList.add('done');
    document.getElementById('nfxd-pi-tpl').textContent = name;
    document.getElementById('nfxd-info-box').style.display = 'block';

    if (hasImg) {
      state.step = 3;
      document.getElementById('nfxd-n4').textContent = '4';
      document.getElementById('nfxd-sec-img').style.display = 'block';
      document.getElementById('nfxd-sec-agendar').style.display = 'none';
      document.getElementById('nfxd-actions').style.display = 'none';
      document.getElementById('nfxd-sec-img').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      state.step = 4;
      document.getElementById('nfxd-n4').textContent = '3';
      document.getElementById('nfxd-sec-img').style.display = 'none';
      document.getElementById('nfxd-sec-agendar').style.display = 'block';
      document.getElementById('nfxd-actions').style.display = 'flex';
      document.getElementById('nfxd-sec-agendar').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    nfxdUpdateSteps();
    nfxdUpdatePreview();
  };

  // ─── IMAGENS BUCKET ─────────────────────────────────────────────────────────
  window.nfxdLoadImages = async function() {
    const cfg = getConfig();
    const container = document.getElementById('nfxd-img-grid-container');
    if (!cfg.webhookUrl || cfg.webhookUrl === 'SEU_N8N_WEBHOOK_URL') {
      container.innerHTML = '<div style="font-size:11px;color:var(--amb);padding:8px 0">Configure o webhook do n8n primeiro (⚙ Configurar).</div>';
      return;
    }
    container.innerHTML = '<div class="nfxd-loading"><div class="nfxd-spin"></div>Carregando imagens do bucket...</div>';
    try {
      const res = await fetch(cfg.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list_images',
          tenant_key: CONFIG.tenantKey,
          payload: {}
        })
      });
      const data = await res.json().catch(() => ({}));
      const result = Array.isArray(data) ? data[0] : data;
      const images = result.images || result[0]?.images || [];
      if (!images.length) {
        container.innerHTML = '<div style="font-size:11px;color:var(--tx3);padding:8px 0">Nenhuma imagem encontrada na pasta configurada.</div>';
        return;
      }
      container.innerHTML = `<div style="font-size:11px;color:var(--tx2);margin-bottom:6px">${images.length} imagem(ns) encontrada(s)</div><div class="nfxd-img-grid" id="nfxd-img-grid"></div>`;
      const grid = document.getElementById('nfxd-img-grid');
      images.forEach(function(img) {
        const thumb = document.createElement('div');
        thumb.className = 'nfxd-img-thumb';
        thumb.innerHTML = `<img src="${esc(img.url)}" loading="lazy" onerror="this.parentElement.style.display='none'"><div class="nfxd-img-fname">${esc(img.name)}</div>`;
        thumb.addEventListener('click', function() { nfxdSelImg(img.url, img.name, thumb); });
        grid.appendChild(thumb);
      });
    } catch (e) {
      container.innerHTML = `<div style="font-size:11px;color:var(--red);padding:8px 0">Erro ao carregar: ${esc(e.message)}</div>`;
    }
  };

  window.nfxdSelImg = function(url, name, el) {
    document.querySelectorAll('.nfxd-img-thumb').forEach(t => t.classList.remove('sel'));
    el.classList.add('sel');
    state.imgUrl = url;
    const input = document.getElementById('nfxd-img-url');
    if (input) input.value = url;
    nfxdShowImgPreview(url);
    nfxdUpdatePreview();
    nfxdShowAgendar();
  };

  window.nfxdImgUrlChg = function(url) {
    state.imgUrl = url;
    document.querySelectorAll('.nfxd-img-thumb').forEach(t => t.classList.remove('sel'));
    nfxdShowImgPreview(url);
    nfxdUpdatePreview();
    if (url && url.startsWith('http')) nfxdShowAgendar();
  };

  function nfxdShowImgPreview(url) {
    const preview = document.getElementById('nfxd-img-preview');
    if (!preview) return;
    if (url && url.startsWith('http')) {
      preview.style.display = 'flex';
      preview.innerHTML = `<img src="${esc(url)}" onerror="this.parentElement.innerHTML='<div class=\\'nfxd-ph\\'>URL inválida ou inacessível</div>'" style="width:100%;height:100%;object-fit:cover">`;
    } else {
      preview.style.display = 'none';
    }
  }

  function nfxdShowAgendar() {
    if (!state.imgUrl || !state.template) return;
    document.getElementById('nfxd-n3').classList.add('done');
    document.getElementById('nfxd-sec-agendar').style.display = 'block';
    document.getElementById('nfxd-actions').style.display = 'flex';
    state.step = 4;
    nfxdUpdateSteps();
    document.getElementById('nfxd-sec-agendar').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ─── PREVIEW ────────────────────────────────────────────────────────────────
  function nfxdUpdatePreview() {
    const t = state.template;
    const pvBody = document.getElementById('nfxd-pv-body');
    const pvHeader = document.getElementById('nfxd-pv-header');
    const pvFooter = document.getElementById('nfxd-pv-footer');
    const pvBtns = document.getElementById('nfxd-pv-btns');
    const bub = document.getElementById('nfxd-bub');
    const prevStatus = document.getElementById('nfxd-prev-status');

    if (!t) {
      pvBody.innerHTML = '<span style="color:#999;font-size:11px">Selecione o público e template...</span>';
      pvHeader.style.display = 'none';
      pvFooter.style.display = 'none';
      pvBtns.innerHTML = '';
      return;
    }

    prevStatus.textContent = 'preview ao vivo';
    const components = t.components || [];
    const header = components.find(c => c.type === 'HEADER');
    const body = components.find(c => c.type === 'BODY');
    const footer = components.find(c => c.type === 'FOOTER');
    const btns = components.find(c => c.type === 'BUTTONS');

    if (header && header.format === 'IMAGE') {
      pvHeader.style.display = 'block';
      if (state.imgUrl && state.imgUrl.startsWith('http')) {
        pvHeader.innerHTML = `<div class="nfxd-pv-img-wrap"><img src="${esc(state.imgUrl)}" onerror="this.parentElement.innerHTML='<div style=\\'width:100%;height:80px;background:#d0c9be;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:20px\\'>🖼</div>'"/></div>`;
      } else {
        pvHeader.innerHTML = `<div style="width:100%;height:80px;background:#d0c9be;border-radius:6px;margin-bottom:6px;display:flex;align-items:center;justify-content:center;font-size:20px">🖼</div>`;
      }
    } else if (header && header.format === 'TEXT' && header.text) {
      pvHeader.style.display = 'block';
      pvHeader.innerHTML = `<div style="font-size:13px;font-weight:600;color:#111;margin-bottom:4px">${esc(header.text)}</div>`;
    } else {
      pvHeader.style.display = 'none';
    }

    if (body) {
      let txt = esc(body.text).replace(/\*(.+?)\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
      txt = txt.replace(/\{\{(\d+)\}\}/g, '<span style="background:rgba(37,211,102,.2);border-radius:3px;padding:0 3px;font-family:monospace;font-size:10px">{{$1}}</span>');
      pvBody.innerHTML = txt;
    }

    if (footer && footer.text) {
      pvFooter.style.display = 'block';
      pvFooter.innerHTML = `<div class="nfxd-wft">${esc(footer.text)}</div>`;
    } else {
      pvFooter.style.display = 'none';
    }

    if (btns && btns.buttons && btns.buttons.length) {
      bub.classList.add('has-btn');
      pvBtns.innerHTML = `<div class="nfxd-btns-wrap">${btns.buttons.map(b =>
        `<button class="nfxd-wb">${esc(b.text)}</button>`
      ).join('')}</div>`;
    } else {
      bub.classList.remove('has-btn');
      pvBtns.innerHTML = '';
    }
  }

  window.nfxdUpdatePreviewInfo = function() {
    const nome = (document.getElementById('nfxd-nome')?.value || '').trim();
    const data = document.getElementById('nfxd-data')?.value || '';
    const hora = document.getElementById('nfxd-hora')?.value || '';
    document.getElementById('nfxd-pi-nome').textContent = nome || '—';
    document.getElementById('nfxd-pi-dt').textContent = (data && hora) ? `${data} às ${hora}` : '—';
  };

  function nfxdUpdateSteps() {
    const hasImg = state.templateHasImg !== false;
    const steps = hasImg ? 4 : 3;
    for (let i = 1; i <= 4; i++) {
      const el = document.getElementById('nfxd-si-' + i);
      const sep = document.querySelectorAll('.nfxd-step-sep')[i - 1];
      if (!el) continue;
      if (i === 3 && !hasImg) {
        el.style.display = 'none';
        if (sep) sep.style.display = 'none';
        continue;
      }
      el.style.display = 'flex';
      if (sep) sep.style.display = 'block';
      const stepNum = (i === 4 && !hasImg) ? 3 : i;
      const activeStep = (state.step === 4 && !hasImg) ? 3 : state.step;
      el.className = 'nfxd-step' + (stepNum === activeStep ? ' active' : stepNum < activeStep ? ' done' : '');
      const num = el.querySelector('.nfxd-step-num');
      if (num) num.textContent = stepNum < activeStep ? '✓' : stepNum;
    }
  }

  // ─── SUBMIT ─────────────────────────────────────────────────────────────────
  window.nfxdSubmit = async function() {
    const cfg = getConfig();
    if (!cfg.webhookUrl || cfg.webhookUrl === 'SEU_N8N_WEBHOOK_URL') {
      alert('Configure o webhook do n8n primeiro (⚙ Configurar).'); return;
    }
    const nome = (document.getElementById('nfxd-nome')?.value || '').trim();
    const data = document.getElementById('nfxd-data')?.value || '';
    const hora = document.getElementById('nfxd-hora')?.value || '';
    if (!nome) { alert('Informe o nome da campanha.'); return; }
    if (!data || !hora) { alert('Informe data e horário.'); return; }
    if (!state.publico) { alert('Selecione o público.'); return; }
    if (!state.template) { alert('Selecione um template.'); return; }
    if (state.templateHasImg && !state.imgUrl) { alert('Informe a URL da imagem.'); return; }

    const btn = document.getElementById('nfxd-submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="nfxd-spin"></span> Agendando...';

    try {
      const res = await fetch(cfg.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_campanha',
          tenant_key: CONFIG.tenantKey,
          payload: {
            nome,
            tipo: state.publico.key,
            tipo_label: state.publico.label,
            template_name: state.template.name,
            template_id: state.template.id,
            url_image: state.imgUrl || null,
            dt_disparo: `${data}T${hora}:00`,
          }
        })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || result.error) throw new Error(result.error || result.message || `HTTP ${res.status}`);
      alert(`✓ Campanha "${nome}" agendada para ${data} às ${hora}!`);
      nfxdReset();
      nfxdView('historico');
    } catch (e) {
      alert(`✗ Erro ao agendar: ${e.message}`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round"/></svg> Agendar disparo';
    }
  };

  // ─── HISTÓRICO ──────────────────────────────────────────────────────────────
  window.loadCampanhas = async function() {
    const cfg = getConfig();
    const container = document.getElementById('nfxd-hist-container');
    if (!cfg.webhookUrl || cfg.webhookUrl === 'SEU_N8N_WEBHOOK_URL') {
      container.innerHTML = '<div class="nfxd-ld">Configure o webhook do n8n primeiro.</div>'; return;
    }
    container.innerHTML = '<div class="nfxd-loading"><div class="nfxd-spin"></div>Carregando histórico...</div>';
    try {
      const res = await fetch(cfg.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list_campanhas',
          tenant_key: CONFIG.tenantKey,
          payload: {}
        })
      });
      const data = await res.json().catch(() => ({}));
      const result = Array.isArray(data) ? data[0] : data;
      state.campanhas = Array.isArray(result.campanhas || result) ? (result.campanhas || result) : [];
      renderHistorico();
    } catch (e) {
      container.innerHTML = `<div class="nfxd-ld" style="color:var(--red)">Erro: ${esc(e.message)}</div>`;
    }
  };

  function renderHistorico() {
    const rows = state.campanhas;
    const total = rows.length;
    const ok = rows.filter(r => r.status === 'executada').length;
    const ag = rows.filter(r => r.status === 'agendada').length;
    document.getElementById('nfxd-m-total').textContent = total;
    document.getElementById('nfxd-m-ok').textContent = ok;
    document.getElementById('nfxd-m-ag').textContent = ag;
    document.getElementById('nfxd-hist-count').textContent = total;

    const container = document.getElementById('nfxd-hist-container');
    if (!rows.length) {
      container.innerHTML = '<div class="nfxd-empty">Nenhuma campanha ainda.<br>Crie a primeira pelo menu "Nova campanha".</div>';
      return;
    }

    const badgeClass = { agendada: 'nfxd-badge-ag', processando: 'nfxd-badge-pr', executada: 'nfxd-badge-ok', erro: 'nfxd-badge-er' };
    container.innerHTML = `
      <div class="nfxd-del-bar" id="nfxd-del-bar">
        <span class="nfxd-del-info" id="nfxd-del-info">0 selecionadas</span>
        <button class="nfxd-del-cancel" onclick="nfxdCancelSel()">Cancelar</button>
        <button class="nfxd-del-btn" onclick="nfxdDeleteSelecionadas()">
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Excluir selecionadas
        </button>
      </div>
      <table class="nfxd-hist-table">
        <thead><tr>
          <th style="text-align:center;vertical-align:middle;padding:6px 8px"><input type="checkbox" class="nfxd-cb-inp" id="nfxd-cb-all" onclick="nfxdToggleAll(this)" style="display:block;margin:0 auto"/></th>
          <th>Campanha</th><th>Público</th><th>Template</th><th>Agendado para</th><th>Status</th>
        </tr></thead>
        <tbody>${rows.map(r => {
          const dt = r.dt_disparo ? new Date(r.dt_disparo).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' }) : '—';
          const bc = badgeClass[r.status] || 'nfxd-badge-ag';
          return `<tr id="nfxd-row-${r.id}">
            <td style="text-align:center;vertical-align:middle"><input type="checkbox" class="nfxd-cb-inp nfxd-row-cb" data-id="${r.id}" onclick="nfxdToggleRow(this)"/></td>
            <td style="font-weight:500">${esc(r.nome || '—')}</td>
            <td style="color:var(--tx2)">${esc(r.tipo_label || r.tipo || '—')}</td>
            <td style="color:var(--tx3);font-size:11px;font-family:monospace">${esc(r.template_name || '—')}</td>
            <td style="color:var(--tx2);font-size:11px;white-space:nowrap">${dt}</td>
            <td><span class="nfxd-badge ${bc}">${esc(r.status || '—')}</span></td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
  }

  window.nfxdToggleAll = function(cb) {
    document.querySelectorAll('.nfxd-row-cb').forEach(c => {
      c.checked = cb.checked;
      const row = document.getElementById('nfxd-row-' + c.dataset.id);
      if (row) row.classList.toggle('sel-row', cb.checked);
    });
    nfxdUpdateDelBar();
  };

  window.nfxdToggleRow = function(cb) {
    const row = document.getElementById('nfxd-row-' + cb.dataset.id);
    if (row) row.classList.toggle('sel-row', cb.checked);
    const all = document.querySelectorAll('.nfxd-row-cb');
    const checked = document.querySelectorAll('.nfxd-row-cb:checked');
    const cbAll = document.getElementById('nfxd-cb-all');
    if (cbAll) cbAll.checked = all.length === checked.length;
    nfxdUpdateDelBar();
  };

  function nfxdUpdateDelBar() {
    const checked = document.querySelectorAll('.nfxd-row-cb:checked');
    const bar = document.getElementById('nfxd-del-bar');
    const info = document.getElementById('nfxd-del-info');
    if (!bar) return;
    if (checked.length > 0) {
      bar.classList.add('visible');
      info.textContent = `${checked.length} campanha(s) selecionada(s)`;
    } else {
      bar.classList.remove('visible');
    }
  }

  window.nfxdCancelSel = function() {
    document.querySelectorAll('.nfxd-row-cb').forEach(c => { c.checked = false; });
    const cbAll = document.getElementById('nfxd-cb-all');
    if (cbAll) cbAll.checked = false;
    document.querySelectorAll('.sel-row').forEach(r => r.classList.remove('sel-row'));
    nfxdUpdateDelBar();
  };

  window.nfxdDeleteSelecionadas = async function() {
    const checked = document.querySelectorAll('.nfxd-row-cb:checked');
    if (!checked.length) return;
    const ids = Array.from(checked).map(c => parseInt(c.dataset.id));
    if (!confirm(`Excluir ${ids.length} campanha(s)? Esta ação não pode ser desfeita.`)) return;

    const cfg = getConfig();
    const btn = document.querySelector('.nfxd-del-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="nfxd-spin"></span> Excluindo...'; }

    try {
      const res = await fetch(cfg.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_campanha',
          tenant_key: CONFIG.tenantKey,
          payload: { ids }
        })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || result.error) throw new Error(result.error || result.message || `HTTP ${res.status}`);
      state.campanhas = state.campanhas.filter(c => !ids.includes(c.id));
      renderHistorico();
    } catch (e) {
      alert(`✗ Erro ao excluir: ${e.message}`);
      if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke-linecap="round" stroke-linejoin="round"/></svg> Excluir selecionadas'; }
    }
  };

  // ─── RESET ──────────────────────────────────────────────────────────────────
  window.nfxdReset = function() {
    state.publico = null;
    state.template = null;
    state.imgUrl = '';
    state.step = 1;
    ['promo','conf','cortesia'].forEach(k => document.getElementById('nfxd-pub-' + k)?.classList.remove('sel'));
    ['nfxd-sec-tpl','nfxd-sec-img','nfxd-sec-agendar','nfxd-actions'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    ['nfxd-nome','nfxd-data','nfxd-hora','nfxd-img-url'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const imgPrev = document.getElementById('nfxd-img-preview');
    if (imgPrev) { imgPrev.innerHTML = ''; imgPrev.style.display = 'none'; }
    const imgGrid = document.getElementById('nfxd-img-grid-container');
    if (imgGrid) imgGrid.innerHTML = '<div style="font-size:11px;color:var(--tx3)">Clique em "Carregar do bucket" para ver as imagens disponíveis</div>';
    document.querySelectorAll('.nfxd-img-thumb').forEach(t => t.classList.remove('sel'));
    document.getElementById('nfxd-info-box').style.display = 'none';
    ['nfxd-n1','nfxd-n2','nfxd-n3','nfxd-n4'].forEach(id => document.getElementById(id)?.classList.remove('done'));
    nfxdUpdateSteps();
    nfxdUpdatePreview();
  };

  // ─── CONFIG ─────────────────────────────────────────────────────────────────
  window.nfxdOpenCfg = function() {
    const c = getConfig();
    document.getElementById('nfxd-cfg-wh').value = c.webhookUrl !== 'SEU_N8N_WEBHOOK_URL' ? (c.webhookUrl || '') : '';
    document.getElementById('nfxd-cfg-tr').className = 'nfxd-tr';
    document.getElementById('nfxd-cfg-ov').classList.add('open');
  };

  window.nfxdCloseCfg = function() {
    document.getElementById('nfxd-cfg-ov').classList.remove('open');
  };

  window.nfxdSaveCfg = function() {
    const webhookUrl = document.getElementById('nfxd-cfg-wh').value.trim();
    if (!webhookUrl) { alert('Preencha a URL do webhook do n8n.'); return; }
    saveConfig({ webhookUrl });
    document.getElementById('nfxd-stxt').textContent = 'Configurado';
    window.nfxdCloseCfg();
  };

  window.nfxdTestCfg = async function() {
    const webhookUrl = document.getElementById('nfxd-cfg-wh').value.trim();
    const r = document.getElementById('nfxd-cfg-tr');
    r.className = 'nfxd-tr'; r.textContent = 'Testando...'; r.style.display = 'block';
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_connection', tenant_key: CONFIG.tenantKey, payload: {} })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      r.className = 'nfxd-tr ok'; r.textContent = `✓ ${data.message || 'Webhook conectado!'}`;
    } catch (e) {
      r.className = 'nfxd-tr err'; r.textContent = `✗ ${e.message}`;
    }
  };

  // ─── EXPOSE ─────────────────────────────────────────────────────────────────
  window.nfxdClose = closeModal;
  window.nfx_portal_disparo_open = openModal;

  // ─── INIT ───────────────────────────────────────────────────────────────────
  const cfg = getConfig();
  if (cfg.webhookUrl && cfg.webhookUrl !== 'SEU_N8N_WEBHOOK_URL') {
    const s = document.getElementById('nfxd-stxt');
    if (s) s.textContent = 'Configurado';
  }
  const obs = new MutationObserver(applyTheme);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });

})();