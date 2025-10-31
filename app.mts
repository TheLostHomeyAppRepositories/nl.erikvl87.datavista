import Homey from 'homey';
import { HomeyAPI, ExtendedHomeyAPIV3Local } from 'homey-api';
import ActionSetDataPercentage from './actions/ActionSetDataPercentage.mjs';
import ActionSetRange from './actions/ActionSetDataRange.mjs';
import AdvancedGaugeWidget from './widgets/advanced-gauge/advancedGaugeWidget.mjs';
import ActionSetGaugeConfiguration from './actions/ActionSetGaugeConfiguration.mjs';
import SimpleGaugeWidget from './widgets/simple-gauge/simpleGaugeWidget.mjs';
import {
	AdvancedGaugeWidgetData,
	AdvancedGaugeWidgetSettings,
} from './datavistasettings/AdvancedGaugeWidgetSettings.mjs';
import ProgressBarWidget from './widgets/progress-bar/ProgressBarWidget.mjs';
import ToggleSwitchWidget from './widgets/toggle-switch/ToggleSwitchWidget.mjs';
import ActionSetDataBoolean from './actions/ActionSetDataBoolean.mjs';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import DataVistaLogger from './DataVistaLogger.mjs';
import LabelWidget from './widgets/label/LabelWidget.mjs';
import ActionSetDataString from './actions/ActionSetDataString.mjs';
import StatusBadgeWidget from './widgets/status-badge/StatusBadgeWidget.mjs';
import ActionSetDataColor from './actions/ActionSetDataStatus.mjs';
import { ExtendedError } from './common/ExtendedError.mjs';
import LineChartWidget from './widgets/line-chart/LineChartWidget.mjs';
import ActionSetProgressBarConfiguration from './actions/ActionSetProgressBarConfiguration.mjs';
import { ProgressBarWidgetData, ProgressBarWidgetSettings } from './datavistasettings/ProgressBarWidgetSettings.mjs';
import ColorUtils from './common/ColorUtils.mjs';

let fetch: typeof globalThis.fetch;

void (async (): Promise<void> => {
	if (typeof globalThis.fetch === 'function') {
		fetch = globalThis.fetch; // Use native fetch if available
	} else {
		// Dynamically import node-fetch for older environments
		const { default: nodeFetch } = await import('node-fetch');
		fetch = nodeFetch as unknown as typeof fetch;
	}
})();

export default class DataVista extends Homey.App {
	homeyApi!: ExtendedHomeyAPIV3Local;
	logger!: DataVistaLogger;
	colorUtils!: ColorUtils;

	public override async onInit(): Promise<void> {
		this.logger = await DataVistaLogger.initialize(this.homey, this.log, this.error);
		await this.logger.logMessage(`${this.constructor.name} has been initialized`);

		this.homeyApi = await HomeyAPI.createAppAPI({
			homey: this.homey,
		});

		this.colorUtils = ColorUtils.initialize(this.homey, this.logger);

		await SimpleGaugeWidget.initialize(this.homey, this.homeyApi, this.logger);
		await AdvancedGaugeWidget.initialize(this.homey, this.homeyApi, this.logger);
		await ProgressBarWidget.initialize(this.homey, this.homeyApi, this.logger);
		await ToggleSwitchWidget.initialize(this.homey, this.homeyApi, this.logger);
		await LabelWidget.initialize(this.homey, this.homeyApi, this.logger);
		await StatusBadgeWidget.initialize(this.homey, this.homeyApi, this.logger);
		await LineChartWidget.initialize(this.homey, this.homeyApi, this.logger);

		await ActionSetDataPercentage.initialize(this.homey, this.logger);
		await ActionSetRange.initialize(this.homey, this.logger);
		await ActionSetGaugeConfiguration.initialize(this.homey, this.logger);
		await ActionSetDataBoolean.initialize(this.homey, this.logger);
		await ActionSetDataString.initialize(this.homey, this.logger);
		await ActionSetDataColor.initialize(this.homey, this.logger);
		await ActionSetProgressBarConfiguration.initialize(this.homey, this.logger);
	}

