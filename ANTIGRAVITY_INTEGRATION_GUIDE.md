# ANTIGRAVITY — Full Backend Integration Guide
## Mobile App: Complete Fix Manual

**Prepared for:** Antigravity Development Team
**Date:** 2026-03-04
**Urgency:** Critical — the app is not showing real data and core actions are broken
**Who this is for:** The developer(s) at Antigravity responsible for the mobile app codebase
**What this is:** A complete, step-by-step text guide explaining every change that needs to be made to the mobile app so it works correctly with the backend API — covering data rendering, accept/reject/submit actions, error handling, security, and scalability. There is no code in this document. Everything is explained in plain language so it can be understood, discussed, and implemented correctly.

---

## BEFORE YOU START — READ THIS SECTION COMPLETELY

### The most important thing to understand

The backend API is working correctly. It has been verified. It returns the right data in the right format. Every single problem described in this document is caused by the mobile app misreading or ignoring what the API sends back. You must not change the API. All fixes happen in the mobile app only.

### Why the app is broken right now

When a mobile app talks to a backend API, the API sends back data in a specific structure — with specific field names, specific data types, and specific nesting. The mobile app must read that structure exactly as it arrives. Right now, the app is making several wrong assumptions about how that data is structured. As a result, data is missing on screen, buttons never work, dates are broken, and errors are silent. This guide explains every wrong assumption, why it is wrong, and exactly what needs to change.

### The principle you must follow throughout this fix

Introduce a translation layer between the raw API data and everything the app displays. The raw API response should never flow directly into your UI components. Instead, every response from the API should pass through a single translation step that converts it into a clean, predictable internal shape. Every component in the app reads from that internal shape — never from the raw API. This one principle, if followed correctly, will fix all seven of the problems described below and prevent this class of bug from ever happening again.

---

## PART ONE — THE SEVEN PROBLEMS

This section describes every discrepancy between what the API sends and what the app currently expects. Read all seven before starting work. Some of them interact with each other, and understanding all of them will help you see the overall picture before you begin making changes.

---

### Problem 1 — Field names are in the wrong format

The API sends all field names in snake_case format. This means words are separated by underscores. For example, the unique identifier for a request comes back from the API as `request_id`. The timestamp for when a request was created comes back as `created_at`. The field for whether a user can approve comes back as `can_approve`.

The mobile app currently expects these same fields to be in camelCase format, where words are joined together with the first letter of each subsequent word capitalised. So the app is looking for `requestId` instead of `request_id`, `createdAt` instead of `created_at`, and `canApprove` instead of `can_approve`.

Because these names do not match, the app reads `undefined` for every single one of these fields. A request item where the ID is undefined cannot be tracked, updated, or acted upon. This is the foundational bug that causes almost all the other visible failures.

**What needs to change:** When the API response arrives, every snake_case field name must be translated to its camelCase equivalent before any part of the app reads it.

---

### Problem 2 — The status field is the wrong type

The API sends the status of each request as a string. The three possible values it can send are the word `pending`, the word `approved`, and the word `rejected`. These are string values.

The mobile app currently treats the status field as if it were a boolean — true or false. Somewhere in the app, there is logic that checks whether the status is true to determine whether something is pending. Since the API never sends true or false, this check always fails. The result is that the app never correctly identifies a request as pending, which is why the accept and reject buttons are always disabled — the app thinks nothing is ever in a state where action can be taken.

**What needs to change:** The app must read the status field as a string and compare it to the string values `pending`, `approved`, and `rejected`. Any logic that treats status as a boolean must be removed and replaced with string comparisons.

---

### Problem 3 — Dates arrive as text but are used as numbers

The API sends dates and timestamps as strings in ISO 8601 format. An example of this format is `2026-03-04T10:00:00Z`. This is a standard, internationally recognised way of representing a date and time as text.

The mobile app currently expects dates to arrive as Unix timestamps, which are plain numbers representing the number of seconds or milliseconds since January 1, 1970. Because the app receives a text string and tries to use it as a number, every date in the app either displays as Invalid Date, shows a completely wrong value, or causes a runtime crash.

