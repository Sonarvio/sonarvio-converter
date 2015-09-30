/**
 * Utilities
 * =========
 *
 * Helpers
 */


export function parseLines (stdout, stderr) {
	const out = stdout.join('\n')
	const err = null
	return [out, err]
}
