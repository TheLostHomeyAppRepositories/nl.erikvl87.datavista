import { DATA_TYPE_IDS } from "../constants.mjs";
import { BaseSettingsRecord } from "./baseSettings.mjs";

export interface PercentageData {
	percentage: number;
}

export class PercentageSettings extends BaseSettingsRecord<PercentageData> {
	public override type = DATA_TYPE_IDS.PERCENTAGE;

	constructor(identifier: string, data: PercentageData) {
		super(identifier, data);
	}
}