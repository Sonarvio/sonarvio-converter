/**
 * ProxyConverter
 * ==============
 *
 * Allows start the converter in a worker - although its available at
 * at a different (or none HTTP/S) origin.
 */

import { extname } from 'path'

import uuid from 'node-uuid'

import Track from './track'


/**
 * 
 */
export default class ProxyConverter {

  constructor ({ proxy, formats = ['webm', 'mp4'] }) {
    this.proxy = proxy
    this.FORMATS = formats

    // prepare queue for async communication
    var resolvers = []
    this.current = Object.create(null)
    this.pending = formats.reduce((pending, format) => {
      pending[format] = new Promise((resolve, rejext) => {
        resolvers.push(resolve) // initial waiting
      })
      return pending
    }, Object.create(null))

    var frame = document.createElement('iframe')
    frame.style.cssText = `
      width: 0;
      height: 0;
      position: fixed;
    `
    // invoke queue of commands
    frame.onload = () => resolvers.forEach((resolve) => resolve())
    frame.src = proxy
    document.documentElement.appendChild(frame) // (document.body || document.documentElement)
    this.context = frame.contentWindow

    // attach window listener
    var link = document.createElement('a')
    link.href = proxy // proxyOrigin match
    window.addEventListener('message', (e) => {
      if (e.origin !== link.origin) {
        return // check source
      }
      const { id, error, track } = e.data
      if (!error) {
        this.current[id].resolve(new Track(track))
      } else {
        this.current[id].reject(new Error(error))
      }
      delete this.current[id]
    })
  }

  /**
   * [_send description]
   * Solve/hanlded by the window event listener
   * @param  {[type]} type  [description]
   * @param  {[type]} args  [description]
   * @return {[type]}       [description]
   */
  _send (type, args) {
    return new Promise((resolve, reject) => {
			const action = {
        id: uuid.v4(),
				type,
				args
			}
      // TODO:
      // - declare transferables for performance
      // - use proper 'window.location.origin' for security
      this.context.postMessage(action, this.proxy)
      this.current[action.id] = { resolve, reject }
    })
  }

  /**
   * [command description]
   * @param  {[type]} format [description]
   * @return {[type]}        [description]
   */
  command (format = this.FORMATS[0]) {
    const args = Array.prototype.slice.call(arguments, 1)
    return this.pending[format] = this.pending[format].then(() => this._send('command', args))
  }

  /**
   * [decode description]
   * @param  {[type]} source [description]
   * @return {[type]}        [description]
   */
  decode (source) {
    const args = [...arguments]
    const format = extname(source.name).substr(1)
    return this.pending[format] = this.pending[format].then(() => this._send('decode', args))
  }

  /**
   * [encode description]
   * @param  {[type]} source [description]
   * @return {[type]}        [description]
   */
  encode (source) {
    const args = [...arguments]
    const format = extname(source.name).substr(1)
    return this.pending[format] = this.pending[format].then(() => this._send('encode', args))
  }
}
