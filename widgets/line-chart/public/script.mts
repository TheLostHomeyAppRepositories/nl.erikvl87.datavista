import type HomeyWidget from 'homey/lib/HomeyWidget';
import type * as echarts from 'echarts';

// TODO: Merge all datasource type definitions!

type Timeframe = 'hour' | 'day' | 'week' | 'month' | 'year';
type Period = 'this' | 'last';

type Settings = {
	showRefreshCountdown : boolean;
	datasource1?: {
		deviceId: string;
		deviceName: string;
		id: string;
		name: string;
		type: 'insight';
	};
	color1: string;
	overwriteName1: string;
	datasource2?: {
		deviceId: string;
		deviceName: string;
		id: string;
		name: string;
		type: 'insight';
	};
	color2: string;
	overwriteName2: string;
	timeframe: Timeframe;
	period1: Period;
	period2: Period;
	yAxisCalculationMethod: 'fullRange' | 'iqr' | 'sameAxis';
};

class LineChartWidgetScript {
	private settings: Settings;
	private homey: HomeyWidget;
	private chart!: echarts.ECharts;
	private isOffTheScale: boolean = false;
	private configurationAnimationTimeout: NodeJS.Timeout | null | undefined;
	resolution1: string;
	resolution2: string;
	data1?: [Date, number | '-'][];
	data2?: [Date, number | '-'][];
	units1: string = '';
	units2: string = '';
	refreshSyncDataTimeout: NodeJS.Timeout | null | undefined;
	name1: string = 'datasource1';
	name2: string = 'datasource2';
	timezone: string | undefined;
	language: string | undefined;
	dateMin: Date | null = null;
	dateMax: Date | null = null;

	constructor(homey: HomeyWidget) {
		this.settings = homey.getSettings() as Settings;

		// If no datasource2 is set, use datasource1 so the 2nd dataset can be the previous period.
		if (!this.settings.datasource2?.id && this.settings.period1 !== this.settings.period2) {
			this.settings.datasource2 = this.settings.datasource1;
		}

		this.homey = homey;
		this.resolution1 = LineChartWidgetScript.getResolution(this.settings.timeframe, this.settings.period1);
		this.resolution2 = LineChartWidgetScript.getResolution(this.settings.timeframe, this.settings.period2);
	}

	/**
	 * Logs a message to the Homey API.
	 * @param message - The message to log.
	 * @param logToSentry - Whether to log the message to Sentry.
	 * @param optionalParams - Additional parameters to include in the log.
	 */
	private async logMessage(message: string, logToSentry: boolean, ...optionalParams: any[]): Promise<void> {
		await this.homey.api('POST', '/logMessage', { message, logToSentry, optionalParams });
	}

	/**
	 * Logs an error to the Homey API.
	 * @param message - The error message to log.
	 * @param error - The error object to serialize and log.
	 */
	private async logError(message: string, error: Error): Promise<void> {
		const serializedError = JSON.stringify(error, Object.getOwnPropertyNames(error));
		await this.homey.api('POST', '/logError', { message, error: serializedError });
	}

	/**
	 * Determines the resolution string based on the granularity and timeframe.
	 * @param granularity - The granularity of the data (e.g., 'day', 'week').
	 * @param timeframe - The timeframe of the data (e.g., 'this', 'last').
	 * @returns The resolution string (e.g., 'today', 'thisWeek').
	 */
	private static getResolution(granularity: Timeframe, timeframe: Period): string {
		switch (granularity) {
			case 'hour':
				return 'last6Hours';
			case 'day':
				return timeframe === 'this' ? 'today' : 'yesterday';
			case 'week':
				return timeframe === 'this' ? 'thisWeek' : 'lastWeek';
			case 'month':
				return timeframe === 'this' ? 'thisMonth' : 'lastMonth';
			case 'year':
				return timeframe === 'this' ? 'thisYear' : 'lastYear';
		}
	}

