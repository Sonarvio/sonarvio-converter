/**
 * LocalConverter
 * ==============
 *
 * Handling transformations and modifications of media files.
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
	 * @param {[type]} format [description]
	 * @param {[type]} deep 	[description]
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
	 * @param  {[type]} format  [description]
	 * @param  {[type]} debug 	[description]
	 * @return {[type]}       	[description]
	 */
	_receive (format, debug) {
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
						// if (debug) {
						// 	console.log('ready', msg)
						// }
						break
					case 'run':
						// if (debug) {
						// 	console.log('run', msg)
						// }
						break
					case 'stdout':
						stdout.push(msg.data)
						break
					case 'stderr':
						stdout.push(msg.data)
						stderr.push(msg.data)
						break
					case 'done':
						// if (debug) {
						// 	console.log('done', msg)
						// }
						const [out, err] = parseLines(stdout, stderr)
						if (debug) {
							console.log(out)
						}
						return resolve(msg.data)
						break;
					case 'error':
						this._reset(format, true)
						return reject(new Error(msg.data))
					case 'exit':
					default:
						// if (debug) {
						// 	console.log('exit', msg)
						// }
						this._reset(format)
						if (msg.data !== 0) {
							return reject(new Error(`Process Exit: ${msg.data}`))
						}
						break
				}
			}
		})
	}

	/**
	 * [command description]
	 * @param  {[type]} params
	 * @return {[type]}        [description]
	 */
	command (format = Object.keys(this.FORMATS)[0], params = '-formats') {
		return new Promise((resolve, reject) => {
			this.pending[format] = this.pending[format].then(() => {
				const done = this._receive(format, true)
													.then(() =>	resolve(new Track({ name: `source.${format}` })))
													.catch(reject)
				this._getWorker(format).postMessage({
					type: 'run',
					arguments: params.split(' ')
				})
				return done
			})
		})
	}

	/**
	 * [decode description]
	 * @param  {[type]} source     [description]
	 * @param  {[type]} targetName [description]
	 * @param  {[type]} options		 [description]
	 * @return {[type]}            [description]
	 */
	decode (source, targetName, options = {}) {
		return new Promise((resolve, reject) => {
			const { format = extname(targetName).substr(1), codec = 'copy' } = options
			const originalFormat = extname(source.name).substr(1)
			this.pending[originalFormat] = this.pending[originalFormat].then(() => {
				const done = this._receive(originalFormat).then(({ MEMFS: [{ data }] }) => {
					return resolve(new Track({ name: targetName, data	}))
				}).catch(reject)
				this._getWorker(originalFormat).postMessage({
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
					arguments: `-i ${source.name} -vn -f ${format} -acodec ${codec} ${targetName}`
										 .split(' ')
				})
				return done
			})
		})
	}

	/**
	 * [encode description]
	 * @param  {[type]} source     [description]
	 * @param  {[type]} targetName [description]
	 * @return {[type]}            [description]
	 */
	encode (source, targetName) {
		return new Promise((resolve, reject) => {
			const format = extname(source.name).substr(1)
			this.pending[format] = this.pending[format].then(() => {
				const done = this._receive(format).then(({ MEMFS: [{ data }] }) => {
					return resolve(new Track({ name: targetName, data	}))
				}).catch(reject)
				this._getWorker(format).postMessage({
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
					arguments: `-i ${source.name} ${targetName}`
										 .split(' ')
				})
				return done
			})
		})
	}
}
