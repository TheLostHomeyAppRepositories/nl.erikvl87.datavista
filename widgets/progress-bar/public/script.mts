import type HomeyWidget from 'homey/lib/HomeyWidget';
import type { BaseSettings } from '../../../datavistasettings/baseSettings.mjs';
import type { PercentageData } from '../../../datavistasettings/percentageSettings.mjs';
import type { WidgetDataPayload } from '../../baseWidgetApi.mjs';
import type { CapabilitiesObject, ExtendedVariable } from 'homey-api';
import type { RangeData } from '../../../datavistasettings/rangeSettings.mjs';

type Settings = {
	datasource?: {
		deviceId: string;
		deviceName: string;
		id: string;
		name: string;
		type: 'capability' | 'advanced' | 'variable';
	};
	transparent: boolean;
	refreshSeconds: number;
	color1: string;
	color2: string;
	showIcon: boolean;
	showName: boolean;
	overwriteName: string;
};

class ProgressBarWidgetScript {
	private homey: HomeyWidget;
	private settings: Settings;
	progressBarEl!: HTMLProgressElement;
	private refreshInterval: NodeJS.Timeout | null = null;
	private configurationAnimationTimeout: NodeJS.Timeout | null | undefined;
	private value: number = 0;
	private percentage: number = 0;
	private iconUrl: string | null = null;

	constructor(homey: HomeyWidget) {
		this.homey = homey;
		this.settings = homey.getSettings() as Settings;
	}

	private async log(...args: any[]): Promise<void> {
		const message = args[0];
		const optionalParams = args.slice(1);
		console.log(message, optionalParams);
		await this.homey.api('POST', '/log', { message, optionalParams });
	}

	private async updateProgress(
		min: number,
		max: number,
		value: number,
		decimals: number,
		unit?: string,
		unitLocation: 'prefix' | 'suffix' = 'suffix',
		overwriteLabel?: string,
	): Promise<void> {
		const previousValue = this.value;
		this.value = value;
		await this.stopConfigurationAnimation();

		const progressBar = document.getElementById('progressBar')!;
		const progressPercentage = document.getElementById('progressPercentage')!;
		const progressLabel = document.getElementById('progressLabel')!;

		const startColor = ProgressBarWidgetScript.hexToRgb(this.settings.color1);
		const endColor = ProgressBarWidgetScript.hexToRgb(this.settings.color2);

		const duration = 500;
		const startTime = performance.now();
		const previousPercentage = this.percentage;
		const percentage = ((value - min) / (max - min)) * 100;
		this.percentage = percentage;

		const animate = async (currentTime: number): Promise<void> => {
			const elapsedTime = currentTime - startTime;
			const progress = Math.min(elapsedTime / duration, 1);
			const currentPercentage = Math.round(previousPercentage + (percentage - previousPercentage) * progress);
			progressPercentage.textContent = `${currentPercentage}%`;

			const currentValue = previousValue + (value - previousValue) * progress;
			const displayValue = value % 1 == 0 ? currentValue.toFixed(0) : currentValue.toFixed(decimals);

			if (overwriteLabel === undefined || overwriteLabel === null || overwriteLabel === '') {
				progressLabel.textContent =
					unit == null
						? `${displayValue}`
						: unitLocation == 'prefix'
							? ` ${unit} ${displayValue}`
							: `${displayValue} ${unit}`;
			} else {
				progressLabel.textContent = overwriteLabel;
			}

			const progressBarRect = progressBar.getBoundingClientRect();
			const progressLabelRect = progressLabel.getBoundingClientRect();
			const isLabelOverBar = progressLabelRect.left + progressLabelRect.width / 2 < progressBarRect.right;

			if (isLabelOverBar) {
				progressLabel.style.color = ProgressBarWidgetScript.getContrastYIQ(intermediateColor);
			} else {
				progressLabel.style.color = getComputedStyle(document.documentElement)
					.getPropertyValue('--homey-text-color')
					.trim();
			}

			if (progress < 1) {
				requestAnimationFrame(animate);
			}
		};

		requestAnimationFrame(animate);

		progressBar.style.width = `${percentage}%`;
		const intermediateColor = ProgressBarWidgetScript.interpolateColor(startColor, endColor, percentage / 100);
		progressBar.style.backgroundColor = intermediateColor;
	}

