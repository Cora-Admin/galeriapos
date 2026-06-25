import { useEffect, useState } from "react";
import { isoToDE, deToISO } from "../lib/dates.js";

// Deutsches Datums-Eingabefeld (TT.MM.JJJJ). value = ISO-String|null.
// onCommit(iso|null) wird beim Verlassen aufgerufen, wenn sich der Wert ändert.
export default function DateInputDE({ value, onCommit }) {
  const [text, setText] = useState(isoToDE(value));
  const [bad, setBad] = useState(false);

  useEffect(() => { setText(isoToDE(value)); setBad(false); }, [value]);

  function commit() {
    const res = deToISO(text);
    if (res === undefined) { setBad(true); return; }   // ungültige Eingabe
    setBad(false);
    if (res !== (value || null)) onCommit(res);
    else setText(isoToDE(value));
  }

  return (
    <div>
      <input className="input" placeholder="TT.MM.JJJJ" inputMode="numeric"
        value={text}
        onChange={(e) => { setText(e.target.value); if (bad) setBad(false); }}
        onBlur={commit}
        style={bad ? { borderColor: "var(--coral)", boxShadow: "0 0 0 3px color-mix(in srgb, var(--coral) 18%, transparent)" } : undefined } />
      {bad && <div style={{ fontSize: 11, color: "var(--coral)", marginTop: 4 }}>
        Bitte im Format TT.MM.JJJJ eingeben.</div>}
    </div>
  );
}
