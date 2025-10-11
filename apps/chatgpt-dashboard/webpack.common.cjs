const path = require('node:path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const OUTPUT_DIR = path.resolve(__dirname, '../../dist/apps/chatgpt-dashboard');

module.exports = {
	entry: path.resolve(__dirname, 'src/index.tsx'),
	output: {
		filename: 'assets/[name].[contenthash].js',
		path: OUTPUT_DIR,
		publicPath: '/apps/chatgpt-dashboard/',
		clean: true,
	},
	resolve: {
		extensions: ['.ts', '.tsx', '.js', '.jsx'],
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				exclude: /node_modules/,
				use: {
					loader: 'ts-loader',
					options: {
						transpileOnly: true,
					},
				},
			},
			{
				test: /\.css$/i,
		use: [
			'style-loader',
			{
				loader: 'css-loader',
				options: {
					importLoaders: 1,
				},
			},
			'postcss-loader',
		],
			},
		],
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: path.resolve(__dirname, 'src/index.html'),
			scriptLoading: 'module',
			favicon: false,
		}),
	],
};
