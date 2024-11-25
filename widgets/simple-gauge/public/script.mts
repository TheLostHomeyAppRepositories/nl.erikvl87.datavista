import type HomeyWidget from 'homey/lib/HomeyWidget';
import type { SimpleGaugeWidgetPayload } from '../api.mjs';
import type * as echarts from 'echarts';

type Settings = {
	datasource?: {
		deviceId: string;
		id: string;
		name: string;
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

	private async startSpinning(): Promise<void> {
		if (this.spinnerTimeout != null) return;

		await this.log('Starting spinner');
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

	async stopSpinning(): Promise<void> {
		if (this.spinnerTimeout !== null) clearTimeout(this.spinnerTimeout);
		this.spinnerTimeout = null;
		await this.updateGauge();
	}

	/*
	 * Logs a message to the Homey API.
	 * @param args The arguments to log.
	 * @returns A promise that resolves when the message is logged.
	 */
	private async log(...args: any[]): Promise<void> {
		const message = args[0];
		const optionalParams = args.slice(1);
		console.log(message, optionalParams);
		await this.homey.api('POST', '/log', { message, optionalParams });
	}

	private async syncData(): Promise<void> {
		const capabilityId = this.settings.datasource?.id;
		const deviceId = this.settings.datasource?.deviceId;
		const payload = (await this.homey.api(
			'GET',
			`/?deviceId=${deviceId}&capabilityId=${capabilityId}`,
			{},
		)) as SimpleGaugeWidgetPayload | null;

		if (payload !== null) {
			await this.log('Received payload', payload);
			await this.stopSpinning();

			this.data = {
				min: this.settings.min != null && this.settings.min !== '' ? this.settings.min : payload.min ?? 0,
				max: this.settings.max != null && this.settings.max !== '' ? this.settings.max : payload.max ?? 100,
				value: payload.value,
				units: payload.units,
				decimals: payload.decimals,
			};

			await this.updateGauge();
		} else {
			await this.log('The payload is null');
			await this.startSpinning();
		}
	}

	/**
	 * Called when the Homey API is ready.
	 */
	public async onHomeyReady(): Promise<void> {
		this.chart = window.echarts.init(document.getElementById('gauge'));
		const height = this.settings.style === 'style1' ? 200 : 165;
		this.homey.ready( { height });
		if (this.settings.datasource?.id == null) {
			await this.log('No datasource selected');
			await this.startSpinning();
			return;
		}

		await this.syncData();

		this.settings.refreshSeconds = this.settings.refreshSeconds ?? 5;
		this.refreshInterval = setInterval(async () => {
			await this.syncData();
		}, this.settings.refreshSeconds * 1000);
	}
}

interface ModuleWindow extends Window {
	onHomeyReady: (homey: HomeyWidget) => Promise<void>;
	echarts: typeof echarts;
}

declare const window: ModuleWindow;

window.onHomeyReady = async (homey: HomeyWidget): Promise<void> =>
	await new SimpleGaugeWidgetScript(homey).onHomeyReady();
