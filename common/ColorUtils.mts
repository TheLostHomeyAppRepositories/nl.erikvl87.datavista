import Homey from 'homey/lib/Homey';
import DataVistaLogger from '../DataVistaLogger.mjs';

export default class ColorUtils {
	private static instance: ColorUtils | null = null;
	private homey: Homey;
	private logger: DataVistaLogger;

	private constructor(
		homey: Homey,
		logger: DataVistaLogger
	) {
		this.homey = homey;
		this.logger = logger;
	}

	public static initialize(
		homey: Homey,
		logger: DataVistaLogger
	): ColorUtils {
		if (this.instance === null)
			this.instance = new this(homey, logger);
		return this.instance;
	}
	/**
	 * Interpolates the color at a specific offset within a ColorStop array.
	 * @param sortedStops - The color stops array, sorted by offset
	 * @param targetOffset - The offset to interpolate the color for
	 * @returns The interpolated color as a hex string
	 */
	public interpolateColorAt(sortedStops: {offset?: number; color: string; }[], targetOffset: number): string {
		if (sortedStops.length === 0) return '#000000';
		if (sortedStops.length === 1) return sortedStops[0].color;

		// Find the two stops that bracket the target offset
		let beforeStop = sortedStops[0];
		let afterStop = sortedStops[sortedStops.length - 1];

		for (let i = 0; i < sortedStops.length - 1; i++) {
			const currentOffset = sortedStops[i].offset ?? 0;
			const nextOffset = sortedStops[i + 1].offset ?? 0;
			
			if (targetOffset >= currentOffset && targetOffset <= nextOffset) {
				beforeStop = sortedStops[i];
				afterStop = sortedStops[i + 1];
				break;
			}
		}

		const beforeOffset = beforeStop.offset ?? 0;
		const afterOffset = afterStop.offset ?? 0;

		// If offsets are the same, return the color of either stop
		if (beforeOffset === afterOffset) {
			return beforeStop.color;
		}

		// Calculate interpolation factor
		const factor = (targetOffset - beforeOffset) / (afterOffset - beforeOffset);

		// Interpolate between the two colors
		return ColorUtils.interpolateColors(beforeStop.color, afterStop.color, factor);
	}

	/**
	 * Interpolates between two hex colors.
	 * @param color1 - The first color (hex string)
	 * @param color2 - The second color (hex string)
	 * @param factor - The interpolation factor (0 = color1, 1 = color2)
	 * @returns The interpolated color as a hex string
	 */
	private static interpolateColors(color1: string, color2: string, factor: number): string {
		// Parse hex colors
		const rgb1 = this.hexToRgb(color1);
		const rgb2 = this.hexToRgb(color2);

		if (!rgb1 || !rgb2) {
			return color1; // Fallback to first color if parsing fails
		}

		// Interpolate each channel
		const r = Math.round(rgb1.r + factor * (rgb2.r - rgb1.r));
		const g = Math.round(rgb1.g + factor * (rgb2.g - rgb1.g));
		const b = Math.round(rgb1.b + factor * (rgb2.b - rgb1.b));

		// Convert back to hex
		return this.rgbToHex(r, g, b);
	}

	/**
	 * Converts a hex color to RGB components.
	 * @param hex - The hex color string (e.g., "#FF0000" or "FF0000")
	 * @returns RGB components or null if invalid
	 */
	private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
		const cleanHex = hex.replace('#', '');
		if (cleanHex.length !== 6) return null;

		const r = parseInt(cleanHex.substr(0, 2), 16);
		const g = parseInt(cleanHex.substr(2, 2), 16);
		const b = parseInt(cleanHex.substr(4, 2), 16);

		if (isNaN(r) || isNaN(g) || isNaN(b)) return null;

		return { r, g, b };
	}

	/**
	 * Converts RGB components to a hex color string.
	 * @param r - Red component (0-255)
	 * @param g - Green component (0-255)
	 * @param b - Blue component (0-255)
	 * @returns Hex color string
	 */
	private static rgbToHex(r: number, g: number, b: number): string {
		const toHex = (n: number): string => {
			const hex = Math.max(0, Math.min(255, n)).toString(16);
			return hex.length === 1 ? '0' + hex : hex;
		};

		return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
	}
}