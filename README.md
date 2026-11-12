# Ketch integration for the Krenalis JavaScript SDK

Official integration to handle consents with the [Ketch](https://www.ketch.com/) consent management platform when using the [Krenalis JavaScript SDK](https://github.com/krenalis/analytics-javascript).

## How it works

`withKetch(krenalis)` wraps the `load` method of the Krenalis SDK, so that:

1. **The SDK is loaded only once the user's choice is known.** Until then, the calls to the SDK (`page`, `track`, ...) are queued, and the SDK neither stores data on the device nor sends events. The SDK is loaded when Ketch has communicated the user's consent and either:
    - the Ketch consent experience (the banner) is closed, because the user has made a choice or has closed it, or it is not shown at all, typically because the user has already made a choice in a previous visit;
    - no purpose of the user's jurisdiction requires the user's opt-in (for example, where the banner is just a notice), so there is no choice to wait for.
2. **The consent is added to every event**, as `context.consents`, including the events queued before the consent was known. It contains the Ketch purposes, for example `{ "analytics": true, "advertising": false }`.
3. **Changes of the consent** made by the user later are applied to the subsequent events.

The Ketch tag can be added to the page before or after the SDK: if it is not there yet, the integration waits for it.

| Case                                                | When the SDK is loaded                            |
| --------------------------------------------------- | ------------------------------------------------- |
| New user, a purpose requires opt-in (e.g. GDPR)     | when the user makes a choice or closes the banner |
| New user, no purpose requires opt-in                | as soon as Ketch communicates the consent         |
| Returning user                                      | as soon as Ketch communicates the stored consent  |
| The user never interacts with the banner            | never                                             |
| Ketch is never loaded (e.g. blocked by the browser) | never                                             |

## Usage

The integration works with the Krenalis snippet; installing the SDK as an npm package is not supported.

In the Krenalis admin, the page of the JavaScript connection generates the snippet with the integration when **Consent management** is set to **Ketch**.

To set it up manually:

1. Add the Ketch Smart Tag to the page, as described in the Ketch documentation.
2. Add this script **before** the Krenalis snippet:

    ```html
    <script src="https://cdn.krenalis.com/krenalis-ketch.min.js"></script>
    ```

3. In the Krenalis snippet, replace the `load` call:

    ```js
    krenalis.load("<event write key>", "<endpoint>");
    ```

    with:

    ```js
    withKetch(krenalis).load("<event write key>", "<endpoint>");
    ```

> [!WARNING]
> If the snippet still calls `krenalis.load(...)` directly, the SDK is loaded without waiting for the consent.

## Development

You'll need [Node.js](https://nodejs.org/) (with npm). See `engines.node` in `package.json` for compatible versions; CI uses Node.js 24.

Install the development dependencies with:

```sh
npm ci
```

The project uses [Prettier](https://prettier.io/) to format files. Run it with:

```sh
npm run format
```

The README and generated files are excluded from formatting.

Before committing, run:

```sh
npm ci            # install the dependencies from package-lock.json
npm run format    # format the files with Prettier
npm run build     # lint with ESLint and build dist/krenalis-ketch.min.js (ES5)
```

Or run the same sequence with a single command:

```sh
npm run commit
```

The build uses esbuild for bundling and minification, and SWC for transpilation to ES5.

## License

This project is released under the [MIT License](LICENSE). © 2026 [Open2b](https://www.krenalis.com/)

The script distributed in `dist/krenalis-ketch.min.js` keeps the license notice in its header; keep it when you copy or redistribute the script.

> Ketch is a trademark of Ketch Kloud Inc.
> This integration is not affiliated with or endorsed by Ketch Kloud Inc.
