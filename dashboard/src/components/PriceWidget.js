import React, { useState } from "react";
import { useLang } from "../i18n";

/* ─────────────────────────────────────────────────────────────
   Price + denomination.

   Every pool surveyed (Antpool, ViaBTC, F2Pool, Braiins, Luxor,
   Foundry) shows money in USD only. For a miner in Tehran or Dubai
   that is itself a conversion step, so this is built as a
   DENOMINATION CONTROL rather than another stat card: pick BTC /
   USD / local once and every money figure on the page re-denominates
   in place. Appending a second grey line under every number would
   double the money noise on a phone and defeat the telemetry
   hierarchy the dashboard is built around.

   Rates come from /api/public/btcprice — CoinGecko/Kraken for BTC,
   open.er-api.com for FX, and صراف's own live Iran feed (Wallex
   USDT/IRR) for Toman and Rial. The public feed publishes Iran's
   OFFICIAL rate, which is more than 50% below what anyone actually
   transacts at, so it cannot be used for those two.
   ───────────────────────────────────────────────────────────── */

// Default denomination per UI language. Spanish spans too many economies for a
// single sensible default, so it falls back to USD; the control overrides all.
const LANG_CURRENCY = { en: "USD", fa: "TMN", zh: "CNY", ru: "RUB", es: "USD", pt: "BRL" };

export const CURRENCIES = [
  "USD", "TMN", "IRR", "EUR", "GBP", "AED", "SAR", "KWD", "QAR", "BHD",
  "OMR", "EGP", "IQD", "TRY", "CNY", "RUB", "BRL", "INR", "PKR",
];

const SYMBOL = {
  USD: "$", EUR: "€", GBP: "£", IRR: "﷼", AED: "د.إ", SAR: "﷼", TRY: "₺",
  CNY: "¥", RUB: "₽", BRL: "R$", INR: "₹", PKR: "₨", EGP: "E£",
  KWD: "د.ك", QAR: "﷼", BHD: ".د.ب", OMR: "﷼", IQD: "ع.د",
  // Toman is the unit Iranians actually quote. 1 Toman = 10 Rial, so a rial
  // figure is a number the reader has to divide by ten in their head.
  TMN: "تومان",
};

const STORAGE_KEY = "hashrial_denom";
export const SARRAF_URL = "https://xn--mgbtl4c.com";

export function fiatSymbol(c) { return SYMBOL[c] || c; }

/* Denomination: "BTC", or any currency code. Persisted so the choice
   survives the 60s refresh and navigation. */
export function useDenomination() {
  const { lang } = useLang();
  const [denom, setDenomState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "BTC" || CURRENCIES.includes(saved)) return saved;
    } catch {}
    return "BTC";
  });
  const setDenom = (d) => {
    setDenomState(d);
    try { localStorage.setItem(STORAGE_KEY, d); } catch {}
  };
  const localCurrency = LANG_CURRENCY[lang] || "USD";
  return { denom, setDenom, localCurrency };
}

/* Currencies like IRR run to eleven digits for a single BTC. Compact notation
   keeps that legible without implying a precision the rate does not have. */
export function formatFiat(value, lang) {
  const n = parseFloat(value || 0);
  if (!isFinite(n)) return "—";
  // Latin digits everywhere, including Persian — miners read these against
  // their own rig's web UI, which is Latin.
  const locale = "en-US";
  try {
    if (Math.abs(n) >= 1e7) {
      return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 2 }).format(n);
    }
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(n);
  } catch { return String(n); }
}

/* Returns null when the rate is missing rather than silently falling back to
   USD, so callers can hide the figure instead of showing a wrong one. */
export function btcToFiat(btc, price, rates, currency) {
  if (!price) return null;
  const rate = currency === "USD" ? 1 : rates && rates[currency];
  if (!rate) return null;
  return parseFloat(btc || 0) * price * rate;
}

/* The single money formatter the dashboard uses. BTC always renders 8
   decimals; fiat always 2 (or compact). Fixed decimal counts mean widths
   never shift on the 60s auto-refresh. */
export function makeMoneyFormatter(denom, priceData, lang) {
  return function money(btcVal) {
    if (denom === "BTC") return { text: parseFloat(btcVal || 0).toFixed(8), unit: "BTC" };
    const v = btcToFiat(btcVal, priceData?.price, priceData?.rates, denom);
    if (v === null) return { text: parseFloat(btcVal || 0).toFixed(8), unit: "BTC" };
    return { text: formatFiat(v, lang), unit: fiatSymbol(denom) };
  };
}

/* Compact price rail for the panel header: BTC spot, 24h change, the local
   figure when the user is not already denominated in it, and one entry point
   to صراف. Deliberately one row — the exchange is a destination, not a panel. */
export function PriceRail({ data, stale, denom, setDenom, localCurrency }) {
  const { t, lang } = useLang();
  if (!data?.price) {
    return <span style={{ fontSize: 11, color: "var(--text3)" }}>{t("priceUnavailable")}</span>;
  }
  // null = the source that served this price carries no 24h change. Rendering
  // "0.00%" would assert the price is flat, which is not what we know.
  const change = typeof data.change === "number" && isFinite(data.change) ? data.change : null;
  const up = (change ?? 0) >= 0;
  const localPer1 = btcToFiat(1, data.price, data.rates, localCurrency);
  // Rate provenance: صراف live feed, or a pinned operator override.
  const rateSource = data.rateMeta && data.rateMeta[localCurrency];
  const pinned = !!(data.rateOverrides && data.rateOverrides[localCurrency]);

  /* Readability was regressed when this became a rail: the price dropped from
     20px/--text to 11px/--text2 and the local figure to --text3, which is the
     faintest token in the palette. Being one row does not require being
     illegible — the price is a number people actually read, so it gets real
     size and full contrast. Only the LABELS stay small. */
  return (
    <div className="pricerail">
      <div className="pricerail-read">
        <span className="eyebrow pricerail-label">{t("btcPrice")}</span>

        <span className="num pricerail-usd">
          ${data.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </span>

        {change !== null && (
          <span className="num pricerail-chg" style={{ color: up ? "var(--green)" : "var(--red)" }}>
            {up ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
          </span>
        )}

        {localCurrency !== "USD" && localPer1 !== null && (
          <>
            <span className="pricerail-sep" aria-hidden="true" />
            <span
              className="num pricerail-local"
              title={rateSource ? `${t("rateFromSarrafHint")} (${rateSource.source})` : undefined}
            >
              {formatFiat(localPer1, lang)}
              <span className="pricerail-cur">{fiatSymbol(localCurrency)}</span>
            </span>
            {(rateSource || pinned) && (
              <span className="pricerail-src">{t("rateFromSarraf")}</span>
            )}
          </>
        )}

        {stale && (
          <span className="pricerail-stale" title={t("priceDelayedHint")}>{t("priceDelayed")}</span>
        )}
      </div>

      <div className="pricerail-ctl">
        <label className="pricerail-denom">
          <span className="eyebrow pricerail-label">{t("showIn")}</span>
          <select
            value={denom}
            onChange={(e) => setDenom(e.target.value)}
            aria-label={t("showIn")}
            className="num"
          >
            <option value="BTC">BTC</option>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <a className="hr-link pricerail-link" href={SARRAF_URL} target="_blank" rel="noopener noreferrer">
          {t("exchangeAtSarraf")}
        </a>
      </div>
    </div>
  );
}

export default PriceRail;
