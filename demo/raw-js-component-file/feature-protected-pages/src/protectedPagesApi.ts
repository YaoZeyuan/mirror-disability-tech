import type { IProtectedPagesApi, PagesMap, ProtectedPagesState } from './types'
import type { IFeatureState } from 'thunderbolt-feature-state'
import { withDependencies, named } from '@wix/thunderbolt-ioc'
import { FeatureStateSymbol } from '@wix/thunderbolt-symbols'
import { name } from './symbols'

function protectedPagesApi(featureState: IFeatureState<ProtectedPagesState>): IProtectedPagesApi {
	return {
		getPageJsonFileName(pageId: string): string | null {
			return featureState.get()?.pagesMap[pageId] ?? null
		},
		getProtectedPages(): Readonly<PagesMap> {
			return { ...(featureState.get()?.pagesMap ?? {}) }
		},
	}
}

export const ProtectedPagesApi = withDependencies([named(FeatureStateSymbol, name)], protectedPagesApi)
