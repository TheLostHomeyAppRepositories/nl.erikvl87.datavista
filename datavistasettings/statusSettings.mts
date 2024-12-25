import { DATA_TYPE_IDS } from "../constants.mjs";
import { BaseSettingsRecord } from "./baseSettings.mjs";

export interface StatusData {
	text: string;
	color: string;
	attention: boolean;
}

export class StatusSettings extends BaseSettingsRecord<StatusData> {
	public override type = DATA_TYPE_IDS.STATUS;

	constructor(identifier: string, data: StatusData) {
		super(identifier, data);
	}
}