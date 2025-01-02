import type { ApiRequest } from '../../Types.mjs';
import { BaseWidgetApi, WidgetDataPayload } from '../baseWidgetApi.mjs';

export type ProgressBarWidgetPayload = {
	name: string,
	value: number | null;
	iconUrl?: string | null;
};

class ProgressBarWidgetApi extends BaseWidgetApi {
	public async datasource({ homey, body }: ApiRequest): Promise<WidgetDataPayload | null> {
		const data = await this.getDatasource(homey.app, body.datasource);
		if (data == null) return null;
		if (!BaseWidgetApi.isDataType(data, { number: true, percentage: true, range: true })) {
			void homey.app.logger.logMessage(`[${this.constructor.name}]: Unsupported data type for widget: ${data.type}`, true, data);
			return null;
		}

		return data;
	}
}

export default new ProgressBarWidgetApi();