**What needs to change:** When a date string arrives from the API, it must be converted into a proper Date object before it is used anywhere in the app. Once it is a Date object, the app can format it however it likes for display — as a short date, a relative time, a full timestamp — but the conversion from the ISO string must happen at the translation layer, not inside each individual component.

---

### Problem 4 — Permission fields are inside a nested object that is never read

The API sends information about what actions a user can take on a request inside a nested object called `permissions`. Inside that object are two boolean fields: `can_approve` and `can_reject`. These control whether the accept and reject buttons should be shown and enabled.

The mobile app never reads the `permissions` object at all. It does not look inside it. As a result, `can_approve` and `can_reject` are always undefined in the app. Since these values are undefined, the buttons that depend on them never appear.

This is the direct cause of the broken accept and reject buttons. Even if Problems 1 and 2 were fixed, the buttons would still not work until this problem is also fixed, because the permission fields that control the buttons are being completely ignored.

**What needs to change:** The translation layer must reach inside the `permissions` object, read `can_approve` and `can_reject`, and expose them as flat fields on the internal model — for example, as `canApprove` and `canReject`. If the `permissions` object is missing entirely for any reason, both should default to `false`.

---

### Problem 5 — Avatar images crash when the user has no photo

The API sends the user's avatar image URL inside a field called `avatar_url` on the user object. This field is nullable — it can contain a valid URL string, or it can contain null if the user has not uploaded a profile photo.

The mobile app currently assumes this field always contains a valid string. It passes the value directly to an image component without checking whether it might be null. When a user without an avatar photo appears, the app receives null, passes it to the image component, and crashes.

**What needs to change:** The translation layer must safely handle null for this field. If the URL is null, the app should fall back to a default display — typically showing the user's initials in a coloured circle. The image component must never receive null. It should receive either a valid URL or nothing, and the fallback display should activate whenever there is no URL.

---

### Problem 6 — Pagination data is sent by the API but ignored by the app

The API sends every list response with a metadata section. Inside this metadata section are fields that describe the full pagination state: the total number of records, the current page number, how many records are on each page, and whether there are more pages available after the current one.

The mobile app currently does not read this metadata section at all. It does not know how many total records exist, and it does not know whether there is a next page. Because of this, the infinite scroll feature on the list screen does not work — the app never loads any page beyond the first one. The total count is never displayed, and the user cannot scroll through more than the initial batch of results.

**What needs to change:** The translation layer must read all four metadata fields and expose them on the internal model. The list screen must use the `hasNext` field to know when to trigger loading of the next page, and must send the correct page number with each subsequent request. The `totalCount` field should be displayed somewhere on the screen so the user knows how many records exist in total.

---

### Problem 7 — API errors are silently discarded

When the API encounters a problem — for example, when a user tries to approve a request they do not have permission to approve, or when a session expires, or when a record is not found — it responds with an error status code and sends back a structured error body. This body includes a machine-readable error code and a human-readable message.

The mobile app currently does not handle these error responses. The fetch calls have no error handling. When an error response arrives, the app either crashes silently, shows a blank screen, or ignores the response entirely. The user sees nothing and has no way to know what went wrong or what to do next.

**What needs to change:** Every API call must check whether the response was successful. If it was not, the error code and message from the response body must be captured and stored. The component that made the action must display a readable error message to the user. For server errors, this means showing the message from the API. For network failures, this means showing a generic connectivity message. For timeouts, this means showing a timeout message. The user must always know what happened and always have a way to retry.

---

## PART TWO — THE FILES YOU NEED TO CREATE

This section describes every new file that needs to be created in the mobile app, what each file is responsible for, and what logic it must contain. The files must be created in the order they are listed, because each one depends on the ones before it.

---

### File 1 — The Type Definitions File

**Where to create it:** Inside a folder called `types` inside your API folder. The filename should be something like `ApiTypes`.

**What this file is for:** This file is the single source of truth for the shape of all data in the app. It contains two categories of type definitions. The first category describes the raw shapes that the API actually sends — these reflect the API exactly, with snake_case names, nullable fields, and nested objects. The second category describes the internal shapes that the app uses — these use camelCase names, proper Date objects instead of strings, and flat structures without nesting.

