/**
 * `JSON.stringify` that replaces lone UTF-16 surrogates with U+FFFD.
 * Some HTTP stacks reject request bodies that contain unpaired surrogates.
 */
export function safeStringify(value: unknown): string {
	return JSON.stringify(value, (_key, val) =>
		typeof val === 'string' ? sanitizeLoneSurrogates(val) : val,
	);
}

function sanitizeLoneSurrogates(input: string): string {
	return input.replace(/[\uD800-\uDFFF]/g, (char, index: number) => {
		const code = char.charCodeAt(0);
		if (code >= 0xd800 && code <= 0xdbff) {
			const next = input.charCodeAt(index + 1);
			return next >= 0xdc00 && next <= 0xdfff ? char : '�';
		}
		const prev = input.charCodeAt(index - 1);
		return prev >= 0xd800 && prev <= 0xdbff ? char : '�';
	});
}
