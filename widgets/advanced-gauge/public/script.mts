import type HomeyWidget from 'homey/lib/HomeyWidget';
import type { AdvancedGaugeWidgetPayload } from '../api.mjs';
import type * as echarts from 'echarts';
import type { AdvancedGaugeWidgetData } from '../../../datavistasettings/advancedGaugeWidgetSettings.mjs';
import type { PercentageData } from '../../../datavistasettings/percentageSettings.mjs';
import type { RangeData } from '../../../datavistasettings/rangeSettings.mjs';
import type { BaseSettings } from '../../../datavistasettings/baseSettings.mjs';

type Settings = {
	transparent: boolean;
	datasource?: {
		id: string;
		name: string;
		type: 'advanced';
	};
	configsource?: {
		id: string;
		name: string;
	};
	segments: number;
	style: 'style1' | 'style2';
};

type ColorStop = {
	offset?: number;
	color: string;
};

type ColorStopConfig = {
	color1?: string;
	color2?: string;
	color3?: string;
	color4?: string;
	color5?: string;
	colorOffset1?: number;
	colorOffset2?: number;
	colorOffset3?: number;
	colorOffset4?: number;
	colorOffset5?: number;
};

type WidgetDataDto = {
	min: number;
	max: number;
	value: number;
	unit?: string;
	unitPosition?: 'prefix' | 'suffix';
	label?: string;
};

class ColorStopsManager {
	private lastConfig: ColorStopConfig | null = null;
	private lastData: WidgetDataDto | null = null;
	private cachedResult: ColorStop[] | null = null;

	public getColorStops(config: ColorStopConfig, data: WidgetDataDto): ColorStop[] {
		if (this.shouldUseCache(config, data)) {
			return this.cachedResult!;
		}

		const stops = [
			{ offset: config.colorOffset1, color: config.color1 },
			{ offset: config.colorOffset2, color: config.color2 },
			{ offset: config.colorOffset3, color: config.color3 },
			{ offset: config.colorOffset4, color: config.color4 },
			{ offset: config.colorOffset5, color: config.color5 },
		].filter(stop => stop.color) as ColorStop[];

		if (stops.length === 0) return [];
		if (stops.length === 1) {
			stops[0].offset = 0;
			return this.cacheAndReturn(config, data, stops);
		}
		if (stops.length === 2) {
			stops[0].offset = 0;
			stops[1].offset = 1;
			return this.cacheAndReturn(config, data, stops);
		}

		this.normalizeStops(stops, data);
		this.sortStops(stops);
		this.adjustStartOffset(stops);
		this.adjustEndOffset(stops);
		this.removeTightlyClusteredStops(stops);

		const result = stops.filter(stop => stop.offset !== undefined);
		return this.cacheAndReturn(config, data, result);
	}

	private shouldUseCache(config: ColorStopConfig, data: WidgetDataDto): boolean {
		if (!this.cachedResult || !this.lastConfig || !this.lastData) return false;

		const configMatch = JSON.stringify(config) === JSON.stringify(this.lastConfig);
		const rangeMatch = data.min === this.lastData.min && data.max === this.lastData.max;

		return configMatch && rangeMatch;
	}

	private cacheAndReturn(config: ColorStopConfig, data: WidgetDataDto, result: ColorStop[]): ColorStop[] {
		this.lastConfig = { ...config };
		this.lastData = { ...data };
		this.cachedResult = [...result];
		return result;
	}

	private sortStops(stops: ColorStop[]): void {
		stops.sort((a, b) => (a.offset === undefined || b.offset === undefined ? 0 : a.offset - b.offset));
	}

	private normalizeStops(stops: ColorStop[], data: WidgetDataDto): void {
		const rangeSize = data.max - data.min;
		const hasDefinedOffsets = stops.some(stop => stop.offset !== undefined);

		if (!hasDefinedOffsets) {
			stops.forEach((stop, index) => {
				stop.offset = index / (stops.length - 1);
			});
		} else {
			stops.forEach(stop => {
				if (stop.offset !== undefined) {
					stop.offset = (stop.offset - data.min) / rangeSize;
				}
			});
		}
	}

