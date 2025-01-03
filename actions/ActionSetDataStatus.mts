import Homey from 'homey/lib/Homey';
import { FlowCardAction } from 'homey';
import { BaseDataAction } from './BaseActionData.mjs';
import DataVistaLogger from '../DataVistaLogger.mjs';
import { StatusSettings } from '../datavistasettings/StatusSettings.mjs';

export default class ActionSetDataColor extends BaseDataAction {
	private static instance: ActionSetDataColor | null = null;

	private actionCard: FlowCardAction;

	private constructor(
		homey: Homey,
		logger: DataVistaLogger
	) {
		super(homey, logger);
		this.actionCard = this.homey.flow.getActionCard('set-status');
	}

	public static async initialize(
		homey: Homey,
		logger: DataVistaLogger
	): Promise<ActionSetDataColor> {
		if (this.instance === null) {
			this.instance = new this(homey, logger);
			await this.instance.setup();
		}
		return this.instance;
	}

	private async setup(): Promise<void> {
		this.actionCard.registerRunListener(async (args, _state) => {
			this.writeData(new StatusSettings(args.identifier, {
				text: args.text,
				color: args.color,
				attention: args.attention,
			}));
		});
	}
}
