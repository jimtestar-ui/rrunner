# 4D Framework Prompt: Gig Driver Traffic Logic & Dashboard

## [DESTINATION]
**Objective:** Architect the core state management and traffic calculation logic for the **Gig Driver Traffic App**. 
**Goal:** Create a system where a driver can refresh 20+ destinations simultaneously and receive immediate, color-coded traffic feedback based on their current GPS location to make split-second "Accept/Decline" decisions for gig work.

---

## [DEFINITION]
The output must adhere to these **binary success criteria**:
1. **Layout Strategy:** Tiles must be responsive. If N > 10, the UI must scale down to ensure zero scrolling (Single-Screen View).
2. **Logic Thresholds:** - **Green:** < `Threshold_1` (Default 5m).
   - **Orange:** Between `Threshold_1` and `Threshold_2` (Default 15m) **AND** an alternate route exists.
   - **Red:** > `Threshold_2` **OR** (Congestion exists and No Alternate Route exists).
3. **Performance:** The fetch-to-UI update cycle must complete in < 5 seconds.
4. **Privacy:** Location access MUST be "Foreground Only" (triggered only by the button press).

---

## [DOUBT]
**Strict Integrity Rules:**
- **Permission Denial:** If the driver denies location, do not "fail silently." The logic must return a `USER_ACTION_REQUIRED` state that triggers the system permission settings.
- **Data Gaps:** If the Google Maps Routes API fails to return `speed_reading_intervals` for a specific segment, do not guess the traffic color. Mark the tile as `STALE/UNKNOWN` and display the last known good state with a warning icon.
- **Logic Conflict:** If you identify a conflict between "No Scrolling" and "Legibility" for 20+ destinations, flag this to me and propose a specific "Tile Compaction" strategy instead of choosing one arbitrarily.

---

## [DONE]
Provide the following deliverables:
1. **TypeScript Interfaces:** Define the `TrafficStatus`, `Destination`, and `AppState` objects.
2. **State Logic:** A function `refreshAllTraffic()` that handles the location fetch, API calls to Google Places/Routes, and the Threshold re-classification logic.
3. **Error Handling Matrix:** A simple table showing how the UI reacts to: 403 API errors, Location Timeout, and 0-Alternate-Route scenarios.

---

## [CONTEXT REFERENCE]
*Use the following glossary terms for naming conventions:*
- **Driver_Location:** Real-time GPS coordinates.
- **Traffic_Threshold:** Customizable minute values (Green-to-Orange / Orange-to-Red).
- **Congestion_Segment:** Specific route portions classified as SLOW or JAM.
- **Traffic_Service:** The backend handler for external API calls.