**What it must contain:**

The raw API types section must define the shape of a single request as the API sends it. This includes the `request_id` string, the `status` string with its three possible values, the `created_at` and `updated_at` ISO strings, the `title` string, the nullable `description`, and the `permissions` nested object containing the two boolean permission fields. It must also define the shape of the user object that comes nested inside each request, including the nullable `avatar_url`. It must define the shape of a paginated list response, which has a `data` array and a `meta` object containing `total_count`, `page`, `per_page`, and `has_next`. It must also define the shape of an error response body, containing `error_code`, `message`, and an optional `details` object.

The internal app model section must define the clean shape that all components will use. The request model must have an `id` string, a `status` field typed as a union of the three string values, `createdAt` and `updatedAt` as proper Date objects, flat boolean fields `canApprove` and `canReject`, a nullable `avatarUrl`, and flat user fields `userName`, `userEmail`, and `userId`. It must also define a paginated result type that wraps an array of the internal request model and includes `totalCount`, `page`, `perPage`, and `hasNext` as flat top-level fields.

---

### File 2 — The Normalizer File

**Where to create it:** Inside a folder called `normalizers` inside your API folder. The filename should be something like `requestNormalizer`.

**What this file is for:** This is the most important file in the entire fix. It is the translation layer described in the opening principle. It takes raw API data and converts it into the internal app model. Nothing in the app should ever read raw API data directly — everything must go through this file first.

**What it must contain:**

A function that takes a single raw API request object and returns an internal request model. This function is responsible for fixing all seven problems in one place. It must read `request_id` and output it as `id`. It must read the `status` string and pass it through a safety check that confirms it is one of the three valid values before outputting it. It must take the `created_at` string and construct a real Date object from it, doing the same for `updated_at`. It must reach inside the `permissions` object to read `can_approve` and output it as `canApprove`, and do the same for `can_reject` into `canReject`, defaulting both to false if the permissions object is missing entirely. It must reach inside the `user` object to extract `avatar_url` into `avatarUrl`, `name` into `userName`, `email` into `userEmail`, and `id` into `userId`, providing sensible defaults for each if the user object is missing. It must handle null safely for every nullable field.

A separate function that takes a full paginated API list response and returns the internal paginated result type. This function must map the `data` array through the single-item normalizer function described above, and must separately map the `meta` object fields — reading `total_count` into `totalCount`, `page` into `page`, `per_page` into `perPage`, and `has_next` into `hasNext`. It must provide safe defaults for all of these in case the meta object is missing.

A private helper function used by the single-item normalizer to validate the status value. This function accepts an unknown value, checks whether it equals one of the three valid status strings, returns it if valid, and returns `pending` as a default if not. In development mode, it should log a warning when it encounters an unexpected value so developers know the API has sent something unexpected.

---

### File 3 — The API Client File

**Where to create it:** Directly inside your API folder. The filename should be something like `client`.

**What this file is for:** This is the single function through which every API call in the app must pass. No screen, component, or service should ever call the `fetch` function directly. All network requests go through this client. It handles authentication, error handling, timeouts, and normalisation in one consistent place.

**What it must contain:**

A custom error class that extends the built-in Error class. This class must store three additional pieces of information alongside the standard error message: the machine-readable error code from the API response, the HTTP status code of the response, and optionally the details object from the error body. Having a custom error class allows components to check whether an error came from the API and read its specific code, rather than just seeing a generic error message.

A central fetch function that accepts four things: the URL path to call, the normalizer function to run on the response, optional request options such as the HTTP method and request body, and an internal flag for whether this is a retry after a token refresh. This function must perform the following steps in order: create a timeout controller that will cancel the request after fifteen seconds if it has not completed; retrieve the current auth token from secure storage; make the fetch call with the Authorization header set to `Bearer` followed by the token, along with Content-Type and Accept headers; if the response comes back with a 401 status and this is not already a retry, call the token refresh function and then call itself again with the retry flag set to true; if the response is not successful after all of that, read the error body and throw an instance of the custom error class populated with the error code, status, and message from the response; if the response is successful, pass the response body through the normalizer function and return the result; if the normalizer throws for any reason, throw a custom error with a parse error code; in all cases, cancel the timeout in the finally block so it does not fire after the request has already completed.

