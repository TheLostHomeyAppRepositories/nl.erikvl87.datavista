import { WIDGET_TYPE_IDS } from "../constants.mjs";
import { BaseSettingsRecord } from "./baseSettings.mjs";

export interface AdvancedGaugeWidgetData {
	color1?: string;
	colorOffset1?: number;
	color2?: string;
	colorOffset2?: number;
	color3?: string;
	colorOffset3?: number;
	color4?: string;
	colorOffset4?: number;
	color5?: string;
	colorOffset5?: number;
}

export class AdvancedGaugeWidgetSettings extends BaseSettingsRecord<AdvancedGaugeWidgetData> {
	public override type = WIDGET_TYPE_IDS.GAUGE;

	constructor(identifier: string, data: AdvancedGaugeWidgetData) {
		super(identifier, data);
	}
}