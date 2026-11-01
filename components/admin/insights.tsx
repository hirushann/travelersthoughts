import { Suspense, type ReactNode } from "react";
import { getSearch, getSpeed, getTraffic, type Result, type Vital } from "@/lib/insights";

const num = (n: number) => new Intl.NumberFormat("en-US", { notation: n >= 10_000 ? "compact" : "standard" }).format(Math.round(n));

function Change({ now, before, lowerIsBetter = false }: { now: number; before: number; lowerIsBetter?: boolean }) {
  if (!before) return null;
  const pct = ((now - before) / before) * 100;
  if (Math.abs(pct) < 0.5) return <span className="text-xs text-muted">no change</span>;
  const good = lowerIsBetter ? pct < 0 : pct > 0;
  return (
    <span className={`text-xs font-medium ${good ? "text-sea" : "text-accent"}`}>
      {pct > 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

function Stat({ label, value, change }: { label: string; value: string; change?: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-3xl font-semibold tabular-nums">{value}</span>
        {change}
      </p>
    </div>
  );
}

function Widget({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-xs text-muted">{note}</span>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function NotConnected({ error }: { error: string }) {
  return (
    <p className="rounded-xl bg-sunken px-4 py-3 text-sm text-muted">
      Couldn&rsquo;t load: {error} See “Dashboard insights” in the README.
    </p>
  );
}

const Loading = () => <p className="h-32 animate-pulse rounded-xl bg-sunken" aria-label="Loading" />;

function List({ rows }: { rows: { label: string; value: string; href?: string }[] }) {
  if (!rows.length) return <p className="text-sm text-muted">No data yet.</p>;
  return (
    <ul className="divide-y divide-line text-sm">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center justify-between gap-4 py-2">
          {r.href ? (
            <a href={r.href} target="_blank" className="min-w-0 truncate hover:text-accent">{r.label}</a>
          ) : (
            <span className="min-w-0 truncate">{r.label}</span>
          )}
          <span className="shrink-0 text-muted tabular-nums">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

function unwrap<T>(result: Result<T>) {
  return "error" in result ? { error: result.error } : { data: result.data };
}

async function TrafficWidget() {
  const { data, error } = unwrap(await getTraffic());
  if (!data) return <NotConnected error={error!} />;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Visitors" value={num(data.users[0])} change={<Change now={data.users[0]} before={data.users[1]} />} />
        <Stat label="Page views" value={num(data.views[0])} change={<Change now={data.views[0]} before={data.views[1]} />} />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 [&>*]:min-w-0">
        <div>
          <h3 className="mb-1 text-xs font-medium text-muted">Top pages</h3>
          <List rows={data.topPages.map((p) => ({ label: p.path, value: num(p.views), href: p.path }))} />
        </div>
        <div>
          <h3 className="mb-1 text-xs font-medium text-muted">Where visitors come from</h3>
          <List rows={data.sources.map((s) => ({ label: s.name, value: num(s.sessions) }))} />
        </div>
      </div>
    </div>
  );
}

async function SearchWidget() {
  const { data, error } = unwrap(await getSearch());
  if (!data) return <NotConnected error={error!} />;
  const { now, before } = data;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Clicks" value={num(now.clicks)} change={<Change now={now.clicks} before={before.clicks} />} />
        <Stat label="Impressions" value={num(now.impressions)} change={<Change now={now.impressions} before={before.impressions} />} />
        <Stat label="Click rate" value={`${(now.ctr * 100).toFixed(1)}%`} />
        <Stat
          label="Avg. position"
          value={now.position ? now.position.toFixed(1) : "—"}
          change={<Change now={now.position} before={before.position} lowerIsBetter />}
        />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 [&>*]:min-w-0">
        <div>
          <h3 className="mb-1 text-xs font-medium text-muted">Top searches</h3>
          <List rows={data.queries.map((q) => ({ label: q.query, value: `${num(q.clicks)} clicks · #${q.position.toFixed(0)}` }))} />
        </div>
        <div>
          <h3 className="mb-1 text-xs font-medium text-muted">Top pages in Google</h3>
          <List rows={data.pages.map((p) => ({ label: new URL(p.page).pathname, value: `${num(p.clicks)} clicks`, href: p.page }))} />
        </div>
      </div>
    </div>
  );
}

const ratingStyle = { FAST: "bg-sea/12 text-sea", AVERAGE: "bg-sunken text-ink", SLOW: "bg-accent-soft text-accent" };
const ratingLabel = { FAST: "Good", AVERAGE: "Needs work", SLOW: "Poor" };

function VitalTile({ name, vital, format }: { name: string; vital?: Vital; format: (v: number) => string }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="text-xs text-muted">{name}</p>
      <p className="mt-1 font-semibold tabular-nums">{vital ? format(vital.value) : "—"}</p>
      {vital && <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${ratingStyle[vital.rating]}`}>{ratingLabel[vital.rating]}</span>}
    </div>
  );
}

async function SpeedWidget() {
  const { data, error } = unwrap(await getSpeed());
  if (!data) return <NotConnected error={error!} />;
  const scoreStyle = data.score >= 90 ? "text-sea" : data.score >= 50 ? "text-ink" : "text-accent";
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <span className={`font-display text-5xl font-semibold tabular-nums ${scoreStyle}`}>{data.score}</span>
        <p className="text-sm text-muted">
          PageSpeed score for the homepage on mobile (out of 100). Test run: LCP {data.lab.lcp}, blocking time {data.lab.tbt}, layout shift {data.lab.cls}.
        </p>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-medium text-muted">Core Web Vitals from real visitors (Chrome, last 28 days)</h3>
        {data.field ? (
          <div className="grid grid-cols-3 gap-3">
            <VitalTile name="Loading (LCP)" vital={data.field.lcp} format={(v) => `${(v / 1000).toFixed(1)} s`} />
            <VitalTile name="Responsiveness (INP)" vital={data.field.inp} format={(v) => `${Math.round(v)} ms`} />
            <VitalTile name="Visual stability (CLS)" vital={data.field.cls} format={(v) => v.toFixed(2)} />
          </div>
        ) : (
          <p className="text-sm text-muted">Google doesn&rsquo;t have enough real-visitor data for this site yet. It appears once traffic builds up.</p>
        )}
      </div>
      <a
        href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(data.url)}`}
        target="_blank"
        className="inline-block text-sm text-accent hover:text-accent-strong"
      >
        Full report on PageSpeed Insights ↗
      </a>
    </div>
  );
}

/** Traffic, Google Search and speed widgets for the dashboard. */
export function Insights() {
  return (
    <div className="mt-10 grid gap-8 xl:grid-cols-2 [&>*]:min-w-0">
      <Widget title="Traffic" note="Google Analytics · last 28 days vs the 28 before">
        <Suspense fallback={<Loading />}><TrafficWidget /></Suspense>
      </Widget>
      <Widget title="Google Search" note="Search Console · 28 days, ~3 days behind">
        <Suspense fallback={<Loading />}><SearchWidget /></Suspense>
      </Widget>
      <Widget title="Speed" note="PageSpeed Insights · refreshed daily">
        <Suspense fallback={<Loading />}><SpeedWidget /></Suspense>
      </Widget>
    </div>
  );
}
