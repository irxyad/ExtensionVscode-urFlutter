declare global {
	interface String {
		firstUppercase(): string;
	}
}

String.prototype.firstUppercase = function (): string {
	return this.charAt(0).toUpperCase() + this.slice(1, this.length);
};
