/* P2pBotsView ("Bots & API"): how an organization runs the P2P market from its own code. An API key
   with the market's two scopes (p2p:read, p2p:write), the webhook events it sends, the
   transfer-matches helper (a merchant's bot forwards each incoming bank transfer and gets the
   orders it most likely settles, each with its release ready to sign; here it can be tried by
   hand) and a bot's loop to start from. The bots' own keys never reach Cosmos Pay: a wallet
   authorises a bot on the contract (P2P liquidity) and the bot signs with its key. */
import { useMemo, useState } from "react";
import { useT, useLang } from "@/lib/i18n/index";
import { showToast } from "@/components/cosmos/shared";
import { DI } from "@/components/cosmos/dashboard/icons";
import { goFiltered } from "@/components/cosmos/dashboard/hooks";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { ViewFigures } from "@/components/cosmos/dashboard/components/ActivityPanel";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { Select } from "@/components/cosmos/dashboard/components/Select";
import { CopyBlock } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { CurrencyMark, currencyName } from "@/components/cosmos/dashboard/components/RampWidget";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { shortAddress } from "@/components/cosmos/dashboard/components/RecordPreview";
import { parseFiat } from "@/lib/p2p/amounts";
import { matchConfidence } from "@/lib/p2p/normalize";
import { P2P_WEBHOOK_EVENTS, type P2pAccount, type P2pTransferMatch } from "@/lib/p2p/types";
import {
  p2pApi, useP2pMarket, useP2pList, networkOf, fiatText, tokenText, OrderStatus, WalletTxDialog, accountName,
} from "@/components/cosmos/dashboard/p2p/shared";

const API_BASE = "https://api.cosmospay.lat/cosmos-api/v1/p2p";

/* The bot's loop, as code to copy (code is not translated). */
const SNIPPET = `// A merchant's bot: forward every incoming bank transfer to Cosmos Pay
// and release the orders it settles, signed with the bot's own key.
const API = "${API_BASE}";
const headers = { Authorization: \`Bearer \${process.env.COSMOS_PAY_API_KEY}\`, "Content-Type": "application/json" };

export async function onBankTransfer(transfer, wallet) {
  const res = await fetch(\`\${API}/merchant/transfer-matches\`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      currency: transfer.currency,          // "ARS"
      amount: transfer.amount,              // "150000.00"
      payerName: transfer.senderName,
      payerDocument: transfer.senderTaxId,
      reference: transfer.reference,
      receivedAt: transfer.receivedAt,
    }),
  });
  const { data } = await res.json();
  // score: 1 the amount matched, 2 and the payer's name, 3 and the document too.
  const best = data[0];
  if (!best || best.score < 3) return; // leave doubtful ones to a person
  // The bot was granted "release" on this wallet (P2P liquidity > Bots).
  const hash = await wallet.sendTransaction(best.transaction);
  console.log("released", best.order.id, hash);
}
`;

