/* p2pRails.test.ts: the account and document checks the P2P screens run before anything leaves the
   browser (src/lib/p2p/rails.ts). Each mirrors the community server's rail table; a value the
   server would refuse must be refused here first, and a real account must never be. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RAILS, RAIL_IDS, railsFor, fiatDecimals, checkCbu, checkAlias, checkCuit, checkDni, checkCpf, checkCnpj, checkPixKey,
  checkClabe, checkRfc, checkCurp, checkCci, checkRuc, checkDniRuc, checkRut, checkNitCc, checkAccount, normalizeDetails,
  checkPayerDocument, checkEmail, checkHolderName, isRailId,
} from "@/lib/p2p/rails";

test("the rail table names each rail once, with its currency and a document", () => {
  assert.deepEqual(RAIL_IDS.sort(), ["ar_bank_transfer", "br_pix", "cl_bank_transfer", "co_bank_transfer", "mx_spei", "pe_bank_transfer"]);
  for (const id of RAIL_IDS) {
    assert.equal(RAILS[id].id, id);
    assert.match(RAILS[id].currency, /^[A-Z]{3}$/);
    assert.ok(RAILS[id].fields.length > 0, id);
  }
  assert.deepEqual(railsFor("ARS").map((r) => r.id), ["ar_bank_transfer"]);
  assert.deepEqual(railsFor("EUR"), []);
  assert.equal(fiatDecimals("CLP"), 0);
  assert.equal(fiatDecimals("ARS"), 2);
  assert.ok(isRailId("br_pix"));
  assert.ok(!isRailId("toString"));
});

test("CBU and CVU: 22 digits and both check digits", () => {
  assert.equal(checkCbu("0170099222000001234561"), null);
  assert.equal(checkCbu("2850590940090418135201"), null);
  assert.equal(checkCbu("0000003110000000123456"), null, "a CVU uses the same checks");
  assert.equal(checkCbu("0170 0992 2200 0001 2345 61"), null, "spaces are ignored");
  assert.equal(checkCbu("0170099322000001234561"), "checksum", "first block's check digit");
  assert.equal(checkCbu("0170099222000001234562"), "checksum", "second block's check digit");
  assert.equal(checkCbu("017009922200000123456"), "format");
  assert.equal(checkCbu("01700992220000012345ab"), "format");
});

test("alias: 6 to 20 letters, digits, dots or hyphens", () => {
  for (const ok of ["mi.alias.mp", "CASA-PERRO-SOL", "abc123"]) assert.equal(checkAlias(ok), null, ok);
  for (const bad of ["corto", "un alias", "a".repeat(21), "alias_con_guion"]) assert.equal(checkAlias(bad), "format", bad);
});

test("CUIT, CUIL and DNI", () => {
  assert.equal(checkCuit("20-32964233-0"), null);
  assert.equal(checkCuit("30500010912"), null);
  assert.equal(checkCuit("20329642331"), "checksum");
  assert.equal(checkCuit("99329642330"), "format", "unknown type prefix");
  assert.equal(checkDni("32.964.233"), null);
  assert.equal(checkDni("123"), "format");
});

test("CPF and CNPJ, and the PIX key types", () => {
  assert.equal(checkCpf("529.982.247-25"), null);
  assert.equal(checkCpf("52998224724"), "checksum");
  assert.equal(checkCpf("11111111111"), "checksum", "all the same digit");
  assert.equal(checkCnpj("11.222.333/0001-81"), null);
  assert.equal(checkCnpj("11222333000182"), "checksum");
  assert.equal(checkPixKey("cpf", "52998224725"), null);
  assert.equal(checkPixKey("cnpj", "11222333000181"), null);
  assert.equal(checkPixKey("email", "joao@example.com"), null);
  assert.equal(checkPixKey("email", "joao@"), "format");
  assert.equal(checkPixKey("phone", "+55 11 91234-5678"), null);
  assert.equal(checkPixKey("phone", "11912345678"), "format", "the country code is required");
  assert.equal(checkPixKey("evp", "123e4567-e89b-12d3-a456-426614174000"), null);
  assert.equal(checkPixKey("evp", "123e4567e89b12d3a456426614174000"), "format");
  assert.equal(checkPixKey("other", "x"), "format");
  assert.equal(checkPixKey("email", " "), "required");
});

test("CLABE, RFC and CURP", () => {
  assert.equal(checkClabe("002010077777777771"), null);
  assert.equal(checkClabe("032180000118359719"), null);
  assert.equal(checkClabe("002010077777777772"), "checksum");
  assert.equal(checkClabe("00201007777777777"), "format");
  assert.equal(checkRfc("GODE561231GR8"), null);
  assert.equal(checkRfc("ABC010101AB1"), null, "a company's has 12 characters");
  assert.equal(checkRfc("GODE5612"), "format");
  assert.equal(checkCurp("GODE561231HDFRRN09"), null);
});

test("Peru, Chile and Colombia", () => {
  assert.equal(checkCci("00219300123456789012"), null);
  assert.equal(checkCci("0021930012345678901"), "format");
  assert.equal(checkRuc("20100070970"), null);
  assert.equal(checkRuc("20100070971"), "checksum");
  assert.equal(checkDniRuc("46779354"), null);
  assert.equal(checkRut("12.345.678-5"), null);
  assert.equal(checkRut("11111111-1"), null);
  assert.equal(checkRut("12.345.678-K"), "checksum");
  assert.equal(checkRut("123"), "format");
  assert.equal(checkNitCc("1020304050"), null);
  assert.equal(checkNitCc("12"), "format");
});

test("an account: holder, document and the rail's fields, with one-of groups", () => {
  const ar = (details: Record<string, string>, document = "20329642330") => checkAccount("ar_bank_transfer", { holderName: "Ana Gómez", document, details });
  assert.deepEqual(ar({ cbu: "0170099222000001234561" }), {});
  assert.deepEqual(ar({ alias: "ana.gomez.mp" }), {}, "an alias alone is enough");
  assert.deepEqual(ar({}), { cbu: "required" }, "a CBU or an alias");
  assert.deepEqual(ar({ cbu: "0170099222000001234562", alias: "ana.gomez.mp" }), { cbu: "checksum" }, "a filled member must be valid");
  assert.deepEqual(ar({ alias: "ana.gomez.mp" }, ""), { document: "required" });
  assert.deepEqual(checkAccount("br_pix", { holderName: "João", document: "52998224725", details: { pixKeyType: "phone", pixKey: "+5511912345678" } }), {});
  assert.deepEqual(checkAccount("br_pix", { holderName: "João", document: "52998224725", details: { pixKeyType: "fax", pixKey: "1" } }), { pixKeyType: "format", pixKey: "format" });
  assert.deepEqual(checkAccount("mx_spei", { holderName: "María", document: "", details: { clabe: "002010077777777771" } }), {}, "the RFC is optional");
  assert.deepEqual(checkAccount("mx_spei", { holderName: "1", document: "x", details: { clabe: "1" } }), { holderName: "format", document: "format", clabe: "format" });
  assert.deepEqual(checkAccount("cl_bank_transfer", { holderName: "Pedro", document: "12345678-5", details: { bank: "Banco Estado", accountType: "vista", accountNumber: "12345678" } }), {});
  assert.deepEqual(checkAccount("unknown_rail", { holderName: "Pedro", document: "", details: { iban: "" } }), { iban: "required" });
});

test("details are kept trimmed, known keys only, account numbers without separators", () => {
  assert.deepEqual(normalizeDetails("ar_bank_transfer", { cbu: " 0170 0992 2200 0001 2345 61 ", alias: " ANA.GOMEZ ", extra: "x" }), { cbu: "0170099222000001234561", alias: "ana.gomez" });
  assert.deepEqual(normalizeDetails("unknown", { a: " 1 ", b: "" }), { a: "1" });
});

test("the payer's document follows the currency", () => {
  assert.equal(checkPayerDocument("ARS", "32964233"), null, "a DNI");
  assert.equal(checkPayerDocument("ARS", "20329642330"), null, "a CUIL");
  assert.equal(checkPayerDocument("ARS", "20329642331"), "checksum");
  assert.equal(checkPayerDocument("BRL", "52998224725"), null);
  assert.equal(checkPayerDocument("MXN", "GODE561231HDFRRN09"), null);
  assert.equal(checkPayerDocument("CLP", "12345678-5"), null);
  assert.equal(checkPayerDocument("PEN", "46779354"), null);
  assert.equal(checkPayerDocument("USD", "AB1234"), null);
  assert.equal(checkPayerDocument("ARS", ""), "required");
  assert.equal(checkEmail("ana@example.com"), null);
  assert.equal(checkEmail("ana@"), "format");
  assert.equal(checkHolderName("12345"), "format", "a name has letters");
  assert.equal(checkHolderName("Ana"), null);
});
