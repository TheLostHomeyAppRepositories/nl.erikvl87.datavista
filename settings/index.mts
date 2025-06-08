import type HomeySettings from 'homey/lib/HomeySettings';
import { BaseSettings } from '../datavistasettings/BaseSettings.mjs';
import { PercentageData } from '../datavistasettings/PercentageSettings.mjs';
import { RangeData } from '../datavistasettings/RangeSettings.mjs';
import { AdvancedGaugeWidgetData } from '../datavistasettings/AdvancedGaugeWidgetSettings.mjs';
import { ProgressBarWidgetData } from '../datavistasettings/ProgressBarWidgetSettings.mjs';
import { BooleanData } from '../datavistasettings/BooleanSettings.mjs';
import { TextData } from '../datavistasettings/TextSettings.mjs';
import { StatusData } from '../datavistasettings/StatusSettings.mjs';

class SettingsScript {
	private homey: HomeySettings;
	timezone: string | undefined;
	language: string | undefined;

	constructor(homey: HomeySettings) {
		this.homey = homey;
	}

	private createElement(templateId: string, data: BaseSettings<any>, key: string): HTMLElement {
		const template = document.getElementById(templateId) as HTMLTemplateElement;
		const fragment = template.content.cloneNode(true) as DocumentFragment;
		const element = fragment.firstElementChild as HTMLElement;
		element.setAttribute('data-id', key);

		const identifierLabel = element.querySelector('.identifier-label') as HTMLElement;
		identifierLabel.innerText = data.identifier;

		const lastUpdatedLabel = element.querySelector('#last-updated-label') as HTMLInputElement;
		lastUpdatedLabel.value = new Date(data.lastUpdated).toLocaleString(this.language, { timeZone: this.timezone });
		lastUpdatedLabel.readOnly = true;

		return element;
	}

	private createPercentageElement(data: BaseSettings<PercentageData>, key: string): HTMLElement {
		const element = this.createElement('percentage-template', data, key);
		const percentageInput = element.querySelector('#percentage-input') as HTMLInputElement;
		percentageInput.value = `${data.settings.percentage}%`;
		return element;
	}

	private createRangeElement(data: BaseSettings<RangeData>, key: string): HTMLElement {
		const element = this.createElement('range-template', data, key);
		const minInput = element.querySelector('#min-input') as HTMLInputElement;
		const maxInput = element.querySelector('#max-input') as HTMLInputElement;
		const valueInput = element.querySelector('#value-input') as HTMLInputElement;
		const unitInput = element.querySelector('#unit-input') as HTMLInputElement;
		minInput.value = `${data.settings.min}`;
		maxInput.value = `${data.settings.max}`;
		valueInput.value = `${data.settings.value}`;
		unitInput.value = data.settings.unit ?? '';
		return element;
	}

	private createBooleanElement(data: BaseSettings<BooleanData>, key: string): HTMLElement {
		const element = this.createElement('boolean-template', data, key);
		const booleanInput = element.querySelector('#boolean-input') as HTMLInputElement;
		booleanInput.checked = data.settings.value;
		return element;
	}

	private createTextElement(data: BaseSettings<TextData>, key: string): HTMLElement {
		const element = this.createElement('text-template', data, key);
		const textInput = element.querySelector('#text-input') as HTMLInputElement;
		textInput.value = data.settings.value;
		return element;
	}

	private createStatusElement(data: BaseSettings<StatusData>, key: string): HTMLElement {
		const element = this.createElement('status-template', data, key);
		const textInput = element.querySelector('#text-input') as HTMLInputElement;
		const attentionInput = element.querySelector('#attention-input') as HTMLInputElement;
		textInput.value = data.settings.text;
		attentionInput.checked = data.settings.attention;
		return element;
	}

