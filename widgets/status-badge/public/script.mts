import type HomeyWidget from 'homey/lib/HomeyWidget';
import type { BaseSettings } from '../../../datavistasettings/baseSettings.mjs';
import type { BooleanData } from '../../../datavistasettings/booleanSettings.mjs';
import type { CapabilitiesObject, ExtendedVariable } from 'homey-api';
import type { WidgetDataPayload } from '../../baseWidgetApi.mjs';
import type { DataSource } from '../../baseWidget.mjs';
import type { StatusData } from '../../../datavistasettings/statusSettings.mjs';

type Settings = {
	datasource?: DataSource;
	style: 'bar' | 'bullet' | 'namedBullet';
	refreshSeconds: number;
	overwriteName: string;
	nameWidth: '' | '20%' | '30%' | '40%';
	trueColor: string;
	falseColor: string;
	trueText: string;
	falseText: string;
};

class statusBadgeWidgetScript {
	private homey: HomeyWidget;
	private settings: Settings;
	switchEl!: HTMLInputElement;
	private refreshInterval: NodeJS.Timeout | null = null;
	private configurationAnimationTimeout: NodeJS.Timeout | null | undefined;
	private data: boolean = false;
	private iconUrl: string | null = null;

	/**
	 * Creates a new instance of the AdvancedGaugeWidgetScript class.
	 * @param homey The Homey widget.
	 */
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

	private updateState(color: string, text: string, attention: boolean = false): void {
		document.documentElement.style.setProperty('--status-color', color);
		const statusTextEl = document.querySelector('#bar .status-text')! as HTMLElement;
		const rgb = statusBadgeWidgetScript.hexToRgb(color);
		const [r, g, b] = rgb;
		const contrastColor = statusBadgeWidgetScript.getContrastYIQ(`rgb(${r},${g},${b})`);
		statusTextEl.style.color = contrastColor;
		statusTextEl.style.textShadow =
			contrastColor === 'white' ? '0px 1px 0px rgba(0, 0, 0, 0.5)' : '0px 1px 0px rgba(255, 255, 255, 0.3)';

		const statusCircleEl = document.querySelector('.status-circle')! as HTMLElement;
		const statusEl = document.querySelector('.status')! as HTMLElement;
		if (attention) {
			statusCircleEl.classList.add('pulse-transform');
			statusEl.classList.add('pulse-box-shadow');
		} else {
			statusCircleEl.classList.remove('pulse-transform');
			statusEl.classList.remove('pulse-box-shadow');
		}

		const statusTextEls = document.querySelectorAll('.status-text')! as NodeListOf<HTMLElement>;
		statusTextEls.forEach(el => {
			el.textContent = text;
		});
	}

	updateName(name: string, overwritable: boolean = true): void {
		name = overwritable && this.settings.overwriteName ? this.settings.overwriteName : name;
		const titleElements = document.querySelectorAll('#title span')! as NodeListOf<HTMLElement>;
		titleElements.forEach(titleEl => {
			titleEl.textContent = name;
		});
	}

	private static hexToRgb(hex: string): number[] {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return [r, g, b];
	}

	private static getContrastYIQ(rgbColor: string): string {
		const rgb = rgbColor.match(/\d+/g)!.map(Number);
		const [r, g, b] = rgb;
		const yiq = (r * 299 + g * 587 + b * 114) / 1000;
		return yiq >= 128 ? 'black' : 'white';
	}

