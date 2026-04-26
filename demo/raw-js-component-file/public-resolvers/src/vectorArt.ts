import type { VectorArt } from '@wix/builder-schemas'

const SVG_TYPES = {
	SHAPE: 'shape' as const,
	UGC: 'ugc' as const,
}

const attributesRegexes = {
	fill: /fill="(.*?)"/g,
	'data-color': /data-color="(.*?)"/g,
	'data-type': /data-type="(.*?)"/g,
	'data-bbox': /data-bbox="(.*?)"/g,
	width: /width="(.*?)"/g,
	height: /height="(.*?)"/g,
	viewBox: /viewBox="(.*?)"/g,
}

const elementsRegexes = {
	svg: /(<svg(.*?)>)/g,
	path: /(<path(.*?)>)/g,
}

const getAll = (str: string, regex: RegExp, defaultValue?: string): Array<string> => {
	const match = regex.exec(str)
	if (match) {
		return [match[1], ...getAll(str, regex, defaultValue)]
	}
	return defaultValue ? [defaultValue] : []
}

const getUGCViewBox = (contentType: VectorArt['contentType'], svgNode: string) => {
	if (contentType === SVG_TYPES.UGC) {
		const [width] = getAll(svgNode, attributesRegexes.width)
		const [height] = getAll(svgNode, attributesRegexes.height)
		if (width && height) {
			return `0 0 ${width} ${height}`
		}
	}
	return ''
}

const getColors = (nodes: Array<string>) =>
	nodes.reduce((colors: { [k: string]: string }, node: string) => {
		const [dataColor] = getAll(node, attributesRegexes['data-color'])
		const [fill] = getAll(node, attributesRegexes.fill)
		colors[`color${dataColor}`] = fill
		return colors
	}, {})

const parseSvgString = (svgString: string) => {
	const [svgNode] = getAll(svgString, elementsRegexes.svg)
	const pathNodes = getAll(svgString, elementsRegexes.path)

	const [contentType] = getAll(svgNode, attributesRegexes['data-type'], SVG_TYPES.SHAPE)
	const [viewBox] = getAll(svgNode, attributesRegexes.viewBox).concat([
		getUGCViewBox(contentType as VectorArt['contentType'], svgNode),
	])
	const [contentBox] = getAll(svgNode, attributesRegexes['data-bbox'])
	const colors = getColors(pathNodes)

	const info = {
		colors,
		contentType: contentType as VectorArt['contentType'],
		viewBox,
		contentBox: contentBox || '',
	}

	return {
		svgContent: svgString,
		info,
	}
}

export type VectorArtResolver = (svgString: string, svgId: string) => VectorArt
export const resolveVectorArt: VectorArtResolver = (svgString, svgId) => {
	const { info, svgContent } = parseSvgString(svgString)
	const { colors, contentType, viewBox, contentBox } = info
	return {
		uri: svgId,
		viewBox,
		contentBox,
		colors,
		contentType,
		svgContent,
	}
}
