/**
 * Build
 * =====
 *
 *
 */

var path = require('path')

var webpack = require('webpack')
var HTMLWebpackPlugin = require('html-webpack-plugin')

var manifest = require('./package.json')

var env = {
  ENTRY_FILE: path.resolve(__dirname, 'src/index.js'),
  PROXY_ENTRY_FILE: path.resolve(__dirname, 'src/proxy/index.js'),
  SOURCE_DIRECTORY: path.resolve(__dirname, 'src'),
  DIST_DIRECTORY: path.resolve(__dirname, path.dirname(manifest.main)),
  FILE_NAME: path.basename(manifest.main, path.extname(manifest.main)),
  EXPORT_NAME: 'Converter'
}


var config = {
  target: 'web',
  devtool: 'eval',
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
  plugins: [
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin({
      // sourceMap: false,
      compress: {
        warnings: false
      }
    })
  ],
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
  }
}

webpack(config).watch(100, notify)

// defer all beween production and not ! ()
// devtool: 'source-map',  // -> dont use eval in production !

var proxyConfig = {
  target: 'web',
  // devtool: 'eval',
  devtool: 'source-map',  // -> dont use eval in production !
  entry: [
    env.PROXY_ENTRY_FILE
  ],
  output: {
    path: env.DIST_DIRECTORY + '/proxy',
    filename: 'proxy.js'
  },
  resolve: {
    extensions: ['', '.js']
  },
  plugins: [
    new HTMLWebpackPlugin({
      filename: 'proxy.html',
      templateContent: '<script src="proxy.js"></script>',
    }),
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin({
      // sourceMap: false,
      compress: {
        warnings: false
      }
    })
  ],
  module: {
    loaders: [
      {
        test: /\.js$/,
        include: env.SOURCE_DIRECTORY,
        loader: 'babel',
        query: {
          // optional: ['runtime'],
          stage: 0
        }
      }
    ]
  }
}

webpack(proxyConfig).watch(100, notify)


function notify (error, stats) {
  if (error) {
    return console.error(error)
  }
  console.log(new Date().toISOString(), ' - [sonarvio-converter]', stats.toString())
}
