import { withDependencies } from '@wix/thunderbolt-ioc'
import type { BrowserWindow, IPageDidMountHandler, IPageDidUnmountHandler, Experiments } from '@wix/thunderbolt-symbols'
import { BrowserWindowSymbol, ExperimentsSymbol } from '@wix/thunderbolt-symbols'
import { accessibilityUtils } from './accessibilityUtils'

const accessibilityFactory = (
	window: BrowserWindow,
	experiments: Experiments
): IPageDidMountHandler & IPageDidUnmountHandler => {
	const { addFocusRingAndKeyboardTabbingOnClasses, removeKeyboardTabbingOnClass } = accessibilityUtils(
		window,
		experiments
	)

	return {
		pageDidMount() {
			window!.addEventListener('keydown', addFocusRingAndKeyboardTabbingOnClasses)
			window!.addEventListener('click', removeKeyboardTabbingOnClass)
		},
		pageDidUnmount() {
			window!.removeEventListener('keydown', addFocusRingAndKeyboardTabbingOnClasses)
			window!.removeEventListener('click', removeKeyboardTabbingOnClass)
		},
	}
}

export const Accessibility = withDependencies([BrowserWindowSymbol, ExperimentsSymbol] as const, accessibilityFactory)
