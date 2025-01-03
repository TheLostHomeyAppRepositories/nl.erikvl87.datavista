import { ExtendedHomeyAPIV3Local } from 'homey-api';
import Homey from 'homey/lib/Homey';
import Widget from 'homey/lib/Widget';
import { BooleanData } from '../datavistasettings/BooleanSettings.mjs';
import { DATA_TYPE_IDS, DATAVISTA_APP_NAME, HOMEY_LOGIC } from '../constants.mjs';
import { BaseSettings } from '../datavistasettings/BaseSettings.mjs';
import { PercentageData } from '../datavistasettings/PercentageSettings.mjs';
import { RangeData } from '../datavistasettings/RangeSettings.mjs';
import DataVistaLogger from '../DataVistaLogger.mjs';
import { TextData } from '../datavistasettings/TextSettings.mjs';
import { StatusData } from '../datavistasettings/StatusSettings.mjs';

export type DataSource = {
	name: string;
	description?: string;
	id: string;
	type?: 'capability' | 'advanced' | 'variable';
	deviceId?: string;
	deviceName: string;
};

type AutocompleteQueryOptions = {
	query?: string | null;
	optional?: boolean;
	includeText?: boolean;
	includeBooleans?: boolean;
	includePercentages?: boolean;
	includeRanges?: boolean;
	includeNumbers?: boolean;
	includeStatus?: boolean;
	fromCapabilities?: boolean;
	fromSettings?: boolean;
	fromVariables?: boolean;
};

export class BaseWidget {
	protected homey: Homey;
	protected homeyApi: ExtendedHomeyAPIV3Local;
	protected logger: DataVistaLogger;

	constructor(homey: Homey, homeyApi: ExtendedHomeyAPIV3Local, logger: DataVistaLogger) {
		this.homey = homey;
		this.homeyApi = homeyApi;
		this.logger = logger;
	}

