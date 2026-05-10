function renderHomepage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Veltrix Faucet</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
    <style>
      :root { color-scheme: dark; --bg:#07110c; --panel:rgba(17,28,21,.9); --panel2:rgba(26,39,31,.96); --border:rgba(162,241,108,.18); --text:#edf7ee; --muted:#98ad9a; --accent:#a2f16c; --accent2:#7ee336; --danger:#ff8f8f; --shadow:0 24px 80px rgba(0,0,0,.38);} *{box-sizing:border-box} body{margin:0;min-height:100vh;font-family:"Space Grotesk",system-ui,sans-serif;color:var(--text);background:radial-gradient(circle at top left, rgba(126,227,54,.18), transparent 30%),radial-gradient(circle at bottom right, rgba(37,101,59,.3), transparent 32%),linear-gradient(160deg,#050806,#0a120e 42%,#040705)} .shell{max-width:960px;margin:0 auto;padding:40px 20px 80px}.hero{margin-bottom:28px}.eyebrow,.label{font-family:"IBM Plex Mono",monospace;color:var(--accent);letter-spacing:.08em;text-transform:uppercase;font-size:12px}.hero h1{margin:12px 0;font-size:clamp(32px,6vw,58px);line-height:.98}.copy{max-width:680px;color:var(--muted);font-size:17px;line-height:1.6}.panel{background:var(--panel);border:1px solid var(--border);border-radius:24px;padding:24px;box-shadow:var(--shadow);backdrop-filter:blur(18px)} .panel-primary{background:linear-gradient(180deg, rgba(22,35,27,.98), var(--panel2));margin-bottom:22px}.panel-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px}.panel-head h2{margin:8px 0 0;font-size:24px}.claim-form{display:grid;gap:18px}.field{display:grid;gap:10px}.field span{color:var(--muted);font-size:14px} input{width:100%;border-radius:16px;border:1px solid rgba(255,255,255,.08);background:rgba(6,11,8,.9);color:var(--text);padding:15px 16px;font:inherit} input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 4px rgba(162,241,108,.12)} button{border:0;cursor:pointer;font:inherit;border-radius:16px;transition:transform .18s ease,opacity .18s ease,background .18s ease} .primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#041006;font-weight:700;padding:15px 18px}.ghost{background:rgba(255,255,255,.04);color:var(--text);padding:12px 15px;border:1px solid rgba(255,255,255,.08)} button:hover{transform:translateY(-1px)} button:disabled{cursor:not-allowed;opacity:.45;transform:none}.turnstile-wrap{min-height:70px;display:flex;align-items:center}.message{min-height:24px;color:var(--muted);font-size:14px}.message.error{color:var(--danger)}.message.success{color:var(--accent)} .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}.meta{display:grid;grid-template-columns:minmax(120px,180px) 1fr;gap:10px 16px;margin:16px 0 0}.meta dt{color:var(--muted);font-size:14px}.meta dd{margin:0;word-break:break-word;font-family:"IBM Plex Mono",monospace;font-size:14px}@media (max-width:760px){.grid{grid-template-columns:1fr}.panel-head{align-items:flex-start;flex-direction:column}}
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <div class="eyebrow">Veltrix Public Faucet</div>
        <h1>Claim a small amount of VEL for gas.</h1>
        <p class="copy">One faucet claim is protected by Cloudflare Turnstile and the faucet cooldown. Use this only for testnet gas.</p>
      </section>
      <section class="panel panel-primary">
        <div class="panel-head">
          <div><div class="label">Claim</div><h2>Request testnet VEL</h2></div>
          <button id="refresh" class="ghost" type="button">Refresh</button>
        </div>
        <form id="claim-form" class="claim-form">
          <label class="field"><span>Recipient address</span><input id="address" type="text" placeholder="0x..." autocomplete="off" required /></label>
          <div id="turnstile-wrap" class="turnstile-wrap"></div>
          <button id="submit" class="primary" type="submit">Claim faucet drip</button>
        </form>
        <div id="message" class="message" aria-live="polite"></div>
      </section>
      <section class="grid">
        <article class="panel"><div class="label">Network</div><dl id="network-meta" class="meta"></dl></article>
        <article class="panel"><div class="label">Faucet</div><dl id="faucet-meta" class="meta"></dl></article>
      </section>
    </main>
    <script>
      const state = { health: null, config: null, turnstileToken: "", widgetId: null };
      const els = {
        address: document.getElementById("address"),
        message: document.getElementById("message"),
        form: document.getElementById("claim-form"),
        submit: document.getElementById("submit"),
        refresh: document.getElementById("refresh"),
        turnstileWrap: document.getElementById("turnstile-wrap"),
        networkMeta: document.getElementById("network-meta"),
        faucetMeta: document.getElementById("faucet-meta"),
      };
      function setMessage(text, tone = "") { els.message.textContent = text; els.message.className = 'message' + (tone ? ' ' + tone : ''); }
      function renderMeta(target, rows) { target.innerHTML = rows.map(([k,v]) => '<dt>' + k + '</dt><dd>' + v + '</dd>').join(''); }
      function updateCards() {
        if (!state.health || !state.config) return;
        renderMeta(els.networkMeta, [["Chain ID", state.health.chainId],["Expected", state.health.chainIdExpected],["Symbol", state.health.nativeSymbol],["Cooldown", state.health.cooldownSeconds + 's']]);
        renderMeta(els.faucetMeta, [["Faucet address", state.health.faucetAddress],["Balance", state.health.balanceFormatted + ' ' + state.health.nativeSymbol],["Drip", state.config.faucetAmountFormatted + ' ' + state.health.nativeSymbol],["Captcha", state.health.turnstileConfigured ? 'Configured' : 'Missing keys']]);
      }
      function ensureTurnstileReady() {
        return new Promise((resolve, reject) => {
          const startedAt = Date.now();
          const tick = () => {
            if (window.turnstile) return resolve(window.turnstile);
            if (Date.now() - startedAt > 10000) return reject(new Error('Turnstile script did not load in time'));
            setTimeout(tick, 100);
          };
          tick();
        });
      }
      async function renderTurnstile() {
        state.turnstileToken = '';
        state.widgetId = null;
        els.turnstileWrap.innerHTML = '';
        if (!state.config.turnstileConfigured || !state.config.turnstileSiteKey) {
          setMessage('Turnstile keys are not configured in Vercel yet.', 'error');
          els.submit.disabled = true;
          return;
        }
        try {
          const turnstile = await ensureTurnstileReady();
          state.widgetId = turnstile.render(els.turnstileWrap, {
            sitekey: state.config.turnstileSiteKey,
            theme: 'dark',
            retry: 'never',
            callback(token) {
              state.turnstileToken = token;
              setMessage('Challenge complete. You can claim now.', 'success');
            },
            'expired-callback'() {
              state.turnstileToken = '';
              setMessage('Challenge expired. Please retry it.', 'error');
            },
            'timeout-callback'() {
              state.turnstileToken = '';
              setMessage('Turnstile timed out. Retry the challenge.', 'error');
            },
            'error-callback'(errorCode) {
              state.turnstileToken = '';
              setMessage('Turnstile failed to load. Error code: ' + errorCode, 'error');
              return false;
            },
          });
          els.submit.disabled = false;
          setMessage('Complete the Turnstile challenge to enable claiming.');
        } catch (error) {
          setMessage(error.message, 'error');
          els.submit.disabled = true;
        }
      }
      async function refreshStatus() {
        els.refresh.disabled = true;
        try {
          const [healthRes, configRes] = await Promise.all([fetch('/api/health'), fetch('/api/turnstile-config')]);
          state.health = await healthRes.json();
          state.config = await configRes.json();
          updateCards();
          await renderTurnstile();
        } catch (error) {
          setMessage('Failed to load faucet status: ' + error.message, 'error');
        } finally {
          els.refresh.disabled = false;
        }
      }
      els.refresh.addEventListener('click', refreshStatus);
      els.form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!state.turnstileToken) { setMessage('Complete the Turnstile challenge before claiming.', 'error'); return; }
        els.submit.disabled = true;
        setMessage('Submitting claim...');
        try {
          const response = await fetch('/api/faucet', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: els.address.value.trim(), turnstileToken: state.turnstileToken }) });
          const payload = await response.json();
          if (!response.ok || !payload.ok) throw new Error(payload.error || 'Claim failed');
          setMessage('Sent ' + payload.amountFormatted + ' ' + payload.nativeSymbol + '. Tx: ' + payload.txHash, 'success');
          els.form.reset();
          state.turnstileToken = '';
          if (window.turnstile && state.widgetId !== null) window.turnstile.reset(state.widgetId);
          await refreshStatus();
        } catch (error) {
          setMessage(error.message, 'error');
          els.submit.disabled = false;
        }
      });
      refreshStatus();
    </script>
  </body>
</html>`;
}

module.exports = {
  renderHomepage,
};
