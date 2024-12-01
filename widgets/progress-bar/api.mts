import { DATAVISTA_APP_NAME } from '../../constants.mjs';
import type { ApiRequest } from '../../types.mjs';

export type progressBarWidgetPayload = {
	name: string,
	value: number | null;
	iconUrl?: string | null;
};

class progressBarWidgetApi {
	public async getCapabilityPercentage({ homey, query }: ApiRequest): Promise<progressBarWidgetPayload | null> {
		const device = await homey.app.homeyApi.devices.getDevice({ id: query.deviceId });
		if (!device) {
			homey.app.log(`[${this.constructor.name}]: Device with id '${query.deviceId}' not found.`);
			return null;
		}

		const capability = device.capabilitiesObj[query.capabilityId];
		if (capability?.type !== 'number' || capability.units === undefined || capability.units !== '%') {
			homey.app.log(
				`[${this.constructor.name}]: The capability with id '${query.capabilityId}' is not a percentage.`,
				capability,
			);
			return null;
		}

		const iconId = capability.iconObj?.id || device.iconObj?.id;
		let iconUrl = null;
		if (iconId != null) {
			iconUrl = `https://icons-cdn.athom.com/${iconId}.svg?ver=1`;
		}

		const payload: progressBarWidgetPayload = {
			value: capability.value as number,
			iconUrl,
			name: `${device.name} - ${capability.title}`
		};

		if (capability.min !== undefined && capability.min == 0 && capability.max !== undefined && capability.max == 1) {
			payload.value = Math.round(((payload.value! - capability.min) / (capability.max - capability.min)) * 100);
		}
		return payload;
	}

	public async getAdvancedPercentage({ homey, query }: ApiRequest): Promise<progressBarWidgetPayload | null> {
		const data = homey.app.homey.settings.get(query.key);
		const payload: progressBarWidgetPayload = {
			value: data.settings.percentage,
			iconUrl: null,
			name: `${DATAVISTA_APP_NAME} - ${data.identifier}`
		};

		return payload;
	}

	public async log({ homey, body }: ApiRequest): Promise<void> {
		homey.app.log(`[${this.constructor.name}]: ${body.message}`, ...body.optionalParams);
	}
}

export default new progressBarWidgetApi();
