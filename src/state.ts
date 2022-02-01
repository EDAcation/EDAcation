import {get, set} from 'idb-keyval';

import {Storage, storageByType, StorageFile} from './storage';

/* TODO: This entire architecture is basically just Redux.
         It probably makes sense to complete the pattern, by changing [state, updateState] to dispatch and random updateState calls to actions.
         Optionally, actually use Redux and hook into it for storing to IndexedDB.
*/

export interface EditorFile {
    id: string;
    storage: Storage<unknown, unknown>;
    path: string[];
    file?: StorageFile<unknown, unknown>;
    originalContent?: string;
    content?: string;
    isSaved: boolean;
}

export type EditorFileOpened = EditorFile & {
    file: NonNullable<EditorFile['file']>;
    originalContent: NonNullable<EditorFile['originalContent']>;
    content: NonNullable<EditorFile['content']>;
};

export interface State {
    loading: boolean;
    theme: 'light' | 'dark';
    storages: Storage<unknown, unknown>[];
    editor: {
        files: EditorFile[];
        openFileId: string | null;
    };
}

export const DEFAULT_STATE: State = {
    loading: true,
    theme: 'dark',
    storages: [],
    editor: {
        files: [],
        openFileId: null
    }
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export const loadState = async (): Promise<State> => {
    const state = {
        ...DEFAULT_STATE,
        loading: false
    };

    // Load state from IndexedDB
    const serializedState = await get('state');
    if (!serializedState) {
        return state;
    }

    if (serializedState.theme) {
        state.theme = serializedState.theme;
    }

    // Deserialize storages
    if (serializedState.storages) {
        state.storages = (serializedState.storages as any[])
            .map((data: any): Storage<unknown, unknown> | null => {
                if (!data.type || !storageByType[data.type]) {
                    return null;
                }

                const storage: Storage<unknown, unknown> = new storageByType[data.type](data.id);
                storage.deserialize(data);
                return storage;
            })
            .filter((s): s is Storage<unknown, unknown> => s !== null);
    }

    // Deserialize editor
    if (serializedState.editor) {
        state.editor.openFileId = serializedState.editor.openFileId;

        // Deserialize open files
        for await (const serializedFile of serializedState.editor.files) {
            const storage = state.storages.find((s) => s.getID() === serializedFile.file.storage);
            if (!storage) {
                continue;
            }

            state.editor.files.push({
                id: serializedFile.file.id,
                storage,
                path: serializedFile.file.path,
                isSaved: true
            });
        }
    }

    return state;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export const storeState = async (state: State) => {
    // Serialize state
    const serializedState = {
        ...state,
        editor: {
            ...state.editor,
            files: state.editor.files.map((file) => ({
                file: {
                    ...file,
                    storage: file.storage.getID()
                }
            }))
        },
        storages: state.storages.map((storage) => ({
            type: storage.getType(),
            id: storage.getID(),
            ...storage.serialize()
        }))
    };

    // Store state in IndexedDB
    await set('state', serializedState);
};