---

### File 4 — The Token Manager File

**Where to create it:** Inside an `auth` folder in your source directory. The filename should be something like `tokenManager`.

**What this file is for:** This file handles all reading and writing of authentication tokens. Tokens must be stored in the platform's hardware-backed secure storage — iOS Keychain and Android Keystore — not in AsyncStorage, not in memory, and not in any state management library. This is a security requirement.

**What it must contain:**

A function for storing both the access token and the refresh token after a successful login. This function must write to the platform keychain with the strictest available access controls: tokens should only be accessible when the device is unlocked, and hardware-level security should be requested where available.

A function for reading the current access token. This is called by the API client before every request. If no token exists in the keychain, this function must throw an error indicating the user is not authenticated so the app can redirect to the login screen.

A function for refreshing the access token using the refresh token. This is called automatically by the API client when it receives a 401 response. It must read the stored refresh token, call the auth refresh endpoint on the API directly using a plain fetch call without going through the API client to avoid circular dependency, store the new tokens that come back, and throw an error if the refresh endpoint itself returns a failure — because at that point the session is truly expired and the user needs to log in again.

A function for clearing all stored tokens. This is called on logout.

---

### File 5 — The Requests Service File

**Where to create it:** Inside a `services` folder inside your API folder. The filename should be something like `requestsService`.

**What this file is for:** This file contains one function for each action the app can take on requests. Every screen and component that needs data goes through this service. The service functions are thin — they build the URL, pass it to the API client with the appropriate normalizer, and return the typed result. They contain no business logic.

**What it must contain:**

A function for fetching a paginated list of requests. It must accept optional parameters for the page number, the number of items per page, and optionally a status filter. It must construct the query string correctly, pass it to the API client with the list normalizer, and return the paginated result model.

A function for fetching a single request by its ID. It must accept an ID string, call the single-item endpoint, and return a single request model.

A function for approving a request. It must accept the request ID, make a POST call to the approve endpoint, pass the response through the single-item normalizer, and return the updated request model. This function should only ever be called from the component after it has already verified that `canApprove` is true and the status is pending — but the service itself does not need to enforce that.

A function for rejecting a request. It must accept the request ID and a reason string, make a POST call to the reject endpoint with the reason in the request body, pass the response through the single-item normalizer, and return the updated request model.

---

### File 6 — The Requests Data Hook

**Where to create it:** Inside a `hooks` folder in your source directory. The filename should be something like `useRequests`.

**What this file is for:** This hook encapsulates all the state management for the list screen. Any screen that shows a list of requests uses this hook. The hook handles the initial load, pagination, pull-to-refresh, in-place updates after actions, error state, and loading state. The screen itself becomes very simple because all the complexity lives here.

**What it must contain:**

State for the current data, which starts as null and is populated with the paginated result after the first successful fetch. State for a loading boolean that is true whenever a fetch is in progress. State for an error, which holds either null or an error object when something goes wrong. State for the current page number, starting at one.

A load function that takes a page number, cancels any previously in-flight request by aborting it, sets loading to true and clears the error, calls the requests service list function with the given page number, and on success either replaces the current data with the new result if this is page one, or appends the new items to the existing items if this is a subsequent page. When appending, it should deduplicate by ID in case of any overlap. On failure, it should store the error unless it is an abort error from a cancelled request. In all cases it should set loading back to false when done.

A refresh function that resets the page back to one and triggers a fresh load. This is connected to the pull-to-refresh gesture on the list.

A load-more function that increments the page number if `hasNext` is true and loading is not currently in progress. This is triggered when the user scrolls near the bottom of the list.

An update-item function that takes a single updated request model and replaces the matching item in the current data by ID. This is called after a successful approve or reject action. It updates the list in place without requiring a full reload — the card visually updates to show the new status and the buttons disappear.

A cleanup effect that aborts any in-flight request when the component using the hook is unmounted, to prevent state updates on unmounted components.

---

### File 7 — The Request Card Component

