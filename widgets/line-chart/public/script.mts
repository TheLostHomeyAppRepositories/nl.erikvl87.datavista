import type HomeyWidget from 'homey/lib/HomeyWidget';
import type * as echarts from 'echarts';
import type { WidgetDataPayload } from '../../BaseWidgetApi.mjs';
import { ExtendedInsightsLogs } from 'homey-api';

// TODO: Merge all datasource type definitions!

type Timeframe = 'day' | 'week' | 'month' | 'year';
type Period = 'this' | 'last';

type Settings = {
	showRefreshCountdown : boolean;
	datasource1?: {
		deviceId: string;
		deviceName: string;
		id: string;
		name: string;
		type: 'insight';
	};
	color1: string;
	overwriteName1: string;
	datasource2?: {
		deviceId: string;
		deviceName: string;
		id: string;
		name: string;
		type: 'insight';
	};
	color2: string;
	overwriteName2: string;
	timeframe: Timeframe;
	period1: Period;
	period2: Period;
	yAxisCalculationMethod: 'fullRange' | 'iqr' | 'sameAxis';
};

class LineChartWidgetScript {
	private settings: Settings;
	private homey: HomeyWidget;
	private chart!: echarts.ECharts;
	private isOffTheScale: boolean = false;
	private configurationAnimationTimeout: NodeJS.Timeout | null | undefined;
	resolution1: string;
	resolution2: string;
	data1?: [Date, number | '-'][];
	data2?: [Date, number | '-'][];
	units1: string = '';
	units2: string = '';
	refreshSyncDataTimeout: NodeJS.Timeout | null | undefined;
	name1: string = 'datasource1';
	name2: string = 'datasource2';
	timezone: string | undefined;
	language: string | undefined;

	constructor(homey: HomeyWidget) {
		this.settings = homey.getSettings() as Settings;

		// If no datasource2 is set, use datasource1 so the 2nd dataset can be the previous period.
		if (!this.settings.datasource2?.id && this.settings.period1 !== this.settings.period2) {
			this.settings.datasource2 = this.settings.datasource1;
		}

		this.homey = homey;
		this.resolution1 = LineChartWidgetScript.getResolution(this.settings.timeframe, this.settings.period1);
		this.resolution2 = LineChartWidgetScript.getResolution(this.settings.timeframe, this.settings.period2);
	}

	private async logMessage(message: string, logToSentry: boolean, ...optionalParams: any[]): Promise<void> {
		await this.homey.api('POST', '/logMessage', { message, logToSentry, optionalParams });
	}

	private async logError(message: string, error: Error): Promise<void> {
		const serializedError = JSON.stringify(error, Object.getOwnPropertyNames(error));
		await this.homey.api('POST', '/logError', { message, error: serializedError });
	}

	private static getResolution(granularity: Timeframe, timeframe: Period): string {
		switch (granularity) {
			case 'day':
				return timeframe === 'this' ? 'today' : 'yesterday';
			case 'week':
				return timeframe === 'this' ? 'thisWeek' : 'lastWeek';
			case 'month':
				return timeframe === 'this' ? 'thisMonth' : 'lastMonth';
			case 'year':
				return timeframe === 'this' ? 'thisYear' : 'lastYear';
		}
	}

	private static hexToRgba(hex: string, opacity: number): string {
		const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
		hex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);

		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		if (!result) {
			throw new Error(`Invalid hex color: ${hex}`);
		}

		const r = parseInt(result[1], 16);
		const g = parseInt(result[2], 16);
		const b = parseInt(result[3], 16);

