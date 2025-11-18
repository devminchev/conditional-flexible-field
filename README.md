# Contentful-Game-Platform-Config

- A custom Contentful app used in the Game model to configure platform specific data.

## Recent Improvements

### ✅ Validation Context Architecture
This app now uses a centralized validation context system that:
- Eliminates race conditions in validation state management
- Provides a single source of truth for field validation
- Automatically syncs with Contentful's `validationStatus` field
- Simplifies component logic by removing complex validation status manipulation

### ✅ React 18 Compatibility
- Refactored all custom components to use JavaScript default parameters instead of `defaultProps`
- Explicitly set all required props on Contentful field editor components
- Follows React 18 best practices and eliminates deprecation warnings
- No functionality changes, just modern React patterns

### ✅ Runtime Debug Logging
The app includes a sophisticated debug logging system that can be toggled on/off at runtime without redeploying:
- Console-based control system accessible in deployed Contentful apps
- Session-persistent debug state using sessionStorage
- Detailed validation flow logging for troubleshooting
- Zero performance impact when disabled (default state)

## Debug Logging

The app includes a runtime debug logging system that helps troubleshoot validation issues and field behavior without requiring code changes or redeployment.

### How to Enable Debug Logging

1. **Open the Contentful app** in your browser
2. **Open browser developer tools** (F12 or right-click → Inspect)
3. **Go to the Console tab**
4. **Enable debug logging** by running:
   ```javascript
   contentfulDebug.enable()
   ```

### Available Commands

| Command | Description |
|---------|-------------|
| `contentfulDebug.enable()` | Enable debug logging for the current session |
| `contentfulDebug.disable()` | Disable debug logging |
| `contentfulDebug.status()` | Check if debug logging is currently enabled |
| `contentfulDebug.help()` | Show available commands and usage |

### What Gets Logged

When debug logging is enabled, you'll see detailed information about:

- **Validation Context Operations**: Field error setting/clearing, state synchronization
- **Field Validation Logic**: Required field checks, duplicate validation, visibility changes
- **Contentful Integration**: How validation state syncs with Contentful's `validationStatus` field
- **Component Lifecycle**: Field initialization, value changes, effect triggers

### Example Debug Output

```
[ValidationContext] setFieldError: fieldId="slug", validationType="duplicate", key="slug:duplicate", error="This slug is already taken..."
[SingleLineField] DUPLICATE DETECTED: fieldId="slug", draft="test-slug"
[ValidationContext] SYNC EFFECT - UPDATING Contentful field
```

### Session Persistence

Debug logging state persists across page reloads and navigation within the same browser session. You only need to enable it once per session.

### Performance Impact

- **When disabled** (default): Zero performance impact, no console output
- **When enabled**: Minimal impact, detailed logging for troubleshooting

## Useful links

More details around why this app is used can be found [here](https://confluence.gamesys.co.uk/display/UWS/Contentful+Conditional+Fields+Application)


[Custom Contentful Apps - Implementation Guide](https://confluence.gamesys.co.uk/display/SPS/Custom+Contentful+Apps+-+Implementation+Guide)

## Deployment

1. run `npm run build`
2. run `npm run deploy`
3. ensure the app in contentful uses this link: `https://github.gamesys.co.uk/pages/PlayerServices/contentful-game-platform-config/`

When all the changes have been merged into master run the deploy script.
The changes made to the app will not immediately be available in Contentful (normally for up to 10 minutes).