	private async syncData(): Promise<void> {
		if (!this.settings.datasource) {
			await this.log('No datasource is set');
			await this.startConfigurationAnimation();
			return;
		}

		const payload = await this.fetchDataSourcePayload();
		if (!payload) {
			await this.log('The payload is null');
			await this.startConfigurationAnimation();
			return;
		}

		switch (this.settings.datasource!.type) {
			case 'capability':
				await this.handleCapabilityPayload(payload);
				break;
			case 'variable':
				await this.handleVariablePayload(payload);
				break;
			case 'advanced':
				await this.handleAdvancedPayload(payload);
				break;
			default:
				await this.log('Unknown datasource type', this.settings.datasource!.type);
				await this.startConfigurationAnimation();
				break;
		}
	}

	private async fetchDataSourcePayload(): Promise<WidgetDataPayload | null> {
		return (await this.homey.api('POST', `/datasource`, {
			datasource: this.settings.datasource,
		})) as WidgetDataPayload | null;
	}

	private async handleCapabilityPayload(payload: WidgetDataPayload): Promise<void> {
		const capability = payload.data as CapabilitiesObject;
		this.updateName(payload.name);
		await this.updateIcon(
			capability.iconObj?.id ? `https://icons-cdn.athom.com/${capability.iconObj.id}.svg?ver=1` : payload.fallbackIcon,
		);

		this.updateProgressBarDisplay(capability.units !== 'percentage');
		
		await this.updateProgress(
			capability.min ?? 0,
			capability.max ?? 100,
			capability.value as number,
			capability.decimals ?? 2,
			capability.units,
		);
	}

	private async handleVariablePayload(payload: WidgetDataPayload): Promise<void> {
		const variable = payload.data as ExtendedVariable;
		this.updateName(payload.name);
		await this.updateProgress(0, 100, variable.value as number, 4);
	}

	private async handleAdvancedPayload(payload: WidgetDataPayload): Promise<void> {
		const advanced = payload.data as BaseSettings<PercentageData | RangeData>;
		this.updateName(payload.name);

		switch (advanced.type) {
			case 'percentage':
				this.updateProgressBarDisplay(false);
				await this.updateProgress(0, 100, (advanced as BaseSettings<PercentageData>).settings.percentage, 0, '%');
				break;
			case 'range': {
				this.updateProgressBarDisplay(true);
				const rangeSettings = (advanced as BaseSettings<RangeData>).settings;
				await this.updateProgress(
					rangeSettings.min,
					rangeSettings.max,
					rangeSettings.value,
					2,
					rangeSettings.unit,
					rangeSettings.unitPosition,
					rangeSettings.label
				);
				break;
			}
			default:
				document.getElementById('progressPercentage')!.style.display = 'block';
				await this.log('Unknown advanced type', advanced.type);
				await this.startConfigurationAnimation();
				break;
		}
	}

	private updateProgressBarDisplay(isRange: boolean): void {
		const progressBar = document.getElementById('progressBar')!;
		const progressBackground = document.getElementById('progressBackground')!;
		const progressLabel = document.getElementById('progressLabel')!;

		if (isRange) {
			document.getElementById('progressPercentage')!.style.display = 'none';
			progressBar.classList.add('displayRange');
			progressBackground.classList.add('displayRange');
			progressLabel.style.display = 'block';
		} else {
			document.getElementById('progressPercentage')!.style.display = 'block';
			progressBar.classList.remove('displayRange');
			progressBackground.classList.remove('displayRange');
			progressLabel.style.display = 'none';
		}
	}

