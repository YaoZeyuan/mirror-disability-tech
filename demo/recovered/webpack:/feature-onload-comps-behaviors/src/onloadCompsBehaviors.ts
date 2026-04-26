import _ from 'lodash'
import { withDependencies, named } from '@wix/thunderbolt-ioc'
import type { IPageWillMountHandler, IComponentsStylesOverrides } from '@wix/thunderbolt-symbols'
import { PageFeatureConfigSymbol, ComponentsStylesOverridesSymbol } from '@wix/thunderbolt-symbols'
import type { OnloadCompsBehaviorsPageConfig } from './types'
import { name } from './symbols'
import { createStyleUtils } from '@wix/thunderbolt-commons'

const onloadCompsBehaviorsFactory = (
	pageFeatureConfig: OnloadCompsBehaviorsPageConfig,
	componentsStylesOverrides: IComponentsStylesOverrides
): IPageWillMountHandler => {
	return {
		name: 'onloadCompsBehaviors',
		pageWillMount() {
			const { compsBehaviors } = pageFeatureConfig

			const responsiveStyleUtils = createStyleUtils({ isResponsive: true })
			const nonResponsiveStyleUtils = createStyleUtils({ isResponsive: false })

			const styleOverrides = _.mapValues(compsBehaviors, ({ collapseOnLoad, hiddenOnLoad, isResponsiveComponent }) => {
				const styleUtils = isResponsiveComponent ? responsiveStyleUtils : nonResponsiveStyleUtils
				const styles = {}
				if (collapseOnLoad) {
					Object.assign(styles, styleUtils.getCollapsedStyles())
				}
				if (hiddenOnLoad) {
					Object.assign(styles, styleUtils.getHiddenStyles())
				}
				return styles
			})

			componentsStylesOverrides.update(styleOverrides)
		},
	}
}

export const OnloadCompsBehaviors = withDependencies(
	[named(PageFeatureConfigSymbol, name), ComponentsStylesOverridesSymbol],
	onloadCompsBehaviorsFactory
)
