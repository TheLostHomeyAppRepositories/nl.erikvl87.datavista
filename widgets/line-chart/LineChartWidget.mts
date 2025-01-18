import { Widget } from 'homey';
import { ExtendedHomeyAPIV3Local } from 'homey-api';
import Homey from 'homey/lib/Homey';
import { BaseWidget } from '../BaseWidget.mjs';
import DataVistaLogger from '../../DataVistaLogger.mjs';

export default class LineChartWidget extends BaseWidget {
	private static instance: LineChartWidget | null = null;
	private widget: Widget;

	private constructor(
		homey: Homey,
		homeyApi: ExtendedHomeyAPIV3Local,
		logger: DataVistaLogger
	) {
		super(homey, homeyApi, logger);
		this.widget = this.homey.dashboards.getWidget('line-chart');
	}

	public static async initialize(
		homey: Homey,
		homeyApi: ExtendedHomeyAPIV3Local,
		logger: DataVistaLogger
	): Promise<LineChartWidget> {
		if (this.instance === null) {
			this.instance = new this(homey, homeyApi, logger);
			await this.instance.setup();
		}
		return this.instance;
	}

	private async setup(): Promise<void> {
		this.widget.registerSettingAutocompleteListener('datasource1', async (query: string) =>
			this.autocompleteQuery({
				query,
				includeDataPoints: true,
				fromInsights: true
			}),
		);

		this.widget.registerSettingAutocompleteListener('datasource2', async (query: string) =>
			this.autocompleteQuery({
				query,
				includeDataPoints: true,
				fromInsights: true,
				optional: true
			}),
		);
	}
}
