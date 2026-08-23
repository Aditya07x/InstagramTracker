# Instagram Tracker App Permissions List

The Instagram Tracker application requests the following Android permissions to safely monitor app usage, trigger timely surveys, and track on-screen events. Each permission is listed with its system name and the plain-language reason it's needed by the app.

| No. | Permission System Name | Purpose | Why it's needed |
|---|---|---|---|
| 1 | Accessibility Service (`BIND_ACCESSIBILITY_SERVICE`) | This is the core permission that allows the app to visually inspect screen elements and detect interactions within Instagram (e.g., determining which reel is playing, detecting scrolls and clicks). | Without this, the app cannot passively observe usage behavior or trigger interactions based on specific visual cues in the Instagram app. |
| 2 | Foreground Service (`FOREGROUND_SERVICE` & `FOREGROUND_SERVICE_DATA_SYNC`) | Allows the app's tracking and data synchronization services to run persistently in the background. | Ensures the tracking logic doesn't get aggressively killed by the Android system while the user is using the phone or other apps. This also places a persistent notification in the status bar so the user is transparently aware the app is running. |
| 3 | Usage Access (`PACKAGE_USAGE_STATS`) | Allows the app to query the system for aggregate statistics about application usage. | This is crucial for detecting exactly when the user opens or leaves the Instagram app. It lets the tracker know when to start or pause monitoring and when to possibly trigger surveys. |
| 4 | Post Notifications (`POST_NOTIFICATIONS`) | Grants the app the ability to push notifications to the user (required on Android 13+). | Needed for the Foreground Service's persistent notification, and to send users alerts when it's time to complete a retroactive survey or delayed probe. |
| 5 | Schedule Exact Alarms (`SCHEDULE_EXACT_ALARM`) | Allows the app to set highly precise timers. | Used for scheduling immediate and time-sensitive tasks, such as firing off delayed experience probes or generating retroactive surveys exactly when intended. |
| 6 | Internet (`INTERNET`) | Allows the app to open network sockets. | Enables the app to sync collected data, download necessary resources, or send off completed surveys to remote servers securely. |
