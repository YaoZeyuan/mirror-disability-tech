import { withDependencies } from '@wix/thunderbolt-ioc'
import type { ISvgDomStoreLoader } from '../types'
import { DomStoreSymbol, SvgFetcherSymbol } from '../symbols'
import { replaceSvgWithSymbol } from './createSymbolFromSvg'
import _ from 'lodash'
import { getAspectRatioFromSvgViewBox } from './getAspectRatioFromSvgViewBox'

export const SvgDomStoreLoader = withDependencies<ISvgDomStoreLoader>(
	[SvgFetcherSymbol, DomStoreSymbol] as const,
	(svgFetcher, domStore) => {
		return {
			async loadSvgs(config) {
				const svgs = _.flatMap(config, (compSvgs) => compSvgs)

				const fetchAndAddToDomStore = svgs.map(async (svgId) => {
					if (domStore.hasElementId(svgId)) {
						return
					}

					const svgString = await svgFetcher.fetchSvg(svgId)

					// double check to make sure the svg was not added to the dom store in the meantime
					if (domStore.hasElementId(svgId)) {
						return
					}

					const arId = `ar-${svgId.replaceAll('.', '-')}`
					const ar = getAspectRatioFromSvgViewBox(svgString)

					domStore.addHtml(svgId, replaceSvgWithSymbol(svgId, svgString))
					domStore.addHtml(arId, `<style id="${arId}">.${arId}{aspect-ratio:${ar}}</style>`)
				})

				await Promise.all(fetchAndAddToDomStore)
			},
		}
	}
)
