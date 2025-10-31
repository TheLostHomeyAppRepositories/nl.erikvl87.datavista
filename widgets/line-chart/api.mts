import { ExtendedInsightsLogs, ExtendedLog } from 'homey-api';
import type { ApiRequest } from '../../Types.mjs';
import { BaseWidgetApi } from '../BaseWidgetApi.mjs';

interface InsightWidgetDataPayload {
	data: {
		insight: { units?: string };
		logs: ExtendedInsightsLogs;
	};
	name: string;
}

type Timeframe = 'hour' | 'day' | 'week' | 'month' | 'year' | '60minutes' | '24hours' | '7days' | '31days' | '365days';
type Period = 'this' | 'last';

class LineChartWidgetApi extends BaseWidgetApi {
	// Rolling resolutions map for quick checks
	private static readonly rollingResolutionsSet = new Set([
		'last60Minutes','this60Minutes','last24Hours','this24Hours','last7Days','this7Days','last31Days','this31Days','last365Days','this365Days'
	]);

	// Internal mapping using camelCase keys for lint compliance; exposed timeframe strings map to these.
	private static readonly periodShiftMap: Record<string, { unit: 'hours' | 'date' | 'month' | 'year'; value: number }> = {
		'hour': { unit: 'hours', value: 1 },
		'day': { unit: 'hours', value: 24 },
		'week': { unit: 'date', value: 7 },
		'month': { unit: 'month', value: 1 },
		'year': { unit: 'year', value: 1 },
		'sixtyMinutes': { unit: 'hours', value: 1 },
		'twentyFourHours': { unit: 'date', value: 1 },
		'sevenDays': { unit: 'date', value: 7 },
		'thirtyOneDays': { unit: 'date', value: 31 },
		'threeHundredSixtyFiveDays': { unit: 'date', value: 365 },
	};

	private static mapTimeframeKey(tf: Timeframe): string {
		switch (tf) {
			case '60minutes': return 'sixtyMinutes';
			case '24hours': return 'twentyFourHours';
			case '7days': return 'sevenDays';
			case '31days': return 'thirtyOneDays';
			case '365days': return 'threeHundredSixtyFiveDays';
			default: return tf;
		}
	}

	private applyNormalizationShift(date: Date, timeframe: Timeframe, shouldShift: boolean, isThisPeriod: boolean): Date {
		if (!shouldShift) return date;
		const cfg = LineChartWidgetApi.periodShiftMap[LineChartWidgetApi.mapTimeframeKey(timeframe)];
		const d = new Date(date.getTime());
		const dir = isThisPeriod ? -1 : 1; // replicate previous logic: 'this' moved backwards
		switch (cfg.unit) {
			case 'hours':
				d.setHours(d.getHours() + dir * cfg.value);
				break;
			case 'date':
				d.setDate(d.getDate() + dir * cfg.value);
				break;
			case 'month':
				d.setMonth(d.getMonth() + dir * cfg.value);
				break;
			case 'year':
				d.setFullYear(d.getFullYear() + dir * cfg.value);
				break;
		}
		return d;
	}

