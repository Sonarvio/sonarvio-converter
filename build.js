/**
 * Build
 * =====
 *
 *
 */

var path = require('path')

var webpack = require('webpack')

var manifest = require('./package.json')

var env = {
  ENTRY_FILE: path.resolve(__dirname, 'src/index.js'),
  SOURCE_DIRECTORY: path.resolve(__dirname, 'src'),
  DIST_DIRECTORY: path.resolve(__dirname, path.dirname(manifest.main)),
  FILE_NAME: path.basename(manifest.main, path.extname(manifest.main)),
  EXPORT_NAME: 'Converter'
}

var config = {
  target: 'web',
  entry: [
    env.ENTRY_FILE
  ],
  output: {
    path: env.DIST_DIRECTORY,
    filename: env.FILE_NAME + '.js',
    library: env.EXPORT_NAME,
    libraryTarget: 'umd'
  },
  resolve: {
    extensions: ['', '.js']
  },
  devtool: 'eval',
  module: {
    loaders: [
      {
        test: /\.js$/,
        include: env.SOURCE_DIRECTORY,
        loader: 'babel',
        query: {
          optional: ['runtime'],
          stage: 0
        }
      }
    ]
  },
  plugins: [
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin({
      // sourceMap: false,
      compress: {
        warnings: false
      }
    })
  ]
}

webpack(config).run(function notify (error, stats) {
  if (error) {
    return console.error(error)
  }
  console.log(new Date().toISOString(), ' - [sonarvio-converter]', stats.toString())
})
