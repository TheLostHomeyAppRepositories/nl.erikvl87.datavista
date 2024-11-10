import { DATA_TYPE_IDS } from "../../constants.mjs";
import { BaseSettings } from "../../datavistasettings/baseSettings.mjs";
import { PercentageData } from "../../datavistasettings/percentageSettings.mjs";
import { RangeData } from "../../datavistasettings/rangeSettings.mjs";
import { AdvancedGaugeWidgetData } from "../../datavistasettings/advancedGaugeWidgetSettings.mjs";
import type { ApiRequest } from "../../types.mjs";

export type widgetDataDto = { min: number, max: number, value: number, label?: string };

export type AdvancedGaugeWidgetPayload = { data: widgetDataDto | null, config: AdvancedGaugeWidgetData | null };

class AdvancedGaugeWidgetApi {
	public async getSettings({ homey, query }: ApiRequest): Promise<AdvancedGaugeWidgetPayload | null> {
		if (query.source === null)
			return null;

		const data = homey.app.homey.settings.get(query.datasource) as BaseSettings<any>;
		const config = homey.app.homey.settings.get(query.configsource) as BaseSettings<AdvancedGaugeWidgetData>;

		let dataResult: widgetDataDto;

		switch (data.type) {
			case DATA_TYPE_IDS.PERCENTAGE: {
				const settings = data.settings as PercentageData;
				dataResult = {
					min: 0,
					max: 100,
					value: settings.percentage,
					label: `${settings.percentage}%`
				};
				break;
			}
			case 'range': {
				const rangeData = data.settings as RangeData;
				dataResult = {
					min: rangeData.min,
					max: rangeData.max,
					value: rangeData.value,
					label: rangeData.label
				};
				break;

			}
			default: {
				homey.app.log(`[${this.constructor.name}] Type '${data.type}' is not implemented.`);
				return null;
			}
		}

		const result : AdvancedGaugeWidgetPayload = {
			data: dataResult,
			config: config.settings
		};
		
		return result;
	}

	public async log({ homey, body }: ApiRequest): Promise<void> {
		homey.app.log(`[${this.constructor.name}]: ${body.message}`, ...body.optionalParams);
	}
}

export default new AdvancedGaugeWidgetApi();