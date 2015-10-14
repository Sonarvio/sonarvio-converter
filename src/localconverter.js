/**
 * LocalConverter
 * ==============
 *
 * Handling transformations and modifications of media files.
 *
 * Links:
 * - http://stackoverflow.com/questions/3377300/what-are-all-codecs-supported-by-ffmpeg
 * - http://superuser.com/questions/300897/what-is-a-codec-e-g-divx-and-how-does-it-differ-from-a-file-format-e-g-mp/300997#300997
 */

import { extname } from 'path'

import { parseLines } from './utilities'
import Track from './track'

const WORKERFS_DIRECTORY = '/data'


/**
 *
 */
export default class LocalConverter {

	constructor ({ formats }) {
		this.FORMATS = formats
		this.workers = Object.create(null)
		this.pending = Object.keys(formats).reduce((pending, format) => {
			pending[format] = Promise.resolve()
			return pending
		}, Object.create(null))
	}

	/**
	 * @param  {[type]} format [description]
	 * @return {[type]}      	 [description]
	 */
	_getWorker (format) {
		if (!this.workers[format]) {
			if (!this.FORMATS[format]) {
				throw new Error(`Unsupported media format: "${format}" !`)
			}
			this.workers[format] = new window.Worker(this.FORMATS[format])
		}
		return this.workers[format]
	}

	/**
	 * @param {[type]} format -
	 * @param {[type]} deep 	-
	 */
	_reset (format, deep = false) {
		const worker = this.workers[format]
		delete worker.onmessage
		delete worker.onerror
		if (deep) {
			worker.terminate()
			delete this.workers[format]
		}
	}

	/**
	 * @param  {[type]} format -
	 * @param  {[type]} debug  -
	 */
	_receive (format, debug = false) {
		return new Promise((resolve, reject) => {
			const worker = this._getWorker(format)
			const stdout = []
			const stderr = []
			worker.onerror = (err) => {
				this._reset(format, true)
				reject(err)
			}
			worker.onmessage = (e) => {
				const msg = e.data || {}
				switch (msg.type) {
					case 'ready':
						if (debug) console.log('ready', msg)
						break
					case 'run':
						if (debug) console.log('run', msg)
						break
					case 'stdout':
						stdout.push(msg.data)
						break
					case 'stderr':
						stdout.push(msg.data)
						stderr.push(msg.data)
						break
					case 'done':
						if (debug) console.log('done', msg)
						const [out, err] = parseLines(stdout, stderr)
						return resolve({ data: msg.data, out, err	})
					case 'error':
						this._reset(format, true)
						return reject(new Error(msg.data))
					case 'exit':
					default:
						if (debug) console.log('exit', msg)
						this._reset(format)
						if (msg.data !== 0) {
							return reject(new Error(`Process Exit: ${msg.data}`))
						}
				}
			}
		})
	}

	/**
	 * Basic execution of a defined task
	 *
	 * @param  {string}	format -
	 * @param  {string}	params -
	 */
	exec (format = Object.keys(this.FORMATS)[0], params = '') {
		return new Promise((resolve, reject) => {
			this.pending[format] = this.pending[format].then(() => {
				const task = this._receive(format).then(resolve).catch(reject)
				this._getWorker(format).postMessage({
					type: 'run',
					arguments: params.split(' ').filter((arg) => arg)
				})
				return task
			})
		})
	}

	/**
	 * Show information about the supported en-/decoder
	 *
	 * TODO:
	 * - parse information from the lists
	 *
	 * @param  {[type]} format [description]
	 * @return {[type]}        [description]
	 */
	info (format) {
		return Promise.all([
			this.exec(format, '-formats'),
			this.exec(format, '-codecs')
		]).then(([ formats, codecs ]) => {
			const formatsDelimeter = 'File formats:'
			const formatsList = formats.out.substr(
														formats.out.indexOf(formatsDelimeter) + formatsDelimeter.length + 1
													).split('\n')

			const codecsDelimeter = 'Codecs:'
			const codecsList = codecs.out.substr(
														codecs.out.indexOf(codecsDelimeter) + codecsDelimeter.length + 1
													).split('\n')

			return {
				formats: formatsList,
				codecs: codecsList
			}
		})
	}

	/**
	 * De-/Encode files
	 *
	 * @param  {[type]} source [description]
	 * @param  {[type]} target [description]
	 * @return {[type]}        [description]
	 */
	transform (source, target) {
		return new Promise((resolve, reject) => {

			const sourceFormat = source.format || extname(source.name).substr(1)
			const targetFormat = target.format || extname(target.name).substr(1)
			const codec = target.codec || { 'wav': 'pcm_s16le' }[targetFormat] || 'copy'

			const options = []

			// time based re-encoding
			if (target.start || target.end || target.duration) {
				const position = target.start || target.duration && (target.end - target.duration)
				if (position) { // targetStart
					options.push(`-ss ${position}`)
				}
				const duration = target.end || target.duration && (target.start + target.duration)
				if (duration) { // targetEnd
					options.push(`-t ${duration}`)
				}
			}

			if (target.normalize) {
				// TODO:
				// - implement peak and RMS normalization
				// 		http://superuser.com/questions/323119/how-can-i-normalize-audio-using-ffmpeg
				// 		https://www.quora.com/How-do-I-normalize-or-equalize-the-audio-on-FFmpeg
			}

			if (Array.isArray(target.modifiers)) {
				options.push.apply(options, modifiers)
			}

			const params = `-i ${source.name} -vn -acodec ${codec} ${options.join(' ')} ${target.name}`

			this.pending[sourceFormat] = this.pending[sourceFormat].then(() => {
				const task = this._receive(sourceFormat).then(({ data }) => {
					const descriptor = data.MEMFS[0] // ~ name, data
					return resolve(new Track(descriptor))
				}).catch(reject)
				this._getWorker(sourceFormat).postMessage({
					type: 'run',
					// TODO:
					// - allow shared usage of existing/passed entries
					mounts: [{
						type: 'WORKERFS',
						opts: {
							blobs: [source]
						},
						mountpoint: WORKERFS_DIRECTORY
					}],
					MEMFS: [source],
					arguments: params.split(' ').filter((arg) => arg)
				})
				return task
			})
		})
	}
}
