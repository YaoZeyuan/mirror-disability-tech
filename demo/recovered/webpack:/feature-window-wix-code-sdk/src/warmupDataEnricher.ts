import _ from 'lodash'
import { withDependencies } from '@wix/thunderbolt-ioc'
import type { AppsWarmupData, IWindowWixCodeSdkWarmupDataEnricher } from './types'

export const WindowWixCodeWarmupDataEnricher = withDependencies([], (): IWindowWixCodeSdkWarmupDataEnricher => {
	const appsWarmupData: AppsWarmupData = {}

	return {
		setAppWarmupData({ appDefinitionId, key, data }) {
			appsWarmupData[appDefinitionId] = appsWarmupData[appDefinitionId] || {}
			appsWarmupData[appDefinitionId][key] = data
		},

		enrichWarmupData: async () => ({ appsWarmupData }),
	}
})