	private async getData(): Promise<void> {
		if (this.settings.datasource == null) {
			await this.logMessage('No statesource is set', false);
			await this.startConfigurationAnimation();
			return;
		}

		const payload = (await this.homey.api('POST', `/datasource`, {
			datasource: this.settings.datasource,
		})) as {
			datasource: WidgetDataPayload | null;
		};

		if (payload.datasource === null) {
			await this.logMessage('The payload is null', false);
			await this.startConfigurationAnimation();
			return;
		}

		await this.stopConfigurationAnimation();

		switch (this.settings.datasource.type) {
			case 'capability': {
				const capability = payload.datasource.data as CapabilitiesObject;
				const value = capability.value as boolean;
				if (value != null) {
					this.updateState(
						value ? this.settings.trueColor : this.settings.falseColor,
						value ? this.settings.trueText : this.settings.falseText,
					);
				}
				break;
			}
			case 'variable': {
				const variable = payload.datasource.data as ExtendedVariable;
				const value = variable.value as boolean;
				if (value != null) {
					this.updateState(
						value ? this.settings.trueColor : this.settings.falseColor,
						value ? this.settings.trueText : this.settings.falseText,
					);
				}
				break;
			}
			case 'advanced': {
				const data = payload.datasource.data as BaseSettings<unknown>;
				switch (data.type) {
					case 'boolean': {
						const advanced = data as BaseSettings<BooleanData>;
						const value = advanced.settings.value as boolean;
						if (value != null) {
							this.updateState(
								value ? this.settings.trueColor : this.settings.falseColor,
								value ? this.settings.trueText : this.settings.falseText,
							);
						}
						break;
					}
					case 'status': {
						const advanced = data as BaseSettings<StatusData>;
						this.updateState(advanced.settings.color, advanced.settings.text, advanced.settings.attention);
						break;
					}
					default:
						await this.logMessage('The data type is not supported', false, data);
						await this.startConfigurationAnimation();
						break;
				}
				break;
			}
			default:
				await this.logMessage('Unknown statesource type', true, this.settings.datasource.type);
				await this.startConfigurationAnimation();
				break;
		}
	}

	private async startConfigurationAnimation(): Promise<void> {
		if (this.configurationAnimationTimeout != null) return;
		const interval = 1500;
		let value = false;

		const update = async (): Promise<void> => {
			value = !value;
			this.updateState(
				value ? '#ff0000' : '#32cd32',
				'Configure me'
			);
			this.configurationAnimationTimeout = setTimeout(update, interval);
		};
		this.updateName('Status', false);
		this.configurationAnimationTimeout = setTimeout(update, interval);
	}

	private async stopConfigurationAnimation(): Promise<void> {
		if (this.configurationAnimationTimeout !== null) clearTimeout(this.configurationAnimationTimeout);
		this.configurationAnimationTimeout = null;
	}

	/**
	 * Called when the Homey API is ready.
	 */
	public async onHomeyReady(): Promise<void> {
		try {
			const containers = document.querySelectorAll('.container')! as NodeListOf<HTMLElement>;
			containers.forEach(container => {
				if (container.id === this.settings.style) {
					container.style.display = 'flex';
				} else {
					container.style.display = 'none';
				}
			});

			this.updateName(this.settings.overwriteName ?? 'Status', false);
			if (this.settings.nameWidth != null && this.settings.nameWidth !== '') {
				const titleElements = document.querySelectorAll('#title')! as NodeListOf<HTMLElement>;
				titleElements.forEach(titleEl => {
					titleEl.style.width = this.settings.nameWidth;
				});
			}


			if (this.settings.datasource != null) await this.getData();
			this.homey.ready();

			if (this.settings.datasource == null) {
				await this.startConfigurationAnimation();
				return;
			}

			if (this.settings.datasource.type === 'capability' || this.settings.datasource.type === 'variable') {
				this.settings.refreshSeconds = this.settings.refreshSeconds ?? 5;
				this.refreshInterval = setInterval(async () => {
					await this.getData();
				}, this.settings.refreshSeconds * 1000);
			} else if (this.settings.datasource.type === 'advanced') {
				this.homey.on(`settings/${this.settings.datasource.id}`, async (_data: BaseSettings<unknown> | null) => {
					await this.getData();
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
	await new statusBadgeWidgetScript(homey).onHomeyReady();
