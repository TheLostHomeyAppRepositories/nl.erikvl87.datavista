import { Log } from 'homey-log';
import Homey from 'homey/lib/Homey';

export default class DataVistaLogger {
	private static instance: DataVistaLogger | null = null;
	private sentryLog: Log;
	private log: (...args: unknown[]) => void;
	private error: (...args: unknown[]) => void;

	private constructor(homey: Homey, log: (...args: unknown[]) => void, error: (...args: unknown[]) => void) {
		this.sentryLog = new Log({ homey });
		this.log = log;
		this.error = error;
	}

	public static async initialize(
		homey: Homey,
		log: (...args: unknown[]) => void,
		error: (...args: unknown[]) => void,
	): Promise<DataVistaLogger> {
		if (this.instance === null) {
			this.instance = new this(homey, log, error);
		}
		return this.instance;
	}

	public async logMessage(message: string, logToSentry: boolean = false, ...args: any[]): Promise<void> {
		if (args.length > 0) {
			this.log(message, ...args);
		} else {
			this.log(message);
		}
		if (logToSentry) {
			try {
				await this.sentryLog.captureMessage(message);
			} catch (err) {
				this.error('Failed to send message to Sentry:', err);
			}
		}
	}

	public async logException(error: any): Promise<void> {
		this.error(error);
		try {
			await this.sentryLog.captureException(error);
		} catch (err) {
			this.error('Failed to send exception to Sentry:', err);
		}
	}
}
