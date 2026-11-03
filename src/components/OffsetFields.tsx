/** Scadenza relativa: "[N] giorni [prima|dopo] l'apertura". Vuoto = senza scadenza. */
export function OffsetFields({ offset }: { offset?: number | null }) {
  const n = offset === null || offset === undefined ? "" : String(Math.abs(offset));
  const dir = offset !== null && offset !== undefined && offset > 0 ? "dopo" : "prima";
  return (
    <div className="flex basis-full items-center gap-1.5 sm:flex-1 sm:basis-auto">
      <input
        type="number"
        min={0}
        name="offset_n"
        defaultValue={n}
        placeholder="giorni"
        className="input w-24 shrink-0"
        title="Giorni (vuoto = senza scadenza, 0 = giorno di apertura)"
      />
      <select name="offset_dir" defaultValue={dir} className="input min-w-0 flex-1 sm:w-auto">
        <option value="prima">g prima apertura</option>
        <option value="dopo">g dopo apertura</option>
      </select>
    </div>
  );
}
