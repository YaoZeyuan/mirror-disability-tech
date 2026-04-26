import type { FeaturesLoaders } from '@wix/thunderbolt-features'

export const featuresLoaders: Partial<FeaturesLoaders> = {
	router: () => import('feature-router' /* webpackChunkName: "router" */),
	landingPage: () => import('feature-landing-page' /* webpackChunkName: "landingPage" */),
	animations: () => import('feature-animations' /* webpackChunkName: "animations" */),
	backgroundScrub: () => import('feature-background-scrub' /* webpackChunkName: "backgroundScrub" */),
	tinyMenu: () => import('feature-tiny-menu' /* webpackChunkName: "tinyMenu" */),
	siteWixCodeSdk: () => import('feature-site-wix-code-sdk' /* webpackChunkName: "siteWixCodeSdk" */),
	lightbox: () => import('feature-lightbox' /* webpackChunkName: "popups" */),
	windowWixCodeSdk: () => import('feature-window-wix-code-sdk' /* webpackChunkName: "windowWixCodeSdk" */),
	editorWixCodeSdk: () => import('feature-editor-wix-code-sdk' /* webpackChunkName: "editorWixCodeSdk" */),
	seo: () => import('feature-seo' /* webpackChunkName: "seo" */),
	domSelectors: () => import('feature-dom-selectors' /* webpackChunkName: "domSelectors" */),
	locationWixCodeSdk: () => import('feature-location-wix-code-sdk' /* webpackChunkName: "locationWixCodeSdk" */),
	siteMembers: () => import('feature-site-members' /* webpackChunkName: "siteMembers" */),
	siteScrollBlocker: () => import('feature-site-scroll-blocker' /* webpackChunkName: "siteScrollBlocker" */),
	pageTransitions: () => import('feature-page-transitions' /* webpackChunkName: "pageTransitions" */),
	usedPlatformApis: () => import('feature-used-platform-apis' /* webpackChunkName: "usedPlatformApis" */),

	siteMembersWixCodeSdk: () =>
		import('feature-site-members-wix-code-sdk' /* webpackChunkName: "siteMembersWixCodeSdk" */),

	clickHandlerRegistrar: () =>
		import('feature-click-handler-registrar' /* webpackChunkName: "clickHandlerRegistrar" */),

	seoWixCodeSdk: () => import('feature-seo-wix-code-sdk' /* webpackChunkName: "seoWixCodeSdk" */),
	autoDisplayLightbox: () => import('feature-auto-display-lightbox' /* webpackChunkName: "autoDisplayLightbox" */),
	renderer: () => import('feature-react-renderer' /* webpackChunkName: "renderer" */),
	ooi: () => import('feature-ooi' /* webpackChunkName: "ooi" */),
	imageZoom: () => import('feature-image-zoom' /* webpackChunkName: "imageZoom" */),
	wixEmbedsApi: () => import('feature-wix-embeds-api' /* webpackChunkName: "wixEmbedsApi" */),
	protectedPages: () => import('feature-protected-pages' /* webpackChunkName: "protectedPages" */),
	multilingual: () => import('feature-multilingual' /* webpackChunkName: "multilingual" */),
	accessibility: () => import('feature-accessibility' /* webpackChunkName: "accessibility" */),
	accessibilityBrowserZoom: () =>
		import('feature-accessibility-browser-zoom' /* webpackChunkName: "accessibilityBrowserZoom" */),
	tpa: () => import('feature-tpa' /* webpackChunkName: "tpa" */),
	consentPolicy: () => import('feature-consent-policy' /* webpackChunkName: "consentPolicy" */),
	sessionManager: () => import('feature-session-manager' /* webpackChunkName: "sessionManager" */),
	reporter: () => import('feature-reporter' /* webpackChunkName: "reporter" */),
	qaApi: () => import('feature-qa-api' /* webpackChunkName: "qaApi" */),
	feedback: () => import('feature-feedback' /* webpackChunkName: "feedback" */),
	pages: () => import('feature-pages' /* webpackChunkName: "pages" */),
	seoTpa: () => import('feature-seo-tpa' /* webpackChunkName: "seoTpa" */),
	pageScroll: () => import('feature-page-scroll' /* webpackChunkName: "pageScroll" */),
	cookiesManager: () => import('feature-cookies-manager' /* webpackChunkName: "cookiesManager" */),
	menuContainer: () => import('feature-menu-container' /* webpackChunkName: "menuContainer" */),
	businessLogger: () => import('feature-business-logger' /* webpackChunkName: "businessLogger" */),
	platform: () => import('thunderbolt-platform' /* webpackChunkName: "platform" */),
	platformPubsub: () => import('feature-platform-pubsub' /* webpackChunkName: "platformPubsub" */),
	windowScroll: () => import('feature-window-scroll' /* webpackChunkName: "windowScroll" */),
	navigation: () => import('feature-navigation' /* webpackChunkName: "navigation" */),
	scrollToAnchor: () => import('feature-scroll-to-anchor' /* webpackChunkName: "scrollToAnchor" */),
	scrollRestoration: () => import('feature-scroll-restoration' /* webpackChunkName: "scrollRestoration" */),

	passwordProtectedPage: () =>
		import('feature-password-protected-page' /* webpackChunkName: "passwordProtectedPage" */),

	dynamicPages: () => import('feature-dynamic-pages' /* webpackChunkName: "dynamicPages" */),
	commonConfig: () => import('feature-common-config' /* webpackChunkName: "commonConfig" */),
	sosp: () => import('feature-sosp' /* webpackChunkName: "sosp" */),
	quickActionBar: () => import('feature-quick-action-bar' /* webpackChunkName: "quickActionBar" */),

	windowMessageRegistrar: () =>
		import('feature-window-message-registrar' /* webpackChunkName: "windowMessageRegistrar" */),

	testApi: () => import('feature-test-api' /* webpackChunkName: "testApi" */),
	activePopup: () => import('feature-active-popup' /* webpackChunkName: "activePopup" */),
	debug: () => import('feature-debug' /* webpackChunkName: "debug" */),
	tpaCommons: () => import('feature-tpa-commons' /* webpackChunkName: "tpaCommons" */),
	translations: () => import('feature-translations' /* webpackChunkName: "translations" */),
	pageAnchors: () => import('feature-page-anchors' /* webpackChunkName: "pageAnchors" */),
	componentsLoader: () => import('@wix/thunderbolt-components-loader' /* webpackChunkName: "componentsLoader" */),
	componentsReact: () => import('thunderbolt-components-react' /* webpackChunkName: "componentsReact" */),
	welcomeScreen: () => import('feature-welcome-screen' /* webpackChunkName: "welcomeScreen" */),
	warmupData: () => import('feature-warmup-data' /* webpackChunkName: "warmupData" */),

	wixCustomElementComponent: () =>
		import('feature-wix-custom-element-component' /* webpackChunkName: "wixCustomElementComponent" */),

	assetsLoader: () => import('feature-assets-loader' /* webpackChunkName: "assetsLoader" */),
	containerSlider: () => import('feature-container-slider' /* webpackChunkName: "containerSlider" */),
	tpaWorkerFeature: () => import('feature-tpa-worker' /* webpackChunkName: "tpaWorkerFeature" */),
	ooiTpaSharedConfig: () => import('feature-ooi-tpa-shared-config' /* webpackChunkName: "ooiTpaSharedConfig" */),
	componentsQaApi: () => import('feature-components-qa-api' /* webpackChunkName: "componentsqaapi" */),
	onloadCompsBehaviors: () => import('feature-onload-comps-behaviors' /* webpackChunkName: "onloadCompsBehaviors" */),
	chat: () => import('feature-chat' /* webpackChunkName: "chat" */),
	customUrlMapper: () => import('feature-custom-url-mapper' /* webpackChunkName: "customUrlMapper" */),
	screenIn: () => import('feature-screen-in' /* webpackChunkName: "screenIn" */),
	stores: () => import('feature-stores' /* webpackChunkName: "stores" */),

	animationsWixCodeSdk: () => import('feature-animations-wix-code-sdk' /* webpackChunkName: "animationsWixCodeSdk" */),

	coBranding: () => import('feature-co-branding' /* webpackChunkName: "coBranding" */),
	structureApi: () => import('feature-structure-api' /* webpackChunkName: "structureApi" */),
	embeddedInIframe: () => import('feature-embedded-in-iframe' /* webpackChunkName: "embeddedInIframe" */),
	loginButton: () => import('feature-login-button' /* webpackChunkName: "loginButton" */),
	hoverBox: () => import('feature-hover-box' /* webpackChunkName: "hoverBox" */),
	dashboardWixCodeSdk: () => import('feature-dashboard-wix-code-sdk' /* webpackChunkName: "dashboardWixCodeSdk" */),
	components: () => import('feature-components' /* webpackChunkName: "components" */),
	menusCurrentPage: () => import('feature-menus-current-page' /* webpackChunkName: "menusCurrentPage" */),
	navigationManager: () => import('feature-navigation-manager' /* webpackChunkName: "navigationManager" */),
	sliderGallery: () => import('feature-slider-gallery' /* webpackChunkName: "sliderGallery" */),
	wixapps: () => import('feature-wixapps' /* webpackChunkName: "wixapps" */),
	imagePlaceholder: () => import('feature-image-placeholder' /* webpackChunkName: "imagePlaceholder" */),
	componentsRegistry: () => import('feature-components-registry' /* webpackChunkName: "componentsRegistry" */),
	codeEmbed: () => import('feature-code-embed' /* webpackChunkName: "codeEmbed" */),

	authenticationWixCodeSdk: () =>
		import('feature-authentication-wix-code-sdk' /* webpackChunkName: "authenticationWixCodeSdk" */),

	mobileActionsMenu: () => import('feature-mobile-actions-menu' /* webpackChunkName: "mobileActionsMenu" */),
	fedopsWixCodeSdk: () => import('feature-fedops-wix-code-sdk' /* webpackChunkName: "fedopsWixCodeSdk" */),
	triggersAndReactions: () => import('feature-triggers-and-reactions' /* webpackChunkName: "triggersAndReactions" */),
	widgetWixCodeSdk: () => import('feature-widget-wix-code-sdk' /* webpackChunkName: "widgetWixCodeSdk" */),
	searchBox: () => import('feature-search-box' /* webpackChunkName: "searchBox" */),
	contentReflow: () => import('feature-content-reflow' /* webpackChunkName: "contentReflow" */),

	editorElementsDynamicTheme: () =>
		import('feature-editor-elements-dynamic-theme' /* webpackChunkName: "editorElementsDynamicTheme" */),

	repeaters: () => import('feature-repeaters' /* webpackChunkName: "repeaters" */),
	tpaModuleProvider: () => import('feature-tpa-module-provider' /* webpackChunkName: "tpaModuleProvider" */),

	environmentWixCodeSdk: () =>
		import('feature-environment-wix-code-sdk' /* webpackChunkName: "environmentWixCodeSdk" */),

	widget: () => import('feature-widget' /* webpackChunkName: "widget" */),
	navigationPhases: () => import('feature-navigation-phases' /* webpackChunkName: "navigationPhases" */),
	renderIndicator: () => import('feature-render-indicator' /* webpackChunkName: "renderIndicator" */),

	thunderboltInitializer: () =>
		import('feature-thunderbolt-initializer' /* webpackChunkName: "thunderboltInitializer" */),

	environment: () => import('feature-environment' /* webpackChunkName: "environment" */),
	serviceRegistrar: () => import('feature-service-registrar' /* webpackChunkName: "serviceRegistrar" */),
	businessManager: () => import('feature-business-manager' /* webpackChunkName: "businessManager" */),
	captcha: () => import('feature-captcha' /* webpackChunkName: "captcha" */),
	cyclicTabbing: () => import('feature-cyclic-tabbing' /* webpackChunkName: "cyclicTabbing" */),
	externalComponent: () => import('feature-external-component' /* webpackChunkName: "externalComponent" */),
	builderComponent: () => import('feature-builder-component' /* webpackChunkName: "builderComponent" */),
	stickyToComponent: () => import('feature-sticky-to-component' /* webpackChunkName: "stickyToComponent" */),
	customCss: () => import('feature-custom-css' /* webpackChunkName: "customCss" */),
	panorama: () => import('feature-panorama' /* webpackChunkName: "panorama" */),
	appMonitoring: () => import('feature-app-monitoring' /* webpackChunkName: "appMonitoring" */),
	routerFetch: () => import('feature-router-fetch' /* webpackChunkName: "routerFetch" */),
	motion: () => import('feature-motion' /* webpackChunkName: "motion" */),
	canvas: () => import('feature-canvas' /* webpackChunkName: "canvas" */),
	clientSdk: () => import('feature-client-sdk' /* webpackChunkName: "clientSdk" */),

	mobileFullScreen: () => import('feature-mobile-full-screen' /* webpackChunkName: "mobileFullScreen" */),

	wixEcomFrontendWixCodeSdk: () =>
		import('feature-wix-ecom-frontend-wix-code-sdk' /* webpackChunkName: "wixEcomFrontendWixCodeSdk" */),

	svgLoader: () => import('feature-svg-loader' /* webpackChunkName: "svgLoader" */),
	versionIndicator: () => import('feature-version-indicator' /* webpackChunkName: "versionIndicator" */),
	mpaNavigation: () => import('feature-mpa-navigation' /* webpackChunkName: "mpaNavigation" */),
	speculationRules: () => import('feature-speculation-rules' /* webpackChunkName: "speculationRules" */),
	anchorsService: () => import('feature-anchors-service' /* webpackChunkName: "anchorsService" */),
	translationsService: () => import('feature-translations-service' /* webpackChunkName: "translationsService" */),
	namedSignalsService: () => import('feature-named-signals-service' /* webpackChunkName: "namedSignalsService" */),

	businessLoggerService: () =>
		import('feature-business-logger-service' /* webpackChunkName: "businessLoggerService" */),

	environmentService: () => import('feature-environment-service' /* webpackChunkName: "environmentService" */),
	urlService: () => import('feature-url-service' /* webpackChunkName: "urlService" */),
	interactions: () => import('feature-interactions-service' /* webpackChunkName: "interactions" */),
	topologyService: () => import('feature-topology-service' /* webpackChunkName: "topologyService" */),
	siteThemeService: () => import('feature-site-theme-service' /* webpackChunkName: "siteThemeService" */),
	consentPolicyService: () => import('feature-consent-policy-service' /* webpackChunkName: "consentPolicyService" */),
	styleUtilsService: () => import('feature-style-utils-service' /* webpackChunkName: "styleUtilsService" */),

	imagePlaceholderService: () =>
		import('feature-image-placeholder-service' /* webpackChunkName: "imagePlaceholderService" */),

	cyclicTabbingService: () => import('feature-cyclic-tabbing-service' /* webpackChunkName: "cyclicTabbingService" */),

	domStore: ({ experiments }) =>
		experiments['specs.thunderbolt.dom_store']
			? import('feature-dom-store' /* webpackChunkName: "domStore" */)
			: Promise.resolve({}),

	fedopsLoggerService: () => import('feature-fedops-logger-service' /* webpackChunkName: "fedopsLoggerService" */),

	provideComponentService: () =>
		import('feature-provide-component-service' /* webpackChunkName: "provideComponentService" */),

	provideCssService: () => import('feature-provide-css-service' /* webpackChunkName: "provideCssService" */),
	pageContextService: () => import('feature-page-context-service' /* webpackChunkName: "pageContextService" */),
	pagesService: () => import('feature-pages-service' /* webpackChunkName: "pagesService" */),
	linkUtilsService: () => import('feature-link-utils-service' /* webpackChunkName: "linkUtilsService" */),
	sdkStateService: () => import('feature-sdk-state-service' /* webpackChunkName: "sdkStateService" */),

	siteScrollBlockerService: () =>
		import('feature-site-scroll-blocker-service' /* webpackChunkName: "siteScrollBlockerService" */),

	lightboxService: () => import('feature-lightbox-service' /* webpackChunkName: "lightboxService" */),
	ssrCache: () => import('feature-ssr-cache' /* webpackChunkName: "ssrCache" */),
	containerSliderService: () =>
		import('feature-container-slider-service' /* webpackChunkName: "containerSliderService" */),
	dynamicRouteService: () => import('feature-dynamic-route-service' /* webpackChunkName: "dynamicRouteService" */),
	routerService: () => import('feature-router-service' /* webpackChunkName: "routerService" */),
	seoService: () => import('feature-seo-service' /* webpackChunkName: "seoService" */),
	headAppenderService: () => import('feature-head-appender-service' /* webpackChunkName: "headAppenderService" */),
	siteMembersService: () => import('feature-site-members-service' /* webpackChunkName: "siteMembersService" */),
	builderContextProviders: () =>
		import('feature-builder-context-providers' /* webpackChunkName: "builderContextProviders" */),
	builderModuleLoader: () => import('feature-builder-module-loader' /* webpackChunkName: "builderModuleLoader" */),
	aboveTheFoldService: () => import('feature-above-the-fold-service' /* webpackChunkName: "aboveTheFoldService" */),
	externalServices: () => import('feature-external-services' /* webpackChunkName: "externalServices" */),
}
