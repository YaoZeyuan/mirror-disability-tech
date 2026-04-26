import _ from 'lodash'
import { withDependencies } from '@wix/thunderbolt-ioc'
import type { IPropsStore } from '@wix/thunderbolt-symbols'
import { CurrentRouteInfoSymbol, Props } from '@wix/thunderbolt-symbols'
import type { ICurrentRouteInfo } from 'feature-router'
import type { MasterPageTpaPropsCache } from './types'

export const TpaPropsCacheFactory = withDependencies(
	[Props, CurrentRouteInfoSymbol],
	(props: IPropsStore, currentRouteInfo: ICurrentRouteInfo): MasterPageTpaPropsCache => {
		const cache: { [compId: string]: any } = {}

		return {
			cacheProps(compId: string, data?: any) {
				const propsToCache = _.omitBy(data || props.get(compId), _.isFunction)
				cache[compId] = _.isEmpty(propsToCache) ? null : propsToCache
			},
			getCachedProps(compId: string) {
				const cachedProps = cache[compId]
				if (!cachedProps) {
					return
				}

				if (
					!_.isEqual(
						currentRouteInfo.getCurrentRouteInfo()?.dynamicRouteData?.publicData,
						currentRouteInfo.getPreviousRouterInfo()?.dynamicRouteData?.publicData
					)
				) {
					delete cachedProps.src
				}
				return cachedProps
			},
		}
	}
)
