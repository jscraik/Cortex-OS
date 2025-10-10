const { merge } = require('webpack-merge');
const path = require('node:path');
const common = require('./webpack.common.cjs');

module.exports = merge(common, {
	mode: 'development',
	devtool: 'eval-source-map',
	devServer: {
		static: {
			directory: path.resolve(__dirname, 'public'),
		},
		port: 5175,
		hot: true,
		historyApiFallback: true,
		allowedHosts: 'all',
	},
});