	private createGaugeElement(data: BaseSettings<AdvancedGaugeWidgetData>, key: string): HTMLElement {
		const element = this.createElement('gauge-template', data, key);
		const colorInputs = [
			{
				color: element.querySelector('#color1-input') as HTMLInputElement,
				hex: element.querySelector('#color1-hex') as HTMLInputElement,
				offset: element.querySelector('#offset1-input') as HTMLInputElement,
				value: data.settings.color1,
				offsetValue: data.settings.colorOffset1,
			},
			{
				color: element.querySelector('#color2-input') as HTMLInputElement,
				hex: element.querySelector('#color2-hex') as HTMLInputElement,
				offset: element.querySelector('#offset2-input') as HTMLInputElement,
				value: data.settings.color2,
				offsetValue: data.settings.colorOffset2,
			},
			{
				color: element.querySelector('#color3-input') as HTMLInputElement,
				hex: element.querySelector('#color3-hex') as HTMLInputElement,
				offset: element.querySelector('#offset3-input') as HTMLInputElement,
				value: data.settings.color3,
				offsetValue: data.settings.colorOffset3,
			},
			{
				color: element.querySelector('#color4-input') as HTMLInputElement,
				hex: element.querySelector('#color4-hex') as HTMLInputElement,
				offset: element.querySelector('#offset4-input') as HTMLInputElement,
				value: data.settings.color4,
				offsetValue: data.settings.colorOffset4,
			},
			{
				color: element.querySelector('#color5-input') as HTMLInputElement,
				hex: element.querySelector('#color5-hex') as HTMLInputElement,
				offset: element.querySelector('#offset5-input') as HTMLInputElement,
				value: data.settings.color5,
				offsetValue: data.settings.colorOffset5,
			},
		];

		colorInputs.forEach(({ color, hex, offset, value, offsetValue }) => {
			if (value != null) {
				color.value = `${value}`;
				hex.value = `${value}`;
			} else {
				// (color.closest('.input-group') as HTMLElement)!.style.display = 'none';
			}
			if (offsetValue != null) {
				offset.value = `${offsetValue}`;
			}
		});

		this.addColorInputListeners(element);
		this.addClearButtonListeners(element);
		this.addSaveButtonListener(element, key);
		return element;
	}

	private createProgressBarElement(data: BaseSettings<ProgressBarWidgetData>, key: string): HTMLElement {
		const element = this.createElement('progress-bar-template', data, key);
		const colorInputs = [
			{
				color: element.querySelector('#color1-input') as HTMLInputElement,
				hex: element.querySelector('#color1-hex') as HTMLInputElement,
				offset: element.querySelector('#offset1-input') as HTMLInputElement,
				value: data.settings.color1,
				offsetValue: data.settings.colorOffset1,
			},
			{
				color: element.querySelector('#color2-input') as HTMLInputElement,
				hex: element.querySelector('#color2-hex') as HTMLInputElement,
				offset: element.querySelector('#offset2-input') as HTMLInputElement,
				value: data.settings.color2,
				offsetValue: data.settings.colorOffset2,
			},
			{
				color: element.querySelector('#color3-input') as HTMLInputElement,
				hex: element.querySelector('#color3-hex') as HTMLInputElement,
				offset: element.querySelector('#offset3-input') as HTMLInputElement,
				value: data.settings.color3,
				offsetValue: data.settings.colorOffset3,
			},
			{
				color: element.querySelector('#color4-input') as HTMLInputElement,
				hex: element.querySelector('#color4-hex') as HTMLInputElement,
				offset: element.querySelector('#offset4-input') as HTMLInputElement,
				value: data.settings.color4,
				offsetValue: data.settings.colorOffset4,
			},
			{
				color: element.querySelector('#color5-input') as HTMLInputElement,
				hex: element.querySelector('#color5-hex') as HTMLInputElement,
				offset: element.querySelector('#offset5-input') as HTMLInputElement,
				value: data.settings.color5,
				offsetValue: data.settings.colorOffset5,
			},
		];

		colorInputs.forEach(({ color, hex, offset, value, offsetValue }) => {
			if (value != null) {
				color.value = `${value}`;
				hex.value = `${value}`;
			} else {
				// (color.closest('.input-group') as HTMLElement)!.style.display = 'none';
			}
			if (offsetValue != null) {
				offset.value = `${offsetValue}`;
			}
		});

		this.addColorInputListeners(element);
		this.addClearButtonListeners(element);
		this.addSaveButtonListener(element, key);
		return element;
	}

