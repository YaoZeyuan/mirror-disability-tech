import type { ReporterState } from '.'
import type { IFeatureState } from 'thunderbolt-feature-state'
import type { IConsentPolicy } from 'feature-consent-policy'

export const setState = (featureState: IFeatureState<ReporterState>, partialState = {}) =>
	featureState.update((prevState: any) => Object.assign(prevState || {}, partialState))

export const isUserConsentProvided = (consentPolicy: IConsentPolicy) => {
	const currentPolicy = consentPolicy.getCurrentConsentPolicy()?.policy
	return currentPolicy?.analytics || currentPolicy?.advertising
}
