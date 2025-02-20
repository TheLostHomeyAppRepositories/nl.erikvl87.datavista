import { CapabilitiesObject, ExtendedDevice, ExtendedVariable } from 'homey-api';
import DataVista from '../app.mjs';
import { BaseSettings } from '../datavistasettings/BaseSettings.mjs';
import { ApiRequest } from '../Types.mjs';
import { DATA_TYPE_IDS, DATAVISTA_APP_NAME, HOMEY_LOGIC } from '../constants.mjs';
import { DataSource } from './BaseWidget.mjs';

export type WidgetDataPayload = {
	type: 'capability' | 'variable' | 'advanced';
	name: string;
	fallbackIcon?: string | null;
	data: CapabilitiesObject | BaseSettings<unknown> | ExtendedVariable;
};

export class BaseWidgetApi {
	/**
	 * Get the data source.
	 */
	protected async getDatasource(app: DataVista, datasource: DataSource): Promise<WidgetDataPayload | null> {
		if (datasource?.type == null) return null;

		switch (datasource.type) {
			case 'capability': {
				const { device, capability } = (await this.getCapability(app, datasource.id, datasource.deviceId!)) ?? {
					device: null,
					capability: null,
				};

				if (device == null || capability == null) return null;

				return {
					type: 'capability',
					name: `${device.name} - ${capability.title}`,
					data: capability,
					fallbackIcon: device.iconObj?.id ? `https://icons-cdn.athom.com/${device.iconObj?.id}.svg?ver=1` : null,
				};
			}
			case 'advanced': {
				const result = this.getAdvanced(app, datasource.id);
				if (result == null) return null;

				return {
					type: 'advanced',
					name: `${DATAVISTA_APP_NAME} - ${result.identifier}`,
					data: result,
				};
			}
			case 'variable': {
				const result = await this.getVariable(app, datasource.id);
				if (result == null) return null;

				return {
					type: 'variable',
					name: `${HOMEY_LOGIC} - ${result.name}`,
					data: result,
				};
			}
			default:
				void app.logger.logMessage(
					`[${this.constructor.name}]: Unsupported data source type: ${datasource.type}`,
					true,
					datasource,
				);
				return null;
		}
	}

	/**
	 * Check if the payload is of a certain data type.
	 */
	protected static isDataType(
		payload: WidgetDataPayload,
		options: {
			status?: boolean;
			string?: boolean;
			boolean?: boolean;
			percentage?: boolean;
			number?: boolean;
			range?: boolean;
		},
	): boolean {
		switch (payload.type) {
			case 'capability': {
				const capability = payload.data as CapabilitiesObject;
				if (options.boolean && capability.type === 'boolean') return true;
				if (options.percentage && capability.type === 'number' && capability.units === '%') return true;
				if (options.number && capability.type === 'number') return true;
				if (
					options.range &&
					capability.type === 'number' &&
					capability.min !== undefined &&
					capability.max !== undefined
				)
					return true;
				if (options.string && capability.type === 'string') return true;
				return false;
			}
			case 'variable': {
				const variable = payload.data as ExtendedVariable;
				if (options.boolean && variable.type === 'boolean') return true;
				if (options.number && variable.type === 'number') return true;
				if (options.string && variable.type === 'string') return true;
				return false;
			}
			case 'advanced': {
				const advanced = payload.data as BaseSettings<unknown>;
				if (options.boolean && advanced.type === DATA_TYPE_IDS.BOOLEAN) return true;
				if (options.percentage && advanced.type === DATA_TYPE_IDS.PERCENTAGE) return true;
				if (options.range && advanced.type === DATA_TYPE_IDS.RANGE) return true;
				if (options.string && advanced.type === DATA_TYPE_IDS.TEXT) return true;
				if (options.status && advanced.type === DATA_TYPE_IDS.STATUS) return true;
				return false;
			}
			default:
				return false;
		}
	}

	/**
	 * Get a capability by id and deviceId.
	 */
	private async getCapability(
		app: DataVista,
		id: string,
		deviceId: string,
	): Promise<{ device: ExtendedDevice; capability: CapabilitiesObject } | null> {
		let device = null;
		try {
			device = await app.homeyApi.devices.getDevice({ id: deviceId });
		} catch (error) {
			if (error instanceof Error && error.message.startsWith('Not Found')) {
				void app.logger.logMessage(`[${this.constructor.name}]: Device with id '${deviceId}' not found.`);
			} else {
				void app.logger.logException(error);
			}
			return null;
		}

		const capability = device.capabilitiesObj[id];
		if (!capability) {
			void app.logger.logMessage(`[${this.constructor.name}]: Capability with id '${id}' not found.`);
			return null;
		}

		return {
			device,
			capability,
		};
	}

	/**
	 * Get an advanced setting by key.
	 */
	private getAdvanced(app: DataVista, key: string): BaseSettings<unknown> | null {
		const data = app.homey.settings.get(key) as BaseSettings<unknown>;
		return data;
	}

	/**
	 * Get a variable by id.
	 */
	private async getVariable(app: DataVista, id: string): Promise<ExtendedVariable | null> {
		let variable = null;
		try {
			variable = await app.homeyApi.logic.getVariable({ id: id });
		} catch (error) {
			if (error instanceof Error && error.message.startsWith('Not Found')) {
				void app.logger.logMessage(`[${this.constructor.name}]: Variable with id '${id}' not found.`);
			} else {
				void app.logger.logException(error);
			}
			return null;
		}

		return variable;
	}

	/**
	 * Log a message.
	 */
	public async logMessage({ homey, body }: ApiRequest): Promise<void> {
		await homey.app.logger.logMessage(
			`[${this.constructor.name}]: ${body.message}`,
			body.logToSentry,
			...body.optionalParams,
		);
	}

	/**
	 * Log an error.
	 */
	public async logError({ homey, body }: ApiRequest): Promise<void> {
		const cause = JSON.parse(body.error as string);
		const error = new Error(`[${this.constructor.name}]: ${body.message}: ${cause.message}`);
		error.name = `Error from ${this.constructor.name}`;
		error.stack = cause.stack;
		error.cause = cause;
		await homey.app.logger.logException(error);
	}

	/**
	 * Get an icon.
	 */
	public async getIcon({ homey, query }: ApiRequest): Promise<string> {
		const svgSource = await homey.app.getSvgForUrl(query.url, query.color);
		return svgSource;
	}
}
