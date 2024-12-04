import { DATAVISTA_APP_NAME, HOMEY_LOGIC } from "../../constants.mjs";
import { BaseSettings } from "../../datavistasettings/baseSettings.mjs";
import { BooleanData } from "../../datavistasettings/booleanSettings.mjs";
import type { ApiRequest } from "../../types.mjs";

export type toggleSwitchWidgetPayload = {
	value?: boolean | null;
	iconUrl?: string | null;
	name: string;
};

class ToggleSwitchWidgetApi {
	public async getCapabilityBoolean({ homey, query }: ApiRequest): Promise<toggleSwitchWidgetPayload | null> {
		const device = await homey.app.homeyApi.devices.getDevice({ id: query.deviceId });
		if (!device) {
			homey.app.log(`[${this.constructor.name}]: Device with id '${query.deviceId}' not found.`);
			return null;
		}

		const capability = device.capabilitiesObj[query.capabilityId];
		if (capability?.type !== 'boolean') {
			homey.app.log(
				`[${this.constructor.name}]: The capability with id '${query.capabilityId}' is not a boolean.`,
				capability,
			);
			return null;
		}

		const iconId = capability.iconObj?.id || device.iconObj?.id;
		let iconUrl = null;
		if (iconId != null) {
			iconUrl = `https://icons-cdn.athom.com/${iconId}.svg?ver=1`;
		}

		const payload: toggleSwitchWidgetPayload = {
			value: capability.value as boolean,
			iconUrl,
			name: `${device.name} - ${capability.title}`
		};

		return payload;
	}

	public async getAdvancedBoolean({ homey, query }: ApiRequest): Promise<toggleSwitchWidgetPayload | null> {
		const data = homey.app.homey.settings.get(query.key) as BaseSettings<BooleanData>;
		const payload: toggleSwitchWidgetPayload = {
			value: data.settings.value,
			iconUrl: null,
			name: `${DATAVISTA_APP_NAME} - ${data.identifier}`
		};

		return payload;
	}

	public async getVariableBoolean({ homey, query }: ApiRequest): Promise<toggleSwitchWidgetPayload | null> {
		const variable = await homey.app.homeyApi.logic.getVariable({ id: query.variableId });
		if (!variable) {
			homey.app.log(`[${this.constructor.name}]: Variable with id '${query.variableId}' not found.`);
			return null;
		}

		const payload: toggleSwitchWidgetPayload = {
			value: variable.value as boolean,
			iconUrl: null,
			name: `${HOMEY_LOGIC} - ${variable.name}`
		};

		return payload;
	}

	public async getIcon({ homey, query }: ApiRequest): Promise<string> {
		const svgSource = await homey.app.getSvgForUrl(query.url, query.color);
		return svgSource;
	}

	public async log({ homey, body }: ApiRequest): Promise<void> {
		homey.app.log(`[${this.constructor.name}]: ${body.message}`, ...body.optionalParams);
	}
}

export default new ToggleSwitchWidgetApi();