import _ from 'lodash'
import { HTMLParser } from '@wix/thunderbolt-becky-root'
import { BOTTOM_ANCHOR, TOP_ANCHOR } from './constants'
import { named, withDependencies } from '@wix/thunderbolt-ioc'
import type { IPropsStore } from '@wix/thunderbolt-symbols'
import { PageFeatureConfigSymbol, Props } from '@wix/thunderbolt-symbols'
import type { LinkBarProps, QuickActionBarItemProps } from '@wix/thunderbolt-components'
import type { ISamePageAnchorPropsResolver, ScrollToAnchorPageConfig } from './types'
import type { IUrlHistoryManager } from 'feature-router'
import { UrlHistoryManagerSymbol, getUrlHash } from 'feature-router'
import type { LinkProps, ImageProps, MenuItemProps } from '@wix/thunderbolt-becky-types'
import { name } from './symbols'

const getIsTopBottomAnchor = (name: string, value: string, isBuilderComponentModel: boolean) => {
	if (isBuilderComponentModel) {
		const urlHash = getUrlHash(value || '')
		return name === 'href' && (urlHash === BOTTOM_ANCHOR || urlHash === TOP_ANCHOR)
	}
	return name === 'data-anchor' && (value === BOTTOM_ANCHOR || value === TOP_ANCHOR)
}

export const SamePageAnchorPropsResolver = withDependencies(
	[Props, UrlHistoryManagerSymbol, named(PageFeatureConfigSymbol, name)],
	(
		propsStore: IPropsStore,
		urlHistoryManager: IUrlHistoryManager,
		{ isBuilderComponentModel }: ScrollToAnchorPageConfig
	): ISamePageAnchorPropsResolver => {
		const getQABUpdatedProps = (compId: string, fullUrl: string, parentId: string) => {
			const currentActionBarItems = propsStore.get(parentId).items
			const updatedItems = currentActionBarItems.map((item: QuickActionBarItemProps) =>
				item.compId === compId
					? {
							...item,
							link: { ...item.link, href: fullUrl },
						}
					: item
			)

			return {
				items: updatedItems,
			}
		}

		const getWRichTextUpdatedProps = (compId: string, fullUrl: string) => {
			const currentHTML = propsStore.get(compId).html
			const updatedAnchorTags: Map<string, string> = new Map()
			let htmlWithUpdatedLinks = currentHTML

			try {
				HTMLParser(currentHTML, {
					start(tagName, attributes, unary, tag) {
						if (tagName === 'a') {
							const shouldUpdateAnchorHref = Boolean(
								_.find(attributes, (attribute) => {
									const { name, value } = attribute
									const isTopBottomAnchor = getIsTopBottomAnchor(name || '', value || '', isBuilderComponentModel)
									const currentInnerRouteHref = name === 'href' && value?.endsWith('/CURRENT_INNER_ROUTE')
									return isTopBottomAnchor || currentInnerRouteHref
								})
							)

							if (shouldUpdateAnchorHref) {
								const updatedTag = tag.replace(/href="(.*?)"/, `href="${_.escape(fullUrl)}"`)
								updatedAnchorTags.set(tag, updatedTag)
							}
						}
					},
				})

				if (updatedAnchorTags.size > 0) {
					const tagsToUpdate = [...updatedAnchorTags.keys()]
					const anchorReplacerRegex = new RegExp(tagsToUpdate.join('|'), 'g')
					htmlWithUpdatedLinks = currentHTML.replace(anchorReplacerRegex, (match: string) =>
						updatedAnchorTags.get(match)
					)
				}
			} catch (e) {
				// TODO handle thrown error
			}

			return {
				html: htmlWithUpdatedLinks,
			}
		}

		const getFixedLinkItem = <T extends { link?: LinkProps }>(item: T, fullUrl: string): T => {
			const anchorDataId = ((item?.link?.anchorDataId as { id: string })?.id || item?.link?.anchorDataId) as string
			const isTopBottomAnchor = ['SCROLL_TO_TOP', 'SCROLL_TO_BOTTOM'].includes(anchorDataId || '')
			const isDynamicPageCurrentInnerRoute = item?.link?.href?.endsWith('/CURRENT_INNER_ROUTE')
			// @ts-expect-error
			const pageId = (item?.link?.pageId?.id || item?.link?.pageId)?.replace('#', '')
			const useFullUrl = (isTopBottomAnchor && pageId === 'masterPage') || isDynamicPageCurrentInnerRoute

			return {
				...item,
				...(useFullUrl ? { link: { ...item.link, href: fullUrl } } : { link: item.link }),
			}
		}

		const fixMenuItem = (item: MenuItemProps, fullUrl: string): MenuItemProps => ({
			...getFixedLinkItem<MenuItemProps>(item, fullUrl),
			...(item.items && { items: item.items.map((menuItem) => fixMenuItem(menuItem, fullUrl)) }),
		})

		const getMenuUpdatedProps = (compId: string, fullUrl: string) => {
			const compProps = propsStore.get(compId)
			const currentMenuItems = compProps.items || compProps.options
			const updatedItems = currentMenuItems.map((item: MenuItemProps) => fixMenuItem(item, fullUrl))

			return {
				items: updatedItems,
			}
		}

		const getLinkBarUpdatedProps = (compId: string, fullUrl: string) => {
			const compProps = propsStore.get(compId) as LinkBarProps
			const currentImages = compProps.images
			const updatedImages = currentImages.map((item: ImageProps) => getFixedLinkItem<ImageProps>(item, fullUrl))

			return {
				images: updatedImages,
			}
		}

		const compTypeToPropsResolver: Record<
			string,
			(compId: string, fullUrl: string, parentId: string) => Record<string, any>
		> = {
			QuickActionBarItem: (compId, fullUrl, parentId) => getQABUpdatedProps(compId, fullUrl, parentId),
			DropDownMenu: (compId, fullUrl) => getMenuUpdatedProps(compId, fullUrl),
			ExpandableMenu: (compId, fullUrl) => getMenuUpdatedProps(compId, fullUrl),
			WRichText: (compId, fullUrl) => getWRichTextUpdatedProps(compId, fullUrl),
			VerticalMenu: (compId, fullUrl) => getMenuUpdatedProps(compId, fullUrl),
			StylableHorizontalMenu: (compId, fullUrl) => getMenuUpdatedProps(compId, fullUrl),
			Menu: (compId, fullUrl) => getMenuUpdatedProps(compId, fullUrl),
			LinkBar: (compId, fullUrl) => getLinkBarUpdatedProps(compId, fullUrl),
		}

		return {
			getPropsOverrides: ({ compId, compType, parentId }) => {
				const fullUrl = urlHistoryManager.getFullUrlWithoutQueryParams()
				const isQABItem = compType === 'QuickActionBarItem'
				const targetCompIdForPropsUpdate = isQABItem ? parentId : compId
				const compProps = propsStore.get(targetCompIdForPropsUpdate)
				const propsResolver = compTypeToPropsResolver[compType]
				const pageId = (compProps.link?.pageId?.id || compProps.link?.pageId)?.replace('#', '')
				const updatedCompProps = propsResolver
					? propsResolver(compId, fullUrl, parentId)
					: {
							link: {
								...compProps.link,
								href:
									pageId === 'masterPage' || compProps.link?.type === 'DynamicPageLink'
										? fullUrl
										: compProps.link?.href,
							},
						}

				return {
					[targetCompIdForPropsUpdate]: updatedCompProps,
				}
			},
		}
	}
)