	private addColorInputListeners(element: HTMLElement): void {
		const colorInputs = element.querySelectorAll('input[type="color"]');
		colorInputs.forEach(colorInput => {
			colorInput.addEventListener('input', event => {
				const hexInput = (colorInput.closest('.input-group') as HTMLElement).querySelector('.hex') as HTMLInputElement;
				hexInput.value = (event.target as HTMLInputElement).value;
			});
		});
	}

	private addClearButtonListeners(element: HTMLElement): void {
		const clearButtons = element.querySelectorAll('.clear-button');
		clearButtons.forEach(button => {
			button.addEventListener('click', event => {
				const inputGroup = (event.target as HTMLElement).closest('.input-group') as HTMLElement;
				const colorInput = inputGroup.querySelector('input[type="color"]') as HTMLInputElement;
				const hexInput = inputGroup.querySelector('.hex') as HTMLInputElement;
				colorInput.value = '';
				hexInput.value = '';
			});
		});
	}

	private addSaveButtonListener(element: HTMLElement, key: string): void {
		const button = element.querySelector('.save-button') as HTMLButtonElement;
		button.onclick = async (): Promise<void> => {
			await this.saveSettings(element, key);
		};
	}

	private async saveSettings(element: HTMLElement, key: string): Promise<void> {
		const colorInputs = [
			{
				color: element.querySelector('#color1-hex') as HTMLInputElement,
				offset: element.querySelector('#offset1-input') as HTMLInputElement,
			},
			{
				color: element.querySelector('#color2-hex') as HTMLInputElement,
				offset: element.querySelector('#offset2-input') as HTMLInputElement,
			},
			{
				color: element.querySelector('#color3-hex') as HTMLInputElement,
				offset: element.querySelector('#offset3-input') as HTMLInputElement,
			},
			{
				color: element.querySelector('#color4-hex') as HTMLInputElement,
				offset: element.querySelector('#offset4-input') as HTMLInputElement,
			},
			{
				color: element.querySelector('#color5-hex') as HTMLInputElement,
				offset: element.querySelector('#offset5-input') as HTMLInputElement,
			},
		];

		const settings = {
			color1: colorInputs[0].color.value,
			colorOffset1: this.convertToNumber(colorInputs[0].offset.value),
			color2: colorInputs[1].color.value,
			colorOffset2: this.convertToNumber(colorInputs[1].offset.value),
			color3: colorInputs[2].color.value,
			colorOffset3: this.convertToNumber(colorInputs[2].offset.value),
			color4: colorInputs[3].color.value,
			colorOffset4: this.convertToNumber(colorInputs[3].offset.value),
			color5: colorInputs[4].color.value,
			colorOffset5: this.convertToNumber(colorInputs[4].offset.value),
		};

		colorInputs.forEach(({ offset }, index) => {
			offset.value = `${(settings as any)[`colorOffset${index + 1}`] ?? ''}`;
		});
		

		await this.homey.api('PUT', `/gauge/${key}`, settings, async (err: string, result: boolean) => {
			if (err || !result) {
				await this.homey.alert('Failed to save data');
			} else {
				await this.homey.alert('Data saved successfully');
			}
		});
	}

	private convertToNumber(value: string | null | undefined): number | undefined {
		if (value == null || String(value).trim() === '') {
			return undefined;
		}

		if (String(value).includes(','))
			value = value.replace(',', '.');
		const numberValue = parseFloat(value);
		if (isNaN(numberValue)) {
			return undefined;
		}

		return numberValue;
	}

