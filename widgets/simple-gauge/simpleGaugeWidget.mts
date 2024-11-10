import { ExtendedHomeyAPIV3Local } from 'homey-api';
import Homey from 'homey/lib/Homey';

export default class SimpleGaugeWidget {
	private static instance: SimpleGaugeWidget | null = null;

	private widget: any;

	private constructor(
		private homey: Homey,
		private homeyApi: ExtendedHomeyAPIV3Local,
		private log: (...args: unknown[]) => void,
		private error: (...args: unknown[]) => void,
	) {
		this.widget = this.homey.dashboards.getWidget('simple-gauge');
	}

	public static async initialize(
		homey: Homey,
		homeyApi: ExtendedHomeyAPIV3Local,
		log: (...args: unknown[]) => void,
		error: (...args: unknown[]) => void,
	): Promise<SimpleGaugeWidget> {
		if (this.instance === null) {
			this.instance = new this(homey, homeyApi, log, error);
			await this.instance.setup();
		}
		return this.instance;
	}

	private async setup(): Promise<void> {
		const devices = await this.homeyApi.devices.getDevices();
		
		this.widget.registerSettingAutocompleteListener(
			'datasource',
			async (query: string) => {
				const results: {
					name: string;
					description: string;
					id: string;
					deviceId: string;
				}[] = [];
				for (const [_key, device] of Object.entries(devices)) {
					for (const [_key, capability] of Object.entries(device.capabilitiesObj)) {
						if (capability.type === 'number') {
							results.push({
								name: capability.title,
								description: `${device.name} (${capability.value ?? 'unset'}${capability.units ? ` ${capability.units}` : ''})`,
								id: capability.id,
								deviceId: device.id,
							});
						}
					}
				}

				const filteredResults = results
					.filter(result => {
						return result.name.toLowerCase().includes(query.toLowerCase());
					})
					.sort((a, b) => a.name.localeCompare(b.name));
				return filteredResults;
			},
		);
	}
}
