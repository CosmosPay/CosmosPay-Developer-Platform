/* csv.ts: a payouts file (one beneficiary per row) read and checked in the browser before anything
   is sent, so every row's problem shows next to it. Columns by header name, in any order:

     currency, amount, rail, holderName, document, reference,
     and the rail's own account fields, as the Payments API names them (cbu, alias, cuit, keyType,
     key, clabe, bank, accountType, accountNumber, documentType, documentNumber, cci, rut;
     pixKeyType and pixKey are read as keyType and key)

   Comma or semicolon separated (the first line decides), quotes as RFC 4180 has them, a UTF-8
   byte-order mark and Windows line ends tolerated, blank lines skipped. Pure;
   tests/unit/p2pCsv.test.ts. */
import { checkBeneficiary, documentOf, fiatDecimals, isRailId, RAILS, normalizeDetails, type FieldError } from "@/lib/p2p/rails";
import { parseDecimal } from "@/lib/p2p/amounts";

export const PAYOUT_MAX_ITEMS = 100;

/* Header names accepted for each column (lower-cased, spaces and underscores dropped). */
const COLUMNS: Record<string, string[]> = {
  currency: ["currency", "moneda", "moeda", "devise", "währung", "waehrung"],
  amount: ["amount", "fiatamount", "monto", "valor", "montant", "betrag"],
  rail: ["rail"],
  holderName: ["holdername", "holder", "name", "beneficiary", "titular", "nombre", "nome", "nom"],
  document: ["document", "documento", "doc", "taxid"],
  reference: ["reference", "externalreference", "referencia", "référence", "referenz", "ref"],
};
export const DETAIL_COLUMNS = ["cbu", "alias", "cuit", "keyType", "key", "clabe", "bank", "accountType", "accountNumber", "documentType", "documentNumber", "cci", "rut"] as const;
/* Other names a file may use for a detail column. */
const DETAIL_ALIASES: Record<string, string> = { pixkeytype: "keyType", pixkey: "key" };

export type CsvRowError = FieldError | "rail" | "currency" | "amount" | "duplicate";

export interface PayoutRow {
  /* 1-based line of the file, for "line 4: ...". */
  line: number;
  currency: string;
  fiatAmount: string;
  rail: string;
  holderName: string;
  document: string;
  details: Record<string, string>;
  externalReference: string;
  errors: Record<string, CsvRowError>;
}

export interface PayoutFile {
  rows: PayoutRow[];
  /* Columns the file must have and does not. */
  missing: string[];
  /* More rows than one batch takes. */
  tooMany: boolean;
}

/** Split CSV text into rows of cells (RFC 4180 quoting). */
export function splitCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
      continue;
    }
    if (c === '"' && cell === "") { quoted = true; continue; }
    if (c === delimiter) { row.push(cell); cell = ""; continue; }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

const norm = (h: string) => h.trim().toLowerCase().replace(/[\s_-]/g, "");

/** The column each header names, or null. */
function columnOf(header: string): string | null {
  const h = norm(header);
  for (const [col, names] of Object.entries(COLUMNS)) if (names.includes(h)) return col;
  for (const d of DETAIL_COLUMNS) if (d.toLowerCase() === h) return d;
  return DETAIL_ALIASES[h] ?? null;
}

/** Read a payouts file: every row with its problems (empty when it can be sent). */
export function parsePayoutCsv(text: string, allowedCurrencies?: readonly string[]): PayoutFile {
  const first = text.replace(/^﻿/, "").split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  const [head = [], ...body] = splitCsv(text, delimiter);
  const cols = head.map(columnOf);
  const missing = ["currency", "amount", "rail", "holderName"].filter((c) => !cols.includes(c));
  const seen = new Set<string>();
  const rows: PayoutRow[] = body.map((cells, i) => {
    const get = (col: string) => {
      const at = cols.indexOf(col);
      return at >= 0 ? String(cells[at] ?? "").trim() : "";
    };
    const currency = get("currency").toUpperCase();
    const rail = get("rail").toLowerCase();
    const details: Record<string, string> = {};
    for (const d of DETAIL_COLUMNS) {
      const v = get(d);
      if (v) details[d] = d === "keyType" || d === "accountType" ? v.toLowerCase() : d === "documentType" ? v.toUpperCase() : v;
    }
    const row: PayoutRow = {
      line: i + 2,
      currency,
      fiatAmount: get("amount").replace(",", "."),
      rail,
      holderName: get("holderName"),
      document: get("document"),
      details,
      externalReference: get("reference"),
      errors: {},
    };
    if (!isRailId(rail)) row.errors.rail = rail ? "rail" : "required";
    if (!currency) row.errors.currency = "required";
    else if ((isRailId(rail) && RAILS[rail].currency !== currency) || (allowedCurrencies && !allowedCurrencies.includes(currency))) row.errors.currency = "currency";
    const amount = currency ? parseDecimal(row.fiatAmount, fiatDecimals(currency)) : null;
    if (!row.fiatAmount) row.errors.amount = "required";
    else if (amount === null || Number(amount) <= 0) row.errors.amount = "amount";
    if (isRailId(rail)) {
      // The holder's document column fills the rail's own document detail when the file leaves it out.
      const key = RAILS[rail].documentKey;
      if (key && !details[key] && row.document) details[key] = row.document;
      row.details = normalizeDetails(rail, details);
      if (!row.document) row.document = documentOf(rail, row.details);
      Object.assign(row.errors, checkBeneficiary(rail, { holderName: row.holderName, document: row.document, details: row.details }));
    } else if (!row.holderName) row.errors.holderName = "required";
    if (row.externalReference) {
      if (seen.has(row.externalReference)) row.errors.reference = "duplicate";
      seen.add(row.externalReference);
    }
    return row;
  });
  return { rows, missing, tooMany: rows.length > PAYOUT_MAX_ITEMS };
}

/** The rows that can be sent, as the payouts route takes its items. */
export function payoutItems(rows: PayoutRow[]) {
  return rows
    .filter((r) => Object.keys(r.errors).length === 0)
    .map((r) => ({
      currency: r.currency,
      fiatAmount: r.fiatAmount,
      rail: r.rail,
      beneficiary: { holderName: r.holderName, document: r.document, details: r.details },
      ...(r.externalReference ? { externalReference: r.externalReference } : {}),
    }));
}

/** A sample file with one row per rail, for the "download a template" link. */
export function payoutTemplate(): string {
  const header = ["currency", "amount", "rail", "holderName", "document", ...DETAIL_COLUMNS, "reference"];
  const sample: Record<string, string>[] = [
    { currency: "ARS", amount: "150000", rail: "ar_bank_transfer", holderName: "Ana Gómez", document: "20329642330", cbu: "0170099222000001234561", cuit: "20329642330", reference: "inv-1001" },
    { currency: "BRL", amount: "820.50", rail: "br_pix", holderName: "João Silva", document: "52998224725", keyType: "email", key: "joao@example.com", reference: "inv-1002" },
    { currency: "MXN", amount: "2500", rail: "mx_spei", holderName: "María López", document: "GODE561231GR8", clabe: "002010077777777771", reference: "inv-1003" },
  ];
  const cell = (v: string) => (/[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [header.join(","), ...sample.map((r) => header.map((h) => cell(r[h] ?? "")).join(","))].join("\n") + "\n";
}
