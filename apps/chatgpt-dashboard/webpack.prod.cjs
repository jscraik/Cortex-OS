const { merge } = require('webpack-merge');
const common = require('./webpack.common.cjs');

module.exports = merge(common, {
	mode: 'production',
	devtool: 'source-map',
	performance: {
		maxEntrypointSize: 512 * 1024,
		maxAssetSize: 512 * 1024,
	},
});
