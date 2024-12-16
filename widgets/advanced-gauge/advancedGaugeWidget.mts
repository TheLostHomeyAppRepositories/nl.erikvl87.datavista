import Homey from 'homey/lib/Homey';
import { BaseSettings } from '../../datavistasettings/baseSettings.mjs';
import { AdvancedGaugeWidgetData } from '../../datavistasettings/advancedGaugeWidgetSettings.mjs';
import { Widget } from 'homey';
import { BaseWidget } from '../baseWidget.mjs';
import { ExtendedHomeyAPIV3Local } from 'homey-api';

export default class AdvancedGaugeWidget extends BaseWidget {
	private static instance: AdvancedGaugeWidget | null = null;
	private widget: Widget;

	private constructor(
		homey: Homey,
		homeyApi: ExtendedHomeyAPIV3Local,
		log: (...args: unknown[]) => void,
		error: (...args: unknown[]) => void,
	) {
		super(homey, homeyApi, log, error);
		this.widget = this.homey.dashboards.getWidget('advanced-gauge');
	}

	public static async initialize(
		homey: Homey,
		homeyApi: ExtendedHomeyAPIV3Local,
		log: (...args: unknown[]) => void,
		error: (...args: unknown[]) => void,
	): Promise<AdvancedGaugeWidget> {
		if (this.instance === null) {
			this.instance = new this(homey, homeyApi, log, error);
			await this.instance.setup();
		}
		return this.instance;
	}

	private async setup(): Promise<void> {
		this.widget.registerSettingAutocompleteListener('datasource', async (query: string) =>
			this.autocompleteQuery({
				query,
				includePercentages: true,
				includeRanges: true,
				fromSettings: true,
				fromVariables: false,
			}),
		);

		this.widget.registerSettingAutocompleteListener('configsource', async (query: string) => {
			const settings = this.homey.settings.getKeys();
			const keys = settings.filter(key => key.startsWith('gauge-'));
			const results = keys.map(key => {
				const data: BaseSettings<AdvancedGaugeWidgetData> = this.homey.settings.get(key);
				return {
					name: data.identifier,
					description: data.type,
					id: key,
				};
			});

			const filteredResults = query
				? results
					.filter(result => {
						return result.name.toLowerCase().includes(query.toLowerCase());
					})
					.sort((a, b) => a.name.localeCompare(b.name))
				: results;
			return filteredResults;
		});
	}
}
