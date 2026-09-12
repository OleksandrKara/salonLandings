import "./StatBand.css";

export interface Stat {
  /** The headline figure, already formatted for display — e.g. "4.8★", "98%", "3-4 wks". */
  value: string;
  /** One short line under the value — e.g. "125 Google reviews". */
  label: string;
}

export interface StatBandProps {
  stats: Stat[];
}

/** A row of headline trust stats — ratings, satisfaction rate, wear time. Built for the
 * above-the-fold trust band a cold Instagram/Facebook visitor sees before scrolling. */
export function StatBand({ stats }: StatBandProps) {
  return (
    <div className="ds-stat-band">
      {stats.map((s, i) => (
        <div className="ds-stat-band__item" key={i}>
          <div className="ds-stat-band__value">{s.value}</div>
          <div className="ds-stat-band__label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
