import type HomeyWidget from 'homey/lib/HomeyWidget';
import type { SimpleGaugeWidgetPayload } from '../api.mjs';
import type * as echarts from 'echarts';
import { WidgetDataPayload } from '../../baseWidgetApi.mjs';
import { CapabilitiesObject, ExtendedVariable } from 'homey-api';
import { BaseSettings } from '../../../datavistasettings/baseSettings.mjs';
import { PercentageData } from '../../../datavistasettings/percentageSettings.mjs';

type Settings = {
	transparent: boolean;
	datasource?: {
		id: string;
		deviceId: string;
		name: string;
		type: 'capability' | 'advanced' | 'variable';
	};
	segments: number;
	refreshSeconds: number;
	min?: number | '';
	max?: number | '';
	style: 'style1' | 'style2';
	color1?: string;
	color2?: string;
	color3?: string;
	isMinNegative: boolean;
	isMaxNegative: boolean;
};

class SimpleGaugeWidgetScript {
	private homey: HomeyWidget;
	private settings: Settings;
	private data: SimpleGaugeWidgetPayload;
	private spinnerTimeout: NodeJS.Timeout | null | undefined;
	private refreshInterval: NodeJS.Timeout | null = null;
	private colors: { offset: number; color: string }[];
	private chart!: echarts.ECharts;

	constructor(homey: HomeyWidget) {
		this.homey = homey;
		this.settings = homey.getSettings() as Settings;
		if (this.settings.datasource != null && this.settings.datasource.type == null)
			this.settings.datasource.type = 'capability'; // Fallback to prevent breaking change.

		if (this.settings.isMinNegative && this.settings.min != null) this.settings.min = -this.settings.min;
		if (this.settings.isMaxNegative && this.settings.max != null) this.settings.max = -this.settings.max;
		this.data = {
			min: 0,
			max: 100,
			value: 0,
			units: '',
		};

		if (this.settings.color1 == null && this.settings.color2 == null && this.settings.color3 == null) {
			this.colors = [
				{ offset: 0, color: '#008000' },
				{ offset: 0.5, color: '#FFFF00' },
				{ offset: 1, color: '#FF0000' },
			];
		} else {
			this.colors = [];
			if (this.settings.color1 != null && this.settings.color1 != '')
				this.colors.push({ offset: 0, color: this.settings.color1 });
			if (this.settings.color2 != null && this.settings.color2 != '')
				this.colors.push({ offset: 0.5, color: this.settings.color2 });
			if (this.settings.color3 != null && this.settings.color3 != '')
				this.colors.push({ offset: 1, color: this.settings.color3 });
		}
	}

	private async updateGauge(): Promise<void> {
		const homeyTextColor = getComputedStyle(document.documentElement).getPropertyValue('--homey-text-color').trim();
		const homeyLightTextColor = getComputedStyle(document.documentElement)
			.getPropertyValue('--homey-text-color-light')
			.trim();

		const value = parseFloat(this.data?.value?.toFixed(this.data.decimals ?? 2) ?? '0');
		let detailFormatter;
		switch (this.data.units) {
			case '€':
				detailFormatter = '€{value}';
				break;
			case '$':
				detailFormatter = '${value}';
				break;
			case '%':
				detailFormatter = '{value}%';
				break;
			default:
				detailFormatter = `{value}${this.data.units ? ` ${this.data.units}` : ''}`;
				break;
		}

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
								formatter: this.spinnerTimeout == null ? detailFormatter : 'Configure me',
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
											new echarts.graphic.LinearGradient(0, 0, 1, 0, this.colors),
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
									value: value,
								},
							],
						},
					],
				});
				break;
			}

			case 'style2': {
				const normalizedValue =
					this.data.min != null && this.data.max != null
						? (value - this.data.min) / (this.data.max - this.data.min)
						: 0;
				const closestColorStop = this.colors.reduce((prev, curr) => {
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
								formatter: this.spinnerTimeout == null ? detailFormatter : 'Configure me',
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
											new echarts.graphic.LinearGradient(0, 0, 1, 0, this.colors),
										],
									],
									width: 10,
								},
							},
							min: this.data.min,
							max: this.data.max,
							data: [
								{
									value: value,
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
			this.data.min = 0;
			this.data.max = 100;
			this.data.value = value;

			await this.updateGauge();
			this.spinnerTimeout = setTimeout(update, interval);
		};
		this.spinnerTimeout = setTimeout(update, interval);
	}

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

	private async syncData(): Promise<void> {
		if (this.settings.datasource == null) {
			await this.logMessage('No datasource is set', false);
			await this.startConfigurationAnimation();
			return;
		}

		const payload = (await this.homey.api('POST', `/datasource`, {
			datasource: this.settings.datasource,
		})) as WidgetDataPayload | null;

		if (payload === null) {
			await this.logMessage('The payload is null', false);
			await this.startConfigurationAnimation();
			return;
		}

		await this.stopConfigurationAnimation();
		// this.updateName(payload.name);

		switch (this.settings.datasource.type) {
			case 'capability': {
				const capability = payload.data as CapabilitiesObject;
				this.data = {
					min: this.settings.min != null && this.settings.min !== '' ? this.settings.min : capability.min ?? 0,
					max: this.settings.max != null && this.settings.max !== '' ? this.settings.max : capability.max ?? 100,
					value: capability.value as number,
					units: capability.units,
					decimals: capability.decimals,
				};
				await this.updateGauge();
				break;
			}
			case 'variable': {
				const variable = payload.data as ExtendedVariable;
				this.data = {
					min: this.settings.min != null && this.settings.min !== '' ? this.settings.min : 0,
					max: this.settings.max != null && this.settings.max !== '' ? this.settings.max : 100,
					value: variable.value as number,
				};
				await this.updateGauge();
				break;
			}
			case 'advanced': {
				if ((payload.data as BaseSettings<unknown>).type !== 'percentage') {
					await this.logMessage('The data type is not percentage', false);
					await this.startConfigurationAnimation();
					return;
				}
				const advanced = payload.data as BaseSettings<PercentageData>;
				this.data = {
					min: this.settings.min != null && this.settings.min !== '' ? this.settings.min : 0,
					max: this.settings.max != null && this.settings.max !== '' ? this.settings.max : 100,
					value: advanced.settings.percentage,
				};
				await this.updateGauge();
				break;
			}
			default:
				await this.logMessage('Unknown datasource type', this.settings.datasource.type, true);
				await this.startConfigurationAnimation();
				break;
		}
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

			await this.syncData();

			this.settings.refreshSeconds = this.settings.refreshSeconds ?? 5;
			this.refreshInterval = setInterval(async () => {
				await this.syncData();
			}, this.settings.refreshSeconds * 1000);
		} catch (error) {
			if (error instanceof Error) {
				await this.logError('An errror occured while initializing the widget', error);
			} else {
				await this.logMessage('An errror occured while initializing the widget', true, error);
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
	await new SimpleGaugeWidgetScript(homey).onHomeyReady();
