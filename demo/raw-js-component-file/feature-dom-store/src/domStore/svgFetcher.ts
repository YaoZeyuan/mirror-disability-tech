import { vectorImage } from '@wix/thunderbolt-commons'
import { optional, withDependencies } from '@wix/thunderbolt-ioc'
import type { IFetchApi, ViewerModel } from '@wix/thunderbolt-symbols'
import { Fetch, MetricsReporterSym, ViewerModelSym } from '@wix/thunderbolt-symbols'
import { fetchShape } from '@wix/thunderbolt-fetch-shapes'
import type { MetricsReporter } from '@wix/thunderbolt-becky-types'
import type { ISvgFetcher } from '../types'

const { buildSvgUrl } = vectorImage.buildSvgUrlFactory()

export const SvgFetcher = withDependencies<ISvgFetcher>(
	[Fetch, ViewerModelSym, optional(MetricsReporterSym)] as const,
	(fetchApi: IFetchApi, viewerModel: ViewerModel, metricsReporter?: MetricsReporter) => {
		return {
			fetchSvg: (svgId: string) =>
				fetchShape(
					svgId,
					fetchApi.envFetch,
					viewerModel.media.mediaRootUrl,
					buildSvgUrl,
					metricsReporter || { reportError: console.error }
				),
		}
	}
)
