import { ExtendedHomeyAPIV3Local } from 'homey-api';
import Homey from 'homey/lib/Homey';
import Widget from 'homey/lib/Widget';
import { BooleanData } from '../datavistasettings/booleanSettings.mjs';
import { DATA_TYPE_IDS, DATAVISTA_APP_NAME, HOMEY_LOGIC } from '../constants.mjs';
import { BaseSettings } from '../datavistasettings/baseSettings.mjs';
import { PercentageData } from '../datavistasettings/percentageSettings.mjs';
import { RangeData } from '../datavistasettings/rangeSettings.mjs';

export class BaseWidget {
	protected homey: Homey;
	protected homeyApi: ExtendedHomeyAPIV3Local;
	protected log: (...args: unknown[]) => void;
	protected error: (...args: unknown[]) => void;

	constructor(
		homey: Homey,
		homeyApi: ExtendedHomeyAPIV3Local,
		log: (...args: unknown[]) => void,
		error: (...args: unknown[]) => void,
	) {
		this.homey = homey;
		this.homeyApi = homeyApi;
		this.log = log;
		this.error = error;
	}

	async autocompleteQuery(options: {
		query: string;
		includeBooleans?: boolean;
		includePercentages?: boolean;
		includeRanges?: boolean;
		includeNumbers?: boolean;
		fromCapabilities?: boolean;
		fromSettings?: boolean;
		fromVariables?: boolean;
	}): Promise<Widget.SettingAutocompleteResults> {
		const results: {
			name: string;
			description: string;
			id: string;
			type: 'capability' | 'advanced' | 'variable';
			deviceId?: string;
			deviceName: string;
		}[] = [];

		if (options.fromSettings) {
			const settingsKeys = this.homey.settings.getKeys();
			settingsKeys.forEach(key => {
				switch (key.split('-')[0]) {
					case DATA_TYPE_IDS.BOOLEAN: {
						if (!options.includeBooleans) break;
						const data: BaseSettings<BooleanData> = this.homey.settings.get(key);
						results.push({
							name: data.identifier,
							description: `${DATAVISTA_APP_NAME} ${this.homey.__('boolean')} (${data.settings.value ? 'true' : 'false'})`,
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
							description: `${DATAVISTA_APP_NAME} ${this.homey.__('percentage')} (${percentageData.settings.percentage ?? '0'}%)`,
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
							description: `${DATAVISTA_APP_NAME} ${this.homey.__('range')} (${rangeData.settings.min}-${rangeData.settings.max})`,
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
			for (const [_key, device] of Object.entries(devices)) {
				for (const [_key, capability] of Object.entries(device.capabilitiesObj)) {
					if (options.includeBooleans && capability.type === 'boolean') {
						results.push({
							name: capability.title,
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
							name: capability.title,
							description: `${device.name} (${capability.value ?? '0'}%)`,
							deviceName: device.name,
							id: capability.id,
							deviceId: device.id,
							type: 'capability',
						});
					} else if (options.includeNumbers && capability.type === 'number') {
						let description = device.name;
						if (capability.units != null || capability.value != null) {
							description += ` (${capability.value ?? '0'}${
								capability.units ? ` ${capability.units}` : ''
							})`;
						}
						results.push({
							name: capability.title,
							description: description,
							deviceName: device.name,
							id: capability.id,
							deviceId: device.id,
							type: 'capability',
						});
					}
				}
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
				}
			}
		}

		const filteredResults = results
			.filter(result => {
				const queryParts = options.query.toLowerCase().split(' ');
				return queryParts.every(
					part => result.name.toLowerCase().includes(part) || result.deviceName.toLowerCase().includes(part),
				);
			})
			.sort((a, b) => {
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

		return filteredResults.map(({ name, description, id, deviceId, type }) => ({
			name,
			description,
			id,
			deviceId,
			type,
		}));
	}
}