	/**
	 * Converts a hex color to an RGBA string.
	 * @param hex - The hex color string (e.g., "#ff0000").
	 * @param opacity - The opacity value (0 to 1).
	 * @returns The RGBA color string.
	 * @throws Error if the hex color is invalid.
	 */
	private static hexToRgba(hex: string, opacity: number): string {
		const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
		hex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);

		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		if (!result) {
			throw new Error(`Invalid hex color: ${hex}`);
		}

		const r = parseInt(result[1], 16);
		const g = parseInt(result[2], 16);
		const b = parseInt(result[3], 16);

		return `rgba(${r}, ${g}, ${b}, ${opacity})`;
	}

	private getFriendlyResolutionTranslationId(resolution: string, period: Period): string {
		if (this.settings.timeframe !== 'hour')
			return resolution;
		{
			if(period === 'this') {
				return 'thisHour';
			} else {
				return 'lastHour';
			}
		}
	}

	private async getData(): Promise<void> {
		const request : { 
			datasource1?: { id: string; insightResolution: string };
			datasource2?: { id: string; insightResolution: string };
			settings: {
				timeframe: Timeframe;
				period1: Period;
				period2: Period;
			}
		} = {
			settings: {
				timeframe: this.settings.timeframe,
				period1: this.settings.period1,
				period2: this.settings.period2,
			}
		};
		
		if (this.settings.datasource1?.id) {
			request.datasource1 = {
				...this.settings.datasource1,
				insightResolution: this.resolution1,
			};
		}
		
		if (this.settings.datasource2?.id.trim()) {
			request.datasource2 = {
				...this.settings.datasource2,
				insightResolution: this.resolution2,
			};
		}

		const result = (await this.homey.api('POST', `/datasource`, request)) as {
			data1: [Date, number | '-'][],
			data2: [Date, number | '-'][],
			updatesIn: number,
			name1?: string;
			name2?: string;
			units1?: string;
			units2?: string;
		};

		if (result.data1 !== null) {
			this.name1 = (this.settings.overwriteName1?.trim())
				? this.settings.overwriteName1
				: result.name1 + ' (' + this.homey.__(this.getFriendlyResolutionTranslationId(this.resolution1, this.settings.period1)) + ')';
		}

		if (result.data2 !== null) {
			this.name2 = (this.settings.overwriteName2?.trim())
				? this.settings.overwriteName2
				: result.name2 + ' (' + this.homey.__(this.getFriendlyResolutionTranslationId(this.resolution2, this.settings.period2)) + ')';
		}

		if (result.updatesIn !== Number.MAX_SAFE_INTEGER) {
			if (this.settings.showRefreshCountdown)
				document.getElementById('progress')!.style.display = 'block';
			this.scheduleCountdown(result.updatesIn);
		}

		await this.setData(result.data1, result.units1 ?? '', result.data2, result.units2 ?? '');
	}

	private async setData(
		data1: [Date, number | '-'][],
		units1: string,
		data2: [Date, number | '-'][],
		units2: string
	): Promise<void> {
		this.data1 = data1;
		this.data2 = data2;
		this.units1 = units1;
		this.units2 = units2;

		if (this.data1 != null && this.data2 != null)
			this.isOffTheScale = await this.determineOffTheScale(this.data1, this.data2);

		const lowestDate1 = this.data1?.length ? new Date(this.data1[0][0]) : null;
		const lowestDate2 = this.data2?.length ? new Date(this.data2[0][0]) : null;

		this.dateMin = lowestDate1 && lowestDate2
			? new Date(Math.min(lowestDate1.getTime(), lowestDate2.getTime()))
			: lowestDate1 ?? lowestDate2;

		const highestDate1 = this.data1?.length ? new Date(this.data1[this.data1.length - 1][0]) : null;
		const highestDate2 = this.data2?.length ? new Date(this.data2[this.data2.length - 1][0]) : null;
		
		this.dateMax = highestDate1 && highestDate2
			? new Date(Math.max(highestDate1.getTime(), highestDate2.getTime()))
			: highestDate1 ?? highestDate2;
	}

	/**
	 * Schedules a countdown timer for data refresh.
	 * @param updatesIn - The time in milliseconds until the next update.
	 */
	private scheduleCountdown(updatesIn: number): void {
		const progressBar = document.getElementById('progress-bar')!;

		const progressIcon = document.getElementById('progress-icon');
		progressBar.style.width = '100%';
		let countdown = Math.ceil(updatesIn / 1000);

		if (this.refreshSyncDataTimeout) {
			clearInterval(this.refreshSyncDataTimeout);
		}

		this.refreshSyncDataTimeout = setInterval(async () => {
			if (countdown <= 0) {
				clearInterval(this.refreshSyncDataTimeout!);
				this.refreshSyncDataTimeout = null;

				progressBar.style.width = '0%'; // Explicitly set to 0%

				// Respect the transition duration
				const transitionDuration = parseFloat(getComputedStyle(progressBar).transitionDuration.replace('s', '')) * 1000;

				await new Promise(resolve => setTimeout(resolve, transitionDuration));

				// Perform the spin animation
				if (progressIcon) {
					progressIcon.style.transition = 'transform 1s ease-in-out, color 1s ease-in-out';
					progressIcon.style.transform = 'rotate(720deg)';
					setTimeout(() => {
						progressIcon.style.transition = '';
						progressIcon.style.transform = '';
					}, 1000);
				}

				// Perform the action when countdown reaches 0
				await this.getData();
				await this.render();
			} else {
				const percentage = (countdown / (updatesIn / 1000)) * 100;
				progressBar.style.width = `${percentage}%`;
			}

			countdown--;
		}, 1000);
	}

	/**
	 * Determines whether the data for the current timeframe is potentially incomplete.
	 * @returns True if the data might not be complete, otherwise false.
	 */
	private potentiallyNotComplete(): boolean {
		if (['hour', 'day', 'week', 'month', 'year'].includes(this.settings.timeframe) &&
			((this.settings.datasource1?.id && this.settings.period1 === 'this') &&
				(!this.settings.datasource2?.id || (this.settings.datasource2?.id && this.settings.period2 === 'this'))))
			return true;
		return false;
	}

	/**
	 * Determines the appropriate options for rendering based on the timeframe and data range.
	 * @param timeframe - The selected timeframe (e.g., 'week', 'month', 'year').
	 * @param dateMin - The minimum date in the dataset.
	 * @param dateMax - The maximum date in the dataset.
	 * @returns An object containing options for rendering and intervals.
	 */
	private getTimeframeOptions(timeframe: Timeframe): {
		options: Intl.DateTimeFormatOptions;
		interval: number;
	} {
		const dateMin = this.dateMin!;
		const dateMax = this.dateMax!;
		const diff = Math.abs(dateMin.getTime() - dateMax.getTime());
		const options: Intl.DateTimeFormatOptions = {};
		let interval = 0;

		switch (timeframe) {
			case 'hour':
			case 'day': {
				const diffInMinutes = Math.ceil(diff / (1000 * 60));
				if (diffInMinutes < 2) {
					// Probably in demo mode
					interval = 10000; // 10 seconds
				} else {
					interval = 1000 * 60 * 10;
				}
				break;
			}
			case 'week': {
				const diffInDays = Math.ceil(diff / (1000 * 3600 * 24));
				if (diffInDays < 4) {
					options.hour = '2-digit';
					options.minute = '2-digit';
					interval = 3600 * 1000 * 4; // 4 hours
				} else {
					interval = 3600 * 1000 * 24; // 1 day
				}
				break;
			}
			case 'month': {
				const diffInDays = Math.ceil(diff / (1000 * 3600 * 24));
				if (diffInDays < 3) {
					options.hour = '2-digit';
					options.minute = '2-digit';
					interval = 3600 * 1000 * 6; // 6 hours
				} else {
					interval = 3600 * 1000 * 24; // 1 day
				}
				break;
			}
			case 'year': {
				const diffInMonths = Math.ceil(diff / (1000 * 3600 * 24 * 30));
				if (diffInMonths < 3) {
					options.month = '2-digit';
					options.day = '2-digit';
					interval = 3600 * 1000 * 24; // 1 day
				} else {
					interval = 3600 * 1000 * 24 * 27; // 27 days
				}
				break;
			}
		}

		return { options, interval };
	}

	/**
	 * Formats the X-axis value based on the selected timeframe and language.
	 * * @param value - The value to format.
	 * @param friendly - Whether the value is for a tooltip or not.
	 * @return The formatted value as a string.
	 * @throws Error if the value is not a valid date.
	 * */
	private formatXAxisValue(value: string, friendly: boolean = false): string {
		const capitalizeFirstLetter = (str: string): string =>
			str.charAt(0).toUpperCase() + str.slice(1);
	
		const date = new Date(value);

		const options: Intl.DateTimeFormatOptions = {
			timeZone: this.timezone,
			weekday: this.settings.timeframe === 'week' ? (friendly ? 'long' : 'short') : undefined,
			day: (this.settings.timeframe === 'month') ? 'numeric' : undefined,
			month: this.settings.timeframe === 'year' ? (friendly ? 'long' : 'short') : undefined,
			hour: (friendly ? this.settings.timeframe !== 'year' &&  this.settings.timeframe !== 'hour' : this.settings.timeframe === 'day') ? 'numeric' : undefined,
			minute: (friendly ? this.settings.timeframe !== 'year' : this.settings.timeframe === 'day' || this.settings.timeframe === 'hour') ? '2-digit' : undefined,
			hourCycle: this.settings.timeframe === 'day' ? 'h23' : undefined,
		};

		if (!friendly && this.potentiallyNotComplete() && this.dateMin && this.dateMax) {
			const { options: adjustedOptions } = this.getTimeframeOptions(this.settings.timeframe);
			Object.assign(options, adjustedOptions);
		}

		let formattedDate = Intl.DateTimeFormat(this.language, options).format(date).replace(',', '');

		if(friendly) {
			switch (this.settings.timeframe) {
				case 'hour':
					formattedDate = this.homey.__('minute') + ' ' + formattedDate;
					break;
				case 'month':
					formattedDate = this.homey.__('day') + ' ' + formattedDate;
					break;
			}
		} else {
			if (options.hour || options.minute)
				formattedDate = formattedDate.replace(' ', '\n');
		}
		return capitalizeFirstLetter(formattedDate);
	}

	/**
	 * Determines whether a second Y-axis is required based on the data ranges and settings.
	 * @param data1 - The first dataset.
	 * @param data2 - The second dataset.
	 * @returns True if a second axis is required, otherwise false.
	 */
	private async determineOffTheScale(data1: [Date, number | '-'][], data2: [Date, number | '-'][]): Promise<boolean> {
		// Helper function to calculate the range of a dataset
		const calculateRange = async (data: [Date, number | '-'][]): Promise<number> => {
			const numericValues = data
				.filter(point => typeof point[1] === 'number')
				.map(point => point[1] as number);

			// Early exit if no numeric values exist
			if (numericValues.length === 0) return 0;

			// Apply IQR method if selected
			if (this.settings.yAxisCalculationMethod === "iqr") {
				const sortedValues = numericValues.sort((a, b) => a - b);
				const q1 = sortedValues[Math.floor(sortedValues.length / 4)];
				const q3 = sortedValues[Math.floor((sortedValues.length * 3) / 4)];
				const iqr = q3 - q1;

				const lowerBound = q1 - 1.5 * iqr;
				const upperBound = q3 + 1.5 * iqr;

				// Filter values within bounds
				const filteredValues = numericValues.filter(value => value >= lowerBound && value <= upperBound);

				// Calculate the range of the filtered dataset
				return Math.max(...filteredValues) - Math.min(...filteredValues);
			}

			// If not using IQR, calculate the full range
			return Math.max(...numericValues) - Math.min(...numericValues);
		};

		// Early exit if both datasets are empty
		if (data1.length === 0 && data2.length === 0)
			return false;

		// Handle "Force Same Axis" option
		if (this.settings.yAxisCalculationMethod === "sameAxis")
			return false; // Force same axis, no second axis needed

		// Calculate ranges for both datasets
		const range1 = await calculateRange(data1);
		const range2 = await calculateRange(data2);

		// Handle cases where both ranges are 0
		if (range1 === 0 && range2 === 0)
			return false;

		// Handle cases where one range is 0
		if (range1 === 0 || range2 === 0)
			return true;

		// Check if units are different
		if (this.units1 !== this.units2)
			return true; // Different units always require a second axis

		// Calculate the range ratio
		const rangeRatio = Math.max(range1, range2) / Math.min(range1, range2);

		// Log the range ratio for debugging
		await this.logMessage(
			`${this.settings.datasource1?.name} Range ratio: ${rangeRatio} (Dataset 1: ${range1}, Dataset 2: ${range2})`,
			false
		);

		const threshold = 10;
		return rangeRatio > threshold;
	}

	/**
	 * Renders the chart using the current data and settings.
	 * Updates the chart options and legend toggles.
	 */
	private async render(): Promise<void> {
		if (!this.data1 && !this.data2) {
			await this.logMessage('The payload is null', false);
			await this.startConfigurationAnimation();
			return;
		}

		await this.stopConfigurationAnimation();

		let splitNumber = 1;
		switch (this.settings.timeframe) {
			case 'hour':
				splitNumber = 6;
				break;
			case 'day':
				splitNumber = 6;
				break;
			case 'week':
				splitNumber = 7;
				break;
			case 'month': {
				const daysInMonth = new Date(this.data1![0][0].getFullYear(), this.data1![0][0].getMonth() + 1, 0).getDate();
				splitNumber = Math.ceil(daysInMonth / 2);
				break;
			}
			case 'year':
				splitNumber = 12;
				break;
		}

		const primaryAxisY = {
			type: 'value',
			name: this.units1,
			nameTextStyle: {
				align: 'left',
				color: getComputedStyle(document.documentElement).getPropertyValue('--homey-color-mono-200').trim(),
			},
			scale: true,
			splitLine: {
				show: true,
				lineStyle: {
					color: getComputedStyle(document.documentElement).getPropertyValue('--homey-color-mono-200').trim(),
					width: 1,
					opacity: 0.5,
					type: 'dashed',
				},
			},
		};

		if (this.isOffTheScale) {
			primaryAxisY.nameTextStyle.color = this.settings.color1;
		}

		const yAxis = this.isOffTheScale
			? [
				primaryAxisY,
				{
					type: 'value',
					name: this.units2,
					nameTextStyle: {
						color: this.settings.color2,
						align: 'right',
					},
					scale: true,
					splitLine: {
						show: false,
						lineStyle: {
							color: getComputedStyle(document.documentElement).getPropertyValue('--homey-color-mono-200').trim(),
							width: 1,
							opacity: 0.5,
							type: 'dashed',
						},
					},
				},
			]
			: primaryAxisY;

		const legendData = [];

		const series = [];
		if (this.settings.datasource1?.id) {
			legendData.push(this.name1);

			series.push({
				name: this.name1,
				type: 'line',
				data: this.data1,
				sampling: this.settings.timeframe === 'year' ? 'lttb' : undefined,
				showSymbol: false,
				itemStyle: {
					color: this.settings.color1,
				},
				areaStyle: {
					color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
						{
							offset: 0.1,
							color: LineChartWidgetScript.hexToRgba(this.settings.color1, 0.5),
						},
						{
							offset: 0.9,
							color: LineChartWidgetScript.hexToRgba(this.settings.color1, 0),
						},
					]),
				},
				lineStyle: {
					width: 1.5,
				},
				yAxisIndex: 0,
			});
		}

		if (this.settings.datasource2) {
			legendData.push(this.name2);
			series.push({
				name: this.name2,
				type: 'line',
				data: this.data2,
				sampling: this.settings.timeframe === 'year' ? 'lttb' : undefined,
				showSymbol: false,
				itemStyle: {
					color: LineChartWidgetScript.hexToRgba(this.settings.color2, 0.7),
				},
				areaStyle: {
					color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
						{
							offset: 0.1,
							color: LineChartWidgetScript.hexToRgba(this.settings.color2, 0.5),
						},
						{
							offset: 0.9,
							color: LineChartWidgetScript.hexToRgba(this.settings.color2, 0),
						},
					]),
				},
				lineStyle: {
					width: 1.5,
				},
				yAxisIndex: this.isOffTheScale ? 1 : 0,
			});
		}

		const { interval } = this.getTimeframeOptions(this.settings.timeframe);

		const option = {
			legend: {
				show: false,
				data: legendData,
				bottom: 0,
			},
			tooltip: {
				trigger: 'axis',
				confine: true,
				textStyle: {
					fontSize: 10,
					overflow: 'truncate',
				},
				formatter: (params: any): string => {
					const formattedTitle = this.formatXAxisValue(params[0].value[0], true);

					// Format the Y-axis values for each series
					const seriesData = params.map((item: any) => {
						const marker = item.marker; // Colored indicator (HTML)
						const seriesName = item.seriesName; // Name of the series
						const yValue = item.value[1]; // Y-axis value

						const unit = item.seriesIndex === 0 ? this.units1 : this.units2;

						const formattedYValue =
							yValue !== '-' ? `${Number.isInteger(yValue) ? yValue : yValue.toFixed(2)} ${unit}` : '-';

						return `${marker}<strong>${seriesName}</strong>: ${formattedYValue}`;
					});

					// Combine the title and series data
					return `<strong>${formattedTitle}</strong><br/>${seriesData.join('<br/>')}`;
				},
			},
			grid: {
				top: '30',
				left: '12',
				right: '12',
				bottom: '0',
				height: 'auto',
				containLabel: true,
			},
			toolbox: {
				feature: {
					saveAsImage: {},
				},
			},
			xAxis: {
				type: 'time',
				splitNumber: splitNumber,
				splitLine: {
					show: false,
				},
				minInterval: interval,
				axisLabel: {
					formatter: (value: string): string => this.formatXAxisValue(value),
					hideOverlap: true,
					showMinLabel:true,
					showMaxLabel: this.settings.timeframe === 'hour' || this.settings.timeframe === 'day' || this.settings.timeframe === 'month' ? this.potentiallyNotComplete() ? false : true : false,
					alignMinLabel: this.settings.timeframe !== 'month' ? 'center' : 'left',
					alignMaxLabel: this.settings.timeframe !== 'month' ? 'center' : 'right',
					rotate: this.settings.timeframe !== 'month' && this.settings.timeframe !== 'hour' ? 45 : 0,
					align: 'center',
					margin: this.settings.timeframe !== 'month' ? 20 : 8,
				},
			},
			yAxis: yAxis,
			series: series,
		};

		this.chart.setOption(option);

		// render/update the legend toggles
		if (this.settings.datasource1?.id) {
			document.querySelector('#toggle1 .label')!.textContent = this.name1;
			(document.querySelector('#toggle1 .toggle-icon')! as HTMLElement).style.backgroundColor = this.settings.color1;
			document.getElementById('toggle1')!.style.display = 'block';
		} else {
			document.getElementById('toggle1')!.style.display = 'none';
		}

		if (this.settings.datasource2?.id) {
			document.querySelector('#toggle2 .label')!.textContent = this.name2;
			(document.querySelector('#toggle2 .toggle-icon')! as HTMLElement).style.backgroundColor = this.settings.color2;
			document.getElementById('toggle2')!.style.display = 'block';
		} else {
			document.getElementById('toggle2')!.style.display = 'none';
		}

		// resize due to toggles being shown/hidden
		this.chart.resize();
	}

	/**
	 * Starts a configuration animation for the chart.
	 * Used when no data is available or during initialization.
	 */
	private async startConfigurationAnimation(): Promise<void> {
		if (this.configurationAnimationTimeout) return;

		const interval = 750;
		const data: [Date, number][] = [];
		

		const update = async (): Promise<void> => {
			const randomValue = Math.floor(Math.random() * 101);
			data.push([new Date(), randomValue]);
			if (data.length > 20) data.shift();
			await this.setData(data, 'Demo', [], '');
			this.resolution1 = 'today';
			this.units1 = 'Demo mode';

			// TODO
			this.settings.timeframe = 'day';
			this.settings.datasource1 = {
				deviceId: 'demo',
				deviceName: 'Demo',
				id: 'demo',
				name: 'Demo',
				type: 'insight',
			};

			await this.render();
			this.configurationAnimationTimeout = setTimeout(update, interval);
		};

		this.configurationAnimationTimeout = setTimeout(update, interval);
	}

	/**
	 * Stops the configuration animation for the chart.
	 */
	private async stopConfigurationAnimation(): Promise<void> {
		if (this.configurationAnimationTimeout) clearTimeout(this.configurationAnimationTimeout);
		this.configurationAnimationTimeout = null;
	}

	/**
	 * Toggles the visibility of a series in the chart.
	 * @param indexToToggle - The index of the series to toggle (0 or 1).
	 */
	private toggleSeries(indexToToggle: number): void {
		const options: echarts.EChartsOption = this.chart.getOption() as echarts.EChartsOption;

		if (!options.series)
			return;

		const series = Array.isArray(options.series) ? options.series : [options.series];
		const legend = Array.isArray(options.legend) ? options.legend[0] : options.legend;

		const visibleSeries: Map<number, echarts.SeriesOption> = new Map();
		series.forEach((seriesItem, index) => {
			if (legend?.selected?.[seriesItem!.name as string] !== false) {
				visibleSeries.set(index, seriesItem);
			}
		});

		const visibleKeys = Array.from(visibleSeries.keys());
		let primaryVisible = visibleKeys.some(k => k === 0);
		let secondaryVisible = visibleKeys.some(k => k === 1);

		if (indexToToggle === 0) {
			primaryVisible = !primaryVisible;
		} else {
			secondaryVisible = !secondaryVisible;
		}

		this.chart.dispatchAction({
			type: visibleKeys.some(k => k === indexToToggle) ? 'legendUnSelect' : 'legendSelect',
			name: series[indexToToggle].name,
		});

		let renderPrimarySplitLine = false;
		let renderSecondarySplitLine = false;

		if (primaryVisible && secondaryVisible) {
			renderPrimarySplitLine = true;
			renderSecondarySplitLine = false;
		} else if (!this.isOffTheScale) {
			primaryVisible = true;
			renderPrimarySplitLine = true;
		} else {
			renderPrimarySplitLine = primaryVisible;
			renderSecondarySplitLine = secondaryVisible;
		}

		this.chart.setOption({
			yAxis: [
				{
					show: primaryVisible,
					splitLine: {
						show: renderPrimarySplitLine,
					},
				},
				{
					show: secondaryVisible,
					splitLine: {
						show: renderSecondarySplitLine,
					},
				},
			],
		});
	}

	/**
	 * Called when the Homey API is ready.
	 */
	public async onHomeyReady(): Promise<void> {
		try {
			const result = await this.homey.api('GET', '/getTimeAndLanguage') as { timezone: string; language: string };
			this.timezone = result.timezone;
			this.language = result.language;
			
			this.chart = window.echarts.init(document.getElementById('line-chart'), null, {
				renderer: 'svg'
			});
			if (this.settings.datasource1 || this.settings.datasource2) await this.getData();

			this.homey.ready();
			await this.render();

			document.getElementById('toggle1')?.addEventListener('click', () => {
				if (this.settings.datasource1) this.toggleSeries(0);
			});

			document.getElementById('toggle2')?.addEventListener('click', () => {
				if (this.settings.datasource2) this.toggleSeries(1);
			});
		} catch (error) {
			if (error instanceof Error) {
				await this.logError('An error occured while initializing the widget', error);
			} else {
				await this.logMessage('An error occured while initializing the widget', true, error);
			}
			await this.startConfigurationAnimation();
		}
	}
}

interface ModuleWindow extends Window {
	onHomeyReady: (homey: HomeyWidget) => Promise<void>;
	echarts: typeof echarts;
}

declare const window: ModuleWindow;

window.onHomeyReady = async (homey: HomeyWidget): Promise<void> =>
	await new LineChartWidgetScript(homey).onHomeyReady();