export function P2pBotsView({ canManage = false, orgId, env = "dev", keys = [], onGo = () => {}, onCreateKey = null }: {
  canManage?: boolean; orgId: string; env?: string; keys?: { permissions?: string[] }[]; onGo?: (v: string) => void; onCreateKey?: (() => void) | null;
}) {
  const t = useT();
  const lang = useLang();
  const p = t.p2p.bots;
  const market = useP2pMarket(env, orgId);
  const accounts = useP2pList<P2pAccount>("accounts", env, orgId);
  const p2pKeys = keys.filter((k) => (k.permissions ?? []).some((s) => s === "p2p:read" || s === "p2p:write")).length;

  // The helper, tried by hand.
  const currencies = market?.currencies.map((c) => c.code) ?? [];
  const [currency, setCurrency] = useState("ARS");
  const [amount, setAmount] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerDocument, setPayerDocument] = useState("");
  const [reference, setReference] = useState("");
  const [matches, setMatches] = useState<P2pTransferMatch[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [releasing, setReleasing] = useState<P2pTransferMatch | null>(null);
  const fiat = parseFiat(amount, currency);
  const find = () => {
    if (fiat === null || busy) return;
    setBusy(true);
    p2pApi.post("merchant/transfer-matches", env, orgId, { currency, amount: fiat, payerName: payerName.trim() || undefined, payerDocument: payerDocument.trim() || undefined, reference: reference.trim() || undefined, receivedAt: new Date().toISOString() })
      .then((r) => setMatches(Array.isArray(r) ? r : []))
      .catch((e) => { setMatches(null); showToast(e?.message || p.matches.failed, "error"); })
      .finally(() => setBusy(false));
  };
  const walletOf = (m: P2pTransferMatch) => accounts.rows.find((a) => a.address.toLowerCase() === (m.order.seller ?? "").toLowerCase()) ?? null;
  const events = useMemo(() => P2P_WEBHOOK_EVENTS.map((e) => [e, p.events[e]] as const), [p]);

  if (releasing) {
    const net = networkOf(market, releasing.order.network);
    const wallet = walletOf(releasing);
    if (net && wallet) {
      return (
        <WalletTxDialog
          eyebrow={p.matches.title} title={t.p2p.orders.actions.release} signer={wallet.address} network={net} market={market}
          fields={[[t.p2p.orders.head.fiat, fiatText(releasing.order.fiatAmount, releasing.order.currency, lang)], [t.p2p.orders.head.tokens, tokenText(releasing.order.tokenAmount, releasing.order.token, lang)], [t.p2p.orders.fields.payer, releasing.order.payer ? `${releasing.order.payer.name} · ${releasing.order.payer.document}` : "-"], [t.p2p.orders.fields.wallet, accountName(wallet)]]}
          steps={[{ key: "release", label: t.p2p.orders.actions.release, build: () => Promise.resolve(releasing.transaction) }]}
          onClose={() => setReleasing(null)} onDone={() => { setReleasing(null); setMatches((x) => (x ? x.filter((m) => m !== releasing) : x)); }}
        />
      );
    }
  }

  return (
    <>
      <ViewHead title={p.title} />
      <ViewFigures
        label={p.figuresLabel} loading={accounts.loading} failed={accounts.error}
        items={[
          { key: "keys", label: p.figures.keys, value: p2pKeys, sub: p.figures.keysSub },
          { key: "merchants", label: p.figures.merchants, value: accounts.rows.filter((a) => a.merchant).length },
          { key: "events", label: p.figures.events, value: P2P_WEBHOOK_EVENTS.length },
          { key: "scopes", label: p.figures.scopes, value: 2, sub: "p2p:read · p2p:write" },
        ]}
      />

      <section className="hub-section p2p-sec" aria-labelledby="p2p-api-t">
        <div className="hub-section-head">
          <h2 id="p2p-api-t">{p.api.title}</h2>
          <div className="vh-actions">
            {onCreateKey && <button type="button" className="btn btn-dark btn-sm" onClick={onCreateKey}>{DI.plus} {p.api.createKey}</button>}
            <button type="button" className="btn btn-outline-w btn-sm" onClick={() => onGo("developers")}>{DI.key} {p.api.keys}</button>
          </div>
        </div>
        <div className="panel p2p-panel">
          <ul className="p2p-scopes" role="list">
            {(["read", "write"] as const).map((s) => (
              <li key={s}><code>{`p2p:${s}`}</code><span>{p.api.scopes[s]}</span></li>
            ))}
          </ul>
          <CopyBlock label={p.api.base} value={API_BASE} />
        </div>
      </section>

      <section className="hub-section p2p-sec" aria-labelledby="p2p-hooks-t">
        <div className="hub-section-head">
          <h2 id="p2p-hooks-t">{p.webhooks.title}</h2>
          <div className="vh-actions"><button type="button" className="btn btn-outline-w btn-sm" onClick={() => goFiltered(onGo, "webhook")}>{DI.webhook} {p.webhooks.manage}</button></div>
        </div>
        <div className="panel">
          <p className="p2p-panel-note">{p.webhooks.note}</p>
          <div className="t-scroll" tabIndex={0}><table className="tx p2p-t"><thead><tr><th>{p.webhooks.event}</th><th>{p.webhooks.when}</th></tr></thead>
            <tbody>{events.map(([e, d]) => (
              <tr key={e}><td className="tid"><code>{e}</code></td><td className="cust">{d}</td></tr>
            ))}</tbody>
          </table></div>
        </div>
      </section>

      <section className="hub-section p2p-sec" aria-labelledby="p2p-match-t">
        <div className="hub-section-head"><h2 id="p2p-match-t">{p.matches.title}</h2></div>
        <div className="panel p2p-panel">
          <div className="p2p-match-form">
            <Field label={p.matches.amount} value={amount} onChange={(e) => setAmount(e.target.value.trim().replace(",", "."))} inputMode="decimal" placeholder="150000" aria-invalid={amount && fiat === null ? true : undefined} />
            <div className="fld">
              <span className="field-l" id="p2p-tm-c">{t.p2p.offers.currency}</span>
              <Select value={currency} onChange={setCurrency} labelledBy="p2p-tm-c" options={(currencies.length ? currencies : ["ARS"]).map((c) => ({ value: c, label: c, hint: currencyName(c, lang), icon: <CurrencyMark id={c} size={18} /> }))} />
            </div>
            <Field label={p.matches.payerName} hint={t.dash.common.optional} value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder={t.p2p.placeholders.holderName} />
            <Field label={p.matches.payerDocument} hint={t.dash.common.optional} value={payerDocument} onChange={(e) => setPayerDocument(e.target.value)} placeholder={t.p2p.placeholders.cuit} />
            <Field label={p.matches.reference} hint={t.dash.common.optional} value={reference} onChange={(e) => setReference(e.target.value)} placeholder={t.p2p.orders.referencePlaceholder} />
            <div className="p2p-match-go"><button type="button" className="btn btn-dark btn-sm" disabled={fiat === null || busy} onClick={find}>{busy ? p.matches.finding : p.matches.find}</button></div>
          </div>
          {matches && (
            <div className="t-scroll" tabIndex={0}><table className="tx p2p-t"><thead><tr>
              <th>{t.p2p.orders.head.order}</th><th>{t.p2p.orders.head.fiat}</th><th>{t.p2p.orders.fields.payer}</th><th>{p.matches.score}</th><th>{t.p2p.orders.head.status}</th>
              <th><span className="sr-only">{t.dash.common.actions}</span></th>
            </tr></thead>
              <tbody>
                {matches.map((m) => (
                  <tr key={m.order.id}>
                    <td className="tid"><RecordLink href={`/dashboard?view=p2pOrders&open=${encodeURIComponent(m.order.id)}`} copy={m.order.id} title={m.order.id}><code>{shortAddress(m.order.id)}</code></RecordLink></td>
                    <td className="amt">{fiatText(m.order.fiatAmount, m.order.currency, lang)}</td>
                    <td className="cust">{m.order.payer ? `${m.order.payer.name} · ${m.order.payer.document}` : "-"}</td>
                    <td className="cust">{new Intl.NumberFormat(lang, { style: "percent", maximumFractionDigits: 0 }).format(matchConfidence(m.score))}</td>
                    <td><OrderStatus status={m.order.status} /></td>
                    <td className="row-actions">
                      {canManage && <button type="button" className="btn btn-dark btn-sm" disabled={!walletOf(m) || !networkOf(market, m.order.network)} title={!walletOf(m) ? t.p2p.orders.noWallet : undefined} onClick={() => setReleasing(m)}>{t.p2p.orders.actions.release}</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
          {matches && matches.length === 0 && <p className="p2p-match-none" role="status">{p.matches.none}</p>}
        </div>
      </section>

      <section className="hub-section p2p-sec" aria-labelledby="p2p-code-t">
        <div className="hub-section-head"><h2 id="p2p-code-t">{p.code.title}</h2></div>
        <div className="panel p2p-panel">
          <CopyBlock label={p.code.label} value={SNIPPET} lang="ts" />
        </div>
      </section>
    </>
  );
}
