# RoadeRunner Remote Access

Use this when you want to test away from the PC.

## Best First Option: Expo Go Tunnel

Run these in two terminals.

Terminal 1:

```powershell
cd "E:\MY DOCUMENTS\My-APPS\RoadeRunner"
npm.cmd run traffic-service
```

Terminal 2:

```powershell
cd "E:\MY DOCUMENTS\My-APPS\RoadeRunner"
npx.cmd expo start --tunnel
```

Then scan the QR code with Expo Go.

Important: the local Traffic Service still runs on the PC. A tunnel lets the phone reach the app bundle, but the backend also needs to be reachable for live Google traffic checks. For full away-from-PC testing, deploy the Traffic Service to a hosted backend.

## Hosted Preview Path

1. Deploy the Traffic Service to a backend host.
2. Set `GOOGLE_MAPS_API_KEY` on that host.
3. Point the app to it with:

```text
EXPO_PUBLIC_TRAFFIC_SERVICE_URL=https://your-service-url
```

4. Build with EAS or publish a preview build.

## Later Production Path

- Mobile app: Expo/EAS build for Android and iOS.
- Backend: hosted Traffic_Service with API key protected.
- Billing: Apple/Google in-app purchase for mobile plans.
