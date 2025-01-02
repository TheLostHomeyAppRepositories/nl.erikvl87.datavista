export class ExtendedError extends Error {
	metadata: Record<string, any>;

	constructor(message: string, metadata: Record<string, any> = {}) {
		super(message);
		this.metadata = metadata;
	}
}
