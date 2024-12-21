import type HomeyWidget from 'homey/lib/HomeyWidget';
import type { WidgetDataPayload } from '../../baseWidgetApi.mjs';
import type { CapabilitiesObject, ExtendedVariable } from 'homey-api';
import type { BaseSettings } from '../../../datavistasettings/baseSettings.mjs';
import { TextData } from '../../../datavistasettings/textSettings.mjs';

type Settings = {
	transparent: boolean;
	textFadeInEffect: boolean;
	textBold: boolean;
	showName: boolean;
	showIcon: boolean;
	overwriteName: string;
	datasource?: {
		deviceId: string;
		deviceName: string;
		id: string;
		name: string;
		type: 'capability' | 'advanced' | 'variable';
	};
	refreshSeconds: number;
};

class LabelWidgetScript {
	private homey: HomeyWidget;
	private settings: Settings;
	private refreshInterval: NodeJS.Timeout | null = null;
	private configurationAnimationTimeout: NodeJS.Timeout | null | undefined;
	private iconUrl: string | null = null;
	private value: string = '';
	timelineAnimation: any;

	constructor(homey: HomeyWidget) {
		this.homey = homey;
		this.settings = homey.getSettings() as Settings;
	}

	/*
	 * Logs a message to the Homey API.
	 * @param args The arguments to log.
	 * @returns A promise that resolves when the message is logged.
	 */
	private async log(message: string, logToSentry: boolean, ...optionalParams: any[]): Promise<void> {
		console.log(message, optionalParams);
		await this.homey.api('POST', '/log', { message, logToSentry, optionalParams });
	}