	public async datasource({ homey, body }: ApiRequest): Promise<{
		data1: [Date, number | '-'][];
		data2: [Date, number | '-'][];
		updatesIn: number;
		name1?: string;
		name2?: string;
		units1: string;
		units2: string;
		windowStart: Date | null;
		windowEnd: Date | null;
	} | null> {
		const settings = body.settings as {
			timeframe: Timeframe;
			period1: Period;
			period2: Period;
		}

		const results1 = await this.getDatasource(homey.app, body.datasource1);
		const results2 = await this.getDatasource(homey.app, body.datasource2);

		if (results1 == null && results2 == null) return null;
		if (results1 !== null && !BaseWidgetApi.isDataType(results1, { datapoint: true })) {
			void homey.app.logger.logMessage(`[${this.constructor.name}]: Unsupported data type for widget: ${results1.type}`, true, results1);
			return null;
		}

		if (results2 !== null && !BaseWidgetApi.isDataType(results2, { datapoint: true })) {
			void homey.app.logger.logMessage(`[${this.constructor.name}]: Unsupported data type for widget: ${results2.type}`, true, results2);
			return null;
		}

		const insights1 = (results1 as InsightWidgetDataPayload | null)?.data.logs ?? null;
		const insights2 = (results2 as InsightWidgetDataPayload | null)?.data.logs ?? null;

		// Helper to build rolling window definitions
		const buildWindow = (now: number, timeframe: string): { start: Date; end: Date; context: boolean } | null => {
			const minuteMs = 60 * 1000;
			const hourMs = 60 * 60 * 1000;
			const dayMs = 24 * hourMs;
			switch (timeframe) {
				case 'this60Minutes': return { start: new Date(now - 60 * minuteMs), end: new Date(now), context: false };
				case 'last60Minutes': return { start: new Date(now - 120 * minuteMs), end: new Date(now - 60 * minuteMs), context: true };
				case 'this24Hours': return { start: new Date(now - 24 * hourMs), end: new Date(now), context: false };
				case 'last24Hours': return { start: new Date(now - 48 * hourMs), end: new Date(now - 24 * hourMs), context: true };
				case 'this7Days': return { start: new Date(now - 7 * dayMs), end: new Date(now), context: false };
				case 'last7Days': return { start: new Date(now - 14 * dayMs), end: new Date(now - 7 * dayMs), context: true };
				case 'this31Days': return { start: new Date(now - 31 * dayMs), end: new Date(now), context: false };
				case 'last31Days': return { start: new Date(now - 62 * dayMs), end: new Date(now - 31 * dayMs), context: false };
				case 'this365Days': return { start: new Date(now - 365 * dayMs), end: new Date(now), context: false };
				case 'last365Days': return { start: new Date(now - 730 * dayMs), end: new Date(now - 365 * dayMs), context: false };
				default: return null;
			}
		};

		const trimmingWindows: Record<string, { start: Date; end: Date }> = {};
		const applyTrimming = (insights: ExtendedInsightsLogs | null, resolution: string | undefined): ExtendedInsightsLogs | null => {
			if (!insights || !resolution) return insights;
			const def = buildWindow(Date.now(), resolution);
			if (!def) return insights; // not a rolling resolution
			trimmingWindows[resolution] = { start: def.start, end: def.end };
			return this.trimInsightToWindow({ logs: insights, insight: { title: '' } as ExtendedLog }, def.start, def.end, def.context)?.logs ?? null;
		};

		// Replace insights variables with trimmed logs where applicable
		const insightResolution1 = (body.datasource1 && 'insightResolution' in body.datasource1) ? (body.datasource1 as { insightResolution?: string }).insightResolution : undefined;
		const insightResolution2 = (body.datasource2 && 'insightResolution' in body.datasource2) ? (body.datasource2 as { insightResolution?: string }).insightResolution : undefined;
		const trimmed1 = applyTrimming(insights1, insightResolution1);
		const trimmed2 = applyTrimming(insights2, insightResolution2);
		const effectiveInsights1 = trimmed1 ?? insights1;
		const effectiveInsights2 = trimmed2 ?? insights2;

		const step1 = effectiveInsights1?.step ?? Number.MAX_SAFE_INTEGER;
		const updatesIn1 = effectiveInsights1?.updatesIn ?? 0;
		const step2 = effectiveInsights2?.step ?? Number.MAX_SAFE_INTEGER;
		const updatesIn2 = effectiveInsights2?.updatesIn ?? 0;
		const updatesIn = Math.min(step1 - updatesIn1, step2 - updatesIn2);

		const differentTimeframes = settings.period1 !== settings.period2;

		// This is to take the longest timeframe in case of different timeframes (e.g. month with 31 days and month with 30 days)
		let timeframeToAdjust: Period = 'this';
		if (differentTimeframes && settings.timeframe === 'month') {
			const firstDate1 = insights1?.values?.[0]?.t ?? null;
			const firstDate2 = insights2?.values?.[0]?.t ?? null;
			if (firstDate1 && firstDate2) {
				const date1 = new Date(firstDate1);
				const date2 = new Date(firstDate2);
				const daysInMonth1 = new Date(date1.getFullYear(), date1.getMonth() + 1, 0).getDate();
				const daysInMonth2 = new Date(date2.getFullYear(), date2.getMonth() + 1, 0).getDate();
				if (daysInMonth1 < daysInMonth2) {
					timeframeToAdjust = settings.period1;
				} else if (daysInMonth1 > daysInMonth2) {
					timeframeToAdjust = settings.period2;
				}
			}
		}

		let entries1 = effectiveInsights1 ? [...(effectiveInsights1.values ?? []), effectiveInsights1.lastValue] : [];
		let entries2 = effectiveInsights2 ? [...(effectiveInsights2.values ?? []), effectiveInsights2.lastValue] : [];

		if (settings.timeframe === 'hour') {
			// Hours need adjustments as it is subdata from last6Hours
			const filterEntries = (entries: { t: string; v: number }[], period: Period): { t: string; v: number }[] => {
				const last = new Date(entries[entries.length - 1].t);
				let start: Date;
				let end: Date;
		
				if (period === 'last') {
					start = new Date(last.getTime() - 1 * 3600000); // Subtract 1 hour
					start.setMinutes(0, 0, 0);
					end = new Date(start.getTime() + 3600000); // Add 1 hour
				} else if (period === 'this') {
					start = new Date(last.getTime());
					start.setMinutes(0, 0, 0);
					end = last;
				}
		
				return entries.filter(({ t }) => {
					const date = new Date(t);
					return date >= start && date <= end;
				});
			};

			// Apply the inline function to both entries1 and entries2
			if (entries1.length)
				entries1 = filterEntries(entries1, settings.period1);
			

			if (entries2.length)
				entries2 = filterEntries(entries2, settings.period2);
		}

		const shouldShift = differentTimeframes;

		const normalizeData = (
			period: Period,
			point: { t: string; v: number },
			_periodToAdjust: Period, // retained for signature compatibility; no longer needed internally
		): [Date, number | '-'] => {
			let date = new Date(point.t);
			date = this.applyNormalizationShift(date, settings.timeframe, shouldShift && period === timeframeToAdjust, period === 'this');
			if (point.v == null) return [date, '-'];
			return [date, parseFloat(point.v.toFixed(2))];
		};

		const data1: [Date, number | '-'][] = effectiveInsights1
			? entries1.map((point, _index) =>
				normalizeData(settings.period1, point, timeframeToAdjust),
			)
			: [];

		const data2: [Date, number | '-'][] = effectiveInsights2
			? entries2.map((point, _index) =>
				normalizeData(settings.period2, point, timeframeToAdjust),
			)
			: [];

		const units1 = (results1 && (results1 as InsightWidgetDataPayload).data?.insight?.units) ? (results1 as InsightWidgetDataPayload).data.insight.units! : '';
		const units2 = (results2 && (results2 as InsightWidgetDataPayload).data?.insight?.units) ? (results2 as InsightWidgetDataPayload).data.insight.units! : '';
		// Determine window boundaries per datasource
		const rollingResolutions = LineChartWidgetApi.rollingResolutionsSet;
		const resolveWindow = (
			trimmed: ExtendedInsightsLogs | null,
			original: ExtendedInsightsLogs | null,
			resolution: string | undefined,
			data: [Date, number | '-'][],
			entries: { t: string; v: number }[],
		): { start: Date | null; end: Date | null } => {
			if (resolution && rollingResolutions.has(resolution)) {
				// Use ORIGINAL trimming input window, not derived data start/end
				const tw = trimmingWindows[resolution];
				return { start: tw?.start ?? null, end: tw?.end ?? null };
			}
			// Non-rolling: derive from raw entries (pre-normalization) to avoid double shifting
			if (!entries.length) return { start: null, end: null };
			const start = new Date(entries[0].t);
			const end = new Date(entries[entries.length - 1].t);
			return { start, end };
		};
		const w1 = resolveWindow(trimmed1, insights1, insightResolution1, data1, entries1 as { t: string; v: number }[]);
		const w2 = resolveWindow(trimmed2, insights2, insightResolution2, data2, entries2 as { t: string; v: number }[]);

		// Adjust per-datasource window boundaries if normalization (timeframe shift) was applied
		const adjustWindow = (start: Date | null, end: Date | null, period: Period): { start: Date | null; end: Date | null } => {
			if (!start || !end) return { start, end };
			if (!(shouldShift && period === timeframeToAdjust)) return { start, end };
			return {
				start: this.applyNormalizationShift(start, settings.timeframe, true, period === 'this'),
				end: this.applyNormalizationShift(end, settings.timeframe, true, period === 'this'),
			};
		};

		const adjW1 = adjustWindow(w1.start, w1.end, settings.period1);
		const adjW2 = adjustWindow(w2.start, w2.end, settings.period2);

		// Consolidate to single windowStart/windowEnd using adjusted windows
		let windowStart: Date | null = null;
		let windowEnd: Date | null = null;
		const starts = [adjW1.start, adjW2.start].filter(Boolean) as Date[];
		const ends = [adjW1.end, adjW2.end].filter(Boolean) as Date[];
		if (starts.length) windowStart = new Date(Math.min(...starts.map(d => d.getTime())));
		if (ends.length) windowEnd = new Date(Math.max(...ends.map(d => d.getTime())));

		const result = {
			data1,
			data2,
			updatesIn,
			name1: results1?.name,
			name2: results2?.name,
			units1,
			units2,
			windowStart,
			windowEnd,
		};
		
		return result;
	}

