/**
 * ProxyConverter
 * ==============
 *
 * Allows to spawn a converter in a worker even if through a different origin.
 *
 * TODO:
 * - add warning if an invalid 'proxy.html' got referenced
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
      const { id, error, data, track } = e.data
      if (!error) {
        this.current[id].resolve(data || track && new Track(track))
      } else {
        this.current[id].reject(new Error(error))
      }
      delete this.current[id]
    })
  }

  /**
   * Solve/hanlded by the window event listener
   *
   * @param  {[type]} type -
   * @param  {[type]} args -
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
   *
   * @param  {[type]} format -
   */
  exec (format) {
    const args = Array.prototype.slice.call(arguments, 1)
    return this.pending[format] = this.pending[format].then(() => this._send('exec', args))
  }

  /**
   * [command description]
   *
   * @param  {[type]} format -
   */
  info (format) {
    return this.pending[format] = this.pending[format].then(() => this._send('info', [format]))
  }

  /**
   * [decode description]
   *
   * @param  {[type]} source -
   */
  transform (source) {
    const args = [...arguments]
    const format = source.format || extname(source.name).substr(1)
    return this.pending[format] = this.pending[format].then(() => this._send('transform', args))
  }
}