	private async syncData(): Promise<void> {
		if (!this.settings.datasource) {
			await this.log('No datasource is set', false);
			await this.startConfigurationAnimation();
			return;
		}

		const payload = await this.fetchDataSourcePayload();
		if (!payload) {
			await this.log('The payload is null', false);
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

		await this.updateLabel(capability.value as string);
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
		const lineEl = document.getElementById('line')!;
		const lineOffset = iconEl.getBoundingClientRect().width;
		const iconMarginRight = parseFloat(getComputedStyle(iconEl).marginRight);
		lineEl.style.marginLeft = `${lineOffset + iconMarginRight}px`;
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

	private async handleVariablePayload(payload: WidgetDataPayload): Promise<void> {
		const variable = payload.data as ExtendedVariable;
		this.updateName(payload.name);
		await this.updateLabel(variable.value as string);
	}

	private async handleAdvancedPayload(payload: WidgetDataPayload): Promise<void> {
		const advanced = payload.data as BaseSettings<TextData>;
		this.updateName(payload.name);

		switch (advanced.type) {
			case 'text': {
				const stringSettings = (advanced as BaseSettings<TextData>).settings;
				await this.updateLabel(stringSettings.value);
				break;
			}
			default:
				document.getElementById('progressPercentage')!.style.display = 'block';
				await this.log('Unknown advanced type', true, advanced.type);
				await this.startConfigurationAnimation();
				break;
		}
	}

	private async updateLabel(string: string): Promise<void> {
		const previousValue = this.value;
		this.value = string;
		if (previousValue === string) return;
		await this.stopConfigurationAnimation();

		// Clean up
		const lettersEl = document.querySelector('.letters')! as HTMLElement;
		const textWrapper = document.querySelector('.text-wrapper')! as HTMLElement;
		lettersEl.classList.remove('marquee');
		if (this.timelineAnimation) {
			this.timelineAnimation.pause();
			this.timelineAnimation.reset();
			this.timelineAnimation = null;
		}
		const clones = document.querySelectorAll('.cloned');
		clones.forEach(clone => clone.remove());
		lettersEl.classList.remove('marquee');

		// Split the string into individual characters, including emoticons and spaces
		const characters = Array.from(string);
		lettersEl.innerHTML = characters
			.map(char => `<span class='letter'>${char === ' ' ? '&nbsp;' : char}</span>`)
			.join('');
		const isMarquee = textWrapper.clientWidth < lettersEl.scrollWidth;
		if (isMarquee) {
			lettersEl.innerHTML += '&nbsp;&nbsp;&nbsp;●&nbsp;&nbsp;&nbsp;';
			const clone = lettersEl.cloneNode(true) as HTMLElement;
			clone.id = 'letters-cloned';
			clone.classList.add('cloned');
			lettersEl.parentNode!.appendChild(clone);
		}

		
		let timeoutForMarquee = 1000;
		if (this.settings.textFadeInEffect) {
			const lineOffset = lettersEl.getBoundingClientRect().width + 5;
			const matchCount = characters.length;
			const lineDuration = 17 * (matchCount + 1) + 600;
			timeoutForMarquee += lineDuration;
			
			this.timelineAnimation = window.anime
				.timeline({ loop: false })
				.add({
					targets: '.line',
					scaleY: [0, 1],
					opacity: [0.5, 1],
					easing: 'easeOutExpo',
					duration: 700,
				})
				.add({
					targets: '.line',
					translateX: [0, lineOffset],
					easing: 'easeOutExpo',
					duration: lineDuration,
					delay: 100,
				})
				.add({
					targets: '.letter',
					opacity: [0, 1],
					easing: 'easeOutExpo',
					duration: 600,
					offset: `-=${lineDuration}`,
					delay: (_el: any, i: number) => 17 * (i + 1),
				})
				.add({
					targets: '.line',
					opacity: 0,
					duration: 1000,
					easing: 'easeOutExpo',
					delay: 500,
				});
		}

		if (isMarquee) {
			await new Promise(resolve => setTimeout(resolve, timeoutForMarquee + 1000));
			const lettersEl = document.querySelectorAll('.letters')! as NodeListOf<HTMLElement>;
			lettersEl.forEach(el => el.classList.add('marquee'));
		}
	}

	private async startConfigurationAnimation(): Promise<void> {
		if (this.configurationAnimationTimeout) return;

		const messages = [
			{ message: 'I can display text', interval: 3000 },
			{ message: 'I can show emoticons 🥳', interval: 4000 },
			{ message: 'I am capable of displaying long sentences by scrolling horizontally.', interval: 7000 },
			{ message: 'Are you still here? Go configure me!', interval: 7000 },
		];
		let i = 0;

		const update = async (): Promise<void> => {
			if (i >= messages.length) i = 0;
			const { message, interval } = messages[i];
			await this.updateLabel(message);
			i++;
			this.configurationAnimationTimeout = setTimeout(update, interval);
		};

		this.updateName('Configure me');
		await update();
	}

	private async stopConfigurationAnimation(): Promise<void> {
		if (this.configurationAnimationTimeout) clearTimeout(this.configurationAnimationTimeout);
		this.configurationAnimationTimeout = null;
	}

	public async onHomeyReady(): Promise<void> {
		if (!this.settings.transparent) {
			const widgetBackgroundColor = getComputedStyle(document.documentElement)
				.getPropertyValue('--homey-background-color')
				.trim();
			document.querySelector('.homey-widget')!.setAttribute('style', `background-color: ${widgetBackgroundColor};`);
				if (this.settings.textBold) document.documentElement.style.setProperty('--font-weight', 'bold');
		}
		if (this.settings.datasource) await this.syncData();

		this.homey.ready({ height: this.settings.showName ? 74 : 52 });

		if (!this.settings.datasource) {
			await this.startConfigurationAnimation();
			return;
		}

		if (this.settings.datasource.type === 'capability' || this.settings.datasource.type === 'variable') {
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
	anime: any;
}

declare const window: ModuleWindow;

window.onHomeyReady = async (homey: HomeyWidget): Promise<void> => await new LabelWidgetScript(homey).onHomeyReady();
