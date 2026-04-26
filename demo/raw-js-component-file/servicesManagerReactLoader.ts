export const load = async () => {
	await window.externalsRegistry.react.loaded
	window.servicesManagerReact = await import(
		'@wix/services-manager-react' /* webpackChunkName: "servicesManagerReact" */
	)
}
