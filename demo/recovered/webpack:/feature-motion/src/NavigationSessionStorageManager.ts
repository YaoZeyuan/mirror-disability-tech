export class NavigationSessionStorageManager {
	private browserWindow?: Window
	private storageKey: string

	constructor(storageKey: string, browserWindow?: Window) {
		this.storageKey = storageKey
		this.browserWindow = browserWindow
	}

	getFromSession(): Record<string, boolean> {
		if (!this.browserWindow?.sessionStorage) {
			return {}
		}

		const navigationEntries = this.browserWindow.performance?.getEntriesByType?.('navigation') as unknown as
			| Array<PerformanceNavigationTiming>
			| undefined
		const isPageReload = navigationEntries?.some((entry) => entry.type === 'reload')

		if (isPageReload) {
			return {}
		}

		try {
			const stored = this.browserWindow.sessionStorage.getItem(this.storageKey)
			return stored ? JSON.parse(stored) : {}
		} catch {
			return {}
		}
	}

	saveToSession(data: Record<string, boolean>): void {
		if (!this.browserWindow?.sessionStorage) {
			return
		}

		try {
			this.browserWindow.sessionStorage.setItem(this.storageKey, JSON.stringify(data))
		} catch {
			return
		}
	}

	clearFromSession(): void {
		if (!this.browserWindow?.sessionStorage) {
			return
		}

		try {
			this.browserWindow.sessionStorage.removeItem(this.storageKey)
		} catch {
			return
		}
	}
}
