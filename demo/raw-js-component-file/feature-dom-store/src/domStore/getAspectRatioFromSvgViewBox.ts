export const getAspectRatioFromSvgViewBox = (svgString: string) => {
	const viewBox = svgString.match(/viewBox="([^"]+)"/)
	if (!viewBox) {
		return '1/1'
	}
	const [, viewBoxValue] = viewBox
	const [, , width, height] = viewBoxValue.split(/\s+/g)
	return `${width}/${height}`
}
