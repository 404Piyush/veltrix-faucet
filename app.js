const state = {
  health: null,
  config: null,
  turnstileToken: "",
  widgetId: null,
};

const els = {
  address: document.getElementById("address"),
  message: document.getElementById("message"),
  form: document.getElementById("claim-form"),
  submit: document.getElementById("submit-button"),
  refresh: document.getElementById("refresh-status"),
  turnstileWrap: document.getElementById("turnstile-wrap"),
  networkMeta: document.getElementById("network-meta"),
  faucetMeta: document.getElementById("faucet-meta"),
};

function setMessage(text, tone = "neutral") {
  els.message.textContent = text;
  els.message.className = `message${tone === "neutral" ? "" : ` message--${tone}`}`;
}

function renderMeta(target, rows) {
  target.innerHTML = rows.map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join("");
}

function updateStatusCards() {
  if (!state.health || !state.config) return;
  renderMeta(els.networkMeta, [
    ["Chain ID", state.health.chainId],
    ["Expected", state.health.chainIdExpected],
    ["Symbol", state.health.nativeSymbol],
    ["Cooldown", `${state.health.cooldownSeconds}s`],
  ]);

  renderMeta(els.faucetMeta, [
    ["Faucet address", state.health.faucetAddress],
    ["Balance", `${state.health.balanceFormatted} ${state.health.nativeSymbol}`],
    ["Drip", `${state.config.faucetAmountFormatted} ${state.health.nativeSymbol}`],
    ["Captcha", state.health.turnstileConfigured ? "Configured" : "Missing keys"],
  ]);
}

function ensureTurnstileReady() {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const tick = () => {
      if (window.turnstile) {
        resolve(window.turnstile);
        return;
      }
      if (Date.now() - startedAt > 10000) {
        reject(new Error("Turnstile script did not load in time"));
        return;
      }
      window.setTimeout(tick, 100);
    };
    tick();
  });
}

async function renderTurnstile() {
  state.turnstileToken = "";
  els.turnstileWrap.innerHTML = "";

  if (!state.config.turnstileConfigured || !state.config.turnstileSiteKey) {
    setMessage("Turnstile keys are not configured in Vercel yet.", "error");
    els.submit.disabled = true;
    return;
  }

  try {
    const turnstile = await ensureTurnstileReady();
    state.widgetId = turnstile.render(els.turnstileWrap, {
      sitekey: state.config.turnstileSiteKey,
      theme: "dark",
      callback(token) {
        state.turnstileToken = token;
        setMessage("Challenge complete. You can claim now.", "success");
      },
      "expired-callback"() {
        state.turnstileToken = "";
        setMessage("Challenge expired. Please retry it.", "error");
      },
      "error-callback"() {
        state.turnstileToken = "";
        setMessage("Turnstile failed to load. Refresh and try again.", "error");
      },
    });
    els.submit.disabled = false;
    setMessage("Complete the Turnstile challenge to enable claiming.");
  } catch (error) {
    setMessage(error.message, "error");
    els.submit.disabled = true;
  }
}

async function refreshStatus() {
  els.refresh.disabled = true;
  try {
    const [healthRes, configRes] = await Promise.all([
      fetch("/api/health"),
      fetch("/api/turnstile-config"),
    ]);
    state.health = await healthRes.json();
    state.config = await configRes.json();
    updateStatusCards();
    await renderTurnstile();
  } catch (error) {
    setMessage(`Failed to load faucet status: ${error.message}`, "error");
  } finally {
    els.refresh.disabled = false;
  }
}

els.refresh.addEventListener("click", refreshStatus);

els.form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!state.turnstileToken) {
    setMessage("Complete the Turnstile challenge before claiming.", "error");
    return;
  }

  els.submit.disabled = true;
  setMessage("Submitting claim...");

  try {
    const response = await fetch("/api/faucet", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        address: els.address.value.trim(),
        turnstileToken: state.turnstileToken,
      }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Claim failed");
    }

    setMessage(`Sent ${payload.amountFormatted} ${payload.nativeSymbol}. Tx: ${payload.txHash}`, "success");
    els.form.reset();
    state.turnstileToken = "";
    if (window.turnstile && state.widgetId !== null) {
      window.turnstile.reset(state.widgetId);
    }
    await refreshStatus();
  } catch (error) {
    setMessage(error.message, "error");
    els.submit.disabled = false;
  }
});

refreshStatus();
