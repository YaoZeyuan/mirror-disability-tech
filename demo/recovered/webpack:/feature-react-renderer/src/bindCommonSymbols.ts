import type { Bind } from '@wix/thunderbolt-ioc'
import {
	LifeCycle,
	HeadContentSymbol,
	ComponentsStylesOverridesSymbol,
	RendererPropsExtenderSym,
	RegisterToUnmountSym,
	BodyContentSymbol,
	HeadContentProviderSymbol,
} from '@wix/thunderbolt-symbols'
import { RendererPropsProviderSym } from '.'
import { PageMountUnmountSubscriber } from './clientRenderer/pageMountUnmountSubscriber'
import { ComponentsStylesOverrides } from './ComponentsStylesOverrides'
import {
	GeneralHeadContentProvider,
	HeadContent,
	PageCssHeadContentProvider,
	ScriptPreloadHeadContentProvider,
} from './HeadContent'
import { BodyContent } from './BodyContent'
import { RendererPropsProvider } from './RendererPropsProvider'
import { DeletedCompPropsProvider } from './components/DeletedComponent'

export const bindCommonSymbols = (bind: Bind, isBrowser = true) => {
	if (isBrowser) {
		bind(RegisterToUnmountSym, LifeCycle.AppWillLoadPageHandler).to(PageMountUnmountSubscriber)
	} else {
		bind(RegisterToUnmountSym).toConstantValue({ registerToUnmount: () => {} })
	}

	bind(RendererPropsProviderSym).to(RendererPropsProvider)
	bind(HeadContentSymbol).to(HeadContent)
	bind(BodyContentSymbol).to(BodyContent)

	bind(ComponentsStylesOverridesSymbol).to(ComponentsStylesOverrides)
	bind(RendererPropsExtenderSym).to(DeletedCompPropsProvider)

	// HeadContent providers
	bind(HeadContentProviderSymbol).to(PageCssHeadContentProvider)
	bind(HeadContentProviderSymbol).to(ScriptPreloadHeadContentProvider)
	bind(HeadContentProviderSymbol).to(GeneralHeadContentProvider)
}