	private adjustStartOffset(stops: ColorStop[]): void {
		const zeroOffset = stops.findLastIndex(stop => stop.offset === 0);
		if (zeroOffset > 0) {
			stops.splice(0, zeroOffset);
			return;
		}

		const lastBelow = stops.findLastIndex(stop => (stop.offset ?? 0) < 0);
		if (lastBelow > -1) {
			const firstPositive = stops.findIndex(stop => (stop.offset ?? 0) > 0);
			if (firstPositive > -1 && Math.abs(stops[lastBelow].offset ?? 0) > Math.abs(stops[firstPositive].offset ?? 0)) {
				stops[firstPositive].offset = 0;
				stops.splice(0, firstPositive);
			} else {
				stops[lastBelow].offset = 0;
				if (lastBelow > 0) stops.splice(0, lastBelow);
			}
		}
	}

	private adjustEndOffset(stops: ColorStop[]): void {
		const oneOffset = stops.findIndex(stop => stop.offset === 1);
		if (oneOffset > -1) {
			stops.splice(oneOffset + 1);
			return;
		}

		const firstAbove = stops.findIndex(stop => (stop.offset ?? 0) > 1);
		if (firstAbove > -1) {
			const lastBelow = stops.findLastIndex(stop => (stop.offset ?? 0) < 1);
			if (
				lastBelow > -1 &&
				Math.abs((stops[firstAbove].offset ?? 0) - 1) > Math.abs((stops[lastBelow].offset ?? 0) - 1)
			) {
				stops[lastBelow].offset = 1;
				stops.splice(lastBelow + 1);
			} else {
				stops[firstAbove].offset = 1;
				if (firstAbove < stops.length - 1) stops.splice(firstAbove + 1);
			}
		}
	}

	private removeTightlyClusteredStops(stops: ColorStop[]): void {
		const minDiff = 0.2;
		for (let i = 0; i < stops.length - 1; i++) {
			if ((stops[i + 1].offset ?? 0) - (stops[i].offset ?? 0) < minDiff) {
				stops.splice(i === stops.length - 2 ? i : i + 1, 1);
			}
		}
	}
}

class AdvancedGaugeWidgetScript {
	private homey: HomeyWidget;
	private settings: Settings;
	private data: WidgetDataDto;
	private config: AdvancedGaugeWidgetData;
	private colorStopsManager: ColorStopsManager;
	private spinnerTimeout: NodeJS.Timeout | null | undefined;
	private chart!: echarts.ECharts;

	/**
	 * Creates a new instance of the AdvancedGaugeWidgetScript class.
	 * @param homey The Homey widget.
	 */
	constructor(homey: HomeyWidget) {
		this.homey = homey;
		this.settings = homey.getSettings() as Settings;
		if (this.settings.datasource != null && this.settings.datasource.type == null)
			this.settings.datasource.type = 'advanced'; // Fallback to prevent breaking change.

		this.colorStopsManager = new ColorStopsManager();

		this.data = {
			min: 0,
			max: 100,
			value: 0,
		};

		this.config = {
			color1: '#008000', // Green
			color2: '#FFFF00', // Yellow
			color4: '#FF0000', // Red
		};
	}

