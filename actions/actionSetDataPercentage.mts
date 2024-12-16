import Homey from 'homey/lib/Homey';
import { FlowCardAction } from 'homey';
import { BaseDataAction } from './baseActionData.mjs';
import { PercentageSettings } from '../datavistasettings/percentageSettings.mjs';
import DataVistaLogger from '../dataVistaLogger.mjs';

export default class ActionSetDataPercentage extends BaseDataAction {
	private static instance: ActionSetDataPercentage | null = null;
	private actionCard: FlowCardAction;

	private constructor(
		homey: Homey,
		logger: DataVistaLogger
	) {
		super(homey, logger);
		this.actionCard = this.homey.flow.getActionCard('set-percentage');
	}

	public static async initialize(
		homey: Homey,
		logger: DataVistaLogger
	): Promise<void> {
		if (this.instance === null) {
			this.instance = new this(homey, logger);
			await this.instance.setup();
		}
	}

	private async setup(): Promise<void> {
		this.actionCard.registerRunListener(async (args, _state) => {
			this.writeData(new PercentageSettings(args.identifier, { percentage: args.percentage }));
		});
	}
}
