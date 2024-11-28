import { ExtendedHomeyAPIV3Local } from 'homey-api';
import Homey from 'homey/lib/Homey';
import { BaseSettings } from '../../datavistasettings/baseSettings.mjs';
import { PercentageData } from '../../datavistasettings/percentageSettings.mjs';
import { DATAVISTA_APP_NAME } from '../../constants.mjs';

export default class progressBarWidget {
	private static instance: progressBarWidget | null = null;

	private widget: any;

	private constructor(
		private homey: Homey,
		private homeyApi: ExtendedHomeyAPIV3Local,
		private log: (...args: unknown[]) => void,
		private error: (...args: unknown[]) => void,
	) {
		this.widget = this.homey.dashboards.getWidget('progress-bar');
	}

	public static async initialize(
		homey: Homey,
		homeyApi: ExtendedHomeyAPIV3Local,
		log: (...args: unknown[]) => void,
		error: (...args: unknown[]) => void,
	): Promise<progressBarWidget> {
		if (this.instance === null) {
			this.instance = new this(homey, homeyApi, log, error);
			await this.instance.setup();
		}
		return this.instance;
	}

	private async setup(): Promise<void> {
		const devices = await this.homeyApi.devices.getDevices();

		this.widget.registerSettingAutocompleteListener('datasource', async (query: string) => {
			const results: {
				name: string;
				description: string;
				id: string;
				type: 'capability' | 'advanced';
				deviceId?: string;
				deviceName: string;
			}[] = [];

			const settings = this.homey.settings.getKeys();
			const keys = settings.filter(key => key.startsWith('percentage-'));
			keys.forEach(key => {
				const data: BaseSettings<PercentageData> = this.homey.settings.get(key);
				results.push({
					name: data.identifier,
					description: `${DATAVISTA_APP_NAME} (${data.settings.percentage ?? '0'}%)`,
					id: key,
					type: 'advanced',
					deviceName: DATAVISTA_APP_NAME,
				});
			});

			for (const [_key, device] of Object.entries(devices)) {
				for (const [_key, capability] of Object.entries(device.capabilitiesObj)) {
					if (capability.type === 'number' && capability.units !== undefined && capability.units === '%') {
						results.push({
							name: capability.title,
							description: `${device.name} (${capability.value ?? '0'}%)`,
							deviceName: device.name,
							id: capability.id,
							deviceId: device.id,
							type: 'capability',
						});
					}
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
