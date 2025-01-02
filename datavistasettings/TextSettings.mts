import { DATA_TYPE_IDS } from "../constants.mjs";
import { BaseSettingsRecord } from "./BaseSettings.mjs";

export interface TextData {
	value: string;
}

export class StringSettings extends BaseSettingsRecord<TextData> {
	public override type = DATA_TYPE_IDS.TEXT;

	constructor(identifier: string, data: TextData) {
		super(identifier, data);
	}
}