		return `rgba(${r}, ${g}, ${b}, ${opacity})`;
	}

	private async syncData(): Promise<void> {
		let payload1: WidgetDataPayload | null = null;
		let payload2: WidgetDataPayload | null = null;

		if (this.settings.datasource1?.id) {
			payload1 = (await this.homey.api('POST', `/datasource`, {
				datasource: {
					...this.settings.datasource1,
					insightResolution: this.resolution1,
				},
			})) as WidgetDataPayload;

			
			this.name1 = (this.settings.overwriteName1?.trim())
				? this.settings.overwriteName1
				: payload1.name + ' (' + this.homey.__(this.resolution1) + ')';
		}

		if (this.settings.datasource2?.id.trim()) {
			payload2 = (await this.homey.api('POST', `/datasource`, {
				datasource: {
					...this.settings.datasource2,
					insightResolution: this.resolution2,
				},
			})) as WidgetDataPayload;

			this.name2 = (this.settings.overwriteName2?.trim())
				? this.settings.overwriteName2
				: payload2.name + ' (' + this.homey.__(this.resolution2) + ')';
		}

		const insights1 = payload1?.data.logs as ExtendedInsightsLogs | null;
		const insights2 = payload2?.data.logs as ExtendedInsightsLogs | null;

		const step1 = insights1?.step ?? Number.MAX_SAFE_INTEGER;
		const updatesIn1 = insights1?.updatesIn ?? 0;
		const step2 = insights2?.step ?? Number.MAX_SAFE_INTEGER;
		const updatesIn2 = insights2?.updatesIn ?? 0;

		const updatesIn = Math.min(step1 - updatesIn1, step2 - updatesIn2);
		if (updatesIn !== Number.MAX_SAFE_INTEGER) {
			if (this.settings.showRefreshCountdown)
				document.getElementById('progress')!.style.display = 'block';
			this.scheduleCountdown(updatesIn);
		}

		const differentTimeframes = this.settings.period1 !== this.settings.period2;
		const normalizeData = (
			timeframe: Period,
			point: {
				t: string;
				v: number;
			},
		): [Date, number | '-'] => {
			const date = new Date(point.t);
			if (differentTimeframes && timeframe === 'this') {
				switch (this.settings.timeframe) {
					case 'day':
						date.setHours(date.getHours() - 24);
						break;
					case 'week':
						date.setDate(date.getDate() - 7);
						break;
					case 'month':
						date.setMonth(date.getMonth() - 1);
						break;
					case 'year':
						date.setFullYear(date.getFullYear() - 1);
						break;
				}
			}

			if (point.v == null) return [date, '-'];

			return [date, parseFloat(point.v.toFixed(2))];
		};

		const data1: [Date, number | '-'][] = insights1
			? [...(insights1.values ?? []), insights1.lastValue].map((point, _index) =>
				normalizeData(this.settings.period1, point),
			)
			: [];
		const data2: [Date, number | '-'][] = insights2
			? [...(insights2.values ?? []), insights2.lastValue].map((point, _index) =>
				normalizeData(this.settings.period2, point),
			)
			: [];

		// When the granularity is month or year, the first point is the last point of the previous resolution
		if (this.settings.timeframe === 'month' || this.settings.timeframe === 'year') {
			data1.shift();
			data2.shift();
		}

		this.data1 = data1;
		this.data2 = data2;
		this.units1 = payload1?.data.insight.units ?? '';
		this.units2 = payload2?.data.insight.units ?? '';
	}

	private scheduleCountdown(updatesIn: number): void {
		const progressBar = document.getElementById('progress-bar')!;

		const progressIcon = document.getElementById('progress-icon');
		progressBar.style.width = '100%';
		let countdown = Math.ceil(updatesIn / 1000);

		if (this.refreshSyncDataTimeout) {
			clearInterval(this.refreshSyncDataTimeout);
		}

		this.refreshSyncDataTimeout = setInterval(async () => {
			if (countdown <= 0) {
				clearInterval(this.refreshSyncDataTimeout!);
				this.refreshSyncDataTimeout = null;

				progressBar.style.width = '0%'; // Explicitly set to 0%

				// Respect the transition duration
				const transitionDuration = parseFloat(getComputedStyle(progressBar).transitionDuration.replace('s', '')) * 1000;

				await new Promise(resolve => setTimeout(resolve, transitionDuration));

				// Perform the spin animation
				if (progressIcon) {
					progressIcon.style.transition = 'transform 1s ease-in-out, color 1s ease-in-out';
					progressIcon.style.transform = 'rotate(720deg)';
					setTimeout(() => {
						progressIcon.style.transition = '';
						progressIcon.style.transform = '';
					}, 1000);
				}

				// Perform the action when countdown reaches 0
				await this.syncData();
				await this.render();
			} else {
				const percentage = (countdown / (updatesIn / 1000)) * 100;
				progressBar.style.width = `${percentage}%`;
			}

			countdown--;
		}, 1000);
	}

	private formatXAxisValue(value: string, legend: boolean = false): string {
		const capitalizeFirstLetter = (str: string): string => {
			return str.charAt(0).toUpperCase() + str.slice(1);
		};

		const date = new Date(value);

		if (!legend)
			return new Intl.DateTimeFormat(this.language, {
				timeZone: this.timezone,
				weekday: this.settings.timeframe === 'week' ? 'short' : undefined,
				day: this.settings.timeframe === 'month' ? 'numeric' : undefined,
				month: this.settings.timeframe === 'year' ? 'short' : undefined,
				hour: this.settings.timeframe === 'day' ? 'numeric' : undefined,
				minute: this.settings.timeframe === 'day' ? '2-digit' : undefined,
				hourCycle: this.settings.timeframe === 'day' ? 'h23' : undefined,
			}).format(date);

		const formatted = Intl.DateTimeFormat(this.language, {
			timeZone: this.timezone,
			weekday: this.settings.timeframe === 'week' ? 'long' : undefined,
			day: (this.settings.timeframe === 'month' || this.settings.timeframe === 'year') ? 'numeric' : undefined,
			month: this.settings.timeframe === 'year' ? 'long' : undefined,
			hour: this.settings.timeframe !== 'year' ? '2-digit': undefined,
			minute: this.settings.timeframe !== 'year' ? '2-digit': undefined,
			hourCycle: this.settings.timeframe === 'day' ? 'h23' : undefined,

		}).format(date);
		
		switch (this.settings.timeframe) {
			case 'day':
				return formatted;
			case 'week':
				return capitalizeFirstLetter(formatted);
			case 'month':
				return capitalizeFirstLetter(this.homey.__('day')) + ' ' + formatted;
			case 'year':
				return capitalizeFirstLetter(formatted);
		}
	}

	private async determineOffTheScale(data1: [Date, number | '-'][], data2: [Date, number | '-'][]): Promise<boolean> {
		// Helper function to calculate the range of a dataset
		const calculateRange = async (data: [Date, number | '-'][]): Promise<number> => {
			const numericValues = data
				.filter(point => typeof point[1] === 'number')
				.map(point => point[1] as number);

			// Early exit if no numeric values exist
			if (numericValues.length === 0) return 0;

			// Apply IQR method if selected
			if (this.settings.yAxisCalculationMethod === "iqr") {
				const sortedValues = numericValues.sort((a, b) => a - b);
				const q1 = sortedValues[Math.floor(sortedValues.length / 4)];
				const q3 = sortedValues[Math.floor((sortedValues.length * 3) / 4)];
				const iqr = q3 - q1;

				const lowerBound = q1 - 1.5 * iqr;
				const upperBound = q3 + 1.5 * iqr;

				// Log the calculated bounds
				await this.logMessage(`Lower Bound: ${lowerBound}, Upper Bound: ${upperBound}`, false);

				// Filter values within bounds
				const filteredValues = numericValues.filter(value => value >= lowerBound && value <= upperBound);

				// Calculate the range of the filtered dataset
				return Math.max(...filteredValues) - Math.min(...filteredValues);
			}

			// If not using IQR, calculate the full range
			return Math.max(...numericValues) - Math.min(...numericValues);
		};

		// Early exit if both datasets are empty
		if (data1.length === 0 && data2.length === 0) {
			await this.logMessage('Both datasets are empty, no need for a second axis.', false);
			return false;
		}

		// Handle "Force Same Axis" option
		if (this.settings.yAxisCalculationMethod === "sameAxis") {
			await this.logMessage('Forcing both series to use the same axis.', false);
			return false; // Force same axis, no second axis needed
		}

		// Calculate ranges for both datasets
		const range1 = await calculateRange(data1);
		const range2 = await calculateRange(data2);

		// Handle cases where both ranges are 0
		if (range1 === 0 && range2 === 0) {
			await this.logMessage('Both datasets have a range of 0, no need for a second axis.', false);
			return false;
		}

		// Handle cases where one range is 0
		if (range1 === 0 || range2 === 0) {
			await this.logMessage('One dataset has a range of 0, requiring a second axis.', false);
			return true;
		}

		// Check if units are different
		if (this.units1 !== this.units2) {
			await this.logMessage('Datasets have different units, requiring a second axis.', false);
			return true; // Different units always require a second axis
		}

		// Calculate the range ratio
		const rangeRatio = Math.max(range1, range2) / Math.min(range1, range2);

		// Log the range ratio for debugging
		await this.logMessage(
			`${this.settings.datasource1?.name} Range ratio: ${rangeRatio} (Dataset 1: ${range1}, Dataset 2: ${range2})`,
			false
		);

		const threshold = 10;
		return rangeRatio > threshold;
	}

	private async render(): Promise<void> {
		if (!this.data1 && !this.data2) {
			await this.logMessage('The payload is null', false);
			await this.startConfigurationAnimation();
			return;
		}

		await this.stopConfigurationAnimation();

		let splitNumber = 1;
		switch (this.settings.timeframe) {
			case 'day':
				splitNumber = 6;
				break;
			case 'week':
				splitNumber = 7;
				break;
			case 'month': {
				const daysInMonth = new Date(this.data1![0][0].getFullYear(), this.data1![0][0].getMonth() + 1, 0).getDate();
				splitNumber = Math.ceil(daysInMonth / 2);
				break;
			}
			case 'year':
				splitNumber = 12;
				break;
		}

		if (this.data1 != null && this.data2 != null)
			this.isOffTheScale = await this.determineOffTheScale(this.data1, this.data2);

		const primaryAxisY = {
			type: 'value',
			name: this.units1,
			nameTextStyle: {
				align: 'left',
				color: getComputedStyle(document.documentElement).getPropertyValue('--homey-color-mono-200').trim(),
			},
			scale: true,
			splitLine: {
				show: true,
				lineStyle: {
					color: getComputedStyle(document.documentElement).getPropertyValue('--homey-color-mono-200').trim(),
					width: 1,
					opacity: 0.5,
					type: 'dashed',
				},
			},
		};

		if (this.isOffTheScale) {
			primaryAxisY.nameTextStyle.color = this.settings.color1;
		}

		const yAxis = this.isOffTheScale
			? [
				primaryAxisY,
				{
					type: 'value',
					name: this.units2,
					nameTextStyle: {
						color: this.settings.color2,
						align: 'right',
					},
					scale: true,
					splitLine: {
						show: false,
						lineStyle: {
							color: getComputedStyle(document.documentElement).getPropertyValue('--homey-color-mono-200').trim(),
							width: 1,
							opacity: 0.5,
							type: 'dashed',
						},
					},
				},
			]
			: primaryAxisY;

		const legendData = [];

		const series = [];
		if (this.settings.datasource1?.id) {
			legendData.push(this.name1);

			series.push({
				name: this.name1,
				type: 'line',
				data: this.data1,
				showSymbol: false,
				itemStyle: {
					color: this.settings.color1,
				},
				areaStyle: {
					color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
						{
							offset: 0.1,
							color: LineChartWidgetScript.hexToRgba(this.settings.color1, 0.5),
						},
						{
							offset: 0.9,
							color: LineChartWidgetScript.hexToRgba(this.settings.color1, 0),
						},
					]),
				},
				lineStyle: {
					width: 1.5,
				},
				yAxisIndex: 0,
			});
		}

		if (this.settings.datasource2) {
			legendData.push(this.name2);
			series.push({
				name: this.name2,
				type: 'line',
				data: this.data2,
				showSymbol: false,
				itemStyle: {
					color: LineChartWidgetScript.hexToRgba(this.settings.color2, 0.7),
				},
				areaStyle: {
					color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
						{
							offset: 0.1,
							color: LineChartWidgetScript.hexToRgba(this.settings.color2, 0.5),
						},
						{
							offset: 0.9,
							color: LineChartWidgetScript.hexToRgba(this.settings.color2, 0),
						},
					]),
				},
				lineStyle: {
					width: 1.5,
				},
				yAxisIndex: this.isOffTheScale ? 1 : 0,
			});
		}

		const option = {
			legend: {
				show: false,
				data: legendData,
				bottom: 0,
			},
			tooltip: {
				trigger: 'axis',
				confine: true,
				textStyle: {
					fontSize: 10,
					overflow: 'truncate',
				},
				formatter: (params: any): string => {
					const formattedTitle = this.formatXAxisValue(params[0].value[0], true);

					// Format the Y-axis values for each series
					const seriesData = params.map((item: any) => {
						const marker = item.marker; // Colored indicator (HTML)
						const seriesName = item.seriesName; // Name of the series
						const yValue = item.value[1]; // Y-axis value

						const unit = item.seriesIndex === 0 ? this.units1 : this.units2;

						const formattedYValue =
							yValue !== '-' ? `${Number.isInteger(yValue) ? yValue : yValue.toFixed(2)} ${unit}` : '-';

						return `${marker}<strong>${seriesName}</strong>: ${formattedYValue}`;
					});

					// Combine the title and series data
					return `<strong>${formattedTitle}</strong><br/>${seriesData.join('<br/>')}`;
				},
			},
			grid: {
				top: '30',
				left: '0',
				right: '0',
				bottom: '0',
				height: 'auto',
				containLabel: true,
			},
			toolbox: {
				feature: {
					saveAsImage: {},
				},
			},
			xAxis: {
				type: 'time',
				splitNumber: splitNumber,
				splitLine: {
					show: false,
				},
				axisLabel: {
					formatter: (value: string): string => this.formatXAxisValue(value),
					hideOverlap: true,
					showMinLabel: true,
					showMaxLabel: this.settings.timeframe === 'day' || this.settings.timeframe === 'month' ? true : false,
					alignMinLabel: 'left',
					alignMaxLabel: 'right'
				},
			},
			yAxis: yAxis,
			series: series,
		};

		this.chart.setOption(option);

		// render/update the legend toggles
		if (this.settings.datasource1?.id) {
			document.querySelector('#toggle1 .label')!.textContent = this.name1;
			(document.querySelector('#toggle1 .toggle-icon')! as HTMLElement).style.backgroundColor = this.settings.color1;
			document.getElementById('toggle1')!.style.display = 'block';
		} else {
			document.getElementById('toggle1')!.style.display = 'none';
		}

		if (this.settings.datasource2?.id) {
			document.querySelector('#toggle2 .label')!.textContent = this.name2;
			(document.querySelector('#toggle2 .toggle-icon')! as HTMLElement).style.backgroundColor = this.settings.color2;
			document.getElementById('toggle2')!.style.display = 'block';
		} else {
			document.getElementById('toggle2')!.style.display = 'none';
		}

		// resize due to toggles being shown/hidden
		this.chart.resize();
	}

	private async startConfigurationAnimation(): Promise<void> {
		if (this.configurationAnimationTimeout) return;

		const interval = 750;
		const data: [Date, number][] = [];

		const update = async (): Promise<void> => {
			const randomValue = Math.floor(Math.random() * 101);
			data.push([new Date(), randomValue]);
			if (data.length > 20) data.shift();
			this.data1 = data;
			this.resolution1 = 'today';
			this.units1 = 'Demo mode';

			// TODO
			this.settings.timeframe = 'day';
			this.settings.datasource1 = {
				deviceId: 'demo',
				deviceName: 'Demo',
				id: 'demo',
				name: 'Demo',
				type: 'insight',
			};

			await this.render();
			this.configurationAnimationTimeout = setTimeout(update, interval);
		};

		this.configurationAnimationTimeout = setTimeout(update, interval);
	}

	private async stopConfigurationAnimation(): Promise<void> {
		if (this.configurationAnimationTimeout) clearTimeout(this.configurationAnimationTimeout);
		this.configurationAnimationTimeout = null;
	}

	private toggleSeries(indexToToggle: number): void {
		const options: echarts.EChartsOption = this.chart.getOption() as echarts.EChartsOption;

		if (!options.series) {
			void this.logMessage('No series found in the options', false);
			return;
		}

		const series = Array.isArray(options.series) ? options.series : [options.series];
		const legend = Array.isArray(options.legend) ? options.legend[0] : options.legend;

		const visibleSeries: Map<number, echarts.SeriesOption> = new Map();
		series.forEach((seriesItem, index) => {
			if (legend?.selected?.[seriesItem!.name as string] !== false) {
				visibleSeries.set(index, seriesItem);
			}
		});

		const visibleKeys = Array.from(visibleSeries.keys());
		let primaryVisible = visibleKeys.some(k => k === 0);
		let secondaryVisible = visibleKeys.some(k => k === 1);

		if (indexToToggle === 0) {
			primaryVisible = !primaryVisible;
		} else {
			secondaryVisible = !secondaryVisible;
		}

		this.chart.dispatchAction({
			type: visibleKeys.some(k => k === indexToToggle) ? 'legendUnSelect' : 'legendSelect',
			name: series[indexToToggle].name,
		});

		let renderPrimarySplitLine = false;
		let renderSecondarySplitLine = false;

		if (primaryVisible && secondaryVisible) {
			renderPrimarySplitLine = true;
			renderSecondarySplitLine = false;
		} else if (!this.isOffTheScale) {
			primaryVisible = true;
			renderPrimarySplitLine = true;
		} else {
			renderPrimarySplitLine = primaryVisible;
			renderSecondarySplitLine = secondaryVisible;
		}

		this.chart.setOption({
			yAxis: [
				{
					show: primaryVisible,
					splitLine: {
						show: renderPrimarySplitLine,
					},
				},
				{
					show: secondaryVisible,
					splitLine: {
						show: renderSecondarySplitLine,
					},
				},
			],
		});
	}

	/**
	 * Called when the Homey API is ready.
	 */
	public async onHomeyReady(): Promise<void> {
		try {
			const result = await this.homey.api('GET', '/getTimeAndLanguage') as { timezone: string; language: string };
			this.timezone = result.timezone;
			this.language = result.language;
			
			this.chart = window.echarts.init(document.getElementById('line-chart'));
			if (this.settings.datasource1 || this.settings.datasource2) await this.syncData();

			this.homey.ready();
			await this.render();

			document.getElementById('toggle1')?.addEventListener('click', () => {
				if (this.settings.datasource1) this.toggleSeries(0);
			});

			document.getElementById('toggle2')?.addEventListener('click', () => {
				if (this.settings.datasource2) this.toggleSeries(1);
			});
		} catch (error) {
			if (error instanceof Error) {
				await this.logError('An error occured while initializing the widget', error);
			} else {
				await this.logMessage('An error occured while initializing the widget', true, error);
			}
			await this.startConfigurationAnimation();
		}
	}
}

interface ModuleWindow extends Window {
	onHomeyReady: (homey: HomeyWidget) => Promise<void>;
	echarts: typeof echarts;
}

declare const window: ModuleWindow;

window.onHomeyReady = async (homey: HomeyWidget): Promise<void> =>
	await new LineChartWidgetScript(homey).onHomeyReady();
