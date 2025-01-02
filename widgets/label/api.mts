import { ApiRequest } from '../../Types.mjs';
import { BaseWidgetApi, WidgetDataPayload } from '../baseWidgetApi.mjs';

class LabelWidgetApi extends BaseWidgetApi {
	public async datasource({ homey, body }: ApiRequest): Promise<WidgetDataPayload | null> {
		const data = await this.getDatasource(homey.app, body.datasource);
		if (data == null) return null;
		if (!BaseWidgetApi.isDataType(data, { string: true })) {
			void homey.app.logger.logMessage(`[${this.constructor.name}]: Unsupported data type for widget: ${data.type}`, true, data);
			return null;
		}

		return data;
	}
}

export default new LabelWidgetApi();
