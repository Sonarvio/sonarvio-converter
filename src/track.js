/**
 * Track
 * =====
 *
 * Wrapper for binary data
 */

import { extname } from 'path'

import fileType from 'file-type'


export default class Track {

	constructor ({ name, data = new Buffer(0) }) {
		const info = fileType(data.slice(0, 262))
		this.name = name
		this.data = data
		this.format = info ? info.ext : extname(name).substr(1)
		this.mime = info ? info.mime : null // mimeDB lookup (?)
	}

	/**
	 * [asBlob description]
	 * @return {[type]} [description]
	 */
	asBlob(){
		return new Blob([ this.data ], { type: this.mime })
	}

	/**
	 * [getUrl description]
	 * @return {[type]} [description]
	 */
	getUrl(){
		return window.URL.createObjectURL(this.asBlob())
	}
}
