import {combineReducers, configureStore} from '@reduxjs/toolkit';
import {useDispatch, useSelector, TypedUseSelectorHook} from 'react-redux';
import {FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER} from 'redux-persist';

import {storagesSlice} from './storages';
import {storageEntriesSlice} from './storage-entries';
import {filesSlice} from './files';
import {panelsSlice} from './panels';
import {popupsSlice} from './popups';
import {createPersistor, createPersistReducer} from './persist';
import {settingsSlice} from './settings';

const rootReducer = createPersistReducer(combineReducers({
    settings: settingsSlice.reducer,
    storages: storagesSlice.reducer,
    storageEntries: storageEntriesSlice.reducer,
    files: filesSlice.reducer,
    panels: panelsSlice.reducer,
    popups: popupsSlice.reducer
}));

export const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
        immutableCheck: {
            ignoredPaths: ['storages', 'storageEntries', 'files']
        },
        serializableCheck: {
            // Ignore redux-persist actions
            ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],

            ignoredPaths: ['storages', 'storageEntries', 'files']
        }
    })
});

export const persistor = createPersistor(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
