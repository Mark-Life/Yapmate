# PostHog React Native SDK

**SDK Version:** 4.17.3

PostHog React Native SDK allows you to capture events and send them to PostHog from your React Native applications.

## Categories

- Initialization
- Identification
- Capture
- Error tracking
- Feature flags
- Group analytics
- Privacy
- LLM analytics

## PostHog

### Initialization methods

#### PostHogProvider()

**Release Tag:** public

PostHogProvider is a React component that provides PostHog functionality to your React Native app. You can find all configuration options in the [React Native SDK docs](https://posthog.com/docs/libraries/react-native#configuration-options).
Autocapturing navigation requires further configuration. See the [React Native SDK navigation docs](https://posthog.com/docs/libraries/react-native#capturing-screen-views) for more information about autocapturing navigation.
This is the recommended way to set up PostHog for React Native. This utilizes the Context API to pass the PostHog client around, enable autocapture.

### Parameters

- **`{ children, client, options, apiKey, autocapture, style, debug, }`** (`PostHogProviderProps`)

### Returns

**Union of:**

- `JSX.Element`
- `null`

### Examples

#### Add to App.(js|ts)

```react-native
// Add to App.(js|ts)
import { usePostHog, PostHogProvider } from 'posthog-react-native'

export function MyApp() {
    return (
        <PostHogProvider apiKey="<ph_project_api_key>" options={{
            host: '<ph_client_api_host>',
        }}>
            <MyComponent />
        </PostHogProvider>
    )
}

// And access the PostHog client via the usePostHog hook
import { usePostHog } from 'posthog-react-native'

const MyComponent = () => {
    const posthog = usePostHog()

    useEffect(() => {
        posthog.capture("event_name")
    }, [posthog])
}
```

#### Using with existing client

```react-native
// Using with existing client
import { PostHog } from 'posthog-react-native'

const posthog = new PostHog('<ph_project_api_key>', {
    host: '<ph_client_api_host>'
})

export function MyApp() {
    return (
        <PostHogProvider client={posthog}>
            <MyComponent />
        </PostHogProvider>
    )
}
```

---

#### PostHog()

**Release Tag:** public

Creates a new PostHog instance for React Native. You can find all configuration options in the [React Native SDK docs](https://posthog.com/docs/libraries/react-native#configuration-options).
If you prefer not to use the PostHogProvider, you can initialize PostHog in its own file and import the instance from there.

### Parameters

- **`apiKey`** (`string`) - Your PostHog API key
- **`options?`** (`PostHogOptions`) - PostHog configuration options

### Returns

- `any`

### Examples

```react-native
// posthog.ts
import PostHog from 'posthog-react-native'

export const posthog = new PostHog('<ph_project_api_key>', {
  host: '<ph_client_api_host>'
})

// Then you can access PostHog by importing your instance
// Another file:
import { posthog } from './posthog'

export function MyApp1() {
    useEffect(async () => {
        posthog.capture('event_name')
    }, [posthog])

    return <View>Your app code</View>
}
```

---

#### debug()

**Release Tag:** public

Enables or disables debug mode for detailed logging.

**Notes:**

Debug mode logs all PostHog calls to the console for troubleshooting. This is useful during development to understand what data is being sent.

### Parameters

- **`enabled?`** (`boolean`)

### Returns

- `void`

### Examples

#### enable debug mode

```react-native
// enable debug mode
posthog.debug(true)
```

#### disable debug mode

```react-native
// disable debug mode
posthog.debug(false)
```

---

#### shutdown()

**Release Tag:** public

Shuts down the PostHog instance and ensures all events are sent.
Call shutdown() once before the process exits to ensure that all events have been sent and all promises have resolved. Do not use this function if you intend to keep using this PostHog instance after calling it. Use flush() for per-request cleanup instead.

### Parameters

- **`shutdownTimeoutMs?`** (`number`) - Maximum time to wait for shutdown in milliseconds

### Returns

- `Promise<void>`

### Examples

```react-native
// shutdown before process exit
process.on('SIGINT', async () => {
  await posthog.shutdown()
  process.exit(0)
})
```

---

### Identification methods

#### alias()

**Release Tag:** public

Assigns an alias to the current user.
Sometimes, you want to assign multiple distinct IDs to a single user. This is helpful when your primary distinct ID is inaccessible. For example, if a distinct ID used on the frontend is not available in your backend.

### Parameters

- **`alias`** (`string`) - The alias to assign to the current user

### Returns

- `void`

### Examples

```react-native
// set alias for current user
posthog.alias('distinct_id')
```

---

#### getDistinctId()

**Release Tag:** public

Gets the current user's distinct ID.
You may find it helpful to get the current user's distinct ID. For example, to check whether you've already called identify for a user or not. This returns either the ID automatically generated by PostHog or the ID that has been passed by a call to identify().

### Returns

- `string`

### Examples

```react-native
// get current distinct ID
const distinctId = posthog.getDistinctId()
```

---

#### identify()

**Release Tag:** public

Associates events with a specific user. Learn more about [identifying users](https://posthog.com/docs/product-analytics/identify)

### Parameters

- **`distinctId?`** (`string`) - A unique identifier for your user. Typically either their email or database ID.
- **`properties?`** (`PostHogEventProperties`) - Optional dictionary with key:value pairs to set the person properties
- **`options?`** (`PostHogCaptureOptions`) - Optional capture options

### Returns

- `void`

### Examples

#### Basic identify

```react-native
// Basic identify
posthog.identify('distinctID', {
  email: 'user@posthog.com',
  name: 'My Name'
})
```

#### Using $set and $set_once

```react-native
// Using $set and $set_once
posthog.identify('distinctID', {
  $set: {
    email: 'user@posthog.com',
    name: 'My Name'
  },
  $set_once: {
    date_of_first_log_in: '2024-03-01'
  }
})
```

---

#### reset()

**Release Tag:** public

Resets the user's ID and anonymous ID after logout.
To reset the user's ID and anonymous ID, call reset. Usually you would do this right after the user logs out. This also clears all stored super properties and more.

### Returns

- `void`

### Examples

```react-native
// reset after logout
posthog.reset()
```

---

#### getAnonymousId()

**Release Tag:** public

Returns the current anonymous ID.
This is the ID assigned to users before they are identified. It's used to track anonymous users and link them to identified users when they sign up.

### Returns

- `string`

### Examples

```react-native
// get the anonymous ID
const anonId = posthog.getAnonymousId()
console.log('Anonymous ID:', anonId)
```

---

### Error tracking methods

#### captureException()

**Release Tag:** public

Capture a caught exception manually

### Parameters

- **`error`** (`Error | unknown`) - The error to capture
- **`additionalProperties?`** (`PostHogEventProperties`) - Any additional properties to add to the error event

### Returns

- `void`

### Examples

#### Capture a caught exception

```react-native
// Capture a caught exception
try {
  // something that might throw
} catch (error) {
  posthog.captureException(error)
}
```

#### With additional properties

```react-native
// With additional properties
posthog.captureException(error, {
  customProperty: 'value',
  anotherProperty: ['I', 'can be a list'],
  ...
})
```

---

### Other methods

#### fetch()

**Release Tag:** public

### Parameters

- **`url`** (`string`)
- **`options`** (`PostHogFetchOptions`)

### Returns

- `Promise<PostHogFetchResponse>`

### Examples

```react-native
// Generated example for fetch
posthog.fetch();
```

---

#### getCommonEventProperties()

**Release Tag:** public

### Returns

- `PostHogEventProperties`

### Examples

```react-native
// Generated example for getCommonEventProperties
posthog.getCommonEventProperties();
```

---

#### getCustomUserAgent()

**Release Tag:** public

### Returns

- `string`

### Examples

```react-native
// Generated example for getCustomUserAgent
posthog.getCustomUserAgent();
```

---

#### getLibraryId()

**Release Tag:** public

### Returns

- `string`

### Examples

```react-native
// Generated example for getLibraryId
posthog.getLibraryId();
```

---

#### getLibraryVersion()

**Release Tag:** public

### Returns

- `string`

### Examples

```react-native
// Generated example for getLibraryVersion
posthog.getLibraryVersion();
```

---

#### getPersistedProperty()

**Release Tag:** public

### Parameters

- **`key`** (`PostHogPersistedProperty`)

### Returns

**Union of:**

- `T`
- `undefined`

### Examples

```react-native
// Generated example for getPersistedProperty
posthog.getPersistedProperty();
```

---

#### getSessionId()

**Release Tag:** public

### Returns

- `string`

### Examples

```react-native
// Generated example for getSessionId
posthog.getSessionId();
```

---

#### getSurveys()

**Release Tag:** public

### Returns

- `Promise<SurveyResponse['surveys']>`

### Examples

```react-native
// Generated example for getSurveys
posthog.getSurveys();
```

---

#### initReactNativeNavigation()

**Release Tag:** public

### Parameters

- **`options`** (`PostHogAutocaptureOptions`)

### Returns

- `boolean`

### Examples

```react-native
// Generated example for initReactNativeNavigation
posthog.initReactNativeNavigation();
```

---

#### resetSessionId()

**Release Tag:** public

### Returns

- `void`

### Examples

```react-native
// Generated example for resetSessionId
posthog.resetSessionId();
```

---

#### setPersistedProperty()

**Release Tag:** public

### Parameters

- **`key`** (`PostHogPersistedProperty`)
- **`value`** (`T | null`)

### Returns

- `void`

### Examples

```react-native
// Generated example for setPersistedProperty
posthog.setPersistedProperty();
```

---

#### autocapture()

**Release Tag:** public

### Parameters

- **`eventType`** (`string`)
- **`elements`** (`PostHogAutocaptureElement[]`)
- **`properties?`** (`PostHogEventProperties`)
- **`options?`** (`PostHogCaptureOptions`)

### Returns

- `void`

### Examples

```react-native
// Generated example for autocapture
posthog.autocapture();
```

---

#### capture()

**Release Tag:** public

### Parameters

- **`event`** (`string`)
- **`properties?`** (`PostHogEventProperties`)
- **`options?`** (`PostHogCaptureOptions`)

### Returns

- `void`

### Examples

```react-native
// Generated example for capture
posthog.capture();
```

---

#### flagsAsync()

**Release Tag:** public

- \*_ FEATURE FLAGS _

### Parameters

- **`sendAnonDistinctId?`** (`boolean`)
- **`fetchConfig?`** (`boolean`)

### Returns

**Union of:**

- `Promise<PostHogFlagsResponse`
- `undefined>`

### Examples

```react-native
// Generated example for flagsAsync
posthog.flagsAsync();
```

---

#### getFeatureFlagDetails()

**Release Tag:** public

### Returns

**Union of:**

- `PostHogFeatureFlagDetails`
- `undefined`

### Examples

```react-native
// Generated example for getFeatureFlagDetails
posthog.getFeatureFlagDetails();
```

---

#### getFeatureFlagPayloads()

**Release Tag:** public

### Returns

**Union of:**

- `PostHogFlagsResponse['featureFlagPayloads']`
- `undefined`

### Examples

```react-native
// Generated example for getFeatureFlagPayloads
posthog.getFeatureFlagPayloads();
```

---

#### getFeatureFlags()

**Release Tag:** public

### Returns

**Union of:**

- `PostHogFlagsResponse['featureFlags']`
- `undefined`

### Examples

```react-native
// Generated example for getFeatureFlags
posthog.getFeatureFlags();
```

---

#### getFeatureFlagsAndPayloads()

**Release Tag:** public

### Returns

**Union of:**

- `{
      flags: PostHogFlagsResponse['featureFlags']`
- `undefined;
      payloads: PostHogFlagsResponse['featureFlagPayloads']`
- `undefined;
  }`

### Examples

```react-native
// Generated example for getFeatureFlagsAndPayloads
posthog.getFeatureFlagsAndPayloads();
```

---

#### getKnownFeatureFlags()

**Release Tag:** public

### Returns

**Union of:**

- `PostHogFlagsResponse['featureFlags']`
- `undefined`

### Examples

```react-native
// Generated example for getKnownFeatureFlags
posthog.getKnownFeatureFlags();
```

---

#### groupIdentify()

**Release Tag:** public

### Parameters

- **`groupType`** (`string`)
- **`groupKey`** (`string | number`)
- **`groupProperties?`** (`PostHogEventProperties`)
- **`options?`** (`PostHogCaptureOptions`)

### Returns

- `void`

### Examples

```react-native
// Generated example for groupIdentify
posthog.groupIdentify();
```

---

#### groups()

**Release Tag:** public

- \*_ GROUPS _

### Parameters

- **`groups`** (`PostHogGroupProperties`)

### Returns

- `void`

### Examples

```react-native
// Generated example for groups
posthog.groups();
```

---

#### on()

**Release Tag:** public

### Parameters

- **`event`** (`string`)
- **`cb`** (`(...args: any[]) => void`)

### Returns

- `() => void`

### Examples

```react-native
// Generated example for on
posthog.on();
```

---

#### onFeatureFlag()

**Release Tag:** public

### Parameters

- **`key`** (`string`)
- **`cb`** (`(value: FeatureFlagValue) => void`)

### Returns

- `() => void`

### Examples

```react-native
// Generated example for onFeatureFlag
posthog.onFeatureFlag();
```

---

#### onFeatureFlags()

**Release Tag:** public

### Parameters

- **`cb`** (`(flags: PostHogFlagsResponse['featureFlags']) => void`)

### Returns

- `() => void`

### Examples

```react-native
// Generated example for onFeatureFlags
posthog.onFeatureFlags();
```

---

#### overrideFeatureFlag()

**Release Tag:** public

### Parameters

- **`flags`** (`PostHogFlagsResponse['featureFlags'] | null`)

### Returns

- `Promise<void>`

### Examples

```react-native
// Generated example for overrideFeatureFlag
posthog.overrideFeatureFlag();
```

---

#### registerForSession()

**Release Tag:** public

### Parameters

- **`properties`** (`PostHogEventProperties`)

### Returns

- `void`

### Examples

```react-native
// Generated example for registerForSession
posthog.registerForSession();
```

---

#### reloadRemoteConfigAsync()

**Release Tag:** public

### Returns

**Union of:**

- `Promise<PostHogRemoteConfig`
- `undefined>`

### Examples

```react-native
// Generated example for reloadRemoteConfigAsync
posthog.reloadRemoteConfigAsync();
```

---

#### setupBootstrap()

**Release Tag:** public

### Parameters

- **`options?`** (`Partial<PostHogCoreOptions>`)

### Returns

- `void`

### Examples

```react-native
// Generated example for setupBootstrap
posthog.setupBootstrap();
```

---

#### unregisterForSession()

**Release Tag:** public

### Parameters

- **`property`** (`string`)

### Returns

- `void`

### Examples

```react-native
// Generated example for unregisterForSession
posthog.unregisterForSession();
```

---

#### addPendingPromise()

**Release Tag:** public

### Parameters

- **`promise`** (`Promise<T>`)

### Returns

- `Promise<T>`

### Examples

```react-native
// Generated example for addPendingPromise
posthog.addPendingPromise();
```

---

#### aliasStateless()

**Release Tag:** public

### Parameters

- **`alias`** (`string`)
- **`distinctId`** (`string`)
- **`properties?`** (`PostHogEventProperties`)
- **`options?`** (`PostHogCaptureOptions`)

### Returns

- `void`

### Examples

```react-native
// Generated example for aliasStateless
posthog.aliasStateless();
```

---

#### aliasStatelessImmediate()

**Release Tag:** public

### Parameters

- **`alias`** (`string`)
- **`distinctId`** (`string`)
- **`properties?`** (`PostHogEventProperties`)
- **`options?`** (`PostHogCaptureOptions`)

### Returns

- `Promise<void>`

### Examples

```react-native
// Generated example for aliasStatelessImmediate
posthog.aliasStatelessImmediate();
```

---

#### captureStateless()

**Release Tag:** public

### Parameters

- **`distinctId`** (`string`)
- **`event`** (`string`)
- **`properties?`** (`PostHogEventProperties`)
- **`options?`** (`PostHogCaptureOptions`)

### Returns

- `void`

### Examples

```react-native
// Generated example for captureStateless
posthog.captureStateless();
```

---

#### captureStatelessImmediate()

**Release Tag:** public

### Parameters

- **`distinctId`** (`string`)
- **`event`** (`string`)
- **`properties?`** (`PostHogEventProperties`)
- **`options?`** (`PostHogCaptureOptions`)

### Returns

- `Promise<void>`

### Examples

```react-native
// Generated example for captureStatelessImmediate
posthog.captureStatelessImmediate();
```

---

#### enqueue()

**Release Tag:** public

- \*_ QUEUEING AND FLUSHING _

### Parameters

- **`type`** (`string`)
- **`_message`** (`any`)
- **`options?`** (`PostHogCaptureOptions`)

### Returns

- `void`

### Examples

```react-native
// Generated example for enqueue
posthog.enqueue();
```

---

#### getCustomHeaders()

**Release Tag:** public

### Returns

- `{
      [key: string]: string;
  }`

### Examples

```react-native
// Generated example for getCustomHeaders
posthog.getCustomHeaders();
```

---

#### getFeatureFlagDetailsStateless()

**Release Tag:** public

### Parameters

- **`distinctId`** (`string`)
- **`groups?`** (`Record<string, string | number>`)
- **`personProperties?`** (`Record<string, string>`)
- **`groupProperties?`** (`Record<string, Record<string, string>>`)
- **`disableGeoip?`** (`boolean`)
- **`flagKeysToEvaluate?`** (`string[]`)

### Returns

**Union of:**

- `Promise<PostHogFeatureFlagDetails`
- `undefined>`

### Examples

```react-native
// Generated example for getFeatureFlagDetailsStateless
posthog.getFeatureFlagDetailsStateless();
```

---

#### getFeatureFlagDetailStateless()

**Release Tag:** public

### Parameters

- **`key`** (`string`)
- **`distinctId`** (`string`)
- **`groups?`** (`Record<string, string>`)
- **`personProperties?`** (`Record<string, string>`)
- **`groupProperties?`** (`Record<string, Record<string, string>>`)
- **`disableGeoip?`** (`boolean`)

### Returns

**Union of:**

- `Promise<{
      response: FeatureFlagDetail`
- `undefined;
      requestId: string`
- `undefined;
      evaluatedAt: number`
- `undefined;
  }`
- `undefined>`

### Examples

```react-native
// Generated example for getFeatureFlagDetailStateless
posthog.getFeatureFlagDetailStateless();
```

---

#### getFeatureFlagPayloadsStateless()

**Release Tag:** public

### Parameters

- **`distinctId`** (`string`)
- **`groups?`** (`Record<string, string>`)
- **`personProperties?`** (`Record<string, string>`)
- **`groupProperties?`** (`Record<string, Record<string, string>>`)
- **`disableGeoip?`** (`boolean`)
- **`flagKeysToEvaluate?`** (`string[]`)

### Returns

**Union of:**

- `Promise<PostHogFlagsResponse['featureFlagPayloads']`
- `undefined>`

### Examples

```react-native
// Generated example for getFeatureFlagPayloadsStateless
posthog.getFeatureFlagPayloadsStateless();
```

---

#### getFeatureFlagPayloadStateless()

**Release Tag:** public

### Parameters

- **`key`** (`string`)
- **`distinctId`** (`string`)
- **`groups?`** (`Record<string, string>`)
- **`personProperties?`** (`Record<string, string>`)
- **`groupProperties?`** (`Record<string, Record<string, string>>`)
- **`disableGeoip?`** (`boolean`)

### Returns

**Union of:**

- `Promise<JsonType`
- `undefined>`

### Examples

```react-native
// Generated example for getFeatureFlagPayloadStateless
posthog.getFeatureFlagPayloadStateless();
```

---

#### getFeatureFlagsAndPayloadsStateless()

**Release Tag:** public

### Parameters

- **`distinctId`** (`string`)
- **`groups?`** (`Record<string, string | number>`)
- **`personProperties?`** (`Record<string, string>`)
- **`groupProperties?`** (`Record<string, Record<string, string>>`)
- **`disableGeoip?`** (`boolean`)
- **`flagKeysToEvaluate?`** (`string[]`)

### Returns

**Union of:**

- `Promise<{
      flags: PostHogFlagsResponse['featureFlags']`
- `undefined;
      payloads: PostHogFlagsResponse['featureFlagPayloads']`
- `undefined;
      requestId: PostHogFlagsResponse['requestId']`
- `undefined;
  }>`

### Examples

```react-native
// Generated example for getFeatureFlagsAndPayloadsStateless
posthog.getFeatureFlagsAndPayloadsStateless();
```

---

#### getFeatureFlagsStateless()

**Release Tag:** public

### Parameters

- **`distinctId`** (`string`)
- **`groups?`** (`Record<string, string | number>`)
- **`personProperties?`** (`Record<string, string>`)
- **`groupProperties?`** (`Record<string, Record<string, string>>`)
- **`disableGeoip?`** (`boolean`)
- **`flagKeysToEvaluate?`** (`string[]`)

### Returns

**Union of:**

- `Promise<{
      flags: PostHogFlagsResponse['featureFlags']`
- `undefined;
      payloads: PostHogFlagsResponse['featureFlagPayloads']`
- `undefined;
      requestId: PostHogFlagsResponse['requestId']`
- `undefined;
  }>`

### Examples

```react-native
// Generated example for getFeatureFlagsStateless
posthog.getFeatureFlagsStateless();
```

---

#### getFeatureFlagStateless()

**Release Tag:** public

### Parameters

- **`key`** (`string`)
- **`distinctId`** (`string`)
- **`groups?`** (`Record<string, string>`)
- **`personProperties?`** (`Record<string, string>`)
- **`groupProperties?`** (`Record<string, Record<string, string>>`)
- **`disableGeoip?`** (`boolean`)

### Returns

**Union of:**

- `Promise<{
      response: FeatureFlagValue`
- `undefined;
      requestId: string`
- `undefined;
  }>`

### Examples

```react-native
// Generated example for getFeatureFlagStateless
posthog.getFeatureFlagStateless();
```

---

#### getFlags()

**Release Tag:** public

- \*_ FEATURE FLAGS _

### Parameters

- **`distinctId`** (`string`)
- **`groups?`** (`Record<string, string | number>`)
- **`personProperties?`** (`Record<string, string>`)
- **`groupProperties?`** (`Record<string, Record<string, string>>`)
- **`extraPayload?`** (`Record<string, any>`)
- **`fetchConfig?`** (`boolean`)

### Returns

**Union of:**

- `Promise<PostHogFlagsResponse`
- `undefined>`

### Examples

```react-native
// Generated example for getFlags
posthog.getFlags();
```

---

#### getRemoteConfig()

**Release Tag:** public

### Returns

**Union of:**

- `Promise<PostHogRemoteConfig`
- `undefined>`

### Examples

```react-native
// Generated example for getRemoteConfig
posthog.getRemoteConfig();
```

---

#### getSurveysStateless()

**Release Tag:** public

- \*_ SURVEYS _

### Returns

- `Promise<SurveyResponse['surveys']>`

### Examples

```react-native
// Generated example for getSurveysStateless
posthog.getSurveysStateless();
```

---

#### groupIdentifyStateless()

**Release Tag:** public

- \*_ GROUPS _

### Parameters

- **`groupType`** (`string`)
- **`groupKey`** (`string | number`)
- **`groupProperties?`** (`PostHogEventProperties`)
- **`options?`** (`PostHogCaptureOptions`)
- **`distinctId?`** (`string`)
- **`eventProperties?`** (`PostHogEventProperties`)

### Returns

- `void`

### Examples

```react-native
// Generated example for groupIdentifyStateless
posthog.groupIdentifyStateless();
```

---

#### identifyStateless()

**Release Tag:** public

- \*_ TRACKING _

### Parameters

- **`distinctId`** (`string`)
- **`properties?`** (`PostHogEventProperties`)
- **`options?`** (`PostHogCaptureOptions`)

### Returns

- `void`

### Examples

```react-native
// Generated example for identifyStateless
posthog.identifyStateless();
```

---

#### identifyStatelessImmediate()

**Release Tag:** public

### Parameters

- **`distinctId`** (`string`)
- **`properties?`** (`PostHogEventProperties`)
- **`options?`** (`PostHogCaptureOptions`)

### Returns

- `Promise<void>`

### Examples

```react-native
// Generated example for identifyStatelessImmediate
posthog.identifyStatelessImmediate();
```

---

#### logMsgIfDebug()

**Release Tag:** public

### Parameters

- **`fn`** (`() => void`)

### Returns

- `void`

### Examples

```react-native
// Generated example for logMsgIfDebug
posthog.logMsgIfDebug();
```

---

#### sendImmediate()

**Release Tag:** public

### Parameters

- **`type`** (`string`)
- **`_message`** (`any`)
- **`options?`** (`PostHogCaptureOptions`)

### Returns

- `Promise<void>`

### Examples

```react-native
// Generated example for sendImmediate
posthog.sendImmediate();
```

---

#### wrap()

**Release Tag:** public

### Parameters

- **`fn`** (`() => void`)

### Returns

- `void`

### Examples

```react-native
// Generated example for wrap
posthog.wrap();
```

---

### Capture methods

#### flush()

**Release Tag:** public

Manually flushes the event queue.
You can set the number of events in the configuration that should queue before flushing. Setting this to 1 will send events immediately and will use more battery. This is set to 20 by default. You can also manually flush the queue. If a flush is already in progress it returns a promise for the existing flush.

### Returns

- `Promise<void>`

### Examples

```react-native
// manually flush the queue
await posthog.flush()
```

---

#### register()

**Release Tag:** public

Registers super properties that are sent with every event.
Super properties are properties associated with events that are set once and then sent with every capture call. They persist across sessions and are stored locally.

### Parameters

- **`properties`** (`PostHogEventProperties`) - An associative array of properties to store about the user

### Returns

- `Promise<void>`

### Examples

```react-native
// register super properties
posthog.register({
    'icecream pref': 'vanilla',
    team_id: 22,
})
```

---

#### screen()

**Release Tag:** public

Captures a screen view event.

**Notes:**

This function requires a name. You may also pass in an optional properties object. Screen name is automatically registered for the session and will be included in subsequent events.

### Parameters

- **`name`** (`string`) - The name of the screen
- **`properties?`** (`PostHogEventProperties`) - Optional properties to include with the screen event
- **`options?`** (`PostHogCaptureOptions`) - Optional capture options

### Returns

- `Promise<void>`

### Examples

#### Basic screen capture

```react-native
// Basic screen capture
posthog.screen('dashboard')
```

#### Screen capture with properties

```react-native
// Screen capture with properties
posthog.screen('dashboard', {
    background: 'blue',
    hero: 'superhog',
})
```

---

#### unregister()

**Release Tag:** public

Removes a super property so it won't be sent with future events.
Super Properties are persisted across sessions so you have to explicitly remove them if they are no longer relevant.

### Parameters

- **`property`** (`string`) - The name of the super property to remove

### Returns

- `Promise<void>`

### Examples

```react-native
// remove a super property
posthog.unregister('icecream pref')
```

---

### Feature flags methods

#### getFeatureFlag()

**Release Tag:** public

Gets the value of a feature flag for the current user.
Defaults to undefined if not loaded yet or if there was a problem loading. Multivariant feature flags are returned as a string.

### Parameters

- **`key`** (`string`) - The feature flag key

### Returns

**Union of:**

- `boolean`
- `string`
- `undefined`

### Examples

```react-native
// get feature flag value
const value = posthog.getFeatureFlag('key-for-your-boolean-flag')
```

---

#### getFeatureFlagPayload()

**Release Tag:** public

Gets the payload of a feature flag for the current user.
Returns JsonType or undefined if not loaded yet or if there was a problem loading.

### Parameters

- **`key`** (`string`) - The feature flag key

### Returns

**Union of:**

- `JsonType`
- `undefined`

### Examples

```react-native
// get feature flag payload
const payload = posthog.getFeatureFlagPayload('key-for-your-multivariate-flag')
```

---

#### isFeatureEnabled()

**Release Tag:** public

Checks if a feature flag is enabled for the current user.
Defaults to undefined if not loaded yet or if there was a problem loading.

### Parameters

- **`key`** (`string`) - The feature flag key

### Returns

**Union of:**

- `boolean`
- `undefined`

### Examples

```react-native
// check if feature flag is enabled
const isEnabled = posthog.isFeatureEnabled('key-for-your-boolean-flag')
```

---

#### reloadFeatureFlags()

**Release Tag:** public

Reloads feature flags from the server.
PostHog loads feature flags when instantiated and refreshes whenever methods are called that affect the flag. If you want to manually trigger a refresh, you can call this method.

### Returns

- `void`

### Examples

```react-native
// reload feature flags
posthog.reloadFeatureFlags()
```

---

#### reloadFeatureFlagsAsync()

**Release Tag:** public

Reloads feature flags from the server asynchronously.
PostHog loads feature flags when instantiated and refreshes whenever methods are called that affect the flag. If you want to manually trigger a refresh and get the result, you can call this method.

### Returns

**Union of:**

- `Promise<Record<string, boolean`
- `string>`
- `undefined>`

### Examples

```react-native
// reload feature flags and get result
posthog.reloadFeatureFlagsAsync().then((refreshedFlags) => console.log(refreshedFlags))
```

---

#### resetGroupPropertiesForFlags()

**Release Tag:** public

Resets group properties for feature flag evaluation.

### Parameters

- **`reloadFeatureFlags?`** (`boolean`) - Whether to reload feature flags after setting the properties. Defaults to true.

### Returns

- `void`

### Examples

```react-native
// reset group properties for flags
posthog.resetGroupPropertiesForFlags()
```

---

#### resetPersonPropertiesForFlags()

**Release Tag:** public

Resets person properties for feature flag evaluation.

### Parameters

- **`reloadFeatureFlags?`** (`boolean`) - Whether to reload feature flags after setting the properties. Defaults to true.

### Returns

- `void`

### Examples

```react-native
// reset person properties for flags
posthog.resetPersonPropertiesForFlags()
```

---

#### setGroupPropertiesForFlags()

**Release Tag:** public

Sets group properties for feature flag evaluation.
These properties are automatically attached to the current group (set via posthog.group()). When you change the group, these properties are reset.

### Parameters

- **`properties`** (`Record<string, Record<string, string>>`) - The group properties to set for flag evaluation
- **`reloadFeatureFlags?`** (`boolean`) - Whether to reload feature flags after setting the properties. Defaults to true.

### Returns

- `void`

### Examples

```react-native
// set group properties for flags
posthog.setGroupPropertiesForFlags({'company': {'property1': 'value', property2: 'value2'}})
```

---

#### setPersonPropertiesForFlags()

**Release Tag:** public

Sets person properties for feature flag evaluation.
Sometimes, you might want to evaluate feature flags using properties that haven't been ingested yet, or were set incorrectly earlier. You can do so by setting properties the flag depends on with this call. These are set for the entire session. Successive calls are additive: all properties you set are combined together and sent for flag evaluation.

### Parameters

- **`properties`** (`Record<string, string>`) - The person properties to set for flag evaluation
- **`reloadFeatureFlags?`** (`boolean`) - Whether to reload feature flags after setting the properties. Defaults to true.

### Returns

- `void`

### Examples

```react-native
// set person properties for flags
posthog.setPersonPropertiesForFlags({'property1': 'value', property2: 'value2'})
```

---

### Group analytics methods

#### group()

**Release Tag:** public

Associates the current user with a group.
Group analytics allows you to associate the events for that person's session with a group (e.g. teams, organizations, etc.). This is a paid feature and is not available on the open-source or free cloud plan.

### Parameters

- **`groupType`** (`string`) - The type of group (e.g. 'company', 'team')
- **`groupKey`** (`string`) - The unique identifier for the group
- **`properties?`** (`PostHogEventProperties`) - Optional properties to set for the group

### Returns

- `void`

### Examples

#### associate with a group

```react-native
// associate with a group
posthog.group('company', 'company_id_in_your_db')
```

#### associate with a group and update properties

```react-native
// associate with a group and update properties
posthog.group('company', 'company_id_in_your_db', {
  name: 'Awesome Inc.',
  employees: 11,
})
```

---

### Privacy methods

#### optIn()

**Release Tag:** public

Opts the user in to data capture.
By default, PostHog has tracking enabled unless it is forcefully disabled by default using the option defaultOptIn: false . Once this has been called it is persisted and will be respected until optOut is called again or the reset function is called.

### Returns

- `Promise<void>`

### Examples

```react-native
// opt in to tracking
posthog.optIn()
```

---

#### optOut()

**Release Tag:** public

Opts the user out of data capture.
You can completely opt-out users from data capture. Once this has been called it is persisted and will be respected until optIn is called again or the reset function is called.

### Returns

- `Promise<void>`

### Examples

```react-native
// opt out of tracking
posthog.optOut()
```

---

### LLM analytics methods

#### captureTraceFeedback()

**Release Tag:** public

Capture written user feedback for a LLM trace. Numeric values are converted to strings.

### Parameters

- **`traceId`** (`string | number`) - The trace ID to capture feedback for.
- **`userFeedback`** (`string`) - The feedback to capture.

### Returns

- `void`

### Examples

```react-native
// Generated example for captureTraceFeedback
posthog.captureTraceFeedback();
```

---

#### captureTraceMetric()

**Release Tag:** public

Capture a metric for a LLM trace. Numeric values are converted to strings.

### Parameters

- **`traceId`** (`string | number`) - The trace ID to capture the metric for.
- **`metricName`** (`string`) - The name of the metric to capture.
- **`metricValue`** (`string | number | boolean`) - The value of the metric to capture.

### Returns

- `void`

### Examples

```react-native
// Generated example for captureTraceMetric
posthog.captureTraceMetric();
```

---
