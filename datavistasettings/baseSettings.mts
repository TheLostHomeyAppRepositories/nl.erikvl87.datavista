import { Homey } from "homey/lib/Device";
import * as crypto from 'crypto';
import DataVistaLogger from "../dataVistaLogger.mjs";

export interface BaseSettings<T> {
	identifier: string;
	type: string;
	lastUpdated: Date;
	settings: T;
}

export abstract class BaseSettingsRecord<T> {
	public identifier: string;
	public abstract type: string;
	public settings: T;
	public lastUpdated: Date;

	constructor(identifier: string, settings: T) {
		this.identifier = identifier;
		this.lastUpdated = new Date();
		this.settings = settings;
	}

	public getSettings(): BaseSettings<T> {
		return {
			identifier: this.identifier,
			type: this.type,
			lastUpdated: this.lastUpdated,
			settings: this.settings,
		}
	}

	public setSettings(homey: Homey, logger: DataVistaLogger) : void {
		const hash = crypto
			.createHash('md5')
			.update(this.identifier)
			.digest('hex');

		const key = `${this.type}-${hash}`;
		const settings = this.getSettings();
		void logger.logMessage(`Updating ${this.type} '${key}' with data`, false, settings);
		homey.settings.set(key, this.getSettings());
		homey.api.realtime(`settings/${key}`, settings);
	}
}
