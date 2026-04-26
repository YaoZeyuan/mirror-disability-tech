import _ from 'lodash'
import type { ComponentType } from 'react'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import type { IStylesStore } from '@wix/thunderbolt-symbols'
import { getFullId, SELECTOR_SEPARATOR } from '@wix/thunderbolt-commons'
import { STYLE_OVERRIDES_ID } from '../symbols'
import Context from './AppContext'

const getSelector = (compIdWithInnerSelector: string) => {
	const [compId, selector] = compIdWithInnerSelector.split(SELECTOR_SEPARATOR)
	return selector ? selector : `#${compId}`
}

const getCompId = (compId: string) => {
	return compId.split(SELECTOR_SEPARATOR)[0]
}

const createCssProperty = (style: Record<string, string>) =>
	Object.entries(style).reduce((styleString, [propName, propValue]) => `${styleString}${propName}:${propValue};`, '')

const createCssRule = (stylesStore: IStylesStore, compIdWithInnerSelector: string) => {
	const compId = getCompId(compIdWithInnerSelector)
	const selector = getSelector(compIdWithInnerSelector)
	const templateCompStyleOverrides = stylesStore.get(getFullId(compIdWithInnerSelector))
	const compStyleOverrides = stylesStore.get(compIdWithInnerSelector)
	const style = _.omitBy({ ...templateCompStyleOverrides, ...compStyleOverrides }, _.isNil) as Record<string, string>
	if (!Object.keys(style).length) {
		return
	}
	return `${selector}{${createCssProperty(style)}}`
}

const calculateCss = (stylesStore: IStylesStore) =>
	Object.keys(stylesStore.getEntireStore())
		.map((compIdWithInnerSelector) => createCssRule(stylesStore, compIdWithInnerSelector))
		.filter((style) => style)
		.join(' ')

const ComponentsStylesOverrides: ComponentType = () => {
	const { styles: stylesStore } = useContext(Context)
	const [, setTick] = useState(0)
	const forceUpdate = useCallback(() => setTick((tick) => tick + 1), [])
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => stylesStore.subscribeToChanges(forceUpdate), [stylesStore])

	const css = calculateCss(stylesStore)
	// TODO - sanitize css, e.g. background-image: url(javascript:alert('Injected'));
	return css ? <style id={STYLE_OVERRIDES_ID} dangerouslySetInnerHTML={{ __html: css }} /> : null
}

export default ComponentsStylesOverrides
