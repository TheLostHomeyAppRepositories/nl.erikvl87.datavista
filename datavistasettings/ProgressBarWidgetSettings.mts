import { WIDGET_TYPE_IDS } from "../constants.mjs";
import { BaseSettingsRecord } from "./BaseSettings.mjs";

export interface ProgressBarWidgetData {
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

export class ProgressBarWidgetSettings extends BaseSettingsRecord<ProgressBarWidgetData> {
	public override type = WIDGET_TYPE_IDS.PROGRESS_BAR;

	constructor(identifier: string, data: ProgressBarWidgetData) {
		super(identifier, data);
	}
}