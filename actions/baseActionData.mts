import { Homey } from 'homey/lib/Device';
import { BaseSettingsRecord } from '../datavistasettings/baseSettings.mjs';

export class BaseDataAction {
	protected homey: Homey;
	protected log: (...args: unknown[]) => void;
	protected error: (...args: unknown[]) => void;

	constructor(
		homey: Homey,
		log: (...args: unknown[]) => void,
		error: (...args: unknown[]) => void,
	) {
		this.homey = homey;
		this.log = log;
		this.error = error;
	}

	protected writeData<T extends BaseSettingsRecord<unknown>>(data: T): void {
		data.setSettings(this.homey);
	}
}
