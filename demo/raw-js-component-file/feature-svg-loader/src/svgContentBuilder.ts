import { named, withDependencies } from '@wix/thunderbolt-ioc'
import type { BrowserWindow, Experiments, IFetchApi } from '@wix/thunderbolt-symbols'
import {
	Fetch,
	LoggerSymbol,
	PageFeatureConfigSymbol,
	BrowserWindowSymbol,
	ExperimentsSymbol,
} from '@wix/thunderbolt-symbols'
import { DomSelectorsSymbol } from 'feature-dom-selectors'
import type { IDomSelectors } from 'feature-dom-selectors'
import { vectorImage } from '@wix/thunderbolt-commons'
import { name } from './symbols'
import type { ILogger } from '@wix/thunderbolt-types'
import type { ISvgContentBuilder, SvgLoaderPageConfig } from './types'
import { SVG_ID_ATTRIBUTE } from './constants'
import { addDataAttrToSvg } from './helpers'

export const SvgContentBuilder = withDependencies(
	[
		named(PageFeatureConfigSymbol, name),
		Fetch,
		LoggerSymbol,
		BrowserWindowSymbol,
		ExperimentsSymbol,
		DomSelectorsSymbol,
	],
	(
		pageFeatureConfig: SvgLoaderPageConfig,
		fetchAPI: IFetchApi,
		logger: ILogger,
		window: BrowserWindow,
		experiments: Experiments,
		domSelectors: IDomSelectors
	): ISvgContentBuilder => {
		const shouldGetSvgFromNetwork = Boolean(experiments['specs.thunderbolt.fetchSVGfromNetworkInCSR'])
		const { buildSvgUrl } = vectorImage.buildSvgUrlFactory()
		const getSvgFromNetwork: ISvgContentBuilder['getSvgFromNetwork'] = async ({
			svgId,
			transformationOptions,
			compId,
			componentType,
		}) => {
			const url = buildSvgUrl(pageFeatureConfig.mediaRootUrl, svgId)
			const logErrorAndReturnFallbackSvg = (error: any) => {
				logger?.captureError(error, {
					tags: { feature: 'svgContentBuilder', compId },
				})
				return {
					svgStringResult: `<svg data-svg-id="fallback-${svgId}" />`,
				}
			}
			try {
				const svgStringRes = await fetchAPI.envFetch(url)
				if (!svgStringRes.ok) {
					const errorText = await svgStringRes.text()
					return logErrorAndReturnFallbackSvg(errorText)
				}
				const rawSvgString = await svgStringRes.text()
				const { info: svgInfo } = vectorImage.parseSvgString(rawSvgString, svgId)
				const svgStringResult = transformationOptions
					? vectorImage.transformVectorImage(rawSvgString, {
							...transformationOptions,
							svgId,
							compId,
							svgInfo,
							colorsMap: pageFeatureConfig.colorsMap,
						})
					: rawSvgString
				const finalSvgStringResult = shouldGetSvgFromNetwork
					? svgStringResult
					: addDataAttrToSvg(svgStringResult, svgId)
				return {
					svgStringResult:
						componentType === 'BackToTopButton'
							? vectorImage.removeWidthAndHeight(finalSvgStringResult)
							: finalSvgStringResult,
					svgInfo,
				}
			} catch (e) {
				return logErrorAndReturnFallbackSvg(e)
			}
		}

		const getSvgFromDOM: ISvgContentBuilder['getSvgFromDOM'] = async ({
			compId,
			svgId,
			componentType,
			transformationOptions,
		}) => {
			const compElement = domSelectors.getByCompId(compId)
			if (compElement) {
				const svgElements = compElement.querySelectorAll('svg')
				for (const element of Array.from(svgElements)) {
					const wixShapeId = element.getAttribute(SVG_ID_ATTRIBUTE)
					if (wixShapeId === svgId) {
						const svgStringResult = (element as Element).outerHTML
						const { info: svgInfo } = vectorImage.parseSvgString(svgStringResult, svgId)
						return { svgStringResult, svgInfo }
					}
				}
			}
			// fallback - get svg from network
			return await getSvgFromNetwork({ svgId, compId, componentType, transformationOptions })
		}

		return { getSvgFromNetwork, getSvgFromDOM }
	}
)