**Where to create it:** Inside your `components` folder. The filename should be something like `RequestCard`.

**What this file is for:** This is the individual card that renders a single request in the list. It contains the user information, the request details, the status indicator, and the accept and reject action buttons. This component receives a single request model and an update callback. All the data it displays comes from the model — it never fetches anything itself.

**What it must contain:**

Local state for tracking which action is currently loading — either `approve`, `reject`, or null when neither is in progress. Local state for an error message string that is null when there is no error and populated with a readable message when an action fails.

Derived boolean values computed from the request model that determine the actionable state of each button. The accept button is actionable only when `canApprove` is true AND the status is equal to the string `pending`. The reject button is actionable only when `canReject` is true AND the status is equal to the string `pending`. If either condition is false, the button is either hidden or shown as disabled depending on which makes more sense for the design. These two conditions must be computed from the model — they must never be hardcoded.

A handler for the approve action. This handler must first verify that the approve conditions are met and that no action is already loading, then set the loading state to approve and clear any existing error, then call the approve function from the requests service, then pass the returned updated model to the onUpdate callback provided by the parent, then catch any error and set the error message to the error's message if it is an API error, or to a generic fallback message otherwise, then clear the loading state in all cases.

A handler for the reject action that follows the same pattern as the approve handler but calls the reject service function with the request ID and a reason.

The rendered output must include the user avatar displayed through a safe component that handles null URLs, the user name, the user email, the request title, the description if it exists, a formatted date, a status badge that shows a different colour and label based on whether the status string is pending, approved, or rejected, an error message area that is only shown when there is an error, and the action buttons section which is only rendered at all when at least one of `canApprove` or `canReject` is true. Inside that section, each button is only rendered when the corresponding permission is true, and each button is disabled and shows a loading spinner when its action is currently in progress.

The avatar component must check whether the URL is null or empty. If it has a valid URL, it renders an image. If it does not, it generates initials from the user's name — the first letter of the first word and the first letter of the second word if it exists — and renders those initials inside a coloured circle.

The status badge component must map the status string to a display label and a colour. Pending maps to a yellow or amber badge. Approved maps to a green badge. Rejected maps to a red badge.

---

### File 8 — The List Screen

**Where to create it:** Inside your `screens` folder. The filename should be something like `RequestsScreen`.

**What this file is for:** This is the screen that shows the full list of requests. It uses the data hook and the card component. Its only job is to connect the hook's state to the list rendering logic and handle the different visual states the screen can be in.

**What it must contain:**

A call to the data hook to get all necessary state and functions.

Logic to display a full-screen loading indicator during the initial load, before any data has arrived. This should show only when loading is true and there is no data yet.

Logic to display a full-screen error state when loading has failed and there is no data. This state should show the error message in a readable format and include a retry button that calls the refresh function from the hook.

Logic to display an empty state message when loading has succeeded but the list is empty. This should also include a way to refresh.

The main list rendering that shows when there is data. This must use the platform's scrollable list component with the following configuration: the list data is the items array from the hook's paginated result; each item is rendered using the request card component with the update-item function from the hook passed as the onUpdate callback; pull-to-refresh is wired to the loading state and the refresh function; the end-reached event is wired to the load-more function with a threshold that triggers loading when the user is roughly twenty percent from the bottom; a footer component shows a loading spinner when data exists but a fetch is still in progress, indicating a next-page load; a header component shows the total count of records from the paginated result's totalCount field.

---

### File 9 — The Error Boundary Component

**Where to create it:** Inside your `components` folder. The filename should be something like `ApiErrorBoundary`.

**What this file is for:** This is a class component that wraps around any section of the app that makes API calls. If any component inside it throws an unhandled error — for example if a normalizer receives an unexpected shape and throws, or if a component tries to render an undefined value — the error boundary catches it and shows a fallback screen instead of crashing the entire app.

**What it must contain:**

State for whether an error has been caught and what that error is.

The static method that React calls when a child component throws. It must set the error state with the caught error.

The lifecycle method that fires after an error has been caught. In development mode, it should log the error to the console. In production, it should report the error to whatever crash analytics service is being used.