	/**
	 * Trim an insight response to a specific time window. Returns null if no data remains within the window.
	 * (Moved from BaseWidgetApi for widget-specific usage.)
	 */
	private trimInsightToWindow(
		result: { logs: ExtendedInsightsLogs; insight: ExtendedLog } | null,
		windowStart: Date,
		windowEnd: Date,
		includeContextPoints: boolean = false,
	): { logs: ExtendedInsightsLogs; insight: ExtendedLog } | null {
		if (!result) return null;
		const startMs = windowStart.getTime();
		const endMs = windowEnd.getTime();
		if (Number.isNaN(startMs) || Number.isNaN(endMs)) return result;
		if (endMs <= startMs) return result;

		const allPoints = [
			...(result.logs.values ?? []),
			result.logs.lastValue,
		].filter((point): point is { t: string; v: number } => point != null);

		const filtered = allPoints.filter((point) => {
			const timestamp = new Date(point.t).getTime();
			return timestamp >= startMs && timestamp <= endMs;
		});
		if (filtered.length === 0) return null; // keep behavior: no points inside window means no result

		// Optionally include one point just before and one point just after the window
		if (includeContextPoints) {
			let before: { t: string; v: number } | undefined;
			let after: { t: string; v: number } | undefined;
			for (const p of allPoints) {
				const ts = new Date(p.t).getTime();
				if (ts < startMs) {
					if (!before || new Date(before.t).getTime() < ts) before = p; // closest before
				} else if (ts > endMs) {
					if (!after || new Date(after.t).getTime() > ts) after = p; // first after (closest since we compare greater and want minimal)
				}
			}
			if (before) filtered.unshift(before);
			if (after) filtered.push(after);
		}

		filtered.sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());
		const lastPoint = filtered[filtered.length - 1];
		const values = filtered.slice(0, -1);
		const start = values.length > 0 ? values[0].t : lastPoint.t;
		const end = lastPoint.t;

		return {
			insight: result.insight,
			logs: {
				...result.logs,
				values,
				start,
				end,
				lastValue: lastPoint,
			},
		};
	}
}


export default new LineChartWidgetApi();