	/**
	 * Updates the gauge with the current data.
	 */
	private async updateGauge(): Promise<void> {
		const homeyTextColor = getComputedStyle(document.documentElement).getPropertyValue('--homey-text-color').trim();
		const homeyLightTextColor = getComputedStyle(document.documentElement)
			.getPropertyValue('--homey-text-color-light')
			.trim();
		const colorStops = this.colorStopsManager.getColorStops(this.config, this.data);

		switch (this.settings.style) {
			case 'style1': {
				this.chart.setOption({
					series: [
						{
							type: 'gauge',
							startAngle: -180,
							endAngle: 0,
							splitNumber: this.settings.segments,
							radius: '100%',
							center: ['50%', '180px'],
							detail: {
								valueAnimation: true,
								formatter: (value: number): string => {
									if (this.data.label != null && this.data.label != '') return this.data.label;
									if (this.data.unit == null) return `${value}`;

									return this.data.unitPosition === 'prefix'
										? `${this.data.unit} ${value}`
										: `${value} ${this.data.unit}`;
								},
								fontSize: 20,
								offsetCenter: [0, '20%'],
								color: homeyTextColor,
							},

							pointer: {
								itemStyle: {
									color: homeyTextColor,
								},
							},
							splitLine: {
								distance: 7,
								length: 10,
							},
							axisTick: {
								distance: 7,
							},
							axisLabel: {
								formatter: (value: number): string => {
									const precision = value % 1 === 0 ? 0 : 2;
									return value.toFixed(precision);
								},
								color: homeyLightTextColor,
							},
							axisLine: {
								lineStyle: {
									color: [
										[
											1,
											// @ts-expect-error This is expexted
											new echarts.graphic.LinearGradient(0, 0, 1, 0, colorStops),
										],
										// [1, "#F6C74C"],
									],
									width: 10,
								},
							},
							min: this.data.min,
							max: this.data.max,
							data: [
								{
									value: parseFloat(this.data.value.toFixed(2)),
								},
							],
						},
					],
				});
				break;
			}

			case 'style2': {
				// get the color for this.data.value that is closest to one of the color steps
				const normalizedValue = (this.data.value - this.data.min) / (this.data.max - this.data.min);
				const closestColorStop = colorStops.reduce((prev, curr) => {
					const prevDiff = Math.abs((prev.offset ?? 0) - normalizedValue);
					const currDiff = Math.abs((curr.offset ?? 0) - normalizedValue);
					return prevDiff < currDiff ? prev : curr;
				});

				this.chart.setOption({
					series: [
						{
							type: 'gauge',
							startAngle: -180,
							endAngle: 0,
							splitNumber: this.settings.segments,
							radius: '100%',
							center: ['50%', '180px'],
							detail: {
								valueAnimation: true,
								formatter: (value: number): string => {
									if (this.data.label != null && this.data.label != '') return this.data.label;
									if (this.data.unit == null) return `${value}`;

									return this.data.unitPosition === 'prefix'
										? `${this.data.unit} ${value}`
										: `${value} ${this.data.unit}`;
								},
								fontSize: 20,
								offsetCenter: [0, '-10%'],
								color: homeyTextColor,
							},

							pointer: {
								show: false,
							},
							splitLine: {
								distance: 15,
								length: 10,
							},
							axisTick: {
								distance: 15,
							},
							axisLabel: {
								distance: 15,
								formatter: (value: number): string => {
									const precision = value % 1 === 0 ? 0 : 2;
									return value.toFixed(precision);
								},
								color: homeyLightTextColor,
							},
							axisLine: {
								lineStyle: {
									color: [
										[
											1,
											// @ts-expect-error This is expexted
											new echarts.graphic.LinearGradient(0, 0, 1, 0, colorStops),
										],
										// [1, "#F6C74C"],
									],
									width: 10,
								},
							},
							min: this.data.min,
							max: this.data.max,
							data: [
								{
									value: parseFloat(this.data.value.toFixed(2)),
								},
							],
						},
						{
							type: 'gauge',
							startAngle: -180,
							endAngle: 0,
							radius: '90%',
							center: ['50%', '180px'],
							min: this.data.min,
							max: this.data.max,
							itemStyle: {
								color: closestColorStop.color,
							},
							progress: {
								show: true,
								width: 6,
							},
							pointer: {
								show: false,
							},
							axisLine: {
								show: false,
							},
							axisTick: {
								show: false,
							},
							splitLine: {
								show: false,
							},
							axisLabel: {
								show: false,
							},
							detail: {
								show: false,
							},
							data: [
								{
									value: this.data.value,
								},
							],
						},
					],
				});
				break;
			}
		}
	}

	/**
	 * Starts the spinning animation.
	 */
	private async startConfigurationAnimation(): Promise<void> {
		if (this.spinnerTimeout != null) return;

		const interval = 1000;
		let value = 0;
		const step = 25;
		let direction = 1;
		const update = async (): Promise<void> => {
			value += step * direction;
			if (value >= 100 || value <= 0) {
				direction *= -1;
			}
			this.data = {
				min: 0,
				max: 100,
				value: value,
				unit: '%',
				unitPosition: 'suffix',
				label: `Configure me`,
			};
			await this.updateGauge();
			this.spinnerTimeout = setTimeout(update, interval);
		};
		this.spinnerTimeout = setTimeout(update, interval);
	}

