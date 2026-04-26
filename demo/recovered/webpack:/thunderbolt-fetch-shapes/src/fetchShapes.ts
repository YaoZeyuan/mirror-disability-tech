import type { FetchFn } from '@wix/thunderbolt-symbols'
import type { MetricsReporter } from '@wix/thunderbolt-becky-types'

export type BuildSvgUrl = (mediaRootUrl: string, svgId: string) => string

const fallbackSvg = (shapeId: string) => `<svg data-svg-id="fallback-${shapeId}" />`

export const fetchShape = async (
	shapeId: string,
	fetchFn: FetchFn,
	mediaRootUrl: string,
	buildSvgUrl: BuildSvgUrl,
	metricsReporter: Pick<MetricsReporter, 'reportError'>
): Promise<string> => {
	const shapeUrl = buildSvgUrl(mediaRootUrl, shapeId)

	const shapeContent = await fetchFn(shapeUrl)
		.then((resp: Response) => (resp.ok ? resp.text() : fallbackSvg(shapeId)))
		.catch((e) => {
			metricsReporter.reportError(e)
			return fallbackSvg(shapeId)
		})

	return shapeContent
}

export const fetchShapes = async (
	shapeIds: Array<string> | undefined,
	fetchFn: FetchFn,
	mediaRootUrl: string,
	buildSvgUrl: BuildSvgUrl,
	metricsReporter: MetricsReporter
): Promise<Record<string, string>> => {
	if (!shapeIds || !shapeIds.length) {
		return {}
	}

	const shapesEntries = await Promise.all(
		shapeIds.map(async (shapeId) => [
			shapeId,
			await fetchShape(shapeId, fetchFn, mediaRootUrl, buildSvgUrl, metricsReporter),
		])
	)

	return Object.fromEntries(shapesEntries)
}
