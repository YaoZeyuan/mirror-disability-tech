import { withDependencies, named } from '@wix/thunderbolt-ioc'
import type { IPageWillMountHandler } from '@wix/thunderbolt-symbols'
import { PageFeatureConfigSymbol } from '@wix/thunderbolt-symbols'
import type { DomStorePageConfig } from '../types'
import { SvgDomStoreLoaderSymbol, name } from '../symbols'

export const DomStorePageWillMount = withDependencies<IPageWillMountHandler>(
	[SvgDomStoreLoaderSymbol, named(PageFeatureConfigSymbol, name)],
	(svgDomStoreLoader, config: DomStorePageConfig) => ({
		name: 'DomStorePageWillMount',
		pageWillMount: async () => {
			await svgDomStoreLoader.loadSvgs(config)
		},
	})
)
