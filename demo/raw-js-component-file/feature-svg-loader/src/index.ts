import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { SvgLoader } from './svgLoader'
import { LifeCycle } from '@wix/thunderbolt-symbols'
import { SvgContentBuilderSymbol } from './symbols'
import { SvgContentBuilder } from './svgContentBuilder'

export const page: ContainerModuleLoader = (bind) => {
	bind(SvgContentBuilderSymbol).to(SvgContentBuilder)
	bind(LifeCycle.PageWillMountHandler).to(SvgLoader)
}
