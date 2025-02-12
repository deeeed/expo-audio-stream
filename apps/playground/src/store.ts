import AsyncStorage from "@react-native-async-storage/async-storage";
import { configureStore, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { SavedUserPreferences } from "@siteed/design-system/dist/src/hooks/_useAppThemeSetup";
import { RecordingConfig } from "@siteed/expo-audio-stream/src/ExpoAudioStream.types";
import { useSelector , useDispatch , TypedUseSelectorHook } from "react-redux";
import { persistReducer, persistStore } from "redux-persist";
import { combineReducers } from "redux";

// Configure persistence for appConfig
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  // No whitelist needed since we're persisting the whole state
};

interface PreferencesState {
    recordingConfig: RecordingConfig
    themePreferences?: SavedUserPreferences
}

const initialState: PreferencesState = {
    themePreferences: undefined,
    recordingConfig: {
        sampleRate: 16000,
        channels: 1,
        encoding: "pcm_16bit",
        keepAwake: true,
        interval: 1000,
    }
}

const preferencesSlice = createSlice({
    name: 'preferences',
    initialState,
    reducers: {
        setThemePreferences: (state, action: PayloadAction<SavedUserPreferences>) => {
            state.themePreferences = action.payload
        },
        setRecordingConfig: (state, action: PayloadAction<RecordingConfig>) => {
            state.recordingConfig = action.payload
        },
    },
});

// Create persisted reducer from the root reducer
const rootReducer = {
    preferences: preferencesSlice.reducer
};

const persistedReducer = persistReducer(
    persistConfig,
    combineReducers(rootReducer)
);

export const store = configureStore({
    reducer: persistedReducer,  // Use the persisted reducer directly
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
            },
        }),
});

export const persistor = persistStore(store);

export const { setThemePreferences, setRecordingConfig } = preferencesSlice.actions;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
