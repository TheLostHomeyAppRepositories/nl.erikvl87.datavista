import { ExtendedHomeyAPIV3Local } from 'homey-api';
import Homey from 'homey/lib/Homey';
import { BaseSettings } from '../../datavistasettings/baseSettings.mjs';
import { DATA_TYPE_IDS, DATAVISTA_APP_NAME, HOMEY_LOGIC } from '../../constants.mjs';
import { BooleanData } from '../../datavistasettings/booleanSettings.mjs';
import { Widget } from 'homey';

export default class toggleSwitchWidget {
	private static instance: toggleSwitchWidget | null = null;

	private widget: Widget;

	private constructor(
		private homey: Homey,
		private homeyApi: ExtendedHomeyAPIV3Local,
		private log: (...args: unknown[]) => void,
		private error: (...args: unknown[]) => void,
	) {
		this.widget = this.homey.dashboards.getWidget('toggle-switch');
	}

	public static async initialize(
		homey: Homey,
		homeyApi: ExtendedHomeyAPIV3Local,
		log: (...args: unknown[]) => void,
		error: (...args: unknown[]) => void,
	): Promise<toggleSwitchWidget> {
		if (this.instance === null) {
			this.instance = new this(homey, homeyApi, log, error);
			await this.instance.setup();
		}
		return this.instance;
	}

	private async setup(): Promise<void> {
		this.widget.registerSettingAutocompleteListener('datasource', async (query: string) => {
			const results: {
				name: string;
				description: string;
				id: string;
				type: 'capability' | 'advanced' | 'variable';
				deviceId?: string;
				deviceName: string;
			}[] = [];

			const settings = this.homey.settings.getKeys();
			const keys = settings.filter(key => key.startsWith(`${DATA_TYPE_IDS.BOOLEAN}-`));
			keys.forEach(key => {
				const data: BaseSettings<BooleanData> = this.homey.settings.get(key);
				results.push({
					name: data.identifier,
					description: `${DATAVISTA_APP_NAME} (${data.settings.value ? 'true' : 'false'})`,
					id: key,
					type: 'advanced',
					deviceName: DATAVISTA_APP_NAME,
				});
			});

			const devices = await this.homeyApi.devices.getDevices();
			for (const [_key, device] of Object.entries(devices)) {
				for (const [_key, capability] of Object.entries(device.capabilitiesObj)) {
					if (capability.type === 'boolean') {
						results.push({
							name: capability.title,
							description: `${device.name} (${capability.value ? 'true' : 'false'})`,
							deviceName: device.name,
							id: capability.id,
							deviceId: device.id,
							type: 'capability',
						});
					}
				}
			}
			
			const variables = await this.homeyApi.logic.getVariables();
			for (const [_key, variable] of Object.entries(variables)) {
				if (variable.type === 'boolean') {
					results.push({
						name: variable.name,
						description: `${HOMEY_LOGIC} (${variable.value ? 'true' : 'false'})`,
						id: variable.id,
						type: 'variable',
						deviceName: HOMEY_LOGIC,
					});
				}
			}

			const filteredResults = results
				.filter(result => {
					const queryParts = query.toLowerCase().split(' ');
					return queryParts.every(
						part => result.name.toLowerCase().includes(part) || result.deviceName.toLowerCase().includes(part),
					);
				})
				.sort((a, b) => {
					if (query === '') {
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
		});
	}
}
