import type { Experiments, SiteAssetsExperimentMetadata } from '@wix/thunderbolt-symbols'
import { beckySpecs, siteAssetsModules } from '@wix/thunderbolt-commons'

export function stringifyExperiments(beckyExperiments: Experiments): string {
	return Object.keys(beckyExperiments)
		.reduce<Array<string>>((acc, key) => {
			const experimentValue = beckyExperiments[key]
			const experimentName = key.replace(/^specs.thunderbolt/, '')
			experimentValue?.toString() === 'true'
				? acc.push(experimentName)
				: acc.push(`${experimentName}:${experimentValue}`)
			return acc
		}, [])
		.sort()
		.join(',')
}

export function filterBeckyExperiments(
	beckyExperiments: Experiments,
	module: string,
	specsMetadata: Record<string, SiteAssetsExperimentMetadata> = beckySpecs
) {
	return Object.entries(beckyExperiments).reduce<Experiments>((acc, [spec, value]) => {
		const metadata: SiteAssetsExperimentMetadata = specsMetadata[spec] || {}
		const modules: Array<string> = metadata.modules || siteAssetsModules
		return modules.includes(module) ? { ...acc, [spec]: value } : acc
	}, {})
}
