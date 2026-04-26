import { withDependencies } from '@wix/thunderbolt-ioc'
import type { IUsedPlatformApis } from './types'

export const UsedPlatformApis = withDependencies([], (): IUsedPlatformApis => {
	const isSSR = !process.env.browser
	const usedPlatformApis: Record<string, boolean> = {}

	return {
		addUsedPlatformApi(moduleName: string) {
			if (isSSR) {
				usedPlatformApis[moduleName] = true
			}
		},
		getUsedPlatformApis() {
			if (isSSR) {
				return Object.keys(usedPlatformApis)
			}
			return JSON.parse(document.getElementById('used-platform-apis-data')?.textContent || '[]')
		},
	}
})
