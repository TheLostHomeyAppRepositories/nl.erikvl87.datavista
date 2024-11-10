import Homey from "homey/lib/Homey";
import { BaseSettings } from "../../datavistasettings/baseSettings.mjs";
import { AdvancedGaugeWidgetData } from "../../datavistasettings/advancedGaugeWidgetSettings.mjs";

export default class AdvancedGaugeWidget {

	private static instance: AdvancedGaugeWidget | null = null;

	private widget: any;

	private constructor(private homey: Homey, private log: (...args: unknown[]) => void, private error: (...args: unknown[]) => void) {
		this.widget = this.homey.dashboards.getWidget('advanced-gauge');
	}

	public static async initialize(homey: Homey, log: (...args: unknown[]) => void, error: (...args: unknown[]) => void): Promise<AdvancedGaugeWidget> {
		if (this.instance === null) {
			this.instance = new this(homey, log, error);
			await this.instance.setup();
		}
		return this.instance;
	}

	private async setup(): Promise<void> {
		this.widget.registerSettingAutocompleteListener('datasource', async (query: string) => {
			const settings = this.homey.settings.getKeys();
			const keys = settings.filter((key) => key.startsWith('percentage-') || key.startsWith('range-'));
			const results = keys.map((key) => {
				const data: BaseSettings<unknown> = this.homey.settings.get(key);
				return {
					name: data.identifier,
					description: data.type,
					id: key
				};
			});

			const filteredResults = results.filter((result) => {
				return result.name.toLowerCase().includes(query.toLowerCase());
			}).sort((a, b) => a.name.localeCompare(b.name));
			return filteredResults;
		});

		this.widget.registerSettingAutocompleteListener('configsource', async (query: string) => {
			const settings = this.homey.settings.getKeys();
			const keys = settings.filter((key) => key.startsWith('gauge-'));
			const results = keys.map((key) => {
				const data: BaseSettings<AdvancedGaugeWidgetData> = this.homey.settings.get(key);
				return {
					name: data.identifier,
					description: data.type,
					id: key
				};
			});

			const filteredResults = results.filter((result) => {
				return result.name.toLowerCase().includes(query.toLowerCase());
			}).sort((a, b) => a.name.localeCompare(b.name));
			return filteredResults;
		});
	}
}
