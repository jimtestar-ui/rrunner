import * as SecureStore from "expo-secure-store";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { PLANS } from "@/lib/plan";
import { seedDestinations } from "@/lib/seed-data";
import { AppState, Destination, PlanType, TrafficCheckLog, Traffic_Threshold } from "@/types/traffic";

const STORAGE_KEY = "roaderunner-app-state";
export const CARD_COLORS = ["#594fd8", "#0b9db9", "#0d4698", "#cc05d8", "#d8a62a", "#737b88", "#087f5b"];

interface AppStore {
  state: AppState;
  setState: (state: AppState) => void;
  addDestination: (
    input: Pick<
      Destination,
      "name" | "address" | "nickname" | "cardColor" | "isPriority" | "placeId" | "latitude" | "longitude"
    >,
  ) => boolean;
  updateDestination: (
    destinationId: string,
    input: Pick<
      Destination,
      "name" | "address" | "nickname" | "cardColor" | "isPriority" | "placeId" | "latitude" | "longitude"
    >,
  ) => boolean;
  deleteDestination: (destinationId: string) => boolean;
  replaceDestinations: (destinations: Destination[], destinationAccountUserId?: string | null) => void;
  updateThresholds: (thresholds: Traffic_Threshold) => void;
  setPlanType: (planType: PlanType) => void;
  addBetaTester: (email: string, planType: PlanType) => boolean;
  addTrafficCheckLog: (log: Omit<TrafficCheckLog, "id" | "checkedAt">) => void;
  updateTrafficCheckLogNote: (logId: string, comparisonNote: string) => void;
  updateTrafficServiceUrl: (url: string) => void;
  updateWittyMode: (enabled: boolean) => void;
}

const initialState: AppState = {
  Driver_Location: null,
  Traffic_Threshold: { greenMaxMinutes: 5, redOverMinutes: 15 },
  destinations: seedDestinations,
  destinationAccountUserId: null,
  plan: PLANS.FREE,
  betaTesters: [],
  trafficCheckLogs: [],
  trafficServiceUrl: process.env.EXPO_PUBLIC_TRAFFIC_SERVICE_URL ?? "http://localhost:8787",
  trafficDataSource: "UNKNOWN",
  wittyModeEnabled: false,
  refreshStatus: "IDLE",
};

const AppStoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [state, setStateInternal] = useState(initialState);

  useEffect(() => {
    getStoredState()
      .then((stored) => {
        if (stored) {
          const parsed = JSON.parse(stored) as AppState;
          setStateInternal({
            ...parsed,
            betaTesters: parsed.betaTesters ?? [],
            trafficCheckLogs: parsed.trafficCheckLogs ?? [],
            trafficServiceUrl:
              parsed.trafficServiceUrl ?? process.env.EXPO_PUBLIC_TRAFFIC_SERVICE_URL ?? "http://localhost:8787",
            trafficDataSource: parsed.trafficDataSource ?? "UNKNOWN",
            wittyModeEnabled: parsed.wittyModeEnabled ?? false,
            destinationAccountUserId: parsed.destinationAccountUserId ?? null,
            Traffic_Threshold: {
              greenMaxMinutes: parsed.Traffic_Threshold.greenMaxMinutes ?? 5,
              redOverMinutes:
                parsed.Traffic_Threshold.redOverMinutes ??
                (parsed.Traffic_Threshold as { orangeMaxMinutes?: number }).orangeMaxMinutes ??
                15,
            },
            destinations: parsed.destinations.map((destination, index) => ({
              ...destination,
              cardColor: destination.cardColor ?? CARD_COLORS[index % CARD_COLORS.length],
              isPriority: destination.isPriority ?? false,
              status: destination.status ?? "IDLE",
              trafficColor: destination.trafficColor ?? "UNKNOWN",
              delayMinutes: destination.delayMinutes ?? null,
              etaMinutes: destination.etaMinutes ?? null,
              normalMinutes: destination.normalMinutes ?? null,
              alternateRouteExists: destination.alternateRouteExists ?? null,
              congestionSegments: destination.congestionSegments ?? [],
            })),
          });
        }
      })
      .catch(() => undefined);
  }, []);

  async function getStoredState() {
    if (process.env.EXPO_OS === "web") {
      return window.localStorage.getItem(STORAGE_KEY);
    }

    return SecureStore.getItemAsync(STORAGE_KEY);
  }

  function persistState(nextState: AppState) {
    const serializedState = JSON.stringify(nextState);

    if (process.env.EXPO_OS === "web") {
      window.localStorage.setItem(STORAGE_KEY, serializedState);
      return;
    }

    SecureStore.setItemAsync(STORAGE_KEY, serializedState).catch(() => undefined);
  }

  function setState(nextState: AppState) {
    setStateInternal(nextState);
    persistState(nextState);
  }

  function addDestination(
    input: Pick<
      Destination,
      "name" | "address" | "nickname" | "cardColor" | "isPriority" | "placeId" | "latitude" | "longitude"
    >,
  ) {
    let didAdd = false;

    setStateInternal((currentState) => {
      if (currentState.destinations.length >= currentState.plan.locationLimit) {
        return currentState;
      }

      const nextDestination: Destination = {
        id: `${input.nickname.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
        name: input.name,
        address: input.address,
        placeId: input.placeId,
        latitude: input.latitude,
        longitude: input.longitude,
        nickname: input.nickname,
        cardColor: input.cardColor || CARD_COLORS[currentState.destinations.length % CARD_COLORS.length],
        isPriority: input.isPriority,
        status: "IDLE",
        trafficColor: "UNKNOWN",
        delayMinutes: null,
        etaMinutes: null,
        normalMinutes: null,
        alternateRouteExists: null,
        congestionSegments: [],
      };

      didAdd = true;
      const nextState = { ...currentState, destinations: [...currentState.destinations, nextDestination] };
      nextState.destinationAccountUserId = null;
      persistState(nextState);
      return nextState;
    });

    return didAdd;
  }

  function updateDestination(
    destinationId: string,
    input: Pick<
      Destination,
      "name" | "address" | "nickname" | "cardColor" | "isPriority" | "placeId" | "latitude" | "longitude"
    >,
  ) {
    let didUpdate = false;

    setStateInternal((currentState) => {
      if (!currentState.destinations.some((destination) => destination.id === destinationId)) {
        return currentState;
      }

      didUpdate = true;
      const nextState = {
        ...currentState,
        destinations: currentState.destinations.map((destination) =>
          destination.id === destinationId
            ? {
                ...destination,
                ...input,
              }
            : destination,
        ),
      };
      persistState(nextState);
      return nextState;
    });
    return didUpdate;
  }

  function deleteDestination(destinationId: string) {
    let didDelete = false;

    setStateInternal((currentState) => {
      if (!currentState.destinations.some((destination) => destination.id === destinationId)) {
        return currentState;
      }

      didDelete = true;
      const nextState = {
        ...currentState,
        destinations: currentState.destinations.filter((destination) => destination.id !== destinationId),
        trafficCheckLogs: currentState.trafficCheckLogs.filter((log) => log.destinationId !== destinationId),
      };
      persistState(nextState);
      return nextState;
    });
    return didDelete;
  }

  function replaceDestinations(destinations: Destination[], destinationAccountUserId: string | null = null) {
    setStateInternal((currentState) => {
      const nextState = {
        ...currentState,
        destinations,
        destinationAccountUserId,
      };
      persistState(nextState);
      return nextState;
    });
  }

  function updateThresholds(Traffic_Threshold: Traffic_Threshold) {
    setState({ ...state, Traffic_Threshold });
  }

  function setPlanType(planType: PlanType) {
    setStateInternal((currentState) => {
      const nextState = { ...currentState, plan: PLANS[planType] };
      persistState(nextState);
      return nextState;
    });
  }

  function addBetaTester(email: string, planType: PlanType) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail.includes("@") || state.betaTesters.some((tester) => tester.email === normalizedEmail)) {
      return false;
    }

    setState({
      ...state,
      betaTesters: [
        ...state.betaTesters,
        {
          id: `${normalizedEmail}-${Date.now()}`,
          email: normalizedEmail,
          planType,
          status: "INVITED",
          addedAt: new Date().toISOString(),
        },
      ],
    });
    return true;
  }

  function addTrafficCheckLog(log: Omit<TrafficCheckLog, "id" | "checkedAt">) {
    setStateInternal((currentState) => {
      const nextState = {
        ...currentState,
        trafficCheckLogs: [
          {
            ...log,
            id: `${log.destinationId}-${Date.now()}`,
            checkedAt: new Date().toISOString(),
          },
          ...currentState.trafficCheckLogs,
        ].slice(0, 50),
      };
      persistState(nextState);
      return nextState;
    });
  }

  function updateTrafficCheckLogNote(logId: string, comparisonNote: string) {
    setStateInternal((currentState) => {
      const nextState = {
        ...currentState,
        trafficCheckLogs: currentState.trafficCheckLogs.map((log) =>
          log.id === logId ? { ...log, comparisonNote } : log,
        ),
      };
      persistState(nextState);
      return nextState;
    });
  }

  function updateTrafficServiceUrl(url: string) {
    const trimmedUrl = url.trim();

    setStateInternal((currentState) => {
      const nextState = {
        ...currentState,
        trafficServiceUrl: trimmedUrl || "http://localhost:8787",
      };
      persistState(nextState);
      return nextState;
    });
  }

  function updateWittyMode(enabled: boolean) {
    setStateInternal((currentState) => {
      const nextState = {
        ...currentState,
        wittyModeEnabled: enabled,
      };
      persistState(nextState);
      return nextState;
    });
  }

  const value = useMemo(
    () => ({
      state,
      setState,
      addDestination,
      updateDestination,
      deleteDestination,
      replaceDestinations,
      updateThresholds,
      setPlanType,
      addBetaTester,
      addTrafficCheckLog,
      updateTrafficCheckLogNote,
      updateTrafficServiceUrl,
      updateWittyMode,
    }),
    [state],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const store = useContext(AppStoreContext);

  if (!store) {
    throw new Error("useAppStore must be used inside AppStoreProvider");
  }

  return store;
}