	/**
	 * Get the timezone and language of this Homey.
	 * @returns An object containing the timezone and language. Example: { timezone: 'Europe/Amsterdam', language: 'nl' }
	 */
	public async getTimeAndLanguage(): Promise<{ timezone: string; language: string }> {
		const timezone = await this.homey.clock.getTimezone();
		const language = this.homey.i18n.getLanguage();
		return { timezone, language };
	}

	/**
	 * Remove a data item from the settings.
	 * @param key The settings key to remove.
	 * @returns A boolean indicating a successful removal.
	 */
	public removeData(key: string): boolean {
		const data = this.homey.settings.get(key);
		if (data == null) {
			void this.logger.logMessage(`Can't remove data with key '${key}' because it doesn't exist.`);
			return false;
		}

		void this.logger.logMessage(`[${this.constructor.name}] Deleting data with key '${key}'.`, false, data);
		this.homey.app.homey.settings.unset(key);
		this.homey.api.realtime(`settings/${key}`, null);
		return true;
	}

	/**
	 * Update a range data item in the settings.
	 * @param key The settings key to update.
	 * @param data The new data to set.
	 * @returns A boolean indicating a successful removal.
	 */
	public updateGauge(key: string, data: AdvancedGaugeWidgetData): boolean {
		const existingData = this.homey.settings.get(key);
		if (existingData == null) {
			void this.logger.logMessage(`Can't update data with key '${key}' because it doesn't exist.`);
			return false;
		}

		const rangeSettings = new AdvancedGaugeWidgetSettings(existingData.identifier, data);
		rangeSettings.setSettings(this.homey, this.logger);
		return true;
	}

	/**
	 * Add a gauge to the settings.
	 * @param key The settings key to add.
	 * @param data The data to add.
	 * @returns A boolean indicating a successful removal.
	 */
	public addGauge(key: string, data: AdvancedGaugeWidgetData): void {
		const settings = new AdvancedGaugeWidgetSettings(key, data);
		settings.setSettings(this.homey, this.logger);
	}

	/**
	 * Add a gauge to the settings.
	 * @param key The settings key to add.
	 * @param data The data to add.
	 * @returns A boolean indicating a successful removal.
	 */
	public addProgressBar(key: string, data: ProgressBarWidgetData): void {
		const settings = new ProgressBarWidgetSettings(key, data);
		settings.setSettings(this.homey, this.logger);
	}

	/**
	 * Get the svg source for a given url.
	 * @param url The url to fetch the svg from.
	 * @param darken If the svg should be darkened.
	 * @returns The svg source.
	 */
	public async getSvgForUrl(url: string, color: string | null): Promise<string> {
		try {
			const response = await fetch(url);
			if (!response.ok) throw new ExtendedError('Invalid response while fetching icon. Status: ', { response });

			if (!response.headers.get('content-type')?.includes('image/svg+xml'))
				throw new ExtendedError('Invalid content type while fetching icon.', { response });

			let iconSvgSource = await response.text();
			if (color == null) return iconSvgSource;

			const parser = new DOMParser();
			const svgDoc = parser.parseFromString(iconSvgSource, 'image/svg+xml');

			const elementsToUpdate = [
				...Array.from(svgDoc.getElementsByTagName('rect')),
				...Array.from(svgDoc.getElementsByTagName('text')),
				...Array.from(svgDoc.getElementsByTagName('path')),
				...Array.from(svgDoc.getElementsByTagName('*')).filter(
					el =>
						(el.hasAttribute('fill') && el.getAttribute('fill') !== 'none') ||
						(el.hasAttribute('stroke') && el.getAttribute('stroke') !== 'none'),
				),
			];

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

			const paths = svgDoc.getElementsByTagName('path');
			for (let i = 0; i < paths.length; i++) {
				const path = paths[i];
				if (!path.hasAttribute('fill')) {
					path.setAttribute('fill', color);
				}
			}

			const styles = svgDoc.getElementsByTagName('style');
			for (let i = 0; i < styles.length; i++) {
				const style = styles[i];
				if (style.textContent) {
					style.textContent = style.textContent.replace(/fill:[^;]+;/g, `fill:${color};`);
				}
			}

			iconSvgSource = new XMLSerializer().serializeToString(svgDoc);

			return iconSvgSource;
		} catch (error) {
			void this.logger.logException(error);
			throw error;
		}
	}
}
