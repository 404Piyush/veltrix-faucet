"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { FaucetCore } from "../components/FaucetCore";

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
  const [message, setMessage] = useState({ text: "Booting terminal...", tone: "neutral" });
  const [events, setEvents] = useState([
    line("BOOT", "Terminal initialized", "neutral"),
    line("SYNC", "Awaiting live telemetry", "neutral"),
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
          showMessage("Challenge cleared. Claim is armed.", "success");
          pushEvent("CAPTCHA", "Challenge passed", "success");
        },
        "expired-callback"() {
          setTurnstileToken("");
          showMessage("Challenge expired. Run it again.", "error");
          pushEvent("CAPTCHA", "Challenge expired", "error");
        },
        "error-callback"() {
          setTurnstileToken("");
          showMessage("Turnstile failed to load. Refresh and retry.", "error");
          pushEvent("CAPTCHA", "Widget error", "error");
        },
      });

      showMessage("Solve Turnstile to unlock the claim button.");
    } catch (error) {
      showMessage(error.message, "error");
      pushEvent("CAPTCHA", "Widget load failed", "error");
    }
  }

  async function refreshStatus() {
    setSyncing(true);

    try {
      const [healthRes, configRes] = await Promise.all([fetch("/api/health"), fetch("/api/turnstile-config")]);
      const [healthData, configData] = await Promise.all([healthRes.json(), configRes.json()]);

      setStatus({ health: healthData, config: configData, loading: false });
      pushEvent(
        "SYNC",
        `Chain ${healthData.chainId} / ${healthData.ready ? "online" : "not ready"}`,
        healthData.ready ? "success" : "warn",
      );
      await renderTurnstile(configData);
      showMessage(healthData.ready ? "Live faucet online." : "Faucet is not ready yet.", healthData.ready ? "success" : "warn");
    } catch (error) {
      setStatus((current) => ({ ...current, loading: false }));
      showMessage(`Failed to sync status: ${error.message}`, "error");
      pushEvent("SYNC", "Status fetch failed", "error");
    } finally {
      setSyncing(false);
    }
  }

  async function copyFaucetAddress() {
    if (!health?.faucetAddress || !navigator.clipboard) return;
    await navigator.clipboard.writeText(health.faucetAddress);
    showMessage("Faucet address copied.", "success");
    pushEvent("COPY", "Faucet address copied", "success");
  }

  async function submitClaim(event) {
    event.preventDefault();

    if (!address.trim()) {
      showMessage("Enter a recipient address first.", "error");
      return;
    }

    if (!turnstileToken) {
      showMessage("Solve Turnstile before claiming.", "error");
      return;
    }

    setSubmitting(true);
    showMessage("Submitting claim...");
    pushEvent("TX", `Requesting drip for ${shortAddress(address.trim())}`, "neutral");

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
        throw new Error(payload.error || "Claim failed");
      }

      const shortTx = shortAddress(payload.txHash, 10, 8);
      showMessage(`Sent ${payload.amountFormatted} ${payload.nativeSymbol}. Tx ${shortTx}`, "success");
      pushEvent("TX", `Confirmed ${shortTx}`, "success");
      setAddress("");
      setTurnstileToken("");

      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.reset(widgetIdRef.current);
      }

      await refreshStatus();
    } catch (error) {
      showMessage(error.message, "error");
      pushEvent("TX", "Claim failed", "error");
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
        <header className="masthead panel">
          <div className="masthead-copy">
            <div className="eyebrow">Veltrix Faucet / Terminal UI</div>
            <h1>Green-black faucet console for live VEL drips.</h1>
            <p className="copy">
              Claim tiny VEL drops through a CRT-style interface with live network telemetry and one usable 3D core.
            </p>
          </div>
          <div className="status-strip">
            <span className={`chip ${health?.ready ? "chip--good" : "chip--warn"}`}>
              {health?.ready ? "ONLINE" : status.loading ? "SYNC" : "CHECK"}
            </span>
            <span className="chip">VEL</span>
            <span className="chip">{health ? `CHAIN ${health.chainId}` : "CHAIN ?"}</span>
            <span className="chip">{health?.turnstileConfigured ? "CAPTCHA READY" : "CAPTCHA OFF"}</span>
          </div>
        </header>

        <section className="hero-grid">
          <article className="panel panel--console">
            <div className="panel-head">
              <div>
                <div className="eyebrow">Claim console</div>
                <h2>Request a drip</h2>
              </div>
              <button className="ghost" type="button" onClick={refreshStatus} disabled={syncing}>
                {syncing ? "Syncing..." : "Refresh"}
              </button>
            </div>

            <div className="terminal-window">
              <div className="terminal-lines">
                <div>&gt; enter recipient address</div>
                <div>&gt; solve captcha gate</div>
                <div>&gt; send {health?.faucetAmountFormatted || "0.001"} VEL</div>
              </div>

              <form className="claim-form" onSubmit={submitClaim}>
                <label className="field">
                  <span>Recipient address</span>
                  <input
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    type="text"
                    placeholder="0x..."
                    autoComplete="off"
                    spellCheck="false"
                    required
                  />
                </label>

                <div className="turnstile-shell">
                  <div className="turnstile-label">Turnstile gate</div>
                  <div ref={turnstileContainerRef} className="turnstile-wrap" />
                </div>

                <button className="primary" type="submit" disabled={submitting || syncing || !turnstileToken || !health?.ready}>
                  {submitting ? "Submitting..." : "Claim faucet drip"}
                </button>
              </form>
            </div>

            <div className={`message message--${message.tone}`} aria-live="polite">
              {message.text}
            </div>
          </article>

          <article className="panel panel--core">
            <div className="panel-head">
              <div>
                <div className="eyebrow">Interactive 3D core</div>
                <h2>Hover, drag, click</h2>
              </div>
              <span className="chip chip--ghost">Usable model</span>
            </div>

            <FaucetCore />

            <div className="core-footer">
              <div>
                <div className="fineprint">Mode</div>
                <div className="mono">{health?.ready ? "ready" : "waiting"}</div>
              </div>
              <div>
                <div className="fineprint">Drip</div>
                <div className="mono">{health?.faucetAmountFormatted || "0.001"} VEL</div>
              </div>
              <div>
                <div className="fineprint">Cooldown</div>
                <div className="mono">{health ? `${health.cooldownSeconds}s` : "..."}</div>
              </div>
            </div>
          </article>
        </section>

        <section className="info-grid">
          <article className="panel">
            <div className="panel-head">
              <div>
                <div className="eyebrow">Network telemetry</div>
                <h2>Chain status</h2>
              </div>
            </div>
            <dl className="meta-grid">
              <dt>Chain ID</dt>
              <dd>{health?.chainId || "..."}</dd>
              <dt>Expected</dt>
              <dd>{health?.chainIdExpected || "..."}</dd>
              <dt>Symbol</dt>
              <dd>{health?.nativeSymbol || "..."}</dd>
              <dt>Ready</dt>
              <dd>{health ? (health.ready ? "online" : "check faucet") : "..."}</dd>
            </dl>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <div className="eyebrow">Faucet telemetry</div>
                <h2>Supply status</h2>
              </div>
              <button className="ghost" type="button" onClick={copyFaucetAddress} disabled={!health?.faucetAddress}>
                Copy faucet
              </button>
            </div>
            <dl className="meta-grid">
              <dt>Faucet address</dt>
              <dd className="mono">{health ? shortAddress(health.faucetAddress, 8, 6) : "..."}</dd>
              <dt>Balance</dt>
              <dd>{health ? `${health.balanceFormatted} ${health.nativeSymbol}` : "..."}</dd>
              <dt>Drip size</dt>
              <dd>{config ? `${config.faucetAmountFormatted} ${health?.nativeSymbol || "VEL"}` : "..."}</dd>
              <dt>Captcha</dt>
              <dd>{health ? (health.turnstileConfigured ? "Configured" : "Missing keys") : "..."}</dd>
            </dl>
          </article>

          <article className="panel panel--log">
            <div className="panel-head">
              <div>
                <div className="eyebrow">Activity log</div>
                <h2>Terminal feed</h2>
              </div>
            </div>
            <div className="event-log">
              {events.map((event) => (
                <div key={`${event.label}-${event.value}`} className={`event event--${event.tone}`}>
                  <span className="event-label">{event.label}</span>
                  <span className="event-value">{event.value}</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>
    </>
  );
}
