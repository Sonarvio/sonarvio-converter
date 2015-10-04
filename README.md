[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

Sonarvio Converter
==================

A wrapper for an [emscripted version of ffmpeg](https://github.com/Kagami/ffmpeg.js) to extract the audio tracks from media containers.

`npm install --save sonarvio-converter`


## Features

- minimal API surface for '.command', '.decode' and '.encode'
- automatic queue system for scheduling re-used workers
- transparent migration for usage with proxy for CORS handling


## Usage

For a better integration with existing projects using webpack the actual script files
for the workers are excluded. They have to be provided as an argument through the constructor.

```js
// local
var Converter = require('sonarvio-converter')
var converter = new Converter({
	types: {
		webm: '<FILE_TO_WORKER_SCRIPT>' // e.g. require(file!ffmpeg.js/ffmpeg-worker-webm)
	}
})
converter.command('webm', '-version').then(function(){
	console.log('shown infos');
})

converter.decode({ name: 'example.webm', data: .... }, 'result.ogg').then(function (track) {
	console.log(track);
})

// remote
var Converter = require('sonarvio-converter')
var converter = new Converter({
	proxy: 'http://sonarvio.com/__/proxy.html'
})

converter.command('webm', '-version').then(function(){
	console.log('show', infos);
})
```