	private addListenerToRemoveButton(element: HTMLElement, key: string): void {
		const button = element.querySelector('.remove-button') as HTMLButtonElement;
		button.onclick = async (): Promise<void> => {
			this.homey.confirm(
				'Are you sure you want to remove this item?',
				null,
				async (_err: string, confirmed: boolean) => {
					if (confirmed) {
						this.homey.api('DELETE', `/data/${key}`, async (_err: string, result: boolean) => {
							if (result) {
								element.remove();
							} else {
								await this.homey.alert('Failed to remove data');
							}
						});
					}
				},
			);
		};
	}

	private getDataTypeIds(): Promise<string[]> {
		return new Promise((resolve, reject) => {
			const dataTypeIds: string[] = [];
			this.homey.api('GET', '/dataTypes', (err: string, result: string[]) => {
				if (err) {
					reject(err);
				} else {
					dataTypeIds.push(...result);
					resolve(dataTypeIds);
				}
			});
		});
	}

	private getTimeAndLanguage(): Promise<{ timezone: string; language: string }> {
		return new Promise((resolve, reject) => {
			this.homey.api('GET', '/getTimeAndLanguage', (err: string, result: { timezone: string; language: string }) => {
				if (err) {
					reject(err);
				} else {
					this.timezone = result.timezone;
					this.language = result.language;
					resolve(result);
				}
			});
		});
	}

	private getSettings(): Promise<Record<string, unknown>> {
		return new Promise((resolve, reject) => {
			this.homey.get((err: string, settings: Record<string, unknown>) => {
				if (err) {
					reject(err);
				} else {
					resolve(settings);
				}
			});
		});
	}

	private async loadData(): Promise<void> {
		const dataTypeIds = await this.getDataTypeIds();
		const settings = await this.getSettings();

		const percentageContent = document.querySelector('#percentage-container .content') as HTMLElement;
		const rangeContent = document.querySelector('#range-container .content') as HTMLElement;
		const booleanContent = document.querySelector('#boolean-container .content') as HTMLElement;
		const textContent = document.querySelector('#text-container .content') as HTMLElement;
		const statusContent = document.querySelector('#status-container .content') as HTMLElement;
		const gaugeContent = document.querySelector('#gauge-container .content') as HTMLElement;
		const progressBarContent = document.querySelector('#progress-bar-container .content') as HTMLElement;

		percentageContent.innerHTML = '';
		rangeContent.innerHTML = '';
		booleanContent.innerHTML = '';
		textContent.innerHTML = '';
		gaugeContent.innerHTML = '';
		progressBarContent.innerHTML = '';

		const dataKeys = Object.keys(settings).filter(key => dataTypeIds.some(id => key.startsWith(`${id}-`)));
		const groupedData: Record<string, { key: string; item: BaseSettings<unknown> }[]> = {};

		for (const key of dataKeys) {
			const item = settings[key] as BaseSettings<unknown>;
			if (!groupedData[item.type]) {
				groupedData[item.type] = [];
			}
			groupedData[item.type].push({ key, item });
		}

		Object.keys(groupedData)
			.sort()
			.forEach(type => {
				groupedData[type]
					.sort((a, b) => new Date(b.item.lastUpdated).getTime() - new Date(a.item.lastUpdated).getTime())
					.forEach(({ key, item: settings }) => {
						let element: HTMLElement;
						switch (settings.type) {
							case 'percentage': {
								element = this.createPercentageElement(settings as BaseSettings<PercentageData>, key);
								this.addListenerToRemoveButton(element, key);
								percentageContent.appendChild(element);
								break;
							}
							case 'range': {
								element = this.createRangeElement(settings as BaseSettings<RangeData>, key);
								this.addListenerToRemoveButton(element, key);
								rangeContent.appendChild(element);
								break;
							}
							case 'boolean': {
								element = this.createBooleanElement(settings as BaseSettings<BooleanData>, key);
								this.addListenerToRemoveButton(element, key);
								booleanContent.appendChild(element);
								break;
							}
							case 'text': {
								element = this.createTextElement(settings as BaseSettings<TextData>, key);
								this.addListenerToRemoveButton(element, key);
								textContent.appendChild(element);
								break;
							}
							case 'status': {
								element = this.createStatusElement(settings as BaseSettings<StatusData>, key);
								this.addListenerToRemoveButton(element, key);
								statusContent.appendChild(element);
								break;
							}
							case 'gauge': {
								element = this.createGaugeElement(settings as BaseSettings<AdvancedGaugeWidgetData>, key);
								this.addListenerToRemoveButton(element, key);
								gaugeContent.appendChild(element);
								break;
							}
							case 'progress-bar': {
								element = this.createProgressBarElement(settings as BaseSettings<ProgressBarWidgetData>, key);
								this.addListenerToRemoveButton(element, key);
								progressBarContent.appendChild(element);
								break;
							}
							default: {
								// const baseData: BaseData = item;
								// TODO: Log this.
								break;
							}
						}
					});
			});
	}

