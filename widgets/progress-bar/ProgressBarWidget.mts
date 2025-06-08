import { ExtendedHomeyAPIV3Local } from 'homey-api';
import Homey from 'homey/lib/Homey';
import { Widget } from 'homey';
import { BaseWidget } from '../BaseWidget.mjs';
import DataVistaLogger from '../../DataVistaLogger.mjs';
import { ProgressBarWidgetData } from '../../datavistasettings/ProgressBarWidgetSettings.mjs';
import { BaseSettings } from '../../datavistasettings/BaseSettings.mjs';
import { WIDGET_TYPE_IDS } from '../../constants.mjs';

export default class ProgressBarWidget extends BaseWidget {
	private static instance: ProgressBarWidget | null = null;
	private widget: Widget;

	private constructor(
		homey: Homey,
		homeyApi: ExtendedHomeyAPIV3Local,
		logger: DataVistaLogger
	) {
		super(homey, homeyApi, logger);
		this.widget = this.homey.dashboards.getWidget('progress-bar');
	}

	public static async initialize(
		homey: Homey,
		homeyApi: ExtendedHomeyAPIV3Local,
		logger: DataVistaLogger
	): Promise<ProgressBarWidget> {
		if (this.instance === null) {
			this.instance = new this(homey, homeyApi, logger);
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
				fromCapabilities: true,
				fromSettings: true
			}));

		this.widget.registerSettingAutocompleteListener('configsource', async (query: string) => {
			const settings = this.homey.settings.getKeys();
			const keys = settings.filter(key => key.startsWith(`${WIDGET_TYPE_IDS.PROGRESS_BAR}-`));
			const results = keys.map(key => {
				const data: BaseSettings<ProgressBarWidgetData> = this.homey.settings.get(key);
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

			filteredResults.unshift({
				name: this.homey.__('none'),
				id: '',
				description: '',
			});
			return filteredResults;
		});
	}
}
