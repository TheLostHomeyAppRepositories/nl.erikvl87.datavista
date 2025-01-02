import { DATA_TYPE_IDS } from "../constants.mjs";
import { BaseSettingsRecord } from "./BaseSettings.mjs";

export interface RangeData {
	min: number;
	max: number;
	unit: string;
	unitPosition: 'prefix' | 'suffix';
	value: number;
	label: string;
}

export class RangeSettings extends BaseSettingsRecord<RangeData> {
	public override type = DATA_TYPE_IDS.RANGE;

	constructor(identifier: string, data: RangeData) {
		super(identifier, data);
	}
}