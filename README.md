# Conditional Flexible Field (Contentful App)

## Overview

Conditional Flexible Field is a custom [Contentful](https://www.contentful.com/) app that replaces the default entry field editors with smarter, Content Model–aware components. It is primarily used in the **Game** content model to configure platform-specific data while providing:

* Conditional visibility that hides or shows fields based on other field values
* Strong validation (required, per-venture uniqueness, reference requirements, and dropdown enforcement)
* Built-in runtime debug logging to troubleshoot validation flow without redeploying the app

### Where the app is installed

Within Contentful, this app is registered as a **field location** app. The current configuration (shown in the screenshots above) enables the app for short text, long text, rich text, numbers, dates, booleans, JSON objects, and entry/media references so editors can benefit from the conditional logic everywhere it is needed. Instance parameters such as `conditionSourceFieldId`, `conditionTriggerValue`, `conditionOperator`, and the uniqueness flags are exposed so each field can customize its show/hide logic and validation without code changes.

The app powers the following content types/fields:

* **`igView` content type** – The `viewSlug` field uses the app to enforce required + per-venture uniqueness validation.
* **All `igSection`-related content types** – Their `slug` field uses the same validation so sections cannot collide with the associated view slug.
* **Conditional `igSection` fields** – The `viewAllAction`, `viewAllActionText`, and `expandedSectionLayoutType` fields use the app's conditional visibility to hide/show related configuration blocks depending on the section layout.

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| UI Framework | [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Create React App](https://create-react-app.dev/) |
| Contentful SDKs | `@contentful/app-sdk`, `@contentful/react-apps-toolkit`, `@contentful/field-editor-*` packages |
| UI Kit | [Forma 36](https://f36.contentful.com/) components |
| Tooling | Jest + ts-jest, TypeScript, gh-pages deployment |

## How the project works

At runtime, the app is rendered inside Contentful as a [Field location app](https://www.contentful.com/developers/docs/extensibility/app-framework/locations/#entry-field). The entry field is replaced with a custom component that can:

1. Determine whether the field should be visible using `conditionSourceFieldId`, `conditionOperator`, and `conditionTriggerValue` instance parameters. (`src/locations/Field.tsx`)
2. Apply specialized validators (required, uniqueness, reference requirements) using React hooks plus a centralized validation context. (`src/components/CustomValidator*` and `src/ValidationContext.tsx`)
3. Synchronize validation errors back to Contentful's `validationStatus` field so editors can see the aggregated status. (`src/ValidationContext.tsx`)
4. Provide dropdown and reference editors that respect predefined values and Contentful reference constraints. (`src/components/CustomValidatorDropdownField.tsx`, `src/components/CustomValidatorSingleRefField.tsx`)
5. Offer runtime debug tooling via a console-accessible API. (`src/utils/debug.ts`)

## Architecture

```
src/
├── index.tsx                 # CRA entry point; renders SDKProvider and GlobalStyles
├── App.tsx                   # Chooses a component based on the current Contentful location
├── ValidationContext.tsx     # Centralized validation store, syncs with Contentful validationStatus
├── locations/Field.tsx       # Main field editor wrapper handling conditional visibility
├── components/
│   ├── CustomValidatorSingleLineField.tsx  # Unique/required validation for text fields
│   ├── CustomValidatorDropdownField.tsx    # Required validation for dropdowns
│   ├── CustomValidatorSingleRefField.tsx   # Required validation for single references
│   └── LocalhostWarning.tsx                # Helper UI when running outside Contentful
└── utils/
    ├── conditionOperators.ts              # Evaluates show/hide rules
    ├── debug.ts                           # Session-based debug logging helpers
    └── queryContentTypes.ts               # Lists content types used in duplicate checks
```

### Conditional rendering flow

1. `App.tsx` uses Contentful's `locations` to pick the `Field` component. (`src/App.tsx`)
2. `Field.tsx` decides whether to show or hide the actual field editor by observing the configured source field and `evaluateCondition`. (`src/locations/Field.tsx`, `src/utils/conditionOperators.ts`)
3. When the field is visible, it swaps in the correct editor (single-line, dropdown, reference, or multiple reference) and, if required, wraps it with the relevant custom validator.
4. All validators push errors through the shared `ValidationContext`, which mirrors its state to `entry.fields.validationStatus` so Contentful displays the same validation summary. (`src/ValidationContext.tsx`)

### Validation highlights

* **Required fields** – `CustomValidatorSingleLineField`, `CustomValidatorDropdownField`, and `CustomValidatorSingleRefField` mark fields invalid when empty and clear errors when the field is hidden. (`src/components/*`)
* **Per-venture uniqueness** – The single-line validator queries the Contentful CMA with a list of content types and flags duplicates in the current venture (including a separate domain list). (`src/components/CustomValidatorSingleLineField.tsx`, `src/utils/queryContentTypes.ts`)
* **Visibility-aware clearing** – Any time a condition hides the field, the validators reset the value and errors to avoid stale validation states. (`src/locations/Field.tsx`, `src/ValidationContext.tsx`)
* **Centralized validation context** – The shared `ValidationContext` now owns the complete validation lifecycle so every validator writes to a single source of truth. This eliminates race conditions between components, keeps validation status synced with Contentful's `validationStatus` field automatically, and simplifies component code because they no longer juggle independent status flags. (`src/ValidationContext.tsx`)

### Debug logging

Enable logging in the browser console while the app runs inside Contentful:

```js
contentfulDebug.enable();
contentfulDebug.disable();
contentfulDebug.status();
contentfulDebug.help();
```

Debug state is stored in `sessionStorage`, so the preference survives reloads during a session. (`src/utils/debug.ts`)

## Installation

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure Contentful environment variables** (required for deploy/upload scripts). Set `CONTENTFUL_ORG_ID`, `CONTENTFUL_APP_DEF_ID`, and `CONTENTFUL_ACCESS_TOKEN` if you intend to run `npm run upload-ci`.

## Usage

### Local development

Run the standard CRA dev server (auto-opens on `localhost:3000`). Contentful apps must run inside Contentful to fully function, so when loaded directly the app renders the `LocalhostWarning` helper.

```bash
npm start
```

In Contentful, create (or reuse) an app definition and point the field location to the dev server URL via the Contentful App Framework tunneling setup if needed.

### Production build & deployment

```bash
npm run build      # Builds the CRA bundle
npm run deploy     # Publishes /build to GitHub Pages (gh-pages)
```

After deploying, configure the Contentful app to load from `https://github.gamesys.co.uk/pages/PlayerServices/contentful-game-platform-config/`.

### Debugging validation

1. Open the Contentful entry that uses this app.
2. Open the browser console.
3. Run `contentfulDebug.enable()` to start streaming validation logs, or `contentfulDebug.disable()` to silence them.

## Testing

The project uses Jest with `ts-jest` and React Testing Library configuration.

```bash
npm test
```

## Contributing

1. Create a feature branch.
2. Install dependencies (`npm install`) and run tests locally (`npm test`).
3. Follow the existing coding patterns (React hooks, validation via `ValidationContext`).
4. Submit a pull request and, once merged to `main`, run `npm run build && npm run deploy` to publish the updated bundle.

---

For background on why the app exists and how to integrate it with Contentful, refer to the internal Confluence guides:

* [Contentful Conditional Fields Application](https://confluence.gamesys.co.uk/display/UWS/Contentful+Conditional+Fields+Application)
* [Custom Contentful Apps – Implementation Guide](https://confluence.gamesys.co.uk/display/SPS/Custom+Contentful+Apps+-+Implementation+Guide)