A retry handler that clears the error state, causing React to attempt to re-render the children.

The render method that shows the children normally when no error has been caught, and shows a fallback error screen when an error has been caught. The fallback screen should display the error message if it came from the API error class, or a generic message if it did not. It should display the error code if available. It should include a try-again button connected to the retry handler.

This component should be used in the navigation configuration to wrap the requests screen, so that any crash inside that screen is caught and recoverable rather than fatal.

---

## PART THREE — HOW EVERYTHING CONNECTS

This section describes the flow of data through the entire system once all the files above have been created, so you can verify your implementation makes sense end to end.

### The flow for loading the list

When the user navigates to the requests screen, the screen calls the data hook. The hook triggers a load for page one. The load function calls the requests service list function with page one and the default page size. The service function builds the URL with the correct query parameters and calls the API client with the list normalizer. The API client retrieves the token from the token manager, makes the fetch call with the authorization header, receives the response, and passes the response body through the list normalizer. The list normalizer converts every item in the data array through the single-item normalizer, fixing all seven problems in the process, and maps all the meta fields onto the paginated result. The API client returns the paginated result to the service, which returns it to the hook. The hook stores it in state and sets loading to false. The screen re-renders with the data. The list shows all the cards. Each card receives its request model and displays the user information, title, description, date, status badge, and action buttons correctly.

### The flow for approving a request

The user taps the Accept button on a card. The button is only tapable because `canApprove` was true and the status was pending in the request model — both conditions that were fixed by the normalizer. The card's approve handler fires. It sets the loading state to approve, which causes the button to show a spinner. It calls the requests service approve function with the request ID. The service calls the API client with a POST method and the single-item normalizer. The API client adds the auth header and makes the call. The API processes the approval, changes the status to approved, and returns the updated request object. The API client passes it through the normalizer. The normalizer produces an updated request model where the status is now the string `approved` and `canApprove` and `canReject` are whatever the API returned — likely both false now. The service returns this model to the card. The card clears the loading state and calls the onUpdate callback with the updated model. The hook's updateItem function replaces the old model in the list with the new one. The card re-renders. The status badge now shows Approved. Because the status is no longer `pending`, both buttons are now in a disabled state and since `canApprove` is likely false, the Accept button is no longer rendered at all.

### The flow for a failed action

The user taps the Reject button. The card's reject handler fires and calls the reject service. The API returns a 403 status because the user's session context does not have permission. The API client reads the error body, extracts the error code and message, and throws an instance of the custom API error class. The error propagates back to the reject handler. The handler catches it, reads the message from the error object, sets it as the card's error message state, and clears the loading state. The button stops showing a spinner and becomes tapable again. The error message appears below the card content so the user knows what went wrong.

### The flow for token expiry

The user has been idle and their access token has expired. They try to load the list. The API client makes the request with the expired token. The server returns a 401. The API client detects the 401 and calls the token manager's refresh function. The refresh function reads the stored refresh token, calls the refresh endpoint, receives a new access token and refresh token, stores both in the keychain, and returns. The API client then retries the original request with the new token. This time the server responds successfully. The user never sees a login screen and never knows a token refresh happened.

---

## PART FOUR — SECURITY REQUIREMENTS

The following security standards must be met by the implementation. These are not optional.

### Token storage

Authentication tokens must be stored in the platform's hardware-backed secure storage. On iOS this is the Keychain. On Android this is the Keystore accessed through the EncryptedSharedPreferences or an equivalent secure credential store. They must never be stored in AsyncStorage, in a state management library, in a file, or logged to the console. The storage configuration must specify that tokens are only accessible when the device is unlocked, must request hardware-level security where available, and must restrict access to the current device only so tokens cannot be restored to a different device from a backup.

### Transport security

All API calls must be made over HTTPS. Plain HTTP must be blocked. On Android this is enforced through the Network Security Configuration file. On iOS this is enforced through App Transport Security settings. Both platforms must be configured.

### Certificate pinning

The app should be configured with certificate pinning for the API domain, so that even if a malicious party presents a valid certificate from a trusted authority, the app will reject connections that do not match the expected certificate fingerprint. Backup pins must be configured to cover the certificate rotation window so pinning does not cause downtime when certificates are renewed.