	async autocompleteQuery(options: AutocompleteQueryOptions): Promise<Widget.SettingAutocompleteResults> {
		const results: DataSource[] = [];

		try {
			if (options.fromSettings) {
				const settingsKeys = this.homey.settings.getKeys();
				settingsKeys.forEach(key => {
					switch (key.split('-')[0]) {
						case DATA_TYPE_IDS.BOOLEAN: {
							if (!options.includeBooleans) break;
							const data: BaseSettings<BooleanData> = this.homey.settings.get(key);
							results.push({
								name: data.identifier,
								description: `${DATAVISTA_APP_NAME} ${this.homey.__('boolean')} (${
									data.settings.value ? 'true' : 'false'
								})`,
								id: key,
								type: 'advanced',
								deviceName: DATAVISTA_APP_NAME,
							});
							break;
						}
						case DATA_TYPE_IDS.PERCENTAGE: {
							if (!options.includePercentages) break;
							const percentageData: BaseSettings<PercentageData> = this.homey.settings.get(key);
							results.push({
								name: percentageData.identifier,
								description: `${DATAVISTA_APP_NAME} ${this.homey.__('percentage')} (${
									percentageData.settings.percentage ?? '0'
								}%)`,
								id: key,
								type: 'advanced',
								deviceName: DATAVISTA_APP_NAME,
							});
							break;
						}
						case DATA_TYPE_IDS.RANGE: {
							if (!options.includeRanges) break;
							const rangeData: BaseSettings<RangeData> = this.homey.settings.get(key);
							results.push({
								name: rangeData.identifier,
								description: `${DATAVISTA_APP_NAME} ${this.homey.__('range')} (${rangeData.settings.min}-${
									rangeData.settings.max
								})`,
								id: key,
								type: 'advanced',
								deviceName: DATAVISTA_APP_NAME,
							});
							break;
						}
						case DATA_TYPE_IDS.TEXT: {
							if (!options.includeText) break;
							const rangeData: BaseSettings<TextData> = this.homey.settings.get(key);
							let description = `${DATAVISTA_APP_NAME} ${this.homey.__('text')}`;
							if (rangeData.settings.value != null && rangeData.settings.value != '')
								description += ` (${rangeData.settings.value})`;

							results.push({
								name: rangeData.identifier,
								description: description,
								id: key,
								type: 'advanced',
								deviceName: DATAVISTA_APP_NAME,
							});
							break;
						}
						case DATA_TYPE_IDS.STATUS: {
							if (!options.includeStatus) break;
							const data: BaseSettings<StatusData> = this.homey.settings.get(key);
							results.push({
								name: data.identifier,
								description: `${DATAVISTA_APP_NAME} ${this.homey.__('status')} (${data.settings.color} - ${data.settings.text})`,
								id: key,
								type: 'advanced',
								deviceName: DATAVISTA_APP_NAME,
							});
							break;
						}
					}
				});
			}

			if (options.fromCapabilities) {
				const devices = await this.homeyApi.devices.getDevices();
				if (devices != null) {
					for (const [_key, device] of Object.entries(devices)) {
						if (device.capabilitiesObj != null) {
							for (const [_key, capability] of Object.entries(device.capabilitiesObj)) {
								try {
									if (options.includeBooleans && capability.type === 'boolean') {
										results.push({
											name: capability.title ?? '[No name]',
											description: `${device.name} (${capability.value ? 'true' : 'false'})`,
											deviceName: device.name,
											id: capability.id,
											deviceId: device.id,
											type: 'capability',
										});
									} else if (
										options.includePercentages &&
										capability.type === 'number' &&
										capability.units !== undefined &&
										capability.units === '%'
									) {
										results.push({
											name: capability.title ?? '[No name]',
											description: `${device.name} (${capability.value ?? '0'}%)`,
											deviceName: device.name,
											id: capability.id,
											deviceId: device.id,
											type: 'capability',
										});
									} else if (
										options.includeRanges &&
										capability.type === 'number' &&
										capability.min !== undefined &&
										capability.max !== undefined
									) {
										results.push({
											name: capability.title ?? '[No name]',
											description: `${device.name} (${capability.value ?? '0'}${
												capability.units ? ` ${capability.units}` : ''
											})`,
											deviceName: device.name,
											id: capability.id,
											deviceId: device.id,
											type: 'capability',
										});
									} else if (options.includeNumbers && capability.type === 'number') {
										let description = device.name;
										if (capability.units != null || capability.value != null) {
											description += ` (${capability.value ?? '0'}${capability.units ? ` ${capability.units}` : ''})`;
										}
										results.push({
											name: capability.title ?? '[No name]',
											description: description,
											deviceName: device.name,
											id: capability.id,
											deviceId: device.id,
											type: 'capability',
										});
									} else if (options.includeText && capability.type === 'string') {
										let description = device.name;
										if (capability.value != null && capability.value != '') description += ` (${capability.value})`;
										results.push({
											name: capability.title ?? '[No name]',
											description: description,
											deviceName: device.name,
											id: capability.id,
											deviceId: device.id,
											type: 'capability',
										});
									}
								} catch (e) {
									void this.logger.logException(e);
								}
							}
						}
					}
				} else {
					void this.logger.logMessage('No devices found for autocomplete', true);
				}
			}

			if (options.fromVariables) {
				const variables = await this.homeyApi.logic.getVariables();
				for (const [_key, variable] of Object.entries(variables)) {
					if (options.includeBooleans && variable.type === 'boolean') {
						results.push({
							name: variable.name,
							description: `${this.homey.__('homey_variable')} (${variable.value ? 'true' : 'false'})`,
							id: variable.id,
							type: 'variable',
							deviceName: HOMEY_LOGIC,
						});
					} else if (options.includeNumbers && variable.type === 'number') {
						results.push({
							name: variable.name,
							description: `${this.homey.__('homey_variable')} (${variable.value ?? '0'})`,
							id: variable.id,
							type: 'variable',
							deviceName: HOMEY_LOGIC,
						});
					} else if (options.includeText && variable.type === 'string') {
						let description = `${this.homey.__('homey_variable')}`;
						if (variable.value != null && variable.value != '') description += ` (${variable.value})`;
						results.push({
							name: variable.name,
							description: description,
							id: variable.id,
							type: 'variable',
							deviceName: HOMEY_LOGIC,
						});
					}
				}
			}

			const filteredResults = options.query
				? results.filter(result => {
					const queryParts = options.query!.toLowerCase().split(' ');
					return queryParts.every(
						part => result.name.toLowerCase().includes(part) || result.deviceName.toLowerCase().includes(part),
					);
				})
				: results;

			filteredResults.sort((a, b) => {
				if (a.deviceName === DATAVISTA_APP_NAME && b.deviceName !== DATAVISTA_APP_NAME) {
					return -1;
				}
				if (a.deviceName !== DATAVISTA_APP_NAME && b.deviceName === DATAVISTA_APP_NAME) {
					return 1;
				}
				if (a.deviceName === HOMEY_LOGIC && b.deviceName !== HOMEY_LOGIC) {
					return -1;
				}
				if (a.deviceName !== HOMEY_LOGIC && b.deviceName === HOMEY_LOGIC) {
					return 1;
				}

				return a.name.localeCompare(b.name);
			});

			if (!options.query && options.optional) {
				filteredResults.unshift({
					name: this.homey.__('none'),
					id: '',
					deviceName: DATAVISTA_APP_NAME,
				});
			}

			return filteredResults;
		} catch (e) {
			void this.logger.logException(e);
			throw e;
		}
	}
}