	public async onHomeyReady(): Promise<void> {
		const timeAndLanguage = await this.getTimeAndLanguage();
		this.timezone = timeAndLanguage.timezone;
		this.language = timeAndLanguage.language;

		const addGaugeButton = document.getElementById('add-gauge-button') as HTMLButtonElement;
		addGaugeButton.addEventListener('click', () => {
			const modal = document.getElementById('identifier-modal') as HTMLElement;
			(document.getElementById('type-input') as HTMLInputElement).value = 'gauge';
			modal.style.display = 'block';
			const identifierInput = document.getElementById('identifier-input') as HTMLInputElement;
			identifierInput.focus();
		});

		const addProgressBarButton = document.getElementById('add-progress-bar-button') as HTMLButtonElement;
		addProgressBarButton.addEventListener('click', () => {
			const modal = document.getElementById('identifier-modal') as HTMLElement;
			(document.getElementById('type-input') as HTMLInputElement).value = 'progress-bar';
			modal.style.display = 'block';
			const identifierInput = document.getElementById('identifier-input') as HTMLInputElement;
			identifierInput.focus();
		});

		const modalSubmitButton = document.getElementById('modal-submit-button') as HTMLButtonElement;
		modalSubmitButton.addEventListener('click', async () => {
			const typeInput = document.getElementById('type-input') as HTMLInputElement;
			const identifierInput = document.getElementById('identifier-input') as HTMLInputElement;
			const identifier = identifierInput.value;
			if (identifier) {
				switch (typeInput.value) {
					case 'gauge':
						await this.addGauge(identifier);
						break;
					case 'progress-bar':
						await this.addProgressBar(identifier);
						break;
				}

				// Clear the inputs and close the modal
				typeInput.value = '';
				identifierInput.value = '';
				const modal = document.getElementById('identifier-modal') as HTMLElement;
				modal.style.display = 'none';
			}
		});

		const modalCancelButton = document.getElementById('modal-cancel-button') as HTMLButtonElement;
		modalCancelButton.addEventListener('click', () => {
			const modal = document.getElementById('identifier-modal') as HTMLElement;
			modal.style.display = 'none';
		});

		await this.loadData();
		this.homey.ready();
	}

	private async addGauge(identifier: string): Promise<void> {
		try {
			this.homey.api('POST', '/gauge', { identifier }, async (err: string, result: boolean) => {
				if (result) {
					await this.loadData();
				} else {
					await this.homey.alert('Failed to add gauge');
					// TODO: Failed
				}
			});
		} catch (error) {
			// TODO
		}
	}

	private async addProgressBar(identifier: string): Promise<void> {
		try {
			this.homey.api('POST', '/progressbar', { identifier }, async (err: string, result: boolean) => {
				if (result) {
					await this.loadData();
				} else {
					await this.homey.alert('Failed to add progress bar');
					// TODO: Failed
				}
			});
		} catch (error) {
			// TODO
		}
	}
}

interface ModuleWindow extends Window {
	onHomeyReady: (homey: HomeySettings) => void;
}

declare const window: ModuleWindow;

window.onHomeyReady = async (homey: HomeySettings): Promise<void> => await new SettingsScript(homey).onHomeyReady();
