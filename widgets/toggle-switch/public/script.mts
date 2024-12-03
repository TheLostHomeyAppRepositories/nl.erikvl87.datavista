import type HomeyWidget from 'homey/lib/HomeyWidget';
import type { toggleSwitchWidgetPayload } from '../api.mjs';
import type { BaseSettings } from '../../../datavistasettings/baseSettings.mjs';
import { BooleanData } from '../../../datavistasettings/booleanSettings.mjs';

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
	showIcon: boolean;
	overwriteName: string;
	faTrueValue: string;
	trueColor: string;
	faFalseValue: string;
	falseColor: string;
};

class toggleSwitchWidgetScript {
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

	private updateState(value: boolean): void {
		if (value === this.data) return;

		// const previousValue = this.data;
		this.data = value;
		this.switchEl.checked = value;
		this.switchEl.dispatchEvent(new Event('change')); // todo check if needed
	}

	updateName(name: string, overwritable: boolean = true): void {
		const titleEl = document.querySelector('.title')! as HTMLElement;
		name = overwritable && this.settings.overwriteName ? this.settings.overwriteName : name;
		titleEl.textContent = name;
	}

	async updateIcon(iconUrl: string): Promise<void> {
		if (this.settings.showIcon === false) return;
		if (this.iconUrl === iconUrl) return;
		this.iconUrl = iconUrl;

		const widgetDiv = document.querySelector('.homey-widget')!;
		const bgColor = window.getComputedStyle(widgetDiv).backgroundColor;
		const rgbMatch = bgColor.match(/\d+/g)!;
		const [r, g, b, a = 1] = rgbMatch.map(Number);
		const isTransparent = a === 0;
		const isWhitish = r > 240 && g > 240 && b > 240;
		const color =
			isTransparent || !isWhitish
				? getComputedStyle(document.documentElement).getPropertyValue('--homey-text-color').trim()
				: null;

		let url = `/icon?url=${iconUrl}`;
		if (color != null) url += `&color=${encodeURIComponent(color)}`;

		const result = (await this.homey.api('GET', url)) as string;
		const iconEl = document.getElementById('icon')!;
		iconEl.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(result)}")`;
		iconEl.style.display = 'block';
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
			)) as toggleSwitchWidgetPayload | null;

			if (payload?.iconUrl != null) {
				await this.updateIcon(payload.iconUrl);
			}
		} else if (type === 'advanced') {
			payload = (await this.homey.api(
				'GET',
				`/advanced?key=${this.settings.datasource!.id}`,
			)) as toggleSwitchWidgetPayload | null;
		} else {
			await this.startConfigurationAnimation();
			return;
		}

		if (payload !== null && payload.value != null) {
			await this.log('Received payload', payload);
			await this.stopConfigurationAnimation();
			this.updateName(payload.name);
			this.updateState(payload.value);
		} else {
			await this.log('The payload is null');
			await this.startConfigurationAnimation();
		}
	}

	private async startConfigurationAnimation(): Promise<void> {
		if (this.configurationAnimationTimeout != null) return;
		const interval = 1500;
		let value = false;
		const update = async (): Promise<void> => {
			value = !value;
			this.updateState(value);
			this.configurationAnimationTimeout = setTimeout(update, interval);
		};
		this.updateName('Configure me', true);
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
		if (!this.settings.transparent) {
			const widgetBackgroundColor = getComputedStyle(document.documentElement)
				.getPropertyValue('--homey-background-color')
				.trim();
			document.querySelector('.homey-widget')!.setAttribute('style', `background-color: ${widgetBackgroundColor};`);
		}

		this.switchEl = document.getElementById('switch')! as HTMLInputElement;
		const label = document.querySelector('label[for="switch"]') as HTMLLabelElement;
		label.style.setProperty('--icon-true-value', `'\\${this.settings.faTrueValue}'`);
		label.style.setProperty('--icon-false-value', `'\\${this.settings.faFalseValue}'`);

		document.documentElement.style.setProperty('--true-color', this.settings.trueColor);
		document.documentElement.style.setProperty('--false-color', this.settings.falseColor);

		if (this.settings.datasource != null) await this.syncData();
		this.homey.ready();

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
			this.homey.on(`settings/${this.settings.datasource.id}`, async (data: BaseSettings<BooleanData> | null) => {
				if (data === null) {
					await this.startConfigurationAnimation();
					return;
				}

				await this.stopConfigurationAnimation();
				this.updateState(data.settings.value);
			});
		}
	}
}

interface ModuleWindow extends Window {
	onHomeyReady: (homey: HomeyWidget) => Promise<void>;
}

declare const window: ModuleWindow;

window.onHomeyReady = async (homey: HomeyWidget): Promise<void> =>
	await new toggleSwitchWidgetScript(homey).onHomeyReady();