	/**
	 * Stops the spinning animation.
	 */
	async stopConfigurationAnimation(): Promise<void> {
		if (this.spinnerTimeout !== null) clearTimeout(this.spinnerTimeout);
		this.spinnerTimeout = null;
		await this.updateGauge();
	}

	private async logMessage(message: string, logToSentry: boolean, ...optionalParams: any[]): Promise<void> {
		await this.homey.api('POST', '/logMessage', { message, logToSentry, optionalParams });
	}

	private async logError(message: string, error: Error): Promise<void> {
		const serializedError = JSON.stringify(error, Object.getOwnPropertyNames(error));
		await this.homey.api('POST', '/logError', { message, error: serializedError });
	}

	/**
	 * Called when the Homey API is ready.
	 */
	public async onHomeyReady(): Promise<void> {
		try {
			if (!this.settings.transparent) {
				const widgetBackgroundColor = getComputedStyle(document.documentElement)
					.getPropertyValue('--homey-background-color')
					.trim();
				document.querySelector('.homey-widget')!.setAttribute('style', `background-color: ${widgetBackgroundColor};`);
			}

			this.chart = window.echarts.init(document.getElementById('gauge'));
			const height = this.settings.style === 'style1' ? 200 : 165;
			this.homey.ready({ height });

			if (this.settings.datasource?.id == null) {
				await this.logMessage('No datasource selected', false);
				await this.startConfigurationAnimation();
				return;
			}

			const datasourceId = this.settings.datasource?.id;
			const configsourceId = this.settings.configsource?.id;

			const payload = (await this.homey.api('POST', `/datasource`, {
				datasource: this.settings.datasource,
				configsource: this.settings.configsource?.id,
			})) as AdvancedGaugeWidgetPayload;

			if (payload.data != null) {
				if (payload.data.type === 'advanced') {
					switch (payload.data.data.type) {
						case 'percentage': {
							const percentageData = payload.data.data as BaseSettings<PercentageData>;
							this.data = {
								min: 0,
								max: 100,
								value: percentageData.settings.percentage,
								unit: '%',
								unitPosition: 'suffix',
							};
							break;
						}
						case 'range': {
							const rangeData = payload.data.data as BaseSettings<RangeData>;
							this.data = {
								min: rangeData.settings.min,
								max: rangeData.settings.max,
								value: rangeData.settings.value,
								unit: rangeData.settings.unit,
								unitPosition: rangeData.settings.unitPosition,
								label: rangeData.settings.label,
							};
							break;
						}
						default: {
							await this.logMessage(`Type '${payload.data.data.type}' is not implemented.`, true);
							await this.startConfigurationAnimation();
						}
					}
				} else {
					await this.startConfigurationAnimation();
				}
			} else {
				await this.startConfigurationAnimation();
			}

			if (payload.config != null) this.config = payload.config;
			await this.updateGauge();

			if (datasourceId !== null) {
				this.homey.on(`settings/${datasourceId}`, async (data: BaseSettings<unknown> | null) => {
					if (data === null) {
						await this.startConfigurationAnimation();
						return;
					} else if (this.spinnerTimeout !== null) {
						await this.stopConfigurationAnimation();
					}

					switch (data.type) {
						case 'percentage': {
							const settings = data.settings as PercentageData;
							this.data = {
								min: 0,
								max: 100,
								value: settings.percentage,
								unit: '%',
								unitPosition: 'suffix',
							};
							break;
						}
						case 'range': {
							const rangeData = data.settings as RangeData;
							this.data = {
								min: rangeData.min,
								max: rangeData.max,
								value: rangeData.value,
								label: rangeData.label,
								unit: rangeData.unit,
								unitPosition: rangeData.unitPosition,
							};
							break;
						}
						default: {
							await this.logMessage(`Type '${data.type}' is not implemented.`, true);
							await this.startConfigurationAnimation();
							return;
						}
					}

					await this.updateGauge();
				});

				if (configsourceId !== null) {
					this.homey.on(`settings/${configsourceId}`, async (config: BaseSettings<AdvancedGaugeWidgetData> | null) => {
						if (config === null) return;

						this.config = config.settings;
						await this.updateGauge();
					});
				}
			}
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
	await new AdvancedGaugeWidgetScript(homey).onHomeyReady();
