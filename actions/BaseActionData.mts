import { Homey } from 'homey/lib/Device';
import { BaseSettingsRecord } from '../datavistasettings/BaseSettings.mjs';
import DataVistaLogger from '../DataVistaLogger.mjs';

export class BaseDataAction {
	protected homey: Homey;
	protected logger: DataVistaLogger;

	constructor(
		homey: Homey,
		logger: DataVistaLogger
	) {
		this.homey = homey;
		this.logger = logger;
	}

	protected writeData<T extends BaseSettingsRecord<unknown>>(data: T): void {
		data.setSettings(this.homey, this.logger);
	}
}
