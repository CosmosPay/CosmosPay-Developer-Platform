/* rails.ts: the local-money rails the P2P market pays on, and the checks every account number and
   identity document goes through before it leaves the browser. They mirror the community
   server's rail table (`src/p2p/p2p-rails.ts` over there, the same detail keys: an Argentine
   account is a CBU or an alias, never both, with the holder's CUIT among its details): the
   server stays the authority, these are its shapes checked early so a typo never becomes an
   order that cannot be paid.

   One entry per rail. A field is `{ key, kind }`; `kind` names the check and the label the
   screens use (t.p2p.fields[kind]). A rail the market lists that this table does not know is
   still offered: its fields come from the market and are checked as plain required text.

   Pure (no DOM, no astro:env): tests/unit/p2pRails.test.ts covers every check. */

export type RailId =
  | "ar_bank_transfer"
  | "br_pix"
  | "mx_spei"
  | "co_bank_transfer"
  | "pe_bank_transfer"
  | "cl_bank_transfer";

/** What a field holds, which also picks its check and its label. */
export type FieldKind =
  | "cbu"
  | "alias"
  | "cuit"
  | "pixKeyType"
  | "pixKey"
  | "cpfCnpj"
  | "clabe"
  | "rfc"
  | "bank"
  | "accountTypeCo"
  | "accountTypeCl"
  | "documentTypeCo"
  | "documentTypePe"
  | "documentNumber"
  | "accountNumber"
  | "cci"
  | "dniRuc"
  | "rut"
  | "nitCc"
  | "text";

export interface RailField {
  key: string;
  kind: FieldKind;
  /* Optional fields may be left empty; `oneOf` names a group where exactly one must be filled. */
  optional?: boolean;
  oneOf?: string;
  /* An account number's fewest digits (the most is 20). */
  minDigits?: number;
  /* A field shown as a choice: its options' keys (labels in t.p2p.options[kind][option]). */
  options?: readonly string[];
}

export interface Rail {
  id: RailId;
  currency: string;
  /* The country whose flag marks the rail (ISO 3166-1 alpha-2, lower case). */
  country: string;
  /* The account the money goes to, the holder's document among its details where the rail asks
     for one. */
  fields: readonly RailField[];
  /* The detail that holds the holder's document, when the rail has one. */
  documentKey?: string;
}

export const PIX_KEY_TYPES = ["cpf", "cnpj", "email", "phone", "evp"] as const;
export type PixKeyType = (typeof PIX_KEY_TYPES)[number];
export const CO_ACCOUNT_TYPES = ["savings", "checking"] as const;
export const CL_ACCOUNT_TYPES = ["checking", "vista", "savings"] as const;
export const CO_DOCUMENT_TYPES = ["CC", "CE", "NIT", "PP"] as const;
export const PE_DOCUMENT_TYPES = ["DNI", "CE", "RUC", "PP"] as const;