### Server-side enforcement

The permission fields `canApprove` and `canReject` in the app model are used to control what the UI shows. They must never be used as the authorisation decision. The server always enforces its own permissions check on every approve and reject call. If a user somehow bypasses the UI and makes a raw approve call without permission, the server will return a 403. The app must handle that 403 as an error and display it. The client-side permission check is a user experience improvement only.

### Logging

No raw API response bodies, tokens, or user data must ever be logged in production builds. Any logging of API data must be wrapped in a development-mode check so it only fires in non-production environments. Crash reporting can send error codes and messages but must not include raw response bodies.

### Request cancellation

Every API request must be created with an abort controller. When a component is unmounted or when a new request supersedes an old one, the old request must be aborted. This prevents stale responses from arriving after a component is gone and writing to its state.

### Encrypted local cache

If any list data is cached locally for offline support, it must be stored in an encrypted store. Unencrypted storage of user request data is not acceptable.

---

## PART FIVE — SCALABILITY REQUIREMENTS

The following patterns must be followed to ensure the app performs well as the number of users and records grows.

### Pagination

The list must never attempt to load all records at once. It must always request a specific page of a specific size. The default page size should be twenty items. When the user scrolls near the bottom of the list, the next page must be loaded and appended to the existing list. Loading must not restart from page one when a new page is loaded. Deduplication by ID must happen when appending pages in case of any overlap between pages.

### Request deduplication

If the same API request is already in-flight and another part of the app triggers the same request, the second trigger should not create a second network call. The data hook handles this naturally because it cancels previous requests when a new one starts for the same data. Services that are called from multiple places simultaneously should coalesce duplicate calls.

### Optimistic updates

After a successful approve or reject action, the card must update in place without triggering a reload of the entire list. The `updateItem` function in the hook handles this by replacing the specific item by ID. This keeps the experience fast even on slow networks.

### Timeout enforcement

Every API call must have a fifteen-second timeout. If the server does not respond within fifteen seconds, the call must be aborted and a timeout error must be shown to the user with a retry option. Calls must never hang indefinitely.

### Modular service boundaries

Each domain area of the app — requests, users, authentication — must have its own service file, its own normalizer, and its own type definitions. Adding a new API resource should never require modifying existing files. The pattern established by the requests domain should be replicated exactly for any future domains.

---

## PART SIX — TESTING REQUIREMENTS

Antigravity must write automated tests for the critical paths described below before the work is considered complete.

### Normalizer tests

The normalizer is the most important file to test because it fixes all seven bugs. Tests must verify each of the following scenarios individually: that `request_id` in the API input becomes `id` in the output; that a status string of `pending` in the API input becomes a status string of `pending` in the output (not a boolean); that a `created_at` ISO string in the API input becomes a proper Date object in the output with a valid, non-NaN timestamp; that the boolean inside `permissions.can_approve` in the API input becomes `canApprove` in the output; that when the `permissions` object is missing entirely, both `canApprove` and `canReject` default to false in the output; that when `avatar_url` is null in the API input, `avatarUrl` is null in the output and nothing throws; that when `avatar_url` has a value, it is preserved in the output; that when the `user` object is missing entirely, the user fields default to safe fallback values and nothing throws; that an unknown status value causes `status` to be set to `pending` in the output with a console warning; that the list normalizer correctly maps `meta.total_count` to `totalCount` in the output; and that the list normalizer correctly maps `meta.has_next` to `hasNext` in the output.

### Request card component tests

Tests must verify each of the following scenarios: that when both `canApprove` and `canReject` are true and the status is pending, both the Accept and Reject buttons are rendered and accessible; that when `canApprove` is false, the Accept button is not rendered; that when `canReject` is false, the Reject button is not rendered; that when the status is `approved`, both buttons are rendered but are in a disabled state; that when the Accept button is tapped, the approve service function is called with the correct request ID; that after a successful approve call, the onUpdate callback is called with the updated model returned from the service; that when the approve call fails with an API error, the error message from the API is displayed on the card; and that a card with a null `avatarUrl` renders without throwing.

