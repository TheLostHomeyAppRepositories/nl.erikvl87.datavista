import Homey from "homey/lib/Homey";
import { FlowCardAction } from "homey";
import { BaseDataAction } from "./BaseActionData.mjs";
import DataVistaLogger from "../DataVistaLogger.mjs";
import { ProgressBarWidgetSettings } from "../datavistasettings/ProgressBarWidgetSettings.mjs";

export default class ActionSetProgressBarConfiguration extends BaseDataAction {

	private static instance: ActionSetProgressBarConfiguration | null = null;

	private actionCard: FlowCardAction;

	private constructor(homey: Homey, logger: DataVistaLogger) {
		super(homey, logger);
		this.actionCard = this.homey.flow.getActionCard('set-progress-bar-configuration');
	}

	public static async initialize(homey: Homey, logger: DataVistaLogger): Promise<ActionSetProgressBarConfiguration> {
		if (this.instance === null) {
			this.instance = new this(homey, logger);
			await this.instance.setup();
		}
		return this.instance;
	}

	private async setup(): Promise<void> {
		this.actionCard.registerRunListener(async (args, _state) => {
			this.writeData(new ProgressBarWidgetSettings(args.identifier, { 
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
