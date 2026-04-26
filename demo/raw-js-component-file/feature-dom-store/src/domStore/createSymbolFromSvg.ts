export const replaceSvgWithSymbol = (symbolId: string, svgString: string): string => {
	// First replace svg tags with symbol tags
	let result = svgString.replace(/<svg/, `<symbol id="${symbolId}"`).replace(/<\/svg>\s*$/, '</symbol>')

	// Handle color override for path elements with data-color attributes
	// Match path tags with fill and data-color attributes (in any order)
	result = result.replace(/<path([^>]*?)(\/?)>/g, (match, attributes, selfClosing) => {
		// Check if this path has both fill and data-color attributes
		const fillMatch = attributes.match(/fill="([^"]*)"/)
		const dataColorMatch = attributes.match(/data-color="([^"]*)"/)

		if (fillMatch && dataColorMatch) {
			const fillValue = fillMatch[1]
			const colorIndex = dataColorMatch[1]

			// Remove the data-color attribute and replace fill value
			const newAttributes = attributes
				.replace(/\s*data-color="[^"]*"\s*/, ' ')
				.replace(/fill="[^"]*"/, `fill="var(--svg-color-${colorIndex},${fillValue})"`)
				.replace(/\s+/g, ' ')
				.trim()

			// Use the original self-closing indicator
			return `<path${newAttributes ? ' ' + newAttributes : ''}${selfClosing}>`
		}

		return match
	})

	return result
}
