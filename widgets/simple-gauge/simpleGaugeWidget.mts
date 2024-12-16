import { Widget } from 'homey';
import { ExtendedHomeyAPIV3Local } from 'homey-api';
import Homey from 'homey/lib/Homey';
import { BaseWidget } from '../baseWidget.mjs';
import DataVistaLogger from '../../dataVistaLogger.mjs';

export default class SimpleGaugeWidget extends BaseWidget {
	private static instance: SimpleGaugeWidget | null = null;
	private widget: Widget;

	private constructor(
		homey: Homey,
		homeyApi: ExtendedHomeyAPIV3Local,
		logger: DataVistaLogger
	) {
		super(homey, homeyApi, logger);
		this.widget = this.homey.dashboards.getWidget('simple-gauge');
	}

	public static async initialize(
		homey: Homey,
		homeyApi: ExtendedHomeyAPIV3Local,
		logger: DataVistaLogger
	): Promise<SimpleGaugeWidget> {
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
				includeNumbers: true,
				includePercentages: true,
				fromCapabilities: true,
				fromVariables: true
			}),
		);
	}
}
