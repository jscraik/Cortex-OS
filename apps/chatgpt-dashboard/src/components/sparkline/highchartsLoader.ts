let loader: Promise<typeof import('highcharts')> | null = null;

export function loadHighcharts(): Promise<typeof import('highcharts')> {
	if (!loader) {
		loader = import(/* webpackChunkName: "highcharts-core" */ 'highcharts').then((Highcharts) => {
			Highcharts.setOptions({
				credits: { enabled: false },
				lang: { thousandsSep: ',' },
			});
			return Highcharts;
		});
	}

	return loader;
}
