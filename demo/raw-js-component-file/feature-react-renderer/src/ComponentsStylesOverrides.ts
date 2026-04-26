import type { IComponentsStylesOverrides, IStylesStore } from '@wix/thunderbolt-symbols'
import { StylesStoreSymbol } from '@wix/thunderbolt-symbols'
import { withDependencies } from '@wix/thunderbolt-ioc'
import { SELECTOR_SEPARATOR } from '@wix/thunderbolt-commons'

const ComponentsStylesOverridesFactory = (stylesStore: IStylesStore): IComponentsStylesOverrides => {
	return {
		getCompStyle: (compId) => stylesStore.get(compId),
		isHidden: (compId) => {
			const compStyle = stylesStore.get(compId)
			return Boolean(compStyle?.visibility?.includes('hidden'))
		},
		update: (overrideStyles) => stylesStore.update(overrideStyles),
		set: (styles) => stylesStore.set(styles),
		getKey: (compId, selector) => `${compId}${selector ? SELECTOR_SEPARATOR + selector : ''}`,
	}
}

export const ComponentsStylesOverrides = withDependencies([StylesStoreSymbol], ComponentsStylesOverridesFactory)