### Data hook tests

Tests must verify that the hook loads page one on mount, that calling refresh resets to page one, that calling loadMore increments the page when `hasNext` is true, that calling loadMore does nothing when `hasNext` is false, that updateItem replaces the correct item by ID without affecting other items, and that errors from the service are stored in the error state.

---

## PART SEVEN — MANUAL TESTING CHECKLIST

Before the work is submitted, a developer must manually walk through every scenario in this checklist on a real device or simulator connected to the actual backend.

### List loading

Confirm that opening the requests screen shows a loading indicator, then populates with real cards from the API. Confirm that each card shows the correct user name, user email, title, and description from the API response. Confirm that dates display as readable formatted dates and not as numbers, error text, or blank. Confirm that the total record count is visible somewhere on the screen. Confirm that the status badges show the correct colour and text for each status value.

### Accept button

Find a request where the user has approve permission and the status is pending. Confirm that the Accept button is visible and tappable. Tap it. Confirm that a loading spinner appears on the button. Confirm that the button cannot be tapped again while the spinner is showing. Confirm that after the API responds, the spinner disappears, the status badge changes to Approved, and the Accept and Reject buttons are no longer shown or are disabled.

### Reject button

Find a request where the user has reject permission and the status is pending. Confirm that the Reject button is visible and tappable. Tap it. Confirm the same loading and update behaviour as described for the Accept button, but that the status changes to Rejected.

### No permission scenarios

Find a request where `can_approve` is false in the API response. Confirm that the Accept button does not appear at all. Find a request where `can_reject` is false. Confirm that the Reject button does not appear. Find a request where the status is approved. Confirm that even if the permission fields are true, the buttons are disabled.

### Avatar fallback

Find a user in the system who has no profile photo so their `avatar_url` is null. Confirm that their card displays initials in a coloured circle and does not crash.

### Pagination

Confirm that scrolling to the bottom of the list triggers loading of the next page and that new cards appear below the existing ones without the existing ones disappearing. Confirm that scrolling past the last page does not trigger additional loads.

### Pull to refresh

Pull down on the list from the top. Confirm that the loading indicator appears and that the list reloads from page one with fresh data.

### Network error

Disable the network on the test device. Open the requests screen. Confirm that a readable error message is shown. Re-enable the network. Tap the retry button. Confirm that the data loads successfully.

### Action failure

While logged in as a user who does not have approve permission on a specific request, manually trigger an approve call through the UI if possible, or temporarily modify the UI to bypass the button visibility check. Confirm that the API returns an error, that the error message is displayed on the card, and that the card does not crash.

### Token expiry

Allow the access token to expire. Perform any action that requires authentication. Confirm that the action completes successfully without requiring the user to log in again, indicating that the silent token refresh worked.

---

## PART EIGHT — INSTALL REQUIREMENTS

The following packages must be installed before implementing the token manager. Everything else required is available in the existing React Native and TypeScript toolchain.

The package for hardware-backed secure credential storage must be installed using the package manager. After installing, the native code must be linked. On iOS this requires running the pod install command in the iOS directory. On Android no additional steps are needed beyond the package installation. The package provides access to iOS Keychain and Android Keystore through a single unified API.

A testing library for React Native components must be installed as a development dependency to support the component tests described in Part Six.

---

## SUMMARY — THE SINGLE MOST IMPORTANT THING

Every problem in this app comes from the same root cause: raw API data flows directly into UI components with no translation step. The fix is to introduce one translation file — the normalizer — that converts all API responses into clean internal models before anything else in the app ever sees them. If you build that one file correctly and route all API data through it, you will fix all seven bugs at once. Everything else in this guide — the error handling, the pagination, the secure token storage, the button logic — builds on that foundation.

Do not skip the normalizer. Do not work around it. Do not partially implement it. Build it fully, test it thoroughly, and make it the single entry point for all API data into the rest of the app.

---

*This document was prepared specifically for Antigravity to guide the complete integration of the mobile app with the backend API. The backend requires no changes. All work described here is on the mobile client only. Estimated scope: one senior React Native developer, three to five working days including testing.*

*Version 1.0 · 2026-03-04*
