# True Road Testing

Use this when testing RoadeRunner away from home Wi-Fi.

## What changes

Expo Go can run the app anywhere, but the phone also needs to reach the traffic service. A local URL like `http://192.168.x.x:8787` only works on the same Wi-Fi as your PC.

For true road testing, deploy the traffic service and use its public HTTPS URL in Owner Tools.

## Hosted traffic service endpoints

The hosted service supports the same paths the app already uses:

- `GET /health`
- `GET /places/search?query=airport`
- `POST /traffic/refresh`

## Google API key setup

Add `GOOGLE_MAPS_API_KEY` as a private environment variable on the host.

For early testing, keep API restrictions limited to:

- Places API
- Routes API
- Geocoding API

If the key is stored only on the hosted backend, do not use website restrictions for this backend key. Website restrictions are for browser/client keys and can block server-side API calls. Use a separate locked-down client key later if the app ever calls Google directly from the phone.

## Phone setup

In RoadeRunner:

1. Open Owner Tools.
2. Set Traffic Service URL to the hosted service root, for example:
   `https://your-road-test-url.vercel.app`
3. Save it.
4. Turn off Wi-Fi on the phone.
5. Open Expo Go using cellular data.
6. Tap refresh from a safe parked location.

The home screen should show `Google traffic` after a successful refresh.
