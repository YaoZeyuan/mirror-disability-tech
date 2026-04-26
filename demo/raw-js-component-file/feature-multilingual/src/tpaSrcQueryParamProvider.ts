import { withDependencies } from '@wix/thunderbolt-ioc'
import { MultilingualSymbol } from './symbols'
import type { IMultilingual, ITpaSrcQueryParamProvider } from '@wix/thunderbolt-symbols'
import _ from 'lodash'

export const MultilingualTpaSrcQueryParamProvider = withDependencies(
	[MultilingualSymbol],
	(multiLingual: IMultilingual): ITpaSrcQueryParamProvider => ({
		getQueryParams() {
			return {
				lang: multiLingual.currentLanguage?.languageCode,
				dateNumberFormat: multiLingual.currentLanguage?.locale,
				isPrimaryLanguage: !_.isNil(multiLingual.isOriginalLanguage) ? `${multiLingual.isOriginalLanguage}` : null,
			}
		},
	})
)
