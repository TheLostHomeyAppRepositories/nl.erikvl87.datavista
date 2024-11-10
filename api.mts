import { DATA_TYPE_IDS, WIDGET_TYPE_IDS } from './constants.mjs';
import { AdvancedGaugeWidgetData } from './datavistasettings/advancedGaugeWidgetSettings.mjs';
import type { ApiRequest } from './types.mjs';

class AppApi {
	public dataTypes(_request: ApiRequest): string[] {
		return [...Object.values(DATA_TYPE_IDS), ...Object.values(WIDGET_TYPE_IDS)];
	}

	public async getTimeAndLanguage({ homey }: ApiRequest): Promise<{ timezone: string; language: string }> {
		return await homey.app.getTimeAndLanguage();
	}

	public deleteData({ homey, params }: ApiRequest): boolean {
		const key = params.id;
		return homey.app.removeData(key);
	}

	public updateGauge({ homey, params, body }: ApiRequest): boolean {
		const key = params.id;

		homey.app.log('incoming update gauge', key, body);
		// create a new AdvancedGaugeWidgetData with the data from body but also validate it
		let data: AdvancedGaugeWidgetData;
		try {
			data = {
				color1: body.color1,
				colorOffset1: this.convertToNumber(body.colorOffset1),
				color2: body.color2,
				colorOffset2: this.convertToNumber(body.colorOffset2),
				color3: body.color3,
				colorOffset3: this.convertToNumber(body.colorOffset3),
				color4: body.color4,
				colorOffset4: this.convertToNumber(body.colorOffset4),
				color5: body.color5,
				colorOffset5: this.convertToNumber(body.colorOffset5),
			};
		} catch (error) {
			homey.app.log("Can't update gauge because one or more values are invalid.", error);
			return false;
		}

		// for every color that has been set, check if the colors are valid hex colors
		// if they are not, return false
		const colorKeys: (keyof AdvancedGaugeWidgetData)[] = ['color1', 'color2', 'color3', 'color4', 'color5'];
		for (const colorKey of colorKeys) {
			const colorValue = data[colorKey] as string;
			if (colorValue && !/^#[0-9A-F]{6}$/i.test(colorValue)) {
				homey.app.log(`Can't update gauge because color '${colorKey}' is not a valid hex color.`);
				return false;
			}
		}

		return homey.app.updateGauge(key, data);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public addGauge({ homey, params, body }: ApiRequest): boolean {
		const identifier = body.identifier;
		if (homey.settings.get(identifier)) {
			homey.app.log(`Can't add gauge because gauge with id '${identifier}' already exists.`);
			return false;
		}

		homey.app.addGauge(identifier, {});
		return true;
	}

	private convertToNumber(value: string | null | undefined): number | undefined {
		if (value == null || String(value).trim() === '') {
			return undefined;
		}

		if (String(value).includes(','))
			value = value.replace(',', '.');
		const numberValue = parseFloat(value);
		if (isNaN(numberValue)) {
			throw new Error(`Value '${value}' is not a number.`);
		}

		return numberValue;
	}
}

export default new AppApi();
