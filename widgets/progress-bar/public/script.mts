import type HomeyWidget from 'homey/lib/HomeyWidget';
import type { progressBarWidgetPayload } from '../api.mjs';
import type { BaseSettings } from '../../../datavistasettings/baseSettings.mjs';
import type { PercentageData } from '../../../datavistasettings/percentageSettings.mjs';

type Settings = {
	datasource?: {
		deviceId: string;
		deviceName: string;
		id: string;
		name: string;
		type: 'capability' | 'advanced';
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
	private data: number = 0;
	private iconUrl: string | null = null;

	/**
	 * Creates a new instance of the AdvancedGaugeWidgetScript class.
	 * @param homey The Homey widget.
	 */
	constructor(homey: HomeyWidget) {
		this.homey = homey;
		this.settings = homey.getSettings() as Settings;
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

	private updateProgress(value: number): void {
		if (value === this.data) return;

		const previousValue = this.data;
		this.data = value;

		const progressBar = document.getElementById('progressBar')!;
		const progressPercentage = document.getElementById('progressPercentage')!;

		const startColor = ProgressBarWidgetScript.hexToRgb(this.settings.color1);
		const endColor = ProgressBarWidgetScript.hexToRgb(this.settings.color2);

		// Animate percentage display
		const duration = 500; // Duration of the animation in milliseconds
		const startTime = performance.now();

		const animate = (currentTime: number): void => {
			const elapsedTime = currentTime - startTime;
			const progress = Math.min(elapsedTime / duration, 1);
			const currentPercentage = Math.round(previousValue + (value - previousValue) * progress);

			progressPercentage.textContent = `${currentPercentage}%`;

			if (progress < 1) {
				requestAnimationFrame(animate);
			}
		};

		requestAnimationFrame(animate);

		// Set width of progress bar
		progressBar.style.width = `${this.data}%`;

		// Calculate intermediate color
		const intermediateColor = ProgressBarWidgetScript.interpolateColor(startColor, endColor, this.data / 100);
		progressBar.style.backgroundColor = intermediateColor;
	}

	private async syncData(): Promise<void> {
		const type = this.settings.datasource!.type;

		let payload;
		if (type === 'capability') {
			const capabilityId = this.settings.datasource?.id;
			const deviceId = this.settings.datasource?.deviceId;
			payload = (await this.homey.api(
				'GET',
				`/capability?deviceId=${deviceId}&capabilityId=${capabilityId}`,
				{},
			)) as progressBarWidgetPayload | null;

			if (payload?.iconUrl != null) {
				await this.updateIcon(payload.iconUrl);
			}
		} else if (type === 'advanced') {
			payload = (await this.homey.api(
				'GET',
				`/advanced?key=${this.settings.datasource!.id}`,
			)) as progressBarWidgetPayload | null;
		} else {
			await this.startConfigurationAnimation();
			return;
		}

		if (payload !== null && payload.value !== null) {
			await this.log('Received payload', payload);
			await this.stopConfigurationAnimation();
			this.updateName(payload.name);
			this.updateProgress(payload.value);
		} else {
			await this.log('The payload is null');
			await this.startConfigurationAnimation();
		}
	}

	async updateIcon(iconUrl: string): Promise<void> {
		if (this.settings.showIcon === false) return;
		if (this.iconUrl === iconUrl) return;

		const response = await fetch(iconUrl);
		if (!response.ok || !response.headers.get('content-type')?.includes('image/svg+xml')) {
			// throw new Error('Invalid response while fetching icon');
		} else {
			let iconSvgSource = await response.text();
			const iconEl = document.getElementById('icon')!;

			const widgetDiv = document.querySelector('.homey-widget')!;
			const bgColor = window.getComputedStyle(widgetDiv).backgroundColor;
			const rgbMatch = bgColor.match(/\d+/g);

			if (rgbMatch) {
				const [r, g, b, a = 1] = rgbMatch.map(Number);

				await this.log('Background color', r, g, b, a);
				const isTransparent = a === 0;
				const isWhitish = r > 240 && g > 240 && b > 240;

				if (isTransparent || !isWhitish) {
					const color = getComputedStyle(document.documentElement).getPropertyValue('--homey-text-color').trim();
					const parser = new DOMParser();
					const svgDoc = parser.parseFromString(iconSvgSource, 'image/svg+xml');
					const elementsToUpdate = svgDoc.querySelectorAll(
						'[fill]:not([fill="none"]), [stroke]:not([stroke="none"]), rect, text, path',
					);

					elementsToUpdate.forEach(el => {
						if (el.hasAttribute('fill') && el.getAttribute('fill') !== 'none') {
							el.setAttribute('fill', color);
						}
						if (el.hasAttribute('stroke') && el.getAttribute('stroke') !== 'none') {
							el.setAttribute('stroke', color);
						}
						if (el.tagName === 'rect' || el.tagName === 'text') {
							const style = el.getAttribute('style');
							if (style && style.includes('fill:')) {
								el.setAttribute('style', style.replace(/fill:[^;"]*;?/, `fill:${color};`));
							}
						}
					});

					const paths = svgDoc.querySelectorAll('path');
					paths.forEach(path => {
						if (!path.hasAttribute('fill')) {
							path.setAttribute('fill', color);
						}
					});

					iconSvgSource = new XMLSerializer().serializeToString(svgDoc.documentElement);
				}
			}

			void this.log('Icon source', iconSvgSource);

			iconEl.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(iconSvgSource)}")`;
			iconEl.style.display = 'block';
		}
	}

	updateName(name: string): void {
		const titleEl = document.querySelector('.title')! as HTMLElement;

		name = this.settings.overwriteName ? this.settings.overwriteName : name;

		if (this.settings.showName === true) {
			titleEl.textContent = name;
			titleEl.style.display = 'block';
		} else {
			titleEl.style.display = 'none';
		}
	}

	private async startConfigurationAnimation(): Promise<void> {
		if (this.configurationAnimationTimeout != null) return;
		const interval = 1500;
		let value = 0;
		const step = 25;
		let direction = 1;
		const update = async (): Promise<void> => {
			value += step * direction;
			if (value >= 100 || value <= 0) {
				direction *= -1;
			}

			this.updateProgress(value);
			this.configurationAnimationTimeout = setTimeout(update, interval);
		};
		this.updateName('Configure me');
		this.configurationAnimationTimeout = setTimeout(update, interval);
	}

	private static hexToRgb(hex: string): number[] {
		// Convert hex to RGB
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return [r, g, b];
	}

	private async stopConfigurationAnimation(): Promise<void> {
		if (this.configurationAnimationTimeout !== null) clearTimeout(this.configurationAnimationTimeout);
		this.configurationAnimationTimeout = null;
	}

	private static interpolateColor(
		color1: number[] | [any, any, any],
		color2: number[] | [any, any, any],
		factor: number,
	): string {
		const [r1, g1, b1] = color1;
		const [r2, g2, b2] = color2;

		const r = Math.round(r1 + factor * (r2 - r1));
		const g = Math.round(g1 + factor * (g2 - g1));
		const b = Math.round(b1 + factor * (b2 - b1));

		return `rgb(${r},${g},${b})`;
	}

	/**
	 * Called when the Homey API is ready.
	 */
	public async onHomeyReady(): Promise<void> {
		if (!this.settings.transparent) {
			const widgetBackgroundColor = getComputedStyle(document.documentElement)
				.getPropertyValue('--homey-background-color')
				.trim();
			document.querySelector('.homey-widget')!.setAttribute('style', `background-color: ${widgetBackgroundColor};`);
		}

		this.progressBarEl = document.getElementById('progress')! as HTMLProgressElement;

		if (this.settings.datasource != null) await this.syncData();

		this.homey.ready({ height: this.settings.showName ? 65 : 40 });

		if (this.settings.datasource == null) {
			await this.startConfigurationAnimation();
			return;
		}

		if (this.settings.datasource.type === 'capability') {
			this.settings.refreshSeconds = this.settings.refreshSeconds ?? 5;
			this.refreshInterval = setInterval(async () => {
				await this.syncData();
			}, this.settings.refreshSeconds * 1000);
		} else if (this.settings.datasource.type === 'advanced') {
			this.homey.on(`settings/${this.settings.datasource.id}`, async (data: BaseSettings<PercentageData> | null) => {
				if (data === null) {
					await this.startConfigurationAnimation();
					return;
				}

				await this.stopConfigurationAnimation();
				this.updateProgress(data.settings.percentage);
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