	private async updateIcon(iconUrl?: string | null): Promise<void> {
		if (!this.settings.showIcon || this.iconUrl === iconUrl) return;
		this.iconUrl = iconUrl || null;

		const iconEl = document.getElementById('icon')!;
		if (!iconUrl) {
			iconEl.style.display = 'none';
			return;
		}

		const color = this.getIconColor();
		let url = `/icon?url=${iconUrl}`;
		if (color) url += `&color=${encodeURIComponent(color)}`;

		const result = (await this.homey.api('GET', url)) as string;
		iconEl.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(result)}")`;
		iconEl.style.display = 'block';
	}

	private getIconColor(): string | null {
		const widgetDiv = document.querySelector('.homey-widget')!;
		const bgColor = window.getComputedStyle(widgetDiv).backgroundColor;
		const rgbMatch = bgColor.match(/\d+/g)!;
		const [r, g, b, a = 1] = rgbMatch.map(Number);
		const isTransparent = a === 0;
		const isWhitish = r > 240 && g > 240 && b > 240;

		return isTransparent || !isWhitish
			? getComputedStyle(document.documentElement).getPropertyValue('--homey-text-color').trim()
			: null;
	}

	private updateName(name: string, overwritable: boolean = true): void {
		const titleEl = document.querySelector('.title')! as HTMLElement;
		name = overwritable && this.settings.overwriteName ? this.settings.overwriteName : name;

		if (this.settings.showName) {
			titleEl.textContent = name;
			titleEl.style.display = 'block';
		} else {
			titleEl.style.display = 'none';
		}
	}

	private async startConfigurationAnimation(): Promise<void> {
		if (this.configurationAnimationTimeout) return;

		const interval = 1500;
		let value = 0;
		const step = 25;
		let direction = 1;

		const update = async (): Promise<void> => {
			value += step * direction;
			if (value >= 100 || value <= 0) direction *= -1;

			await this.updateProgress(0, 100, value, 0, '%');
			this.configurationAnimationTimeout = setTimeout(update, interval);
		};

		this.updateName('Configure me');
		this.configurationAnimationTimeout = setTimeout(update, interval);
	}

	private async stopConfigurationAnimation(): Promise<void> {
		if (this.configurationAnimationTimeout) clearTimeout(this.configurationAnimationTimeout);
		this.configurationAnimationTimeout = null;
	}

	private static hexToRgb(hex: string): number[] {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return [r, g, b];
	}

	private static interpolateColor(color1: number[], color2: number[], factor: number): string {
		const [r1, g1, b1] = color1;
		const [r2, g2, b2] = color2;

		const r = Math.round(r1 + factor * (r2 - r1));
		const g = Math.round(g1 + factor * (g2 - g1));
		const b = Math.round(b1 + factor * (b2 - b1));

		return `rgb(${r},${g},${b})`;
	}

	private static getContrastYIQ(rgbColor: string): string {
		const rgb = rgbColor.match(/\d+/g)!.map(Number);
		const [r, g, b] = rgb;
		const yiq = (r * 299 + g * 587 + b * 114) / 1000;
		return yiq >= 128 ? 'black' : 'white';
	}

	public async onHomeyReady(): Promise<void> {
		if (!this.settings.transparent) {
			const widgetBackgroundColor = getComputedStyle(document.documentElement)
				.getPropertyValue('--homey-background-color')
				.trim();
			document.querySelector('.homey-widget')!.setAttribute('style', `background-color: ${widgetBackgroundColor};`);
		}

		this.progressBarEl = document.getElementById('progress')! as HTMLProgressElement;

		if (this.settings.datasource) await this.syncData();

		this.homey.ready({ height: this.settings.showName ? 45 : 20 });

		if (!this.settings.datasource) {
			await this.startConfigurationAnimation();
			return;
		}

		if (this.settings.datasource.type === 'capability') {
			this.settings.refreshSeconds = this.settings.refreshSeconds ?? 5;
			this.refreshInterval = setInterval(async () => {
				await this.syncData();
			}, this.settings.refreshSeconds * 1000);
		} else if (this.settings.datasource.type === 'advanced') {
			this.homey.on(`settings/${this.settings.datasource.id}`, async (_data: BaseSettings<unknown> | null) => {
				await this.syncData();
			});
		}
	}
}

interface ModuleWindow extends Window {
	onHomeyReady: (homey: HomeyWidget) => Promise<void>;
}

declare const window: ModuleWindow;

window.onHomeyReady = async (homey: HomeyWidget): Promise<void> =>
	await new ProgressBarWidgetScript(homey).onHomeyReady();
