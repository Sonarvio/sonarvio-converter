/**
 * Proxy
 * =====
 *
 *
 */

import LocalConverter from '../localconverter'

// file loader references for custom builds
require('file?name=[name].[ext]!../../../ffmpeg.js/ffmpeg-worker-webm_wav')
require('file?name=[name].[ext]!../../../ffmpeg.js/ffmpeg-worker-mp4')


const parentContext = window.parent

const converter = new LocalConverter({
  formats: {
    webm: 'ffmpeg-worker-webm_wav.js',
    mp4: 'ffmpeg-worker-mp4.js'
  }
})

window.addEventListener('message', (e) => {
  const { type, args, id } = e.data // msg
  switch (type) {
    case 'exec':
      converter.exec.apply(converter, args)
      .then((data) => parentContext.postMessage({ id, data }, '*'))
      .catch((error) => parentContext.postMessage({ error: error.message }, '*'))
      break
    case 'info':
      converter.info.apply(converter, args)
      .then((data) => parentContext.postMessage({ id, data }, '*'))
      .catch((error) => parentContext.postMessage({ error: error.message }, '*'))
      break
    case 'transform':
      converter.transform.apply(converter, args)
      .then((track) => parentContext.postMessage({ id, track }, '*'))
      .catch((error) => parentContext.postMessage({ id, error: error.message }, '*'))
      break
    default:
      parentContext.postMessage({ id, error: `Invalid API method: "${type}" !` }, '*')
  }
}, '*')
