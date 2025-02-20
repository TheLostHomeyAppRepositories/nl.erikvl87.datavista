import Homey from 'homey/lib/Homey';
import { FlowCardAction } from 'homey';
import { BaseDataAction } from './BaseActionData.mjs';
import DataVistaLogger from '../DataVistaLogger.mjs';
import { StringSettings } from '../datavistasettings/TextSettings.mjs';

export default class ActionSetDataString extends BaseDataAction {
	private static instance: ActionSetDataString | null = null;

	private actionCard: FlowCardAction;

	private constructor(
		homey: Homey,
		logger: DataVistaLogger
	) {
		super(homey, logger);
		this.actionCard = this.homey.flow.getActionCard('set-text');
	}

	public static async initialize(
		homey: Homey,
		logger: DataVistaLogger
	): Promise<ActionSetDataString> {
		if (this.instance === null) {
			this.instance = new this(homey, logger);
			await this.instance.setup();
		}
		return this.instance;
	}

	private async setup(): Promise<void> {
		this.actionCard.registerRunListener(async (args, _state) => {
			this.writeData(new StringSettings(args.identifier, {
				value: args.value,
			}));
		});
	}
}
