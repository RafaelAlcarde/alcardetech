(function () {
  'use strict';

  const STORAGE_KEY = 'neofluxx_waba_config';
  const VERSION = 'v1.9';
  const SVG_IMG   = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
  const SVG_VIDEO = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-3v10l-6-3"/></svg>';
  const SVG_DOC   = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>';
  const SVG_REPLY = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a4 4 0 010 8h-1"/></svg>';
  const SVG_LINK  = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>';

  const N8N_CONFIG = {
    webhookUrl: 'https://webhooks.xbluedigital.app.br/webhook/template-builder-v3',
    get tenantKey() {
      const match = window.location.pathname.match(/accounts\/(\d+)/);
      return match ? `account-${match[1]}` : 'default';
    },
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
    /* botão flutuante removido — abertura via menu Neofluxx */
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
    .nfx-ta{resize:vertical;min-height:80px;line-height:1.6;font-family:monospace;font-size:12px;border-radius:7px 7px 0 0!important}
    .nfx-toolbar{display:flex;align-items:center;gap:2px;padding:4px 6px;background:var(--sf3);border:1px solid var(--bd);border-top:none;border-radius:0 0 7px 7px}
    .nfx-tb-btn{background:transparent;border:none;border-radius:5px;padding:3px 7px;font-size:12px;cursor:pointer;color:var(--tx2);transition:all .15s;line-height:1.4}
    .nfx-tb-btn:hover{background:var(--sf2);color:var(--tx)}
    .nfx-tb-sep{width:1px;height:14px;background:var(--bd2);margin:0 3px}
    .nfx-tb-var{font-size:10px;font-family:monospace;color:var(--ac)!important;border:1px solid var(--agl)!important;background:var(--adim)!important;padding:2px 7px}
    .nfx-tb-var:hover{opacity:.8}
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
    .nfx-bs{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:7px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:12px;cursor:pointer;transition:all .15s;font-family:inherit;white-space:nowrap;flex-shrink:0}
    .nfx-bs:hover{background:var(--sf2);color:var(--tx)}
    #nfx-preview{background:var(--sf);border-left:1px solid var(--bd);display:flex;flex-direction:column;overflow:hidden}
    .nfx-ph{padding:12px 14px;border-bottom:1px solid var(--bd);display:flex;align-items:center;justify-content:space-between}
    #nfx-pbody{flex:1;padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:12px}
    .nfx-phone{width:100%;max-width:228px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;border:1px solid #e4e4e4}
    .nfx-pbar{background:#075e54;padding:10px 12px;display:flex;align-items:center;justify-content:center}
    .nfx-pbar-title{font-size:12px;font-weight:600;color:#fff;text-align:center}
    .nfx-pbar-sub{font-size:9px;color:rgba(255,255,255,.7);text-align:center;margin-top:1px}
    .nfx-pchat{padding:14px 10px;min-height:150px;background:#fff}
    .nfx-bub{background:#f7f7f7;border:1px solid #ececec;border-radius:12px;overflow:hidden}
    .nfx-btxt{padding:8px 10px}
    .nfx-wt{font-size:11px;color:#111;line-height:1.5}
    .nfx-vh{background:rgba(37,211,102,.15);color:#128c7e;border-radius:3px;padding:0 3px;font-family:monospace;font-size:10px}
    .nfx-wfr{margin-top:4px;display:flex;justify-content:flex-end;font-size:9px;color:#8696a0;gap:3px;align-items:center}
    .nfx-wht{font-size:13px;font-weight:600;color:#111;margin-bottom:4px}
    .nfx-whm{width:100%;height:120px;background:#eee}
    .nfx-whm img{width:100%;height:100%;display:block;object-fit:cover}
    .nfx-whm-ph{width:100%;height:100%;background:#eee;display:flex;align-items:center;justify-content:center}
    .nfx-wft{border-top:1px solid rgba(0,0,0,.08);margin-top:6px;padding-top:5px;font-size:10px;color:#667781}
    .nfx-wb{width:100%;background:transparent;border:none;border-top:1px solid #e4e4e4;padding:9px 8px;text-align:center;font-size:12px;font-weight:500;color:#00a884;cursor:default;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px;box-sizing:border-box}
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
    .nfx-tc{background:var(--sf);border:1px solid var(--bd);border-radius:10px;padding:12px 14px;display:flex;align-items:flex-start;gap:12px;transition:border .15s}
    .nfx-tc.selected{border-color:var(--ac);background:var(--adim)}
    .nfx-tc-cb{width:16px;height:16px;cursor:pointer;accent-color:var(--ac);flex-shrink:0;margin-top:2px}
    .nfx-del-bar{display:none;align-items:center;gap:10px;padding:8px 12px;background:var(--sf2);border:1px solid var(--bd);border-radius:8px}
    .nfx-del-bar.visible{display:flex;position:sticky;top:0;z-index:5}
    .nfx-del-info{font-size:12px;color:var(--tx2);font-weight:500;flex:1}
    .nfx-del-cancel{padding:5px 12px;border-radius:6px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);font-size:11px;cursor:pointer}
    .nfx-del-cancel:hover{background:var(--sf3);color:var(--tx)}
    .nfx-del-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:6px;border:none;background:var(--red);color:#fff;font-size:11px;font-weight:600;cursor:pointer}
    .nfx-del-btn:hover:not(:disabled){opacity:.85}
    .nfx-del-btn:disabled{opacity:.6;cursor:not-allowed}
    .nfx-edit-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:6px;border:none;background:var(--ac);color:#000;font-size:11px;font-weight:600;cursor:pointer}
    .nfx-edit-btn:hover{opacity:.85}
    #nfx-del-ov{display:none;position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,.65);align-items:center;justify-content:center}
    #nfx-del-ov.open{display:flex}
    #nfx-del-m{width:380px;max-width:94vw;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    #nfx-del-m.light{background:#fff;color:#1a1a2e;--bd:#e2e5ea;--sf2:#f0f2f5;--tx:#1a1a2e;--tx2:#5a6170;--red:#e53935}
    #nfx-del-m.dark{background:#17171b;color:#f0f0f5;--bd:#2a2a35;--sf2:#1e1e24;--tx:#f0f0f5;--tx2:#9090a8;--red:#ff5e5e}
    #nfx-tplprev-ov{display:none;position:fixed;inset:0;z-index:100003;background:rgba(0,0,0,.65);align-items:center;justify-content:center}
    #nfx-tplprev-ov.open{display:flex}
    #nfx-tplprev-m{width:300px;max-width:94vw;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;padding:14px}
    .nfx-tc-eye{display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;border:1px solid var(--bd2);background:transparent;color:var(--tx2);cursor:pointer;flex-shrink:0}
    .nfx-tc-eye:hover{background:var(--sf3);color:var(--tx)}
    .nfx-ti{flex:1}
    .nfx-tn{font-size:13px;font-weight:600;color:var(--tx)}
    .nfx-tm{font-size:11px;color:var(--tx2);margin-top:2px}
    .nfx-sb2{font-size:10px;padding:3px 9px;border-radius:10px;font-weight:500;white-space:nowrap}
    .nfx-AP{background:var(--adim);color:var(--ac);border:1px solid var(--agl)}
    .nfx-PE{background:rgba(245,166,35,.12);color:var(--amb);border:1px solid rgba(245,166,35,.3)}
    .nfx-RE{background:rgba(255,94,94,.1);color:var(--red);border:1px solid rgba(255,94,94,.3)}
    .nfx-PA{background:var(--sf3);color:var(--tx3);border:1px solid var(--bd2)}
    .nfx-ltb{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;position:relative}
    .nfx-ld{text-align:center;color:var(--tx3);font-size:12px;padding:24px}
    .nfx-rr{margin-top:6px;padding:6px 8px;border-radius:6px;background:rgba(255,94,94,.08);border:1px solid rgba(255,94,94,.2);font-size:10px;color:var(--red);line-height:1.5}

    @keyframes nfxSpin{to{transform:rotate(360deg)}}
    .nfx-spin{display:inline-block;width:12px;height:12px;border:2px solid rgba(0,0,0,.25);border-top-color:#000;border-radius:50%;animation:nfxSpin .7s linear infinite}
    #nfx-main::-webkit-scrollbar,#nfx-pbody::-webkit-scrollbar{width:4px}
    #nfx-main::-webkit-scrollbar-track,#nfx-pbody::-webkit-scrollbar-track{background:transparent}
    #nfx-main::-webkit-scrollbar-thumb,#nfx-pbody::-webkit-scrollbar-thumb{background:var(--bd2);border-radius:2px}
    .nfx-field-err{font-size:10px;color:var(--red);margin-top:3px;display:none}
    .nfx-waba-grid{display:flex;flex-wrap:wrap;gap:10px;margin-top:4px}
    .nfx-waba-card{flex:1;min-width:120px;border:1px solid var(--bd);border-radius:10px;padding:12px 14px;cursor:pointer;transition:all .15s;background:var(--sf);display:flex;align-items:center;gap:8px}
    .nfx-waba-card:hover{border-color:var(--bd2);background:var(--sf2)}
    .nfx-waba-card.sel{border:1.5px solid var(--ac);background:var(--adim)}
    .nfx-waba-icon{width:30px;height:30px;border-radius:8px;background:var(--adim);display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .nfx-waba-label{font-size:12px;font-weight:600;color:var(--tx)}
    .nfx-waba-sel-bar{display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--adim);border:1px solid var(--agl);border-radius:7px;font-size:11px;color:var(--ac);margin-bottom:4px}
  `;
  document.head.appendChild(style);

  let buttons     = [];
  let headerType  = 'none';
  let varType     = 'text';
  let varExamples = {};
  let config      = Object.assign({}, N8N_CONFIG, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
  let tenantId    = null;
  let wabaNome    = null;
  let wabas       = [];
  let _loadedTemplates = [];
  window._nfxEditMode  = { active:false, templateId:null, name:null, originalHeader:null };

  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function tc()   { return isDark() ? 'dark' : 'light'; }

  function applyTheme() {
    const m = document.getElementById('nfx-modal');
    if (m) { m.classList.remove('dark','light'); m.classList.add(tc()); }
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
    return Object.assign({ Accept:'application/json' }, extra || {});
  }

  async function n8nRequest(action, payload, file) {
    const cfg = getConfig();
    if (!cfg.webhookUrl) throw new Error('Configure a URL do webhook.');
    if (!cfg.tenantKey) throw new Error('Configure a chave da empresa.');
    if (file) {
      const form = new FormData();
      form.append('action', action);
      form.append('tenant_key', cfg.tenantKey);
      if (tenantId) form.append('tenant_id', tenantId);
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
      body: JSON.stringify({ action, tenant_key: cfg.tenantKey, tenant_id: tenantId, payload: payload || {} })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(data.error || data.message || `HTTP ${res.status}`);
    return data;
  }

  // botão flutuante removido — abertura via window.nfx_template_builder_open()

  const overlay = document.createElement('div');
  overlay.id = 'nfx-overlay';
  overlay.innerHTML = buildHTML();
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeBuilder(); });

  function openBuilder() { applyTheme(); overlay.classList.add('open'); nfxLoadWabas(); updatePreview(); }
  function closeBuilder() {
    overlay.classList.remove('open');
    tenantId = null;
    wabaNome = null;
    wabas = [];
    const sec = document.getElementById('nfx-sec-waba');
    if (sec) sec.style.display = 'none';
    const bar = document.getElementById('nfx-waba-sel-bar');
    if (bar) bar.style.display = 'none';
    nfxLockForm(false);
    if (typeof nfxDoClear === 'function') nfxDoClear();
    if (window.nfxCancelSel) window.nfxCancelSel();
    if (window.nfxCloseTplPreview) window.nfxCloseTplPreview();
    const searchEl = document.getElementById('nfx-search');
    if (searchEl) searchEl.value = '';
    setTimeout(() => { if (window.nfxView) nfxView('create'); }, 50);
  }

  function buildHTML() {
    return `
    <div id="nfx-modal" class="${tc()}">
      <div id="nfx-topbar">
        <span style="font-size:13px;font-weight:600;color:var(--tx)">Template Builder</span>
        <span style="font-size:10px;color:var(--tx3)">/ WhatsApp Business</span>
        <div class="nfx-sp"></div>
        <div class="nfx-pill"><div class="nfx-dot"></div><span id="nfx-stxt">aguardando configuração</span></div>

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

          <div class="nfx-sec" id="nfx-sec-waba" style="display:none">
            <div class="nfx-sh"><div class="nfx-sn">W</div><div class="nfx-st">Selecione a WABA</div></div>
            <div class="nfx-sb">
              <div class="nfx-waba-grid" id="nfx-waba-grid"></div>
            </div>
          </div>

          <div id="nfx-waba-sel-bar" style="display:none" class="nfx-waba-sel-bar">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="#25d366"/></svg>
            <span id="nfx-waba-sel-txt">—</span>
            <span style="margin-left:auto;cursor:pointer;color:var(--tx3);font-size:10px" onclick="nfxMostrarWabas()">trocar</span>
          </div>

          <div id="nfx-edit-banner" style="display:none;align-items:center;gap:8px;padding:6px 10px;background:rgba(79,142,247,.1);border:1px solid rgba(79,142,247,.3);border-radius:8px;font-size:11px;color:var(--bl)">
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">✎ Editando <b id="nfx-edit-name"></b> <span style="opacity:.7">— nome/categoria não permitidos</span></span>
            <button class="nfx-bs" style="flex-shrink:0;padding:4px 10px;font-size:10px" onclick="nfxCancelEdit()">Cancelar</button>
          </div>

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
                <input class="nfx-inp" id="nfx-hval" placeholder="Texto do cabeçalho (máx. 60 caracteres)" maxlength="60" oninput="nfxHvalChg(this)"/>
              </div>
              <div id="nfx-hmedia" style="display:none;margin-top:10px;flex-direction:column;gap:8px">
                <div id="nfx-edit-media-note" style="display:none;padding:8px 10px;border-radius:7px;background:var(--adim);border:1px solid var(--agl);font-size:11px;color:var(--ac)"></div>
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
                <div style="position:relative">
                    <textarea class="nfx-ta" id="nfx-body" placeholder="Olá {{1}}, seu pedido foi confirmado!" oninput="nfxBodyChg(this)"></textarea>
                    <div class="nfx-toolbar">
                      <button class="nfx-tb-btn" title="Emoji" onclick="nfxTbEmoji(event)" type="button">😊</button>
                      <button class="nfx-tb-btn" title="Negrito" onclick="nfxTbWrap('*')" type="button"><b>B</b></button>
                      <button class="nfx-tb-btn" title="Itálico" onclick="nfxTbWrap('_')" type="button"><i>I</i></button>
                      <div class="nfx-tb-sep"></div>
                      <button class="nfx-tb-btn nfx-tb-var" title="Inserir variável" onclick="nfxTbVar()" type="button">+ {{var}}</button>
                    </div>
                    <div id="nfx-emoji-picker-wrap" style="display:none;position:fixed;z-index:100001"></div>
                  </div>
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <div class="nfx-hint">Use <code>{{1}}</code> <code>{{2}}</code> para variáveis</div>
                  <div class="nfx-cc" id="nfx-bc">0/1024</div>
                </div>

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
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
              <span id="nfx-version-tag" style="font-size:10px;font-family:monospace;color:var(--tx3);background:var(--sf3);border:1px solid var(--bd2);border-radius:10px;padding:2px 8px;flex-shrink:0"></span>
              <button class="nfx-bs" id="nfx-sync-btn" onclick="nfxSyncTemplates()">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Sincronizar modelos
              </button>
              <button class="nfx-bs" id="nfx-refresh-btn" onclick="nfxLoad()">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Atualizar
              </button>
            </div>
          </div>
          <div id="nfx-sync-feedback" style="display:none;text-align:right;font-size:11px;padding:2px 0 6px"></div>
          <div style="position:relative">
            <input class="nfx-inp" id="nfx-search" placeholder="Buscar template por nome..." oninput="nfxFilterTemplates(this.value)" style="padding-left:30px"/>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--tx3);pointer-events:none"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" stroke-linecap="round"/></svg>
          </div>
          <div class="nfx-del-bar" id="nfx-del-bar">
            <span class="nfx-del-info" id="nfx-del-info">0 selecionados</span>
            <button class="nfx-del-cancel" onclick="nfxCancelSel()">Cancelar</button>
            <button class="nfx-edit-btn" id="nfx-edit-sel-btn" style="display:none" onclick="nfxStartEdit()">
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Editar
            </button>
            <button class="nfx-del-btn" onclick="nfxConfirmDelete()">
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Excluir selecionados
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
                <div id="nfx-phmedia" class="nfx-whm" style="display:none"></div>
                <div class="nfx-btxt">
                  <div id="nfx-ph2" class="nfx-wht" style="display:none"></div>
                  <div class="nfx-wt" id="nfx-pb">Digite o corpo da mensagem...</div>
                  <div id="nfx-pf" class="nfx-wft" style="display:none"></div>
                  <div class="nfx-wfr">
                    <span>agora</span>
                    <svg width="14" height="10" viewBox="0 0 14 10" fill="#53bdeb"><path d="M1 5l3 3 5-7M6 8l2-2 3-3"/></svg>
                  </div>
                </div>
                <div id="nfx-pbtns"></div>
              </div>
            </div>
          </div>
          <div id="nfx-vbox" style="display:none">
            <div style="font-size:10px;color:var(--tx3);margin-bottom:6px">Preencha para visualizar no preview</div>
            <div id="nfx-vlist" style="display:flex;flex-direction:column;gap:6px"></div>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal confirmação delete -->
    <div id="nfx-del-ov">
      <div id="nfx-del-m" class="${tc()}">
        <div style="padding:20px 20px 8px;display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;border-radius:50%;background:rgba(229,57,53,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--red)" stroke-width="2.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div>
            <div style="font-size:14px;font-weight:600;color:var(--tx)">Excluir templates</div>
            <div style="font-size:11px;color:var(--tx2);margin-top:2px" id="nfx-del-m-sub">Confirme a exclusão</div>
          </div>
        </div>
        <div style="padding:8px 20px 16px;font-size:12px;color:var(--tx2);line-height:1.6">
          Esta ação é <strong style="color:var(--red)">permanente e irreversível</strong>. Os templates serão removidos da sua conta WhatsApp Business e não poderão ser recuperados.
        </div>
        <div style="padding:12px 20px;border-top:1px solid var(--bd);display:flex;gap:8px;justify-content:flex-end">
          <button class="nfx-bs" onclick="nfxCancelDelete()">Cancelar</button>
          <button class="nfx-del-btn" id="nfx-del-confirm-btn" onclick="nfxExecuteDelete()">
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Confirmar exclusão
          </button>
        </div>
      </div>
    </div>
    <!-- Modal preview do template -->
    <div id="nfx-tplprev-ov" onclick="if(event.target===this) nfxCloseTplPreview()">
      <div id="nfx-tplprev-m">
        <div style="display:flex;justify-content:flex-end;margin-bottom:6px">
          <button onclick="nfxCloseTplPreview()" style="background:none;border:none;cursor:pointer;color:#999;font-size:16px;line-height:1;padding:2px">✕</button>
        </div>
        <div id="nfx-tplprev-body"></div>
      </div>
    </div>
    `;
  }

  window.nfxLoadWabas = async function() {
    const cfg = getConfig();
    if (!cfg.webhookUrl) return;
    try {
      const res = await fetch(cfg.webhookUrl, {
        method: 'POST',
        headers: buildN8NHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ action: 'list_wabas', tenant_key: cfg.tenantKey, payload: {} })
      });
      const data = await res.json().catch(() => ({}));
      wabas = data.wabas || [];
      if (wabas.length === 1) {
        nfxSelWaba(wabas[0].id, wabas[0].waba_nome);
      } else if (wabas.length > 1) {
        nfxMostrarWabas();
      }
    } catch(e) {}
  };

  function nfxLockForm(lock) {
    const form = document.getElementById('nfx-cv');
    if (!form) return;
    const toBlock = form.querySelectorAll('.nfx-sec:not(#nfx-sec-waba), #nfx-waba-sel-bar, .nfx-sidebar, #nfx-nav-c, #nfx-nav-l');
    toBlock.forEach(el => {
      el.style.pointerEvents = lock ? 'none' : '';
      el.style.opacity = lock ? '0.35' : '';
      el.style.userSelect = lock ? 'none' : '';
    });
    const sidebar = document.getElementById('nfx-sidebar');
    if (sidebar) {
      sidebar.style.pointerEvents = lock ? 'none' : '';
      sidebar.style.opacity = lock ? '0.35' : '';
    }
  }

  window.nfxMostrarWabas = function() {
    const sec = document.getElementById('nfx-sec-waba');
    const bar = document.getElementById('nfx-waba-sel-bar');
    const grid = document.getElementById('nfx-waba-grid');
    if (!sec || !grid) return;
    sec.style.display = 'block';
    if (bar) bar.style.display = 'none';
    nfxLockForm(true);
    grid.innerHTML = wabas.map(w => `
      <div class="nfx-waba-card${tenantId === w.id ? ' sel' : ''}" onclick="nfxSelWaba(${w.id},'${esc(w.waba_nome)}')">
        <div class="nfx-waba-icon"><svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="#25d366"/></svg></div>
        <div class="nfx-waba-label">${esc(w.waba_nome)}</div>
      </div>`).join('');
  };

  window.nfxSelWaba = function(id, nome) {
    tenantId = id;
    wabaNome = nome;
    const sec = document.getElementById('nfx-sec-waba');
    const bar = document.getElementById('nfx-waba-sel-bar');
    const txt = document.getElementById('nfx-waba-sel-txt');
    if (sec) sec.style.display = 'none';
    if (bar && wabas.length > 1) bar.style.display = 'flex';
    if (txt) txt.textContent = `WABA: ${nome}`;
    nfxLockForm(false);
  };

  // Carrega emoji-picker-element via CDN
  if (!customElements.get('emoji-picker')) {
    const s = document.createElement('script');
    s.type = 'module';
    s.src = 'https://cdn.jsdelivr.net/npm/emoji-picker-element@1/index.js';
    document.head.appendChild(s);
  }

  function nfxInsertAtCursor(text) {
    const ta = document.getElementById('nfx-body');
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    ta.value = ta.value.slice(0, s) + text + ta.value.slice(e);
    ta.selectionStart = ta.selectionEnd = s + text.length;
    ta.focus();
    nfxBodyChg(ta);
  }

  window.nfxTbWrap = function(char) {
    const ta = document.getElementById('nfx-body');
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = ta.value.slice(s, e);
    if (sel) {
      const wrapped = char + sel + char;
      ta.value = ta.value.slice(0, s) + wrapped + ta.value.slice(e);
      ta.selectionStart = s;
      ta.selectionEnd = s + wrapped.length;
    } else {
      const placeholder = char + 'texto' + char;
      ta.value = ta.value.slice(0, s) + placeholder + ta.value.slice(e);
      ta.selectionStart = s + 1;
      ta.selectionEnd = s + placeholder.length - 1;
    }
    ta.focus();
    nfxBodyChg(ta);
  };

  window.nfxTbVar = function() {
    const ta = document.getElementById('nfx-body');
    if (!ta) return;
    const existing = [...new Set((ta.value.match(/\{\{(\d+)\}\}/g) || []))].map(v => parseInt(v.replace(/[{}]/g, '')));
    let next = 1;
    while (existing.includes(next)) next++;
    nfxInsertAtCursor('{{' + next + '}}');
  };

  window.nfxTbEmoji = function(event) {
    event.stopPropagation();
    const wrap = document.getElementById('nfx-emoji-picker-wrap');
    if (!wrap) return;
    if (wrap.style.display !== 'none') { wrap.style.display = 'none'; return; }
    const btn = event.currentTarget;
    const rect = btn.getBoundingClientRect();
    const pickerH = 340, pickerW = 300;
    const top = rect.top - pickerH - 6 > 0 ? rect.top - pickerH - 6 : rect.bottom + 6;
    const left = Math.min(rect.left, window.innerWidth - pickerW - 8);
    wrap.style.top = top + 'px';
    wrap.style.left = left + 'px';
    if (!wrap.querySelector('emoji-picker')) {
      const picker = document.createElement('emoji-picker');
      picker.style.cssText = '--border-radius:10px;--shadow:0 4px 20px rgba(0,0,0,.2);width:300px;height:340px';
      picker.addEventListener('emoji-click', e => {
        nfxInsertAtCursor(e.detail.unicode);
        wrap.style.display = 'none';
      });
      wrap.appendChild(picker);
    }
    wrap.style.display = 'block';
    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (!wrap.contains(e.target)) { wrap.style.display = 'none'; document.removeEventListener('click', handler); }
      });
    }, 0);
  };

  window.nfxClose = closeBuilder;

  // Expõe abertura para o menu Neofluxx
  window.nfx_template_builder_open = openBuilder;



  window.nfxView = function(v) {
    document.getElementById('nfx-cv').style.display  = v==='create'?'flex':'none';
    document.getElementById('nfx-lv').style.display  = v==='list'?'flex':'none';
    document.getElementById('nfx-preview').style.display = v==='create'?'flex':'none';
    const main = document.getElementById('nfx-main');
    if (main) main.style.gridColumn = v==='list' ? '2 / -1' : '';
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
    const editNote = document.getElementById('nfx-edit-media-note');
    if (editNote) editNote.style.display = 'none';
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => {
        const phmedia = document.getElementById('nfx-phmedia');
        if (phmedia) { phmedia.style.display='block'; phmedia.innerHTML=`<img src="${e.target.result}" alt="preview"/>`; }
      };
      reader.readAsDataURL(file);
    } else {
      const phmedia = document.getElementById('nfx-phmedia');
      if (phmedia) { phmedia.style.display='block'; phmedia.innerHTML=`<div class="nfx-whm-ph">${SVG_DOC}</div>`; }
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
    const phmedia = document.getElementById('nfx-phmedia');
    if (phmedia) { phmedia.style.display='none'; phmedia.innerHTML=''; }
    nfxUpdateEditMediaNote();
    updatePreview();
  };

  function nfxUpdateEditMediaNote() {
    const noteEl = document.getElementById('nfx-edit-media-note');
    if (!noteEl) return;
    const orig = window._nfxEditMode?.originalHeader;
    const keepingOriginal = window._nfxEditMode?.active && orig && (orig.format||'').toLowerCase() === headerType && !window._nfxSelectedFile;
    if (keepingOriginal) {
      noteEl.style.display = 'block';
      noteEl.textContent = `🖼 Cabeçalho de mídia atual (${orig.format}) será mantido. Selecione um arquivo apenas se quiser substituí-lo.`;
    } else {
      noteEl.style.display = 'none';
    }
  }

  window.nfxHdr = function(type, el) {
    headerType = type;
    document.querySelectorAll('.nfx-tt').forEach(t=>t.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('nfx-htxt').style.display = type==='text'?'block':'none';
    const hm = document.getElementById('nfx-hmedia');
    hm.style.display = ['image','video','document'].includes(type)?'flex':'none';
    if (!['image','video','document'].includes(type)) window.nfxClearFile();
    nfxUpdateEditMediaNote();
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

  window.nfxHvalChg = function(el) {
    // Remove emojis silenciosamente — a Meta não aceita no cabeçalho
    const cursor = el.selectionStart;
    const clean = el.value.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\uD800-\uDBFF][\uDC00-\uDFFF]|\u200D|[\u{FE00}-\u{FE0F}]/gu, '');
    if (clean !== el.value) {
      const diff = el.value.length - clean.length;
      el.value = clean;
      el.selectionStart = el.selectionEnd = Math.max(0, cursor - diff);
    }
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

  function nfxDoClear() {
    ['nfx-name','nfx-body','nfx-foot','nfx-hval'].forEach(id=>{ const el=document.getElementById(id); if(el){ el.value=''; el.style.borderColor=''; } });
    buttons=[]; varExamples={}; varType='none';
    renderBtns();
    window.nfxSetVarType('none');
    window.nfxHdr('none', document.querySelector('.nfx-tt'));
    ['nfx-var-warn','nfx-var-pos-err','nfx-name-err'].forEach(id=>{ const el=document.getElementById(id); if(el) el.style.display='none'; });
    nfxExitEditMode();
    updatePreview();
  }

  function nfxExitEditMode() {
    window._nfxEditMode = { active:false, templateId:null, name:null, originalHeader:null };
    const nameEl = document.getElementById('nfx-name');
    if (nameEl) { nameEl.readOnly = false; nameEl.style.background = ''; nameEl.style.cursor = ''; }
    const catEl = document.getElementById('nfx-cat');
    if (catEl) catEl.disabled = false;
    const hval = document.getElementById('nfx-hval');
    if (hval) hval.readOnly = false;
    const editNote = document.getElementById('nfx-edit-media-note');
    if (editNote) editNote.style.display = 'none';
    const banner = document.getElementById('nfx-edit-banner');
    if (banner) banner.style.display = 'none';
    const submitBtn = document.getElementById('nfx-submit-btn');
    if (submitBtn) submitBtn.innerHTML = '<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" stroke-linecap="round" stroke-linejoin="round"/></svg> Enviar para Meta';
  }

  window.nfxCancelEdit = function() {
    nfxShowModal({
      title: 'Cancelar edição',
      message: 'Deseja descartar as alterações e sair do modo de edição?',
      confirmLabel: 'Sim, cancelar',
      cancelLabel: 'Não',
      type: 'confirm',
      onConfirm: nfxDoClear
    });
  };

  window.nfxStartEdit = function() {
    if (_selectedTemplates.length !== 1) return;
    const name = _selectedTemplates[0];
    const t = _loadedTemplates.find(x => x.name === name);
    if (!t) { alert('Template não encontrado. Clique em "Atualizar" e tente novamente.'); return; }

    nfxCancelSel();
    nfxView('create');

    const comps     = t.components || [];
    const headerComp = comps.find(c => c.type === 'HEADER') || null;
    const bodyComp   = comps.find(c => c.type === 'BODY');
    const footComp   = comps.find(c => c.type === 'FOOTER');
    const btnsComp   = comps.find(c => c.type === 'BUTTONS');

    // Nome — travado
    const nameEl = document.getElementById('nfx-name');
    nameEl.value = t.name;
    nameEl.readOnly = true;
    nameEl.style.background = 'var(--sf3)';
    nameEl.style.cursor = 'not-allowed';
    const nameErr = document.getElementById('nfx-name-err');
    if (nameErr) nameErr.style.display = 'none';

    // Categoria — travada
    const catEl = document.getElementById('nfx-cat');
    catEl.value = t.category;
    catEl.disabled = true;

    // Idioma
    const langEl = document.getElementById('nfx-lang');
    if (langEl) langEl.value = t.language || 'pt_BR';

    // Cabeçalho — tipo livre para edição (Meta aceita trocar o tipo de cabeçalho)
    document.querySelectorAll('.nfx-tt').forEach(el => el.classList.remove('active'));
    window._nfxSelectedFile = null;
    window._nfxMediaHandle = null;
    if (headerComp) {
      const fmt = (headerComp.format || 'TEXT').toLowerCase();
      headerType = fmt;
      const tabEl = [...document.querySelectorAll('.nfx-tt')].find(el => el.getAttribute('onclick')?.includes(`nfxHdr('${fmt}'`));
      if (tabEl) tabEl.classList.add('active');
      if (fmt === 'text') {
        document.getElementById('nfx-htxt').style.display = 'block';
        document.getElementById('nfx-hmedia').style.display = 'none';
        const hval = document.getElementById('nfx-hval');
        hval.value = headerComp.text || '';
        hval.readOnly = false;
      } else {
        document.getElementById('nfx-htxt').style.display = 'none';
        document.getElementById('nfx-hmedia').style.display = 'flex';
      }
    } else {
      headerType = 'none';
      const noneTab = document.querySelector('.nfx-tt');
      if (noneTab) noneTab.classList.add('active');
      document.getElementById('nfx-htxt').style.display = 'none';
      document.getElementById('nfx-hmedia').style.display = 'none';
    }

    window._nfxEditMode = { active:true, templateId: t.id, name: t.name, originalHeader: headerComp };
    nfxUpdateEditMediaNote();

    // Corpo
    const bodyEl = document.getElementById('nfx-body');
    bodyEl.value = bodyComp?.text || '';
    varExamples = {};
    const vars = [...new Set((bodyEl.value.match(/\{\{\d+\}\}/g)||[]))];
    if (bodyComp?.example?.body_text?.[0]) {
      vars.forEach((v,i) => { varExamples[v] = bodyComp.example.body_text[0][i] || ''; });
    }
    varType = vars.length ? 'number' : 'none';
    window.nfxSetVarType(varType);
    nfxBodyChg(bodyEl);

    // Rodapé
    const footEl = document.getElementById('nfx-foot');
    footEl.value = footComp?.text || '';

    // Botões
    buttons = (btnsComp?.buttons || []).map(b => ({ type: b.type, label: b.text, url: b.url || '' }));
    renderBtns();

    // Banner + botão de envio
    const banner = document.getElementById('nfx-edit-banner');
    if (banner) banner.style.display = 'flex';
    const editNameEl = document.getElementById('nfx-edit-name');
    if (editNameEl) editNameEl.textContent = t.name;
    const submitBtn = document.getElementById('nfx-submit-btn');
    if (submitBtn) submitBtn.innerHTML = '<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" stroke-linecap="round" stroke-linejoin="round"/></svg> Salvar alterações';

    updatePreview();
  };

  function buildEditComps() {
    const body = document.getElementById('nfx-body').value;
    const foot = document.getElementById('nfx-foot')?.value||'';
    const comps=[];

    if (headerType === 'text') {
      const hdr = document.getElementById('nfx-hval')?.value||'';
      if (hdr) comps.push({type:'HEADER', format:'TEXT', text:hdr});
    } else if (['image','video','document'].includes(headerType)) {
      // Se não há arquivo novo selecionado, mantemos o cabeçalho de mídia original
      // (só entra aqui quando o tipo bate com o original — validado antes do envio).
      // Quando há arquivo novo, o header é resolvido no N8N via upload + handle,
      // então não adicionamos nada aqui.
      if (!window._nfxSelectedFile) {
        const orig = window._nfxEditMode?.originalHeader;
        if (orig && (orig.format||'').toLowerCase() === headerType) {
          comps.push(orig);
        }
      }
    }
    // headerType 'none' -> sem header

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

  function nfxShowModal({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel, type }) {
    const existing = document.getElementById('nfx-custom-modal-ov');
    if (existing) existing.remove();
    const tc_ = () => document.getElementById('nfx-modal')?.classList.contains('dark') ? 'dark' : 'light';
    const iconMap = {
      success: '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#25d366" stroke-width="2.5"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      confirm: '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--amb)" stroke-width="2.5"><path d="M12 9v4M12 17h.01" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="10"/></svg>',
      error:   '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--red)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };
    const bgMap = { success: 'rgba(37,211,102,.1)', confirm: 'rgba(245,166,35,.1)', error: 'rgba(229,57,53,.1)' };
    const ov = document.createElement('div');
    ov.id = 'nfx-custom-modal-ov';
    ov.style.cssText = 'display:flex;position:fixed;inset:0;z-index:200000;background:rgba(0,0,0,.65);align-items:center;justify-content:center';
    ov.innerHTML = `
      <div class="${tc_()}" style="width:380px;max-width:94vw;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--sf,#fff);color:var(--tx,#1a1a2e);--bd:#e2e5ea;--sf:#fff;--sf2:#f0f2f5;--tx:#1a1a2e;--tx2:#5a6170;--ac:#25d366;--adim:rgba(37,211,102,.1);--agl:rgba(37,211,102,.3);--red:#e53935;--amb:#f5a623;">
        <div style="padding:20px 20px 8px;display:flex;align-items:center;gap:12px">
          <div style="width:40px;height:40px;border-radius:50%;background:${bgMap[type||'success']};display:flex;align-items:center;justify-content:center;flex-shrink:0">${iconMap[type||'success']}</div>
          <div style="font-size:14px;font-weight:600">${title}</div>
        </div>
        <div style="padding:4px 20px 16px;font-size:12px;color:var(--tx2,#5a6170);line-height:1.6">${message}</div>
        <div style="padding:12px 20px;border-top:1px solid var(--bd,#e2e5ea);display:flex;gap:8px;justify-content:flex-end">
          ${cancelLabel ? `<button id="nfx-cm-cancel" style="padding:7px 14px;border-radius:7px;border:1px solid var(--bd,#e2e5ea);background:transparent;color:var(--tx2,#5a6170);font-size:12px;cursor:pointer;font-family:inherit">${cancelLabel}</button>` : ''}
          <button id="nfx-cm-confirm" style="padding:7px 16px;border-radius:7px;border:none;background:var(--ac,#25d366);color:#000;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">${confirmLabel||'OK'}</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    document.getElementById('nfx-cm-confirm').onclick = () => { ov.remove(); onConfirm && onConfirm(); };
    const cancelBtn = document.getElementById('nfx-cm-cancel');
    if (cancelBtn) cancelBtn.onclick = () => { ov.remove(); onCancel && onCancel(); };
  }

  window.nfxClear = function() {
    nfxShowModal({
      title: 'Limpar formulário',
      message: 'Deseja limpar todos os campos? Os dados preenchidos serão perdidos.',
      confirmLabel: 'Sim, limpar',
      cancelLabel: 'Não',
      type: 'confirm',
      onConfirm: nfxDoClear
    });
  };

  window.nfxSubmit = async function() {
    const cfg = getConfig();
    if (!tenantId) {
      nfxMostrarWabas();
      const sec = document.getElementById('nfx-sec-waba');
      if (sec) {
        sec.style.border = '1.5px solid var(--red)';
        let aviso = document.getElementById('nfx-waba-aviso');
        if (!aviso) {
          aviso = document.createElement('div');
          aviso.id = 'nfx-waba-aviso';
          aviso.style.cssText = 'font-size:11px;color:var(--red);margin-top:6px;padding:0 4px';
          sec.appendChild(aviso);
        }
        aviso.textContent = '⚠ Selecione uma WABA para continuar';
        setTimeout(() => { sec.style.border = '1px solid var(--bd)'; if (aviso) aviso.textContent = ''; }, 2500);
      }
      return;
    }
    const editMode = !!window._nfxEditMode?.active;
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

    if (editMode && ['image','video','document'].includes(headerType)) {
      const orig = window._nfxEditMode.originalHeader;
      const keepingOriginal = orig && (orig.format||'').toLowerCase() === headerType && !window._nfxSelectedFile;
      if (!keepingOriginal && !window._nfxSelectedFile) {
        alert('Selecione um arquivo para o novo cabeçalho de mídia (ou volte ao cabeçalho original).');
        return;
      }
    }

    const btn = document.getElementById('nfx-submit-btn');
    btn.disabled = true;
    btn.innerHTML = editMode ? `<span class="nfx-spin"></span> Salvando...` : `<span class="nfx-spin"></span> Enviando...`;

    try {
      let result;

      if (editMode) {
        const payload = {
          template_id: window._nfxEditMode.templateId,
          headerType,
          components: buildEditComps()
        };

        if (['image','video','document'].includes(headerType) && window._nfxSelectedFile) {
          btn.innerHTML = `<span class="nfx-spin"></span> Enviando mídia...`;
          result = await n8nRequest('edit_template', payload, window._nfxSelectedFile);
        } else {
          result = await n8nRequest('edit_template', payload);
        }

        nfxShowModal({
          title: 'Alterações salvas!',
          message: `<strong>${name}</strong> foi atualizado. A Meta pode levar alguns minutos para reprocessar a aprovação do template.`,
          confirmLabel: 'OK',
          type: 'success',
          onConfirm: () => { nfxDoClear(); nfxView('list'); }
        });
      } else {
        const payload = {
          name,
          language: document.getElementById('nfx-lang')?.value || 'pt_BR',
          category: document.getElementById('nfx-cat').value,
          headerType,
          components: buildComps(),
          buttons,
          varExamples
        };

        if (['image','video','document'].includes(headerType) && window._nfxSelectedFile) {
          btn.innerHTML = `<span class="nfx-spin"></span> Enviando mídia...`;
          result = await n8nRequest('create_template', payload, window._nfxSelectedFile);
        } else {
          result = await n8nRequest('create_template', payload);
        }

        const tplId = result.template_id || result.id || '-';
        const tplStatus = result.status || 'PENDING';
        nfxShowModal({
          title: 'Template enviado!',
          message: `<strong>${name}</strong> foi enviado para aprovação da Meta.<br><br><span style="font-size:11px;color:var(--tx3,#9aa0ad)">ID: ${tplId} &nbsp;•&nbsp; Status: ${tplStatus}</span>`,
          confirmLabel: 'OK',
          type: 'success',
          onConfirm: () => {
            nfxShowModal({
              title: 'Limpar formulário?',
              message: 'Deseja limpar os campos para criar um novo template?',
              confirmLabel: 'Sim, limpar',
              cancelLabel: 'Não',
              type: 'confirm',
              onConfirm: nfxDoClear
            });
          }
        });
      }
    } catch(e) {
      alert(`✗ Erro ao ${editMode ? 'salvar' : 'enviar'}: ${e.message}`);
    } finally {
      btn.disabled = false;
      const stillEditing = !!window._nfxEditMode?.active;
      btn.innerHTML = stillEditing
        ? `<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" stroke-linecap="round" stroke-linejoin="round"/></svg> Salvar alterações`
        : `<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" stroke-linecap="round" stroke-linejoin="round"/></svg> Enviar para Meta`;
    }
  };

  window.nfxSyncTemplates = async function() {
    const btn = document.getElementById('nfx-sync-btn');
    if (btn) { btn.disabled=true; btn.innerHTML='<span class="nfx-spin" style="border-top-color:var(--tx2)"></span> Sincronizando...'; }

    try {
      // Pega credenciais da sessão do Chatwoot
      const raw = document.cookie.match(/(^|;\s*)cw_d_session_info=([^;]+)/);
      if (!raw) throw new Error('Sessão do Chatwoot não encontrada.');
      const session = JSON.parse(decodeURIComponent(raw[2]));
      const headers = {
        'access-token': session['access-token'],
        'client':       session['client'],
        'uid':          session['uid'],
        'token-type':   session['token-type']
      };

      const accountId = location.pathname.match(/accounts\/(\d+)/)?.[1];
      if (!accountId) throw new Error('ID da conta não encontrado.');

      // Busca todos os inboxes da conta
      const inboxResp = await fetch(`/api/v1/accounts/${accountId}/inboxes`, { headers });
      if (!inboxResp.ok) throw new Error(`Erro ao buscar inboxes: ${inboxResp.status}`);
      const inboxData = await inboxResp.json();
      const whatsappInboxes = (inboxData.payload || []).filter(i =>
        i.channel_type === 'Channel::Whatsapp'
      );

      if (!whatsappInboxes.length) throw new Error('Nenhum inbox WhatsApp encontrado.');

      // Sincroniza cada inbox
      let synced = 0;
      for (const inbox of whatsappInboxes) {
        const syncResp = await fetch(
          `/api/v1/accounts/${accountId}/inboxes/${inbox.id}/sync_templates`,
          { method: 'POST', headers }
        );
        if (syncResp.ok) synced++;
      }

      // Mostra resultado
      const msg = synced === 1
        ? '✓ Templates sincronizados com sucesso!'
        : `✓ ${synced} inboxes sincronizados com sucesso!`;

      if (btn) { btn.disabled=false; btn.innerHTML='<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" stroke-linecap="round" stroke-linejoin="round"/></svg> Sincronizar modelos'; }

      // Mostra feedback temporário
      const info = document.getElementById('nfx-sync-feedback');
      if (info) {
        info.style.color = 'var(--ac)';
        info.textContent = msg;
        info.style.display = 'block';
        clearTimeout(window._nfxSyncFeedbackTimer);
        window._nfxSyncFeedbackTimer = setTimeout(() => { info.style.display = 'none'; }, 4000);
      }

    } catch(e) {
      alert(`✗ Erro ao sincronizar: ${e.message}`);
      if (btn) { btn.disabled=false; btn.innerHTML='<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" stroke-linecap="round" stroke-linejoin="round"/></svg> Sincronizar modelos'; }
    }
  };

  window.nfxLoad = async function() {
    const cfg = getConfig();
    const container = document.getElementById('nfx-tlist');
    const btn = document.getElementById('nfx-refresh-btn');
    if (!cfg.webhookUrl || !cfg.tenantKey) { container.innerHTML='<div class="nfx-ld">Configure o webhook do n8n primeiro.</div>'; return; }
    container.innerHTML='<div class="nfx-ld">Carregando templates...</div>';
    nfxCancelSel();
    if (btn) { btn.disabled=true; btn.innerHTML='<span class="nfx-spin" style="border-top-color:var(--tx2)"></span> Atualizando...'; }
    try {
      const d = await n8nRequest('list_templates', {});
      const tpls = d.data || d.templates || [];
      _loadedTemplates = tpls;
      const searchEl = document.getElementById('nfx-search');
      if (searchEl) searchEl.value = '';
      const lb = document.getElementById('nfx-lb');
      if (lb) lb.textContent = tpls.length;
      nfxRenderTemplateList(tpls);
    } catch(e) {
      container.innerHTML=`<div class="nfx-ld" style="color:var(--red)">Erro: ${esc(e.message)}</div>`;
    } finally {
      if (btn) { btn.disabled=false; btn.innerHTML='<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" stroke-linecap="round" stroke-linejoin="round"/></svg> Atualizar'; }
    }
  };

  function nfxRenderTemplateList(tpls) {
    const container = document.getElementById('nfx-tlist');
    if (!container) return;
    container.innerHTML = tpls.length ? tpls.map(tplCard).join('') : '<div class="nfx-ld">Nenhum template encontrado.</div>';
  }

  window.nfxFilterTemplates = function(query) {
    const q = (query||'').trim().toLowerCase();
    const filtered = q ? _loadedTemplates.filter(t => (t.name||'').toLowerCase().includes(q)) : _loadedTemplates;
    nfxCancelSel();
    if (!filtered.length) {
      document.getElementById('nfx-tlist').innerHTML = q
        ? `<div class="nfx-ld">Nenhum template encontrado com "${esc(query)}".</div>`
        : '<div class="nfx-ld">Nenhum template encontrado.</div>';
      return;
    }
    nfxRenderTemplateList(filtered);
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
    result = result.replace(/\*(.+?)\*/g,'<b>$1</b>').replace(/\_(.+?)\_/g,'<em>$1</em>').replace(/\n/g,'<br>');
    pb.innerHTML = result;
  }

  function updatePreview() {
    const hdr     = document.getElementById('nfx-hval')?.value||'';
    const body    = document.getElementById('nfx-body')?.value||'';
    const foot    = document.getElementById('nfx-foot')?.value||'';
    const ph2     = document.getElementById('nfx-ph2');
    const phmedia = document.getElementById('nfx-phmedia');
    const pf      = document.getElementById('nfx-pf');
    const pbtns   = document.getElementById('nfx-pbtns');
    const vbox    = document.getElementById('nfx-vbox');
    const vlist   = document.getElementById('nfx-vlist');

    if (ph2) {
      if (headerType==='text' && hdr) {
        ph2.style.display='block';
        ph2.textContent = hdr;
      } else {
        ph2.style.display='none';
      }
    }

    if (phmedia) {
      if (['image','video','document'].includes(headerType)) {
        phmedia.style.display='block';
        if (!phmedia.querySelector('img')) {
          const icoMap = {image:SVG_IMG, video:SVG_VIDEO, document:SVG_DOC};
          phmedia.innerHTML = `<div class="nfx-whm-ph">${icoMap[headerType]||SVG_IMG}</div>`;
        }
      } else {
        phmedia.style.display='none';
        phmedia.innerHTML='';
      }
    }

    renderPreviewBody();
    if (pf) { pf.style.display=foot?'block':'none'; pf.textContent=foot; }
    if (pbtns) {
      const icoMap = {URL:SVG_LINK, QUICK_REPLY:SVG_REPLY};
      pbtns.innerHTML=buttons.map(b=>`<button class="nfx-wb">${icoMap[b.type]||SVG_REPLY}${esc(b.label)}</button>`).join('');
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

  let _selectedTemplates = [];

  window.nfxToggleSelect = function(name, cb) {
    const card = document.getElementById('nfx-card-'+name);
    if (cb.checked) {
      if (!_selectedTemplates.includes(name)) _selectedTemplates.push(name);
      if (card) card.classList.add('selected');
    } else {
      _selectedTemplates = _selectedTemplates.filter(n => n !== name);
      if (card) card.classList.remove('selected');
    }
    const bar = document.getElementById('nfx-del-bar');
    const info = document.getElementById('nfx-del-info');
    const editBtn = document.getElementById('nfx-edit-sel-btn');
    if (bar) bar.classList.toggle('visible', _selectedTemplates.length > 0);
    if (info) info.textContent = `${_selectedTemplates.length} selecionado(s)`;
    if (editBtn) editBtn.style.display = _selectedTemplates.length === 1 ? 'inline-flex' : 'none';
  };

  window.nfxCancelSel = function() {
    _selectedTemplates = [];
    document.querySelectorAll('.nfx-tc-cb').forEach(cb => cb.checked = false);
    document.querySelectorAll('.nfx-tc').forEach(c => c.classList.remove('selected'));
    const bar = document.getElementById('nfx-del-bar');
    if (bar) bar.classList.remove('visible');
    const editBtn = document.getElementById('nfx-edit-sel-btn');
    if (editBtn) editBtn.style.display = 'none';
  };

  window.nfxConfirmDelete = function() {
    if (!_selectedTemplates.length) return;
    const sub = document.getElementById('nfx-del-m-sub');
    if (sub) sub.textContent = `${_selectedTemplates.length} template(s) serão excluídos`;
    const ov = document.getElementById('nfx-del-ov');
    const m  = document.getElementById('nfx-del-m');
    if (ov) ov.classList.add('open');
    if (m)  { m.classList.remove('dark','light'); m.classList.add(tc()); }
  };

  window.nfxCancelDelete = function() {
    document.getElementById('nfx-del-ov').classList.remove('open');
  };

  window.nfxExecuteDelete = async function() {
    const cfg = getConfig();
    const btn = document.getElementById('nfx-del-confirm-btn');
    if (btn) { btn.disabled=true; btn.innerHTML='<span class="nfx-spin" style="border-top-color:#fff"></span> Excluindo...'; }
    try {
      const res = await fetch(cfg.webhookUrl, {
        method: 'POST',
        headers: buildN8NHeaders({ 'Content-Type':'application/json' }),
        body: JSON.stringify({
          action: 'delete_template',
          tenant_key: cfg.tenantKey,
          tenant_id: tenantId,
          payload: { names: [..._selectedTemplates] }
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || data.message || `HTTP ${res.status}`);
      document.getElementById('nfx-del-ov').classList.remove('open');
      nfxCancelSel();
      nfxLoad();
    } catch(e) {
      alert(`✗ Erro ao excluir: ${e.message}`);
    } finally {
      if (btn) { btn.disabled=false; btn.innerHTML='<svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke-linecap="round" stroke-linejoin="round"/></svg> Confirmar exclusão'; }
    }
  };

  function tplCard(t) {
    const sm={APPROVED:'Aprovado',PENDING:'Pendente',REJECTED:'Rejeitado',PAUSED:'Pausado'};
    const sc={APPROVED:'AP',PENDING:'PE',REJECTED:'RE',PAUSED:'PA'};
    const comps = t.components||[];
    const hc=comps.find(c=>c.type==='HEADER');
    const bc=comps.find(c=>c.type==='BODY');
    const fc=comps.find(c=>c.type==='FOOTER');
    const btc=comps.find(c=>c.type==='BUTTONS');
    const prev=bc?esc(bc.text).substring(0,80)+(bc.text.length>80?'...':''):'—';

    const tipParts = [];
    if (hc) tipParts.push(hc.format === 'TEXT' ? `[Cabeçalho] ${hc.text}` : `[Cabeçalho: ${hc.format}]`);
    if (bc) tipParts.push(bc.text);
    if (fc) tipParts.push(`[Rodapé] ${fc.text}`);
    if (btc && btc.buttons?.length) {
      const btnLines = btc.buttons.map(b => `• ${b.text}${b.type==='URL' && b.url ? ` (${b.url})` : ''}`);
      tipParts.push(`[Botões]\n${btnLines.join('\n')}`);
    }
    const fullTip = tipParts.join('\n\n');

    const reason=t.rejected_reason&&t.rejected_reason!=='NONE'?`<div class="nfx-rr">✗ Motivo: ${esc(t.rejected_reason)}</div>`:'';
    const safeName = esc(t.name).replace(/'/g,"\\'");
    return `<div class="nfx-tc" id="nfx-card-${esc(t.name)}">
      <input type="checkbox" class="nfx-tc-cb" onclick="nfxToggleSelect('${safeName}',this)"/>
      <div class="nfx-ti">
        <div class="nfx-tn">${esc(t.name)}</div>
        <div class="nfx-tm">${esc(t.category)} • ${esc(t.language)}</div>
        <div class="nfx-tm" style="margin-top:3px;font-size:10px" title="${esc(fullTip)}">${prev}</div>
        ${reason}
      </div>
      <button class="nfx-tc-eye" title="Preview" onclick="event.stopPropagation();nfxShowTplPreview('${safeName}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>
      <span class="nfx-sb2 nfx-${sc[t.status]||'PA'}">${sm[t.status]||t.status}</span>
    </div>`;
  }

  function renderPhonePreviewHTML(comps) {
    const hc  = (comps||[]).find(c=>c.type==='HEADER');
    const bc  = (comps||[]).find(c=>c.type==='BODY');
    const fc  = (comps||[]).find(c=>c.type==='FOOTER');
    const btc = (comps||[]).find(c=>c.type==='BUTTONS');

    let mediaHtml = '';
    if (hc && hc.format && hc.format !== 'TEXT') {
      const icoMap = {IMAGE:SVG_IMG, VIDEO:SVG_VIDEO, DOCUMENT:SVG_DOC};
      mediaHtml = `<div class="nfx-whm"><div class="nfx-whm-ph">${icoMap[hc.format]||SVG_IMG}</div></div>`;
    }
    const headerTextHtml = (hc && hc.format === 'TEXT') ? `<div class="nfx-wht">${esc(hc.text||'')}</div>` : '';

    let bodyHtml = '—';
    if (bc && bc.text) {
      bodyHtml = esc(bc.text)
        .replace(/\*(.+?)\*/g,'<b>$1</b>')
        .replace(/\_(.+?)\_/g,'<em>$1</em>')
        .replace(/\n/g,'<br>');
    }
    const footHtml = fc && fc.text ? `<div class="nfx-wft">${esc(fc.text)}</div>` : '';

    let btnsHtml = '';
    if (btc && btc.buttons?.length) {
      const icoMap = {URL:SVG_LINK, QUICK_REPLY:SVG_REPLY};
      btnsHtml = btc.buttons.map(b=>`<button class="nfx-wb">${icoMap[b.type]||SVG_REPLY}${esc(b.text)}</button>`).join('');
    }

    return `<div class="nfx-phone">
      <div class="nfx-pbar"><div><div class="nfx-pbar-title">Prévia do modelo</div><div class="nfx-pbar-sub">WhatsApp Business</div></div></div>
      <div class="nfx-pchat">
        <div class="nfx-bub">
          ${mediaHtml}
          <div class="nfx-btxt">
            ${headerTextHtml}
            <div class="nfx-wt">${bodyHtml}</div>
            ${footHtml}
            <div class="nfx-wfr"><span>agora</span><svg width="14" height="10" viewBox="0 0 14 10" fill="#53bdeb"><path d="M1 5l3 3 5-7M6 8l2-2 3-3"/></svg></div>
          </div>
          <div>${btnsHtml}</div>
        </div>
      </div>
    </div>`;
  }

  window.nfxShowTplPreview = function(name) {
    const t = _loadedTemplates.find(x => x.name === name);
    if (!t) return;
    const body = document.getElementById('nfx-tplprev-body');
    if (body) body.innerHTML = renderPhonePreviewHTML(t.components || []);
    const ov = document.getElementById('nfx-tplprev-ov');
    if (ov) ov.classList.add('open');
  };

  window.nfxCloseTplPreview = function() {
    const ov = document.getElementById('nfx-tplprev-ov');
    if (ov) ov.classList.remove('open');
  };

  // Init
  const s=document.getElementById('nfx-stxt');
  if (s) s.textContent='Sincronizado';
  const vt=document.getElementById('nfx-version-tag');
  if (vt) vt.textContent=VERSION;
  const obs=new MutationObserver(applyTheme);
  obs.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  obs.observe(document.body,{attributes:true,attributeFilter:['class']});

})();
