// MIT License
// Copyright (c) 2026 Open2b
// See the LICENSE file for full text.

// pollInterval is the interval, in milliseconds, at which the presence of the
// Ketch tag on the page is checked.
const pollInterval = 500

// withKetch integrates Ketch with the Krenalis JavaScript SDK. It defers
// krenalis.load until Ketch has communicated the consent and either the
// consent experience is hidden or no purpose requires opt-in. Events triggered
// before then are queued, and later consent changes are forwarded to the SDK.
export function withKetch(krenalis) {
	if (
		krenalis == null ||
		typeof krenalis.load !== 'function' ||
		typeof krenalis.unshift !== 'function' ||
		typeof krenalis.setConsents !== 'function'
	) {
		throw new Error('Ketch wrapper: krenalis must be the Krenalis snippet object, with the setConsents method')
	}

	const load = krenalis.load

	let isLoadCalled = false // reports whether krenalis.load has been called
	let loadArguments = [] // arguments passed to krenalis.load
	let consents = null // consent purposes from Ketch, or null if not received yet
	let isAllowed = false // reports whether Ketch allows loading the SDK
	let isLoaded = false // reports whether the SDK has been loaded

	const loadIfAllowed = () => {
		if (isLoaded || !isLoadCalled || consents == null || !isAllowed) {
			return
		}
		isLoaded = true
		// Set the consents before the queued calls.
		krenalis.unshift(['setConsents', consents])
		load.apply(krenalis, loadArguments)
	}

	// onConsent is called when Ketch communicates the consent or its changes.
	const onConsent = (consent) => {
		const purposes = copyPurposes(consent)
		if (purposes == null) {
			return
		}
		if (isLoaded) {
			krenalis.setConsents(purposes)
			return
		}
		consents = purposes
		loadIfAllowed()
	}

	// onHideExperience is called when the consent banner is hidden.
	const onHideExperience = () => {
		// Request the current consent programmatically because the Ketch banner
		// does not always emit the consent event correctly when it closes.
		globalThis.ketch('getConsent', (consent) => {
			onConsent(consent)
			isAllowed = true
			loadIfAllowed()
		})
	}

	// onConfig is called with the Ketch configuration requested via getConfig.
	// If no purpose requires opt-in, it allows loading the SDK without waiting
	// for the consent banner to be hidden.
	const onConfig = (config) => {
		if (!requiresOptIn(config)) {
			isAllowed = true
			loadIfAllowed()
		}
	}

	const addKetchListeners = () => {
		globalThis.ketch('on', 'consent', onConsent)
		globalThis.ketch('on', 'hideExperience', onHideExperience)
		globalThis.ketch('getConfig', onConfig)
	}

	// Add the listeners as soon as the Ketch tag is available on the page.
	if (typeof globalThis.ketch === 'function') {
		addKetchListeners()
	} else {
		const id = setInterval(() => {
			if (typeof globalThis.ketch === 'function') {
				clearInterval(id)
				addKetchListeners()
			}
		}, pollInterval)
	}

	krenalis.load = (...args) => {
		if (isLoadCalled) {
			console.error('Krenalis has already been loaded')
			return
		}
		isLoadCalled = true
		loadArguments = args
		loadIfAllowed()
	}

	return krenalis
}

// requiresOptIn reports whether a purpose of the Ketch configuration config
// requires the user's opt-in. If config is not valid, it returns true.
function requiresOptIn(config) {
	if (!isPlainObject(config) || !Array.isArray(config.purposes)) {
		return true
	}
	for (let i = 0; i < config.purposes.length; i++) {
		const purpose = config.purposes[i]
		if (!isPlainObject(purpose) || purpose.requiresOptIn === true) {
			return true
		}
	}
	return false
}

// copyPurposes returns a deep copy of the purposes communicated by Ketch,
// or null if consent or consent.purposes is not an object. The copy isolates
// the SDK's consents from changes to the original consent, including nested
// objects.
function copyPurposes(consent) {
	if (!isPlainObject(consent) || !isPlainObject(consent.purposes)) {
		return null
	}
	if (typeof structuredClone === 'function') {
		return structuredClone(consent.purposes)
	}
	return JSON.parse(JSON.stringify(consent.purposes))
}

// isPlainObject reports whether v is a non-null object and not an array.
function isPlainObject(v) {
	return typeof v === 'object' && v != null && !Array.isArray(v)
}
