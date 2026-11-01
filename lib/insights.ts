import "server-only";
import { createSign } from "node:crypto";
import { cacheLife } from "next/cache";
import { site } from "./site";

/**
 * Traffic, search and speed numbers for the admin dashboard, read from Google's APIs.
 * Each result is cached for an hour (speed for a day), so the dashboard costs Google
 * a handful of calls per hour and adds no load to the site itself.
 */

export type Result<T> = { data: T } | { error: string };

const DAY = 24 * 60 * 60 * 1000;
const isoDay = (offsetDays: number) => new Date(Date.now() - offsetDays * DAY).toISOString().slice(0, 10);
const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

// ---- Auth: a service account signs a JWT and swaps it for an access token. ----

function serviceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  // hPanel can mangle multi-line values, so base64 of the key file is accepted too.
  const json = JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
  return { email: json.client_email as string, key: (json.private_key as string).replace(/\\n/g, "\n") };
}

async function accessToken(scope: string) {
  const account = serviceAccount();
  if (!account) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set.");
  const now = Math.floor(Date.now() / 1000);
  const b64 = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: account.email,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(account.key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Google sign-in failed: ${body.error_description ?? body.error ?? res.status}`);
  return body.access_token as string;
}

async function googlePost<T>(url: string, scope: string, payload: object): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken(scope)}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error?.message ?? `Google returned ${res.status}`);
  return body as T;
}

// ---- Google Analytics 4: visitors, views, top pages, sources (last 28 days). ----

export type Traffic = {
  users: [now: number, before: number];
  views: [now: number, before: number];
  topPages: { path: string; views: number }[];
  sources: { name: string; sessions: number }[];
};

type GaReport = { rows?: { dimensionValues?: { value: string }[]; metricValues: { value: string }[] }[] };

export async function getTraffic(): Promise<Result<Traffic>> {
  "use cache";
  const property = process.env.GA4_PROPERTY_ID?.trim();
  if (!property) {
    cacheLife("minutes");
    return { error: "GA4_PROPERTY_ID is not set." };
  }
  try {
    const run = (body: object) =>
      googlePost<GaReport>(
        `https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`,
        "https://www.googleapis.com/auth/analytics.readonly",
        body,
      );
    const last28 = { startDate: "28daysAgo", endDate: "yesterday" };
    const [totals, pages, sources] = await Promise.all([
      // Two date ranges: Google labels rows date_range_0 (now) and date_range_1 (before).
      run({
        dateRanges: [last28, { startDate: "56daysAgo", endDate: "29daysAgo" }],
        metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
      }),
      run({
        dateRanges: [last28],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 5,
      }),
      run({
        dateRanges: [last28],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 5,
      }),
    ]);
    const range = (i: number) => totals.rows?.find((r) => r.dimensionValues?.[0]?.value === `date_range_${i}`)?.metricValues;
    const metric = (i: number, m: number) => Number(range(i)?.[m]?.value ?? 0);
    cacheLife("hours");
    return {
      data: {
        users: [metric(0, 0), metric(1, 0)],
        views: [metric(0, 1), metric(1, 1)],
        topPages: (pages.rows ?? []).map((r) => ({ path: r.dimensionValues![0].value, views: Number(r.metricValues[0].value) })),
        sources: (sources.rows ?? []).map((r) => ({ name: r.dimensionValues![0].value, sessions: Number(r.metricValues[0].value) })),
      },
    };
  } catch (err) {
    cacheLife("minutes");
    return { error: errorText(err) };
  }
}

// ---- Search Console: clicks, impressions, position, top queries and pages. ----

export type SearchTotals = { clicks: number; impressions: number; ctr: number; position: number };
export type Search = {
  now: SearchTotals;
  before: SearchTotals;
  queries: { query: string; clicks: number; impressions: number; position: number }[];
  pages: { page: string; clicks: number; impressions: number }[];
};

type GscRow = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number };

export async function getSearch(): Promise<Result<Search>> {
  "use cache";
  const siteUrl = process.env.GSC_SITE_URL?.trim();
  if (!siteUrl) {
    cacheLife("minutes");
    return { error: "GSC_SITE_URL is not set." };
  }
  try {
    const query = (startDate: string, endDate: string, dimensions: string[] = [], rowLimit = 5) =>
      googlePost<{ rows?: GscRow[] }>(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        "https://www.googleapis.com/auth/webmasters.readonly",
        { startDate, endDate, dimensions, rowLimit },
      ).then((r) => r.rows ?? []);
    // Search Console data lags 2–3 days, so the 28-day window ends 3 days ago.
    const [end, start, prevEnd, prevStart] = [isoDay(3), isoDay(30), isoDay(31), isoDay(58)];
    const [now, before, queries, pages] = await Promise.all([
      query(start, end),
      query(prevStart, prevEnd),
      query(start, end, ["query"]),
      query(start, end, ["page"]),
    ]);
    const totals = (rows: GscRow[]): SearchTotals => rows[0] ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    cacheLife("hours");
    return {
      data: {
        now: totals(now),
        before: totals(before),
        queries: queries.map((r) => ({ query: r.keys![0], clicks: r.clicks, impressions: r.impressions, position: r.position })),
        pages: pages.map((r) => ({ page: r.keys![0], clicks: r.clicks, impressions: r.impressions })),
      },
    };
  } catch (err) {
    cacheLife("minutes");
    return { error: errorText(err) };
  }
}

// ---- PageSpeed Insights: lab score for the homepage plus real-visitor Core Web Vitals. ----

export type Vital = { value: number; rating: "FAST" | "AVERAGE" | "SLOW" };
export type Speed = {
  url: string;
  score: number;
  /** Real Chrome visitors over 28 days (Chrome UX Report); null until the site has enough traffic. */
  field: { lcp?: Vital; inp?: Vital; cls?: Vital; overall?: Vital["rating"] } | null;
  lab: { lcp: string; tbt: string; cls: string };
};

type CruxMetric = { percentile: number; category: Vital["rating"] };

export async function getSpeed(): Promise<Result<Speed>> {
  "use cache";
  const url = `${site.url}/`;
  const params = new URLSearchParams({ url, strategy: "mobile", category: "performance" });
  // Without a key, requests share a public quota that is usually exhausted.
  if (process.env.GOOGLE_API_KEY) params.set("key", process.env.GOOGLE_API_KEY.trim());
  try {
    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`, {
      signal: AbortSignal.timeout(90_000),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error?.message ?? `PageSpeed returned ${res.status}`);
    const audits = body.lighthouseResult.audits;
    const exp = body.originLoadingExperience ?? body.loadingExperience;
    const m = exp?.metrics as Record<string, CruxMetric> | undefined;
    const vital = (key: string, scale = 1): Vital | undefined =>
      m?.[key] ? { value: m[key].percentile / scale, rating: m[key].category } : undefined;
    cacheLife("days");
    return {
      data: {
        url,
        score: Math.round(body.lighthouseResult.categories.performance.score * 100),
        field: m
          ? {
              lcp: vital("LARGEST_CONTENTFUL_PAINT_MS"),
              inp: vital("INTERACTION_TO_NEXT_PAINT"),
              cls: vital("CUMULATIVE_LAYOUT_SHIFT_SCORE", 100),
              overall: exp.overall_category,
            }
          : null,
        lab: {
          lcp: audits["largest-contentful-paint"].displayValue,
          tbt: audits["total-blocking-time"].displayValue,
          cls: audits["cumulative-layout-shift"].displayValue,
        },
      },
    };
  } catch (err) {
    cacheLife("minutes");
    return { error: errorText(err) };
  }
}
