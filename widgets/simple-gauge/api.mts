import type { ApiRequest } from "../../types.mjs";

export type SimpleGaugeWidgetPayload = {
	min?: number;
	max?: number;
	value?: number;
	units?: string;
	decimals?: number;
};

class SimpleGaugeWidgetApi {
	public async getSettings({ homey, query }: ApiRequest): Promise<SimpleGaugeWidgetPayload | null> {
		
		const device = await homey.app.homeyApi.devices.getDevice({ id: query.deviceId });
		if (!device) {
			homey.app.log(`[${this.constructor.name}]: Device with id '${query.deviceId}' not found.`);
			return null;
		}
		
		const capability = device.capabilitiesObj[query.capabilityId];
		if (capability?.type !== 'number') {
			homey.app.log(`[${this.constructor.name}]: The capability with id '${query.capabilityId}' is not a number.`, capability);
			return null;
		}
		
		return capability as SimpleGaugeWidgetPayload;
	}

	public async log({ homey, body }: ApiRequest): Promise<void> {
		homey.app.log(`[${this.constructor.name}]: ${body.message}`, ...body.optionalParams);
	}
}

export default new SimpleGaugeWidgetApi();