/**
 * Converter
 * =========
 *
 * Handling transformations and modifications of media files.
 */

import LocalConverter from './localconverter'
import ProxyConverter from './proxyconverter'

export default class Converter {
	constructor (options) {
		if (options.proxy) {
			return new ProxyConverter(options)
		}
		return new LocalConverter(options)
	}
}
