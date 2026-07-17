/** Shared formatting helpers for cash amounts and compact token counts. */

/** Format a cash amount with up to 2 decimal places, stripping trailing zeros. */
export function formatAmount(value: number): string {
	return value.toFixed(2).replace(/\.?0+$/, '') || '0';
}
