import { CapabilitiesObject, ExtendedDevice, ExtendedInsightsLogs, ExtendedLog, ExtendedVariable } from 'homey-api';
import DataVista from '../app.mjs';
import { BaseSettings } from '../datavistasettings/BaseSettings.mjs';
import { ApiRequest } from '../Types.mjs';
import { DATA_TYPE_IDS, DATAVISTA_APP_NAME, HOMEY_INSIGHT, HOMEY_LOGIC } from '../constants.mjs';
import { DataSource } from './BaseWidget.mjs';

export type WidgetDataPayload = {
	type: 'capability' | 'variable' | 'advanced' | 'insight';
	name: string;
	fallbackIcon?: string | null;
	data: any;
};

export class BaseWidgetApi {
	/**
	 * Get the time and language.
	 */
	protected async getTimeAndLanguage({ homey }: ApiRequest): Promise<{ timezone: string; language: string }> {
		return await homey.app.getTimeAndLanguage();
	}

	protected async getConfigsource<T>(app: DataVista, configsource: string): Promise<BaseSettings<T> | null> {
		if (configsource == null) return null;

		const data = app.homey.settings.get(configsource) as BaseSettings<T>;
		if (data == null) {
			void app.logger.logMessage(`[${this.constructor.name}]: Config source with id '${configsource}' not found.`);
			return null;
		}

		return data;
	}

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
			case 'insight': {
				const result = await this.getInsight(app, datasource.id, datasource.insightResolution!);
				if (result == null) return null;

				return {
					type: 'insight',
					name: result.insight.title ?? '[No name]',
					data: {
						insight: result.insight,
						logs: result.logs 
					},
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
			datapoint?: boolean;
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
			case 'insight': {
				if (options.datapoint) return true;
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
	 * Get a capability by id and deviceId.
	 */
	private async getInsight(
		app: DataVista,
		id: string,
		resolution:
			| 'yesterday'
			| 'lastWeek'
			| 'lastMonth'
			| 'lastYear'
			| 'last2Years'
			| 'today'
			| 'thisWeek'
			| 'thisMonth'
			| 'thisYear'
			| 'lastHour'
			| 'last6Hours'
			| 'last24Hours'
			| 'last3Days'
			| 'last7Days'
			| 'last14Days'
			| 'last31Days'
			| 'last3Months'
			| 'last6Months'
			| 'lastYear',
	): Promise<{ logs: ExtendedInsightsLogs; insight: ExtendedLog } | null> {
		const insight = await app.homeyApi.insights.getLog({ id: id });
		const logs = await app.homeyApi.insights.getLogEntries({ id: id, resolution });
		if (!logs) {
			void app.logger.logMessage(`[${this.constructor.name}]: Insight with id '${id}' not found.`);
			return null;
		}

		return {
			logs,
			insight
		};
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
