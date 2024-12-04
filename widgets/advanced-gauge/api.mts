import { BaseSettings } from "../../datavistasettings/baseSettings.mjs";
import { AdvancedGaugeWidgetData } from "../../datavistasettings/advancedGaugeWidgetSettings.mjs";
import type { ApiRequest } from "../../types.mjs";
import { BaseWidgetApi, WidgetDataPayload } from "../baseWidgetApi.mjs";

export type widgetDataDto = { min: number, max: number, value: number, label?: string };
export type AdvancedGaugeWidgetPayload = { data: WidgetDataPayload | null, config?: AdvancedGaugeWidgetData | null };

class AdvancedGaugeWidgetApi extends BaseWidgetApi {
	public async datasource({ homey, body }: ApiRequest): Promise<AdvancedGaugeWidgetPayload> {
		let data = await this.getDatasource(homey.app, body.datasource);
		if (data != null && !BaseWidgetApi.isDataType(data, { percentage: true, range: true })) data = null;
		let config = null;
		if(body.configsource)
			config = homey.app.homey.settings.get(body.configsource) as BaseSettings<AdvancedGaugeWidgetData>;

		return { data, config: config?.settings };
	}
}

export default new AdvancedGaugeWidgetApi();