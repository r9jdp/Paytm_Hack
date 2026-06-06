"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useReducer } from "react";

import { mergeCatalogCandidates } from "../_lib/catalog-merge";
import { defaultMerchantContext, sampleProducts } from "../_lib/mock-data";
import type { CatalogItem, CatalogItemCandidate, GeminiLiveState, ScanStatus } from "../_lib/types";

type ScanAction =
  | { type: "HYDRATE"; state: Partial<GeminiLiveState> }
  | { type: "SET_STATUS"; status: ScanStatus }
  | { type: "SET_TRANSCRIPT"; transcript: string }
  | { type: "SET_ASSISTANT"; message: string; followUpQuestion?: string | null; warnings?: string[] }
  | { type: "MERGE_CANDIDATES"; candidates: CatalogItemCandidate[] }
  | { type: "LOAD_SAMPLE_DATA" }
  | { type: "UPDATE_ITEM"; id: string; item: Partial<CatalogItem> }
  | { type: "DELETE_ITEM"; id: string }
  | { type: "CONFIRM_ITEM"; id: string }
  | { type: "CONFIRM_ALL" }
  | { type: "ADD_ITEM"; item: Omit<CatalogItem, "id" | "updatedAt"> }
  | { type: "RESET" };

type GeminiLiveStore = {
  state: GeminiLiveState;
  dispatch: React.Dispatch<ScanAction>;
};

const STORAGE_KEY = "paytm-gemini-live-scan:v1";

const GeminiLiveContext = createContext<GeminiLiveStore | null>(null);

function createScanId() {
  return `scan-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createInitialState(): GeminiLiveState {
  return {
    hydrated: false,
    scanId: createScanId(),
    merchantContext: defaultMerchantContext,
    transcriptSoFar: "",
    catalog: [],
    assistantMessage: "Point your phone at one shelf and speak product names, prices, and stock naturally.",
    followUpQuestion: null,
    warnings: [],
    status: "idle",
    lastAnalyzedAt: null
  };
}

function withDetectedAt(state: GeminiLiveState, catalog: CatalogItem[]): GeminiLiveState {
  return {
    ...state,
    catalog,
    lastAnalyzedAt: new Date().toISOString()
  };
}

function scanReducer(state: GeminiLiveState, action: ScanAction): GeminiLiveState {
  switch (action.type) {
    case "HYDRATE":
      return {
        ...state,
        ...action.state,
        status: "idle",
        hydrated: true
      };
    case "SET_STATUS":
      return { ...state, status: action.status };
    case "SET_TRANSCRIPT":
      return { ...state, transcriptSoFar: action.transcript };
    case "SET_ASSISTANT":
      return {
        ...state,
        assistantMessage: action.message,
        followUpQuestion: action.followUpQuestion ?? null,
        warnings: action.warnings ?? []
      };
    case "MERGE_CANDIDATES":
      return withDetectedAt(state, mergeCatalogCandidates(state.catalog, action.candidates));
    case "LOAD_SAMPLE_DATA":
      return {
        ...withDetectedAt(state, mergeCatalogCandidates(state.catalog, sampleProducts)),
        assistantMessage: "Demo shelf data loaded. Review each item before exporting the catalog.",
        followUpQuestion: "Please confirm prices and stock counts.",
        warnings: ["Using sample data for demo reliability."]
      };
    case "UPDATE_ITEM":
      return {
        ...state,
        catalog: state.catalog.map((item) =>
          item.id === action.id
            ? {
                ...item,
                ...action.item,
                status: action.item.status ?? item.status,
                updatedAt: new Date().toISOString()
              }
            : item
        )
      };
    case "DELETE_ITEM":
      return { ...state, catalog: state.catalog.filter((item) => item.id !== action.id) };
    case "CONFIRM_ITEM":
      return {
        ...state,
        catalog: state.catalog.map((item) =>
          item.id === action.id
            ? { ...item, status: "confirmed", reviewNotes: [], updatedAt: new Date().toISOString() }
            : item
        )
      };
    case "CONFIRM_ALL":
      return {
        ...state,
        catalog: state.catalog.map((item) => ({
          ...item,
          status: "confirmed",
          reviewNotes: [],
          updatedAt: new Date().toISOString()
        })),
        assistantMessage: "Catalog confirmed. Export the reviewed JSON for the next hackathon step.",
        followUpQuestion: null
      };
    case "ADD_ITEM":
      return {
        ...state,
        catalog: [
          ...state.catalog,
          {
            ...action.item,
            id: createScanId(),
            updatedAt: new Date().toISOString()
          }
        ]
      };
    case "RESET":
      return { ...createInitialState(), hydrated: true };
    default:
      return state;
  }
}

function getPersistedState(): Partial<GeminiLiveState> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<GeminiLiveState>;
  } catch {
    return null;
  }
}

function persistState(state: GeminiLiveState) {
  const persisted: Partial<GeminiLiveState> = {
    scanId: state.scanId,
    merchantContext: state.merchantContext,
    transcriptSoFar: state.transcriptSoFar,
    catalog: state.catalog,
    assistantMessage: state.assistantMessage,
    followUpQuestion: state.followUpQuestion,
    warnings: state.warnings,
    lastAnalyzedAt: state.lastAnalyzedAt
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
}

export function GeminiLiveProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(scanReducer, undefined, createInitialState);

  useEffect(() => {
    dispatch({ type: "HYDRATE", state: getPersistedState() ?? {} });
  }, []);

  useEffect(() => {
    if (state.hydrated) {
      persistState(state);
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <GeminiLiveContext.Provider value={value}>{children}</GeminiLiveContext.Provider>;
}

export function useGeminiLiveStore() {
  const value = useContext(GeminiLiveContext);

  if (!value) {
    throw new Error("useGeminiLiveStore must be used inside GeminiLiveProvider.");
  }

  return value;
}
