/** Scadenza relativa: "[N] giorni [prima|dopo] l'apertura". Vuoto = senza scadenza. */
export function OffsetFields({ offset }: { offset?: number | null }) {
  const n = offset === null || offset === undefined ? "" : String(Math.abs(offset));
  const dir = offset !== null && offset !== undefined && offset > 0 ? "dopo" : "prima";
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        name="offset_n"
        defaultValue={n}
        placeholder="—"
        className="input w-20"
        title="Giorni (vuoto = senza scadenza, 0 = giorno di apertura)"
      />
      <span className="text-sm text-stone-500">g</span>
      <select name="offset_dir" defaultValue={dir} className="input w-auto">
        <option value="prima">prima dell&apos;apertura</option>
        <option value="dopo">dopo l&apos;apertura</option>
      </select>
    </div>
  );
}
