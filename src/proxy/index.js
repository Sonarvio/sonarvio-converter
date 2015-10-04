/**
 * Proxy
 * =====
 *
 *
 */

import LocalConverter from '../localconverter'

// default file loader references // optional ?
// require('file?name=[name].[ext]!ffmpeg.js/ffmpeg-worker-webm')
// require('file?name=[name].[ext]!ffmpeg.js/ffmpeg-worker-mp4')
const parentContext = window.parent

const converter = new LocalConverter({
  formats: {
    webm: 'ffmpeg-worker-webm.js',
    mp4: 'ffmpeg-worker-mp4.js'
  }
})

window.addEventListener('message', (e) => {
  const { type, args, id } = e.data // msg
  switch (type) {
    case 'command':
      converter.command.apply(converter, args)
      .then((track) => parentContext.postMessage({ id, track }, '*'))
      .catch((error) => parentContext.postMessage({ error: error.message }, '*'))
      break
    case 'decode':
      converter.decode.apply(converter, args)
      .then((track) => parentContext.postMessage({ id, track }, '*'))
      .catch((error) => parentContext.postMessage({ id, error: error.message }, '*'))
      break
    case 'encode':
      converter.encode.apply(converter, args)
      .then((track) => parentContext.postMessage({ id, track }, '*'))
      .catch((error) => parentContext.postMessage({ id, error: error.message }, '*'))
      break
    default:
      parentContext.postMessage({ id, error: `Invalid API method: "${msg.type}" !` }, '*')
  }
}, '*')
