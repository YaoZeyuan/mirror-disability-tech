import { withDependencies } from '@wix/thunderbolt-ioc'
import type { IBodyContent } from '@wix/thunderbolt-symbols'

type BodyContentFactory = () => IBodyContent

const bodyContent: BodyContentFactory = () => {
	const scriptContent: Array<string> = []
	const embeddedContentStart: Array<string> = []
	const embeddedContentEnd: Array<string> = []

	return {
		appendReactScript: (value) => scriptContent.push(value),
		getReactScripts: () => scriptContent.join('\n'),
		setEmbeddedContentStart: (value) => embeddedContentStart.push(value),
		setEmbeddedContentEnd: (value) => embeddedContentEnd.push(value),
		getEmbeddedContentStart: () => embeddedContentStart.join('\n'),
		getEmbeddedContentEnd: () => embeddedContentEnd.join('\n'),
	}
}

export const BodyContent = withDependencies([], bodyContent)
