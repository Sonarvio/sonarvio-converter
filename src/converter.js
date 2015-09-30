/**
 * Converter
 * =========
 *
 * Handling transformations and modifications of media files.
 */

import { extname } from 'path'

import { parseLines } from './utilities'

const WORKERFS_DIRECTORY = '/data'


/**
 *
 */
export default class Converter {

	constructor ({ types }) {
		this.TYPES = types
		this.workers = Object.create(null)
		this.pending = Object.keys(types).reduce((pending, type) => {
			pending[type] = Promise.resolve()
			return pending
		}, Object.create(null))
	}

	/**
	 * @param  {[type]} type [description]
	 * @return {[type]}      [description]
	 */
	_getWorker (type) {
		if (!this.workers[type]) {
			if (!this.TYPES[type]) {
				throw new Error(`Unsupported media type: ${type}`)
			}
			this.workers[type] = new Worker(this.TYPES[type])
		}
		return this.workers[type]
	}

	/**
	 * @param {[type]} type [description]
	 * @param {[type]} deep [description]
	 */
	_reset (type, deep = false) {
		const worker = this.workers[type]
		delete worker.onmessage
		delete worker.onerror
		if (deep) {
			worker.terminate()
			delete this.workers[type]
		}
	}

	/**
	 * @param  {[type]} type  [description]
	 * @param  {[type]} debug [description]
	 * @return {[type]}       [description]
	 */
	_receive (type, debug) {
		return new Promise((resolve, reject) => {
			const worker = this._getWorker(type)
			const stdout = []
			const stderr = []
			worker.onerror = (err) => {
				this._reset(type, true)
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
						this._reset(type, true)
						return reject(new Error(msg.data))
						break
					case 'exit':
					default:
						// if (debug) {
						// 	console.log('exit', msg)
						// }
						this._reset(type)
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
	command (type = Object.keys(this.TYPES)[0], params = '-formats') {
		return new Promise((resolve, reject) => {
			this.pending[type] = this.pending[type].then(() => {
				this._receive(type, true).then(resolve).catch(reject)
				this._getWorker(type).postMessage({
					type: 'run',
					arguments: params.split(' ')
				})
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
			const type = extname(source.name).substr(1)
			this.pending[type] = this.pending[type].then(() => {
				this._receive(type).then(({ MEMFS: [{ data }] }) => {
					return resolve({
						name: targetName,
						data
					})
				}).catch(reject)
				this._getWorker(type).postMessage({
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
			const type = extname(source.name).substr(1)
			this.pending[type] = this.pending[type].then(() => {
				this._receive(type).then(({ MEMFS: [{ data }] }) => {
					return resolve({
						name: targetName,
						data
					})
				}).catch(reject)
				this._getWorker(type).postMessage({
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
			})
		})
	}
}
