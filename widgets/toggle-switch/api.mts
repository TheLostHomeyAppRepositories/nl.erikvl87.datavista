import { ApiRequest } from '../../types.mjs';
import { BaseWidgetApi, WidgetDataPayload } from '../baseWidgetApi.mjs';

class ToggleSwitchWidgetApi extends BaseWidgetApi {
	public async datasource({ homey, body }: ApiRequest): Promise<WidgetDataPayload | null> {
		const data = await this.getDatasource(homey.app, body.datasource);
		if (data == null) return null;
		if (!BaseWidgetApi.isDataType(data, { boolean: true })) return null;
		return data;
	}
}

export default new ToggleSwitchWidgetApi();
