import Homey from "homey/lib/Homey";
import { FlowCardAction } from "homey";
import { BaseDataAction } from "./baseActionData.mjs";
import { AdvancedGaugeWidgetSettings } from "../datavistasettings/advancedGaugeWidgetSettings.mjs";

export default class ActionSetGaugeConfiguration extends BaseDataAction {

	private static instance: ActionSetGaugeConfiguration | null = null;

	private actionCard: FlowCardAction;

	private constructor(homey: Homey, log: (...args: unknown[]) => void, error: (...args: unknown[]) => void) {
		super(homey, log, error);
		this.actionCard = this.homey.flow.getActionCard('set-gauge-configuration');
	}

	public static async initialize(homey: Homey, log: (...args: unknown[]) => void, error: (...args: unknown[]) => void): Promise<ActionSetGaugeConfiguration> {
		if (this.instance === null) {
			this.instance = new this(homey, log, error);
			await this.instance.setup();
		}
		return this.instance;
	}

	private async setup(): Promise<void> {
		this.actionCard.registerRunListener(async (args, _state) => {
			this.writeData(new AdvancedGaugeWidgetSettings(args.identifier, { 
				color1: args.color1,
				colorOffset1: args.colorOffset1,
				color2: args.color2,
				colorOffset2: args.colorOffset2,
				color3: args.color3,
				colorOffset3: args.colorOffset3,
				color4: args.color4,
				colorOffset4: args.colorOffset4,
				color5: args.color5,
				colorOffset5: args.colorOffset5,
			}));
		});
	}
}
