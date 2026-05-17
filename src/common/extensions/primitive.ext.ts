declare global {
	interface String {
		get firstUppercase(): string;
		/**
		 * Format text. cth: "hello_world" ke "Hello World"
		 */
		get toTitleCase(): string;
    get isEmpty(): boolean;
	}

	interface Array<T> {
		get isEmpty(): boolean;
		get last(): T;
	}
}

function defineGetter<T extends object>(
	prototype: T,
	name: string,
	getter: (this: T) => unknown,
): void {
	Object.defineProperty(prototype, name, {
		get: getter,
		enumerable: false,
		configurable: true,
	});
}

// String
defineGetter(String.prototype, 'firstUppercase', function () {
	return this.charAt(0).toUpperCase() + this.slice(1);
});

defineGetter(String.prototype, 'toTitleCase', function () {
	return this.replace(/[_-]/g, ' ')
		.split(' ')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
});

defineGetter(String.prototype, 'isEmpty', function () {
	return this.length === 0;
});

// Array
defineGetter(Array.prototype, 'isEmpty', function () {
	return this.length === 0;
});

defineGetter(Array.prototype, 'last', function () {
	return this[this.length - 1];
});

export { };
