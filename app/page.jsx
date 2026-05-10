"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function shortAddress(value, head = 6, tail = 4) {
  if (!value) return "...";
  if (value.length <= head + tail + 2) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function line(label, value, tone = "neutral") {
  return { label, value, tone };
}

export default function FaucetPage() {
  const [status, setStatus] = useState({ health: null, config: null, loading: true });
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState({ text: "booting...", tone: "neutral" });
  const [events, setEvents] = useState([
    line("BOOT", "terminal initialized", "neutral"),
    line("SYNC", "awaiting telemetry", "neutral"),
  ]);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const turnstileContainerRef = useRef(null);
  const widgetIdRef = useRef(null);

  const health = status.health;
  const config = status.config;

  const pushEvent = (label, value, tone = "neutral") => {
    setEvents((current) => [line(label, value, tone), ...current].slice(0, 6));
  };

  const showMessage = (text, tone = "neutral") => {
    setMessage({ text, tone });
  };

  async function waitForTurnstile() {
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

  async function renderTurnstile(configData) {
    if (!turnstileContainerRef.current) return;

    turnstileContainerRef.current.innerHTML = "";
    setTurnstileToken("");

    if (!configData?.turnstileConfigured || !configData.turnstileSiteKey) {
      showMessage("Turnstile keys are not configured yet.", "error");
      return;
    }

    try {
      const turnstile = await waitForTurnstile();

      if (widgetIdRef.current !== null && typeof turnstile.remove === "function") {
        try {
          turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore widget teardown failures
        }
      }

      widgetIdRef.current = turnstile.render(turnstileContainerRef.current, {
        sitekey: configData.turnstileSiteKey,
        theme: "dark",
        callback(token) {
          setTurnstileToken(token);
          showMessage("challenge cleared.", "success");
          pushEvent("CAPTCHA", "challenge passed", "success");
        },
        "expired-callback"() {
          setTurnstileToken("");
          showMessage("challenge expired.", "error");
          pushEvent("CAPTCHA", "challenge expired", "error");
        },
        "error-callback"() {
          setTurnstileToken("");
          showMessage("turnstile failed to load.", "error");
          pushEvent("CAPTCHA", "widget error", "error");
        },
      });

      showMessage("solve Turnstile to unlock the claim button.");
    } catch (error) {
      showMessage(error.message, "error");
      pushEvent("CAPTCHA", "widget load failed", "error");
    }
  }

  async function refreshStatus() {
    setSyncing(true);

    try {
      const [healthRes, configRes] = await Promise.all([fetch("/api/health"), fetch("/api/turnstile-config")]);
      const [healthData, configData] = await Promise.all([healthRes.json(), configRes.json()]);

      setStatus({ health: healthData, config: configData, loading: false });
      pushEvent("SYNC", `chain ${healthData.chainId} / ${healthData.ready ? "online" : "not ready"}`, healthData.ready ? "success" : "warn");
      await renderTurnstile(configData);
      showMessage(healthData.ready ? "faucet online." : "faucet not ready.", healthData.ready ? "success" : "warn");
    } catch (error) {
      setStatus((current) => ({ ...current, loading: false }));
      showMessage(`sync failed: ${error.message}`, "error");
      pushEvent("SYNC", "status fetch failed", "error");
    } finally {
      setSyncing(false);
    }
  }

  async function copyFaucetAddress() {
    if (!health?.faucetAddress || !navigator.clipboard) return;
    await navigator.clipboard.writeText(health.faucetAddress);
    showMessage("faucet address copied.", "success");
    pushEvent("COPY", "faucet address copied", "success");
  }

  async function submitClaim(event) {
    event.preventDefault();

    if (!address.trim()) {
      showMessage("enter a recipient address.", "error");
      return;
    }

    if (!turnstileToken) {
      showMessage("solve Turnstile first.", "error");
      return;
    }

    setSubmitting(true);
    showMessage("submitting claim...");
    pushEvent("TX", `requesting drip for ${shortAddress(address.trim())}`, "neutral");

    try {
      const response = await fetch("/api/faucet", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          address: address.trim(),
          turnstileToken,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "claim failed");
      }

      const shortTx = shortAddress(payload.txHash, 10, 8);
      showMessage(`sent ${payload.amountFormatted} ${payload.nativeSymbol}. tx ${shortTx}`, "success");
      pushEvent("TX", `confirmed ${shortTx}`, "success");
      setAddress("");
      setTurnstileToken("");

      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.reset(widgetIdRef.current);
      }

      await refreshStatus();
    } catch (error) {
      showMessage(error.message, "error");
      pushEvent("TX", "claim failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    refreshStatus();
  }, []);

  return (
    <>
      <Script id="turnstile-script" src={TURNSTILE_SRC} strategy="afterInteractive" />
      <main className="shell">
        <section className="console panel">
          <div className="prompt-row">
            <span className="prompt">root@veltrix:~$</span>
            <span className="prompt-text">request faucet drip</span>
            <button className="ghost" type="button" onClick={refreshStatus} disabled={syncing}>
              {syncing ? "syncing" : "refresh"}
            </button>
          </div>

            <div className="terminal-grid">
              <form className="claim-form terminal-box" onSubmit={submitClaim}>
                <label className="field">
                  <span>recipient address</span>
                  <div className="input-shell">
                    <span className="input-prefix">veltrix&gt;</span>
                    <input
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      type="text"
                      placeholder="0x..."
                      autoComplete="off"
                      spellCheck="false"
                      autoCapitalize="off"
                      required
                    />
                  </div>
                </label>

              <div className="turnstile-shell">
                <div className="turnstile-label">turnstile</div>
                <div ref={turnstileContainerRef} className="turnstile-wrap" />
              </div>

              <button className="primary" type="submit" disabled={submitting || syncing || !turnstileToken || !health?.ready}>
                {submitting ? "submitting..." : "claim drip"}
              </button>
            </form>

            <div className="stack">
              <article className="terminal-box">
                <div className="section-label">network</div>
                <dl className="meta-grid">
                  <dt>chain id</dt>
                  <dd>{health?.chainId || "..."}</dd>
                  <dt>expected</dt>
                  <dd>{health?.chainIdExpected || "..."}</dd>
                  <dt>symbol</dt>
                  <dd>{health?.nativeSymbol || "..."}</dd>
                  <dt>ready</dt>
                  <dd>{health ? (health.ready ? "yes" : "no") : "..."}</dd>
                </dl>
              </article>

              <article className="terminal-box">
                <div className="section-label">faucet</div>
                <dl className="meta-grid">
                  <dt>address</dt>
                  <dd className="mono">{health ? shortAddress(health.faucetAddress, 8, 6) : "..."}</dd>
                  <dt>balance</dt>
                  <dd>{health ? `${health.balanceFormatted} ${health.nativeSymbol}` : "..."}</dd>
                  <dt>drip</dt>
                  <dd>{config ? `${config.faucetAmountFormatted} ${health?.nativeSymbol || "VEL"}` : "..."}</dd>
                  <dt>captcha</dt>
                  <dd>{health ? (health.turnstileConfigured ? "configured" : "missing") : "..."}</dd>
                </dl>
                <button className="ghost ghost--full" type="button" onClick={copyFaucetAddress} disabled={!health?.faucetAddress}>
                  copy faucet address
                </button>
              </article>
            </div>
          </div>

          <div className={`message message--${message.tone}`} aria-live="polite">
            {message.text}
          </div>

          <div className="feed terminal-box">
            <div className="section-label">log</div>
            <div className="event-log">
              {events.map((event) => (
                <div key={`${event.label}-${event.value}`} className={`event event--${event.tone}`}>
                  <span className="event-label">{event.label}</span>
                  <span className="event-value">{event.value}</span>
                </div>
              ))}
            </div>
          </div>

          <footer className="footer terminal-box">
            <div className="section-label">links</div>
            <div className="footer-links">
              <a href="https://github.com/404Piyush" target="_blank" rel="noreferrer noopener">
                github
              </a>
              <a href="https://404piyush.me" target="_blank" rel="noreferrer noopener">
                portfolio
              </a>
            </div>
            <div className="footer-note">404piyush.me / veltrix faucet console</div>
          </footer>
        </section>
      </main>
    </>
  );
}
