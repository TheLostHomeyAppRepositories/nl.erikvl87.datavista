import { ExtendedHomeyAPIV3Local } from 'homey-api';
import Homey from 'homey/lib/Homey';
import { Widget } from 'homey';
import { BaseWidget } from '../baseWidget.mjs';
import DataVistaLogger from '../../DataVistaLogger.mjs';

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
	}
}
