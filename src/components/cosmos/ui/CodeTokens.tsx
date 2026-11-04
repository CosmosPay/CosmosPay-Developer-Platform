/* CodeTokens.tsx: highlighted code for the React views (company site, dashboard), from the same
   tokens Code.astro renders on the payments pages (src/lib/highlight.ts), coloured by cosmos.css's
   .tk-* rules. Text in spans, never an HTML string; the lines are joined with real newlines, so
   the element it sits in (a <pre>, or anything with white-space: pre / pre-wrap) lays them out
   and a selection copies the source as written. Copy buttons keep copying their own string. */
import { Fragment, useMemo } from "react";
import { highlightLines, type CodeLang } from "@/lib/highlight";

export function CodeTokens({ code, lang }: { code: string; lang: CodeLang }) {
  const lines = useMemo(() => highlightLines(code, lang), [code, lang]);
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && "\n"}
          {line.map((t, j) => (t.kind === "plain" ? <Fragment key={j}>{t.text}</Fragment> : <span key={j} className={`tk-${t.kind}`}>{t.text}</span>))}
        </Fragment>
      ))}
    </>
  );
}
