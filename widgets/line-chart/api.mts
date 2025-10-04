import { ExtendedInsightsLogs } from 'homey-api';
import type { ApiRequest } from '../../Types.mjs';
import { BaseWidgetApi } from '../BaseWidgetApi.mjs';

interface InsightWidgetDataPayload {
	data: {
		insight: { units?: string };
		logs: ExtendedInsightsLogs;
	};
	name: string;
}

type Timeframe = 'hour' | 'day' | 'week' | 'month' | 'year';
type Period = 'this' | 'last' | 'rolling';

class LineChartWidgetApi extends BaseWidgetApi {
	public async datasource({ homey, body }: ApiRequest): Promise<{
		data1: [Date, number | '-'][];
		data2: [Date, number | '-'][];
		updatesIn: number;
		name1?: string;
		name2?: string;
		units1: string;
		units2: string;
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

		const step1 = insights1?.step ?? Number.MAX_SAFE_INTEGER;
		const updatesIn1 = insights1?.updatesIn ?? 0;
		const step2 = insights2?.step ?? Number.MAX_SAFE_INTEGER;
		const updatesIn2 = insights2?.updatesIn ?? 0;
		const updatesIn = Math.min(step1 - updatesIn1, step2 - updatesIn2);

		// Rolling periods always overlap in time, so no need to adjust
		const differentTimeframes = settings.period1 !== 'rolling' && settings.period2 !== 'rolling' && settings.period1 !== settings.period2;
		const normalizeData = (
			period: Period,
			point: {
				t: string;
				v: number;
			},
			periodToAdjust: Period,
		): [Date, number | '-'] => {
			const date = new Date(point.t);

			if (differentTimeframes && period === periodToAdjust) {
				switch (settings.timeframe) {
					case 'hour':
						date.setHours(date.getHours() + (periodToAdjust === 'this' ? -1 : 1));
						break;
					case 'day':
						date.setHours(date.getHours() + (periodToAdjust === 'this' ? -24 : 24));
						break;
					case 'week':
						date.setDate(date.getDate() + (periodToAdjust === 'this' ? -7 : 7));
						break;
					case 'month':
						date.setMonth(date.getMonth() + (periodToAdjust === 'this' ? -1 : 1));
						break;
					case 'year':
						date.setFullYear(date.getFullYear() + (periodToAdjust === 'this' ? -1 : 1));
						break;
				}
			}

			if (point.v == null) return [date, '-'];

			return [date, parseFloat(point.v.toFixed(2))];
		};

		// When the granularity is month or year, the first point is the last point of the previous resolution
		if (settings.timeframe === 'month' || settings.timeframe === 'year') {
			insights1?.values?.shift();
			insights2?.values?.shift();
		}
		
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

		let entries1 = insights1 ? [...(insights1.values ?? []), insights1.lastValue] : [];
		let entries2 = insights2 ? [...(insights2.values ?? []), insights2.lastValue] : [];

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
				} else if (period === 'rolling') {
					start = new Date(last.getTime() - 1 * 3600000);
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

		// Trim each rolling yearly period independently (no trimming for non-rolling)
		const trimRollingYear = (entries: { t: string; v: number }[]): { t: string; v: number }[] => {
			if (!entries.length) return entries;
			const lastDate = new Date(entries[entries.length - 1].t);
			const cutoff = new Date(lastDate.getTime());
			cutoff.setDate(cutoff.getDate() - 365);
			return entries.filter(({ t }) => {
				const d = new Date(t);
				return d >= cutoff && d <= lastDate;
			});
		};

		if (settings.timeframe === 'year' && settings.period1 === 'rolling' && entries1.length) {
			entries1 = trimRollingYear(entries1);
		}
		if (settings.timeframe === 'year' && settings.period2 === 'rolling' && entries2.length) {
			entries2 = trimRollingYear(entries2);
		}

		const data1: [Date, number | '-'][] = insights1
			? entries1.map((point, _index) =>
				normalizeData(settings.period1, point, timeframeToAdjust),
			)
			: [];

		const data2: [Date, number | '-'][] = insights2
			? entries2.map((point, _index) =>
				normalizeData(settings.period2, point, timeframeToAdjust),
			)
			: [];

		const result = {
			data1,
			data2,
			updatesIn,
			name1: results1?.name,
			name2: results2?.name,
			units1: results1?.data.insight.units ?? '',
			units2: results2?.data.insight.units ?? '',
		};
		
		return result;
	}
}


export default new LineChartWidgetApi();