export const RAILS: Record<RailId, Rail> = {
  ar_bank_transfer: {
    id: "ar_bank_transfer",
    currency: "ARS",
    country: "ar",
    fields: [
      { key: "cbu", kind: "cbu", oneOf: "account" },
      { key: "alias", kind: "alias", oneOf: "account" },
      { key: "cuit", kind: "cuit" },
    ],
    documentKey: "cuit",
  },
  br_pix: {
    id: "br_pix",
    currency: "BRL",
    country: "br",
    fields: [
      { key: "keyType", kind: "pixKeyType", options: PIX_KEY_TYPES },
      { key: "key", kind: "pixKey" },
    ],
  },
  mx_spei: {
    id: "mx_spei",
    currency: "MXN",
    country: "mx",
    fields: [{ key: "clabe", kind: "clabe" }],
  },
  co_bank_transfer: {
    id: "co_bank_transfer",
    currency: "COP",
    country: "co",
    fields: [
      { key: "bank", kind: "bank" },
      { key: "accountType", kind: "accountTypeCo", options: CO_ACCOUNT_TYPES },
      { key: "accountNumber", kind: "accountNumber", minDigits: 6 },
      { key: "documentType", kind: "documentTypeCo", options: CO_DOCUMENT_TYPES },
      { key: "documentNumber", kind: "documentNumber" },
    ],
    documentKey: "documentNumber",
  },
  pe_bank_transfer: {
    id: "pe_bank_transfer",
    currency: "PEN",
    country: "pe",
    fields: [
      { key: "cci", kind: "cci" },
      { key: "documentType", kind: "documentTypePe", options: PE_DOCUMENT_TYPES },
      { key: "documentNumber", kind: "documentNumber" },
    ],
    documentKey: "documentNumber",
  },
  cl_bank_transfer: {
    id: "cl_bank_transfer",
    currency: "CLP",
    country: "cl",
    fields: [
      { key: "bank", kind: "bank" },
      { key: "accountType", kind: "accountTypeCl", options: CL_ACCOUNT_TYPES },
      { key: "accountNumber", kind: "accountNumber" },
      { key: "rut", kind: "rut" },
    ],
    documentKey: "rut",
  },
};

export const RAIL_IDS = Object.keys(RAILS) as RailId[];

export function isRailId(value: unknown): value is RailId {
  return typeof value === "string" && Object.hasOwn(RAILS, value);
}

/** The rails a currency is paid on, in the table's order. */
export function railsFor(currency: string): Rail[] {
  return RAIL_IDS.map((id) => RAILS[id]).filter((r) => r.currency === currency);
}

/** Local money's decimals: Chilean pesos have none, the rest two. */
export function fiatDecimals(currency: string): number {
  return currency === "CLP" ? 0 : 2;
}

/* --- The checks. Each answers null when the value is valid, else why it is not: "required",
   "format" (the wrong characters or length) or "checksum" (the shape fits, a check digit does
   not). The screens word each reason (t.p2p.errors). --- */

export type FieldError = "required" | "format" | "checksum" | "exclusive";

const digitsOf = (value: string) => value.replace(/[\s.-]/g, "");
const allSame = (d: string) => /^(\d)\1*$/.test(d);

/** A CBU or CVU: 22 digits, two blocks with a check digit each (BCRA's weights). */
export function checkCbu(value: string): FieldError | null {
  const d = digitsOf(value);
  if (!/^\d{22}$/.test(d)) return "format";
  const block = (digits: string, weights: number[]) => {
    const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
    return (10 - (sum % 10)) % 10;
  };
  if (block(d.slice(0, 7), [7, 1, 3, 9, 7, 1, 3]) !== Number(d[7])) return "checksum";
  if (block(d.slice(8, 21), [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3]) !== Number(d[21])) return "checksum";
  return null;
}

/** An Argentine transfer alias: 6 to 20 letters, digits, dots or hyphens. */
export function checkAlias(value: string): FieldError | null {
  return /^[a-z0-9.-]{6,20}$/.test(value.trim().toLowerCase()) ? null : "format";
}

/** A CUIT or CUIL: 11 digits, a known type prefix and its mod-11 check digit. */
export function checkCuit(value: string): FieldError | null {
  const d = digitsOf(value);
  if (!/^\d{11}$/.test(d) || !["20", "23", "24", "25", "26", "27", "30", "33", "34"].includes(d.slice(0, 2))) return "format";
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(d[i]), 0);
  const mod = 11 - (sum % 11);
  const check = mod === 11 ? 0 : mod;
  return check === 10 || check !== Number(d[10]) ? "checksum" : null;
}

/** An Argentine DNI: 7 or 8 digits. */
export function checkDni(value: string): FieldError | null {
  return /^\d{7,8}$/.test(digitsOf(value)) ? null : "format";
}

/** A CPF: 11 digits with two check digits (not all the same digit). */
export function checkCpf(value: string): FieldError | null {
  const d = value.replace(/[\s.\-/]/g, "");
  if (!/^\d{11}$/.test(d)) return "format";
  if (allSame(d)) return "checksum";
  const dv = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]) ? null : "checksum";
}

/** A CNPJ: 14 digits with two check digits (not all the same digit). */
export function checkCnpj(value: string): FieldError | null {
  const d = value.replace(/[\s.\-/]/g, "");
  if (!/^\d{14}$/.test(d)) return "format";
  if (allSame(d)) return "checksum";
  const dv = (weights: number[]) => {
    const r = weights.reduce((acc, w, i) => acc + w * Number(d[i]), 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const first = dv([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = dv([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return first === Number(d[12]) && second === Number(d[13]) ? null : "checksum";
}

/** A CPF or a CNPJ, told apart by length. */
export function checkCpfCnpj(value: string): FieldError | null {
  const d = value.replace(/[\s.\-/]/g, "");
  return d.length > 11 ? checkCnpj(value) : checkCpf(value);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EVP = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A PIX key of the given type: a CPF, a CNPJ, an email, a Brazilian phone (+55, area code and
    8 or 9 digits) or a random key (EVP, a UUID). */
export function checkPixKey(type: string, value: string): FieldError | null {
  const v = value.trim();
  if (!v) return "required";
  switch (type) {
    case "cpf":
      return checkCpf(v);
    case "cnpj":
      return checkCnpj(v);
    case "email":
      return v.length <= 77 && EMAIL.test(v) ? null : "format";
    case "phone":
      return /^\+55[1-9]\d{9,10}$/.test(v.replace(/[\s()-]/g, "")) ? null : "format";
    case "evp":
      return EVP.test(v) ? null : "format";
    default:
      return "format";
  }
}

/** A CLABE: 18 digits, weights 3, 7, 1 repeated, each product taken mod 10. */
export function checkClabe(value: string): FieldError | null {
  const d = digitsOf(value);
  if (!/^\d{18}$/.test(d)) return "format";
  const weights = [3, 7, 1];
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += (Number(d[i]) * weights[i % 3]) % 10;
  return (10 - (sum % 10)) % 10 === Number(d[17]) ? null : "checksum";
}

/** A Mexican RFC: 12 characters for a company, 13 for a person. */
export function checkRfc(value: string): FieldError | null {
  return /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(value.trim().toUpperCase()) ? null : "format";
}

/** A Mexican CURP: 18 characters. */
export function checkCurp(value: string): FieldError | null {
  return /^[A-Z]{4}\d{6}[HMX][A-Z]{5}[A-Z0-9]\d$/.test(value.trim().toUpperCase()) ? null : "format";
}

/** A Peruvian CCI: 20 digits. */
export function checkCci(value: string): FieldError | null {
  return /^\d{20}$/.test(digitsOf(value)) ? null : "format";
}

/** A Peruvian RUC: 11 digits with a mod-11 check digit. */
export function checkRuc(value: string): FieldError | null {
  const d = digitsOf(value);
  if (!/^(10|15|17|20)\d{9}$/.test(d)) return "format";
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(d[i]), 0);
  const check = (11 - (sum % 11)) % 10;
  return check === Number(d[10]) ? null : "checksum";
}

/** A DNI (8 digits) or a RUC, told apart by length. */
export function checkDniRuc(value: string): FieldError | null {
  const d = digitsOf(value);
  if (/^\d{8}$/.test(d)) return null;
  return checkRuc(value);
}

/** A Chilean RUT: its number and its check digit (0 to 9 or K), mod 11 over weights 2 to 7. */
export function checkRut(value: string): FieldError | null {
  const v = value.replace(/[\s.]/g, "").toUpperCase();
  const m = /^(\d{7,8})-?([\dK])$/.exec(v);
  if (!m) return "format";
  const [, body, dv] = m;
  let sum = 0;
  let w = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * w;
    w = w === 7 ? 2 : w + 1;
  }
  const r = 11 - (sum % 11);
  const expected = r === 11 ? "0" : r === 10 ? "K" : String(r);
  return expected === dv ? null : "checksum";
}

/** A Colombian NIT (9 or 10 digits) or citizen card (6 to 10 digits). */
export function checkNitCc(value: string): FieldError | null {
  return /^\d{6,10}$/.test(digitsOf(value)) ? null : "format";
}

/** A bank account number: `min` (4 unless said) to 20 digits. */
export function checkAccountNumber(value: string, min = 4): FieldError | null {
  const d = digitsOf(value);
  return d.length >= min && /^\d{1,20}$/.test(d) ? null : "format";
}

/** A Colombian or Peruvian document number: 5 to 15 letters or digits. */
export function checkDocumentNumber(value: string): FieldError | null {
  return /^[A-Za-z0-9]{5,15}$/.test(value.trim()) ? null : "format";
}

/** One field's value against its kind (`context` carries a sibling the check depends on: the
    PIX key's type). Empty answers "required"; the caller decides whether that matters. */
export function checkField(kind: FieldKind, value: string, context: Record<string, string> = {}, options?: readonly string[], minDigits?: number): FieldError | null {
  const v = (value ?? "").trim();
  if (!v) return "required";
  switch (kind) {
    case "cbu":
      return checkCbu(v);
    case "alias":
      return checkAlias(v);
    case "cuit":
      return checkCuit(v);
    case "pixKeyType":
    case "accountTypeCo":
    case "accountTypeCl":
    case "documentTypeCo":
    case "documentTypePe":
      return options && !options.includes(v) ? "format" : null;
    case "pixKey":
      return checkPixKey(context.keyType ?? context.pixKeyType ?? "", v);
    case "documentNumber":
      return checkDocumentNumber(v);
    case "cpfCnpj":
      return checkCpfCnpj(v);
    case "clabe":
      return checkClabe(v);
    case "rfc":
      return checkRfc(v);
    case "bank":
    case "text":
      return v.length <= 80 ? null : "format";
    case "accountNumber":
      return checkAccountNumber(v, minDigits);
    case "cci":
      return checkCci(v);
    case "dniRuc":
      return checkDniRuc(v);
    case "rut":
      return checkRut(v);
    case "nitCc":
      return checkNitCc(v);
    default:
      return null;
  }
}

/** A holder name: two characters at least, no digits-only, at most 80. */
export function checkHolderName(value: string): FieldError | null {
  const v = (value ?? "").trim();
  if (!v) return "required";
  return v.length >= 2 && v.length <= 80 && /\p{L}/u.test(v) ? null : "format";
}

export interface AccountInput {
  holderName: string;
  details: Record<string, string>;
  /* A payout's or a sale's beneficiary also carries a document (checkBeneficiary). */
  document?: string;
}

/** Every problem with an account on `rail`, by field key ("holderName" or a detail key); empty
    when it can be sent. In a `oneOf` group exactly one member is filled (the server refuses a CBU
    and an alias together), and it must be valid. */
export function checkAccount(railId: string, input: AccountInput): Record<string, FieldError> {
  const errors: Record<string, FieldError> = {};
  const holder = checkHolderName(input.holderName);
  if (holder) errors.holderName = holder;
  if (!isRailId(railId)) {
    for (const [key, value] of Object.entries(input.details)) if (!String(value ?? "").trim()) errors[key] = "required";
    return errors;
  }
  const rail = RAILS[railId];
  const groups = new Map<string, RailField[]>();
  for (const field of rail.fields) {
    const value = String(input.details[field.key] ?? "").trim();
    if (field.oneOf) {
      groups.set(field.oneOf, [...(groups.get(field.oneOf) ?? []), field]);
      if (value) {
        const e = checkField(field.kind, value, input.details, field.options, field.minDigits);
        if (e) errors[field.key] = e;
      }
      continue;
    }
    if (!value && field.optional) continue;
    const e = checkField(field.kind, value, input.details, field.options, field.minDigits);
    if (e) errors[field.key] = e;
  }
  for (const members of groups.values()) {
    const filled = members.filter((f) => String(input.details[f.key] ?? "").trim());
    if (!filled.length) errors[members[0].key] = "required";
    else if (filled.length > 1) errors[filled[filled.length - 1].key] = "exclusive";
  }
  return errors;
}

/** The holder's document a rail keeps among its details (a CUIT, a RUT, a document number), or
    the PIX key itself when it is a CPF or CNPJ; empty when the rail has none. */
export function documentOf(railId: string, details: Record<string, string>): string {
  if (!isRailId(railId)) return "";
  const rail = RAILS[railId];
  if (rail.documentKey) return String(details[rail.documentKey] ?? "").trim();
  if (railId === "br_pix" && (details.keyType === "cpf" || details.keyType === "cnpj")) return String(details.key ?? "").replace(/\D/g, "");
  return "";
}

/** A beneficiary (a payout's, or the seller's own account on a sale): the account, and the
    holder's document the server also asks for (4 to 20 letters, digits, dots, hyphens or
    slashes), taken from the details when the rail keeps one. */
export function checkBeneficiary(railId: string, input: AccountInput): Record<string, FieldError> {
  const errors = checkAccount(railId, input);
  const doc = (input.document ?? "").trim() || documentOf(railId, input.details);
  if (!doc) errors.document = "required";
  else if (!/^[A-Za-z0-9./-]{4,20}$/.test(doc)) errors.document = "format";
  return errors;
}

/** The details a rail keeps, trimmed, without empty or unknown keys (an alias lower-cased, digits
    without spaces or dots). */
export function normalizeDetails(railId: string, details: Record<string, string>): Record<string, string> {
  if (!isRailId(railId)) {
    return Object.fromEntries(Object.entries(details).map(([k, v]) => [k, String(v ?? "").trim()]).filter(([, v]) => v));
  }
  const out: Record<string, string> = {};
  for (const field of RAILS[railId].fields) {
    let v = String(details[field.key] ?? "").trim();
    if (!v) continue;
    if (field.kind === "alias") v = v.toLowerCase();
    if (["cbu", "clabe", "cci", "accountNumber"].includes(field.kind)) v = v.replace(/[\s.-]/g, "");
    out[field.key] = v;
  }
  return out;
}

/* --- The payer's identity: who must send the transfer on a purchase (a BUY order or a charge).
   Merchants check the money comes from that person, so the document is required. --- */

/** The payer's document for a payment in `currency`: Argentina a DNI or CUIT/CUIL, Brazil a CPF or
    CNPJ, Mexico an RFC or CURP, Colombia a citizen card or NIT, Peru a DNI or RUC, Chile a RUT;
    any other currency 4 to 20 letters and digits. */
export function checkPayerDocument(currency: string, value: string): FieldError | null {
  const v = (value ?? "").trim();
  if (!v) return "required";
  switch (currency) {
    case "ARS":
      return digitsOf(v).length <= 8 ? checkDni(v) : checkCuit(v);
    case "BRL":
      return checkCpfCnpj(v);
    case "MXN":
      return v.length >= 18 ? checkCurp(v) : checkRfc(v);
    case "COP":
      return checkNitCc(v);
    case "PEN":
      return checkDniRuc(v);
    case "CLP":
      return checkRut(v);
    default:
      return /^[A-Za-z0-9.-]{4,20}$/.test(v) ? null : "format";
  }
}

/** An email address, as the payer types it for the receipt. */
export function checkEmail(value: string): FieldError | null {
  const v = (value ?? "").trim();
  if (!v) return "required";
  return v.length <= 254 && EMAIL.test(v) ? null : "format";
}
