import type { SvgInfo } from '@wix/thunderbolt-commons'
import type { SvgLoaderProps, SvgStringPropKeys, SvgStringResultAndInfo, SvgContentBuilder } from './types'
import { SVG_TYPES, SVG_ID_ATTRIBUTE } from './constants'
import { resolveVectorArt } from '@wix/public-resolvers'
import type { IPropsStore, SvgLoaderComponentTypes } from '@wix/thunderbolt-symbols'
import _ from 'lodash'
import type { VectorArtDataItem } from '@wix/thunderbolt-becky-root'

export const updateSvgProps = (compId: string, svgLoaderProps: SvgLoaderProps, propsStore: IPropsStore) => {
	propsStore.update<Record<string, SvgLoaderProps>>({
		[compId]: svgLoaderProps,
	})
}

const isUGCtype = ({ svgType }: SvgInfo) => svgType === SVG_TYPES.UGC

/**
 * Some components use different prop names for the svg string content.
 */
const getSvgPropKeyFromCompType = (compType: SvgLoaderComponentTypes): SvgStringPropKeys => {
	switch (compType) {
		case 'VectorImage':
			return 'svgContent'
		case 'BackToTopButton':
			return 'svgContent'
		case 'Breadcrumbs':
			return 'svgString'
		default:
			console.error(`Passing an unsupported component type to svgLoader: ${compType}`)
			return 'svgContent'
	}
}

export const createSvgProps = (
	componentType: SvgLoaderComponentTypes,
	{ svgStringResult, svgInfo }: SvgStringResultAndInfo
) => {
	const svgStringPropName = getSvgPropKeyFromCompType(componentType)
	const shouldScaleStroke = svgInfo ? { shouldScaleStroke: isUGCtype(svgInfo) } : {}

	return {
		[svgStringPropName]: svgStringResult,
		...shouldScaleStroke, // only update shouldScaleStroke if svgInfo is was passed
	} as SvgLoaderProps
}

export const addDataAttrToSvg = (svgContent: string, shapeId: string) => {
	const svgTagMatch = svgContent?.match(/<svg\b[^>]*>/i)
	if (!svgTagMatch) {
		return svgContent
	}

	const svgTag = svgTagMatch[0]
	const newSvgTag = svgTag.replace(/\s*\/?>$/, (closing) => {
		const isSelfClosing = closing.includes('/')
		return ` ${SVG_ID_ATTRIBUTE}="${shapeId}"${isSelfClosing ? '/>' : '>'}`
	})
	return svgContent.replace(svgTag, newSvgTag)
}

export async function resolveVectorArtInProps(
	props: Record<string, any>,
	pathsToVectorArtsInProps: Array<string>,
	runSvgContentBuilder: SvgContentBuilder,
	compId: string
): Promise<void> {
	await Promise.all(
		pathsToVectorArtsInProps.map(async (path) => {
			const unresolvedVectorArt = _.get(props, path) as VectorArtDataItem
			const svgId = unresolvedVectorArt.uri
			const { svgStringResult } = await runSvgContentBuilder({ svgId, compId, componentType: 'Builder' })
			const resolvedVectorArt = resolveVectorArt(svgStringResult, svgId)
			_.set(props, path, resolvedVectorArt)
		})
	)
}
