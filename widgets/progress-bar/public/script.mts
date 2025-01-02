import type HomeyWidget from 'homey/lib/HomeyWidget';
import type { BaseSettings } from '../../../datavistasettings/BaseSettings.mjs';
import type { PercentageData } from '../../../datavistasettings/PercentageSettings.mjs';
import type { WidgetDataPayload } from '../../baseWidgetApi.mjs';
import type { CapabilitiesObject, ExtendedVariable } from 'homey-api';
import type { RangeData } from '../../../datavistasettings/RangeSettings.mjs';

type Settings = {
	datasource?: {
		deviceId: string;
		deviceName: string;
		id: string;
		name: string;
		type: 'capability' | 'advanced' | 'variable';
	};
	refreshSeconds: number;
	color1: string;
	color2: string;
	color3: string;
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

	private async logMessage(message: string, logToSentry: boolean, ...optionalParams: any[]): Promise<void> {
		await this.homey.api('POST', '/logMessage', { message, logToSentry, optionalParams });
	}

	private async logError(message: string, error: Error): Promise<void> {
		const serializedError = JSON.stringify(error, Object.getOwnPropertyNames(error));
		await this.homey.api('POST', '/logError', { message, error: serializedError });
	}

	private static getPrecision(a: number): number {
		if (!isFinite(a)) return 0; // Handle non-finite numbers (e.g., Infinity, NaN)
		let e = 1,
			p = 0; // Initialize multiplier `e` and precision counter `p`
		while (Math.round(a * e) / e !== a) {
			e *= 10; // Multiply `e` by 10 to shift the decimal point
			p++; // Increment precision counter
		}
		return p; // Return the calculated precision
	}

	private async updateProgress(
		min: number,
		max: number,
		value: number,
		maximumPrecision: number,
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

		const duration = 500;
		const startTime = performance.now();
		const previousPercentage = this.percentage;
		const percentage = ((Math.min(Math.max(value, min), max) - min) / (max - min)) * 100;
		this.percentage = percentage;

		const precision = ProgressBarWidgetScript.getPrecision(value);
		const actualPrecision = precision <= maximumPrecision ? precision : maximumPrecision;

		const animate = async (currentTime: number): Promise<void> => {
			const elapsedTime = currentTime - startTime;
			const progress = Math.min(elapsedTime / duration, 1);
			const currentPercentage = Math.round(previousPercentage + (percentage - previousPercentage) * progress);
			progressPercentage.textContent = `${currentPercentage}%`;

			const currentValue = previousValue + (value - previousValue) * progress;

			const displayValue =
				ProgressBarWidgetScript.getPrecision(currentValue) <= maximumPrecision
					? currentValue.toString()
					: currentValue.toFixed(actualPrecision);

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
			const isLabelOverBar = progressLabelRect.right - progressLabelRect.width / 2 < progressBarRect.left;

			if (isLabelOverBar) {
				const colors = [this.settings.color1, this.settings.color2, this.settings.color3]
					.filter(color => color && color.trim() !== '')
					.map(color => ProgressBarWidgetScript.hexToRgb(color));
				const intermediateColor = ProgressBarWidgetScript.interpolateColor(colors, 0.5);
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

		progressBar.style.width = `${100 - percentage}%`;
		progressBar.style.right = '0';
	}

	private async syncData(): Promise<void> {
		if (!this.settings.datasource) {
			await this.logMessage('No datasource is set', false);
			await this.startConfigurationAnimation();
			return;
		}

		const payload = await this.fetchDataSourcePayload();
		if (!payload) {
			await this.logMessage('The payload is null', false);
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
				await this.logMessage('Unknown datasource type', true, this.settings.datasource!.type);
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

		this.updateProgressBarDisplay(capability.units !== '%');

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
					rangeSettings.label,
				);
				break;
			}
			default:
				document.getElementById('progressPercentage')!.style.display = 'block';
				await this.logMessage('Unknown advanced type', true, advanced.type);
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
		try {
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
		} catch (error) {
			if (error instanceof Error) {
				await this.logError('An error occured while updating the icon', error);
			} else {
				await this.logMessage('An error occured while updating the icon', true, error);
			}
		}
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

	private static interpolateColor(colors: number[][], factor: number): string {
		if (colors.length === 1) {
			const [r, g, b] = colors[0];
			return `rgb(${r},${g},${b})`;
		}
		const interpolate = (start: number, end: number, factor: number): number =>
			Math.round(start + factor * (end - start));
		const steps = colors.length - 1;
		const step = Math.floor(factor * steps);
		const localFactor = factor * steps - step;

		const [r1, g1, b1] = colors[step];
		const [r2, g2, b2] = colors[step + 1];

		const r = interpolate(r1, r2, localFactor);
		const g = interpolate(g1, g2, localFactor);
		const b = interpolate(b1, b2, localFactor);

		return `rgb(${r},${g},${b})`;
	}

	private static getContrastYIQ(rgbColor: string): string {
		const rgb = rgbColor.match(/\d+/g)!.map(Number);
		const [r, g, b] = rgb;
		const yiq = (r * 299 + g * 587 + b * 114) / 1000;
		return yiq >= 128 ? 'black' : 'white';
	}

	public async onHomeyReady(): Promise<void> {
		try {
			this.progressBarEl = document.getElementById('progress')! as HTMLProgressElement;
			const progressBackground = document.getElementById('progressBackground')!;
			const colors = [this.settings.color1, this.settings.color2, this.settings.color3].filter(
				color => color && color.trim() !== '',
			);
			progressBackground.style.background =
				colors.length === 1
					? colors[0]
					: (progressBackground.style.background = `linear-gradient(to right, ${colors.join(', ')})`);

			if (this.settings.datasource) await this.syncData();

			// # Temporary fix for the height of the widget causing the widget's height to be too small
			// # This can be reverted once Athom has fixed the issue.
			// this.homey.ready({ height: this.settings.showName ? 45 : 20 });
			this.homey.ready({ height: 45 });

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
}

declare const window: ModuleWindow;

window.onHomeyReady = async (homey: HomeyWidget): Promise<void> =>
	await new ProgressBarWidgetScript(homey).onHomeyReady();
