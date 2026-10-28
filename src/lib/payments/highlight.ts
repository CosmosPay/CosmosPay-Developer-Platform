/* highlight.ts: a small syntax highlighter for the payments landing's code samples.
   The samples are fixed strings written in this repo (curl, TypeScript, JSON, HTML), so a
   tokenizer of a few rules is enough and keeps the colours in the page's palette instead of an
   editor theme's. It never produces HTML: the result is tokens, rendered by Code.astro as text
   in spans. Lines are returned separately so the block can number them. */

export type CodeLang = "bash" | "ts" | "json" | "html";
export type TokenKind = "kw" | "str" | "num" | "com" | "key" | "fn" | "flag" | "tag" | "attr" | "punc" | "plain";
export interface Token {
  kind: TokenKind;
  text: string;
}

const TS_KEYWORDS = new Set([
  "import", "from", "export", "const", "let", "var", "await", "async", "new", "return",
  "function", "if", "else", "true", "false", "null", "undefined", "typeof",
]);

/** Runs `rules` over `src` from left to right; each rule is a sticky regex and the token kind
    it yields (or a function deciding the kind from the match and what follows it). */
function scan(src: string, rules: [RegExp, TokenKind | ((m: string, rest: string) => TokenKind)][]): Token[] {
  const out: Token[] = [];
  let at = 0;
  outer: while (at < src.length) {
    for (const [re, kind] of rules) {
      re.lastIndex = at;
      const m = re.exec(src);
      if (m && m[0].length) {
        const text = m[0];
        push(out, typeof kind === "function" ? kind(text, src.slice(at + text.length)) : kind, text);
        at += text.length;
        continue outer;
      }
    }
    push(out, "plain", src[at]);
    at += 1;
  }
  return out;
}

/** Appends a token, merging it into the previous one when both are of the same kind. */
function push(out: Token[], kind: TokenKind, text: string) {
  const last = out[out.length - 1];
  if (last && last.kind === kind) last.text += text;
  else out.push({ kind, text });
}

function tokenizeTs(src: string): Token[] {
  return scan(src, [
    [/\/\/[^\n]*/y, "com"],
    [/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/y, "str"],
    [/\b\d+(?:\.\d+)?\b/y, "num"],
    [/[A-Za-z_$][\w$]*/y, (word, rest) =>
      TS_KEYWORDS.has(word) ? "kw" : /^\s*\(/.test(rest) ? "fn" : /^\s*:/.test(rest) ? "key" : "plain"],
    [/[{}()[\];,.:=<>+\-*/!?|&]+/y, "punc"],
    [/\s+/y, "plain"],
  ]);
}

function tokenizeJson(src: string): Token[] {
  return scan(src, [
    [/"(?:[^"\\\n]|\\.)*"/y, (_m, rest) => (/^\s*:/.test(rest) ? "key" : "str")],
    [/-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/y, "num"],
    [/\b(?:true|false|null)\b/y, "kw"],
    [/[{}[\]:,]/y, "punc"],
    [/\s+/y, "plain"],
  ]);
}

function tokenizeBash(src: string): Token[] {
  const out: Token[] = [];
  const base = scan(src, [
    [/(?:^|(?<=\s))#[^\n]*/y, "com"],
    // a single-quoted JSON body (curl -d '{…}') is highlighted as JSON inside its quotes
    [/'(?:[^'])*'/y, "str"],
    [/"(?:[^"\\\n]|\\.)*"/y, "str"],
    [/(?:^|(?<=\s))--?[A-Za-z][\w-]*/y, "flag"],
    [/\b(?:curl|npm|npx|node)\b/y, "fn"],
    [/\\(?=\n)/y, "punc"],
    [/\s+/y, "plain"],
    [/[^\s'"\\]+/y, "plain"],
  ]);
  for (const t of base) {
    if (t.kind === "str" && t.text.startsWith("'{") && t.text.endsWith("}'")) {
      out.push({ kind: "punc", text: "'" });
      for (const inner of tokenizeJson(t.text.slice(1, -1))) push(out, inner.kind, inner.text);
      push(out, "punc", "'");
    } else push(out, t.kind, t.text);
  }
  return out;
}

function tokenizeHtml(src: string): Token[] {
  return scan(src, [
    [/<!--[\s\S]*?-->/y, "com"],
    [/<\/?[A-Za-z][\w-]*/y, "tag"],
    [/\/?>/y, "tag"],
    [/[A-Za-z_:][\w:.-]*(?==)/y, "attr"],
    [/=/y, "punc"],
    [/"[^"]*"|'[^']*'/y, "str"],
    [/\s+/y, "plain"],
    [/[^<\s]+/y, "plain"],
  ]);
}

const TOKENIZERS: Record<CodeLang, (src: string) => Token[]> = {
  bash: tokenizeBash,
  ts: tokenizeTs,
  json: tokenizeJson,
  html: tokenizeHtml,
};

/** The code's tokens, one array per line. Concatenating every token's text and joining the
    lines with "\n" gives back the source exactly. */
export function highlightLines(src: string, lang: CodeLang): Token[][] {
  const lines: Token[][] = [[]];
  for (const token of TOKENIZERS[lang](src)) {
    const parts = token.text.split("\n");
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ kind: token.kind, text: part });
    });
  }
  return lines;
}
