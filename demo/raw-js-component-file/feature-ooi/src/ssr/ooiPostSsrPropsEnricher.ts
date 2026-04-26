import _ from 'lodash'
import { withDependencies } from '@wix/thunderbolt-ioc'
import type { IAppWillRenderFirstPageHandler, IAppDidMountHandler, IPropsStore } from '@wix/thunderbolt-symbols'
import { Props } from '@wix/thunderbolt-symbols'
import type { IWarmupDataProvider } from 'feature-warmup-data'
import { WarmupDataProviderSymbol } from 'feature-warmup-data'
import type { OOIWarmupData } from '../types'

export default withDependencies<IAppDidMountHandler & IAppWillRenderFirstPageHandler>(
	[WarmupDataProviderSymbol, Props],
	(warmupDataProvider: IWarmupDataProvider, props: IPropsStore) => ({
		appWillRenderFirstPage: async () => {
			const ooiWarmupData = await warmupDataProvider.getWarmupData<OOIWarmupData>('ooi')
			_.forEach(ooiWarmupData?.failedInSsr, (__, compId) => {
				props.update({
					[compId]: {
						__VIEWER_INTERNAL: {
							failedInSsr: true,
						},
					},
				})
			})
		},
		appDidMount: async () => {
			const ooiWarmupData = await warmupDataProvider.getWarmupData<OOIWarmupData>('ooi')
			_.forEach(ooiWarmupData?.failedInSsr, (__, compId) => {
				props.update({
					[compId]: {
						__VIEWER_INTERNAL: {},
					},
				})
			})
		},
	})
)
