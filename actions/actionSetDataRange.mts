import Homey from 'homey/lib/Homey';
import { FlowCardAction } from 'homey';
import { BaseDataAction } from './baseActionData.mjs';
import { RangeSettings } from '../datavistasettings/rangeSettings.mjs';

export default class ActionSetDataRange extends BaseDataAction {
	private static instance: ActionSetDataRange | null = null;

	private actionCard: FlowCardAction;

	private constructor(
		homey: Homey,
		log: (...args: unknown[]) => void,
		error: (...args: unknown[]) => void,
	) {
		super(homey, log, error);
		this.actionCard = this.homey.flow.getActionCard('set-range');
	}

	public static async initialize(
		homey: Homey,
		log: (...args: unknown[]) => void,
		error: (...args: unknown[]) => void,
	): Promise<ActionSetDataRange> {
		if (this.instance === null) {
			this.instance = new this(homey, log, error);
			await this.instance.setup();
		}
		return this.instance;
	}

	private async setup(): Promise<void> {
		this.actionCard.registerRunListener(async (args, _state) => {
			this.writeData(new RangeSettings(args.identifier, {
				min: args.min,
				max: args.max,
				value: args.value,
				unit: args.unit,
				unitPosition: args.unitPosition,
				label: args.label,
			}));
		});
	}
}
