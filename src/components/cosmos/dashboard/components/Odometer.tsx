/* Odometer: a figure that counts up digit by digit (product owner: the money-rising effect of the
   payments landing, here too). Each digit is a strip of 0-9 that spins two turns and settles, the
   strips starting one after another from the left; every other character (currency, separators)
   stands still. It plays when it mounts and again when its text changes (the face is keyed by the
   text, so a new figure starts from zero). Assistive tech reads the text once (a visually hidden
   copy); the strips are hidden from it. Runs for everyone. */
import { useEffect, useState, type CSSProperties } from "react";

const TURNS = 2;

function Face({ text }: { text: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    // Two frames: the strips are drawn at zero before they move.
    let b = 0;
    const a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setOn(true)); });
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); };
  }, []);
  let k = 0;
  return (
    <span className={`odo${on ? " is-on" : ""}`} aria-hidden="true">
      {Array.from(text).map((ch, i) => {
        if (!/\d/.test(ch)) return <span key={i}>{ch}</span>;
        const to = TURNS * 10 + Number(ch);
        return (
          <span key={i} className="odo-d">
            <span className="odo-s" style={{ "--to": to, "--k": k++ } as CSSProperties}>
              {Array.from({ length: to + 1 }, (_, d) => <span key={d}>{d % 10}</span>)}
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function Odometer({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`odo-wrap${className ? ` ${className}` : ""}`}>
      <span className="sr-only">{text}</span>
      <Face key={text} text={text} />
    </span>
  );
}
