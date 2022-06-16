import {deserializeState} from '../../serializable';
import {SerializedStorage, Storage, StorageFile} from '../../storage';

import {INDEX_DATA, INDEX_FS_LOCK, INDEX_WORKER_LOCK, INDEX_WORKER_NOTIFY, Operation} from './constants';
import {Data} from './data';
import {createStorageFS} from './emscripten-fs';
import {Mutex} from './mutex';

export interface EmscriptenWrapper {
    getFS(): typeof FS;
}

export interface ToolMessageInit {
    type: 'init';
    sharedBuffer: SharedArrayBuffer;
    portFs: MessagePort;
}

export interface ToolMessageStorage {
    type: 'storage';
    storage: SerializedStorage;
}

export interface ToolMessageCall {
    type: 'call';
    id: string;
    storageId: string;
    path: string[];
}

export type ToolMessage = ToolMessageInit | ToolMessageStorage | ToolMessageCall;

// TODO: consider if this is needed
export interface ToolResult {
    name: string;
    content: string;
}

export abstract class WorkerTool<Tool extends EmscriptenWrapper> {

    private readonly id: number;

    private sharedBuffer: SharedArrayBuffer;
    private arrayInt32: Int32Array;
    private lockFs: Mutex;
    private lockWorker: Mutex;
    private data: Data;
    private portFs: MessagePort;

    private toolPromise: Promise<void>;
    protected tool: Tool;
    private fs: typeof FS;
    private storageFs: Emscripten.FileSystemType;

    private storages: Record<string, Storage<unknown, unknown>>;
    private isStorageMounted: Record<string, boolean>;

    constructor(id: number) {
        this.id = id;

        this.storages = {};
        this.isStorageMounted = {};

        this.toolPromise = (async () => {
            this.tool = await this.initialize();
        })();

        addEventListener('message', this.handleMessage.bind(this));
        addEventListener('messageerror', this.handleMessageError.bind(this));
    }

    handleMessage(event: MessageEvent<ToolMessage>) {
        switch (event.data.type) {
            case 'init': {
                this.init(event.data);
                break;
            }
            case 'storage': {
                this.updateStorage(event.data);
                break;
            }
            case 'call': {
                this.call(event.data);
                break;
            }
        }
    }

    handleMessageError(event: MessageEvent) {
        console.error('Failed to deserialize worker message.', event);
    }

    async init(message: ToolMessageInit) {
        this.sharedBuffer = message.sharedBuffer;
        this.arrayInt32 = new Int32Array(this.sharedBuffer);
        this.lockFs = new Mutex(this.arrayInt32, INDEX_FS_LOCK);
        this.lockWorker = new Mutex(this.arrayInt32, INDEX_WORKER_LOCK);
        this.data = new Data(this.sharedBuffer, INDEX_DATA * 4);
        this.portFs = message.portFs;

        // Ensure the tool is initialized
        if (!this.tool) {
            await this.toolPromise;
        }

        // Initialize file system
        this.fs = this.tool.getFS();
        this.storageFs = createStorageFS(this.fs, this);
        this.fs.mkdir('/storages');
        this.mountStorages();
    }

    async updateStorage(message: ToolMessageStorage) {
        // Deserialize storage
        const storage = deserializeState<Storage<unknown, unknown>>(message.storage);

        this.storages[storage.getID()] = storage;

        this.mountStorages();
    }

    mountStorages() {
        if (!this.fs) {
            return;
        }

        for (const storageId of Object.keys(this.storages)) {
            if (!this.isStorageMounted[storageId]) {
                const path = `/storages/${storageId}`;
                this.fs.mkdir(path);
                this.fs.mount(this.storageFs, {
                    tool: this,
                    storageId
                }, path);

                this.isStorageMounted[storageId] = true;

                // NOTE: test
                console.log(this.fs.readdir('/'));
                console.log(this.fs.readdir(`${path}/`));
            }
        }
    }

    async call(message: ToolMessageCall) {
        const storage = this.storages[message.storageId];
        if (!storage) {
            throw new Error(`Unknown storage "${message.storageId}".`);
        }

        // Find the file in storage
        const file = await storage.getEntry(message.path);
        if (!(file instanceof StorageFile)) {
            throw new Error('Storage entry is not a file.');
        }

        // Ensure the tool is initialized
        if (!this.tool) {
            await this.toolPromise;
        }

        // Execute the tool
        const result = await this.execute(file);

        postMessage({
            id: message.id,
            result
        });
    }

    callFs(storageId: string, path: string, operation: Operation) {
        console.log(`worker ${this.id} is waiting for lock...`);

        // Acquire worker lock
        this.lockWorker.acquire();

        console.log(`worker ${this.id} has lock`);

        // Acquire FS lock
        this.lockFs.acquire();

        this.portFs.postMessage({
            type: 'call',
            storageId,
            path,
            operation
        });

        // Release of FS lock
        this.lockFs.release();

        console.log(`worker ${this.id} is waiting for response...`);

        // Wait for worker notify
        Atomics.wait(this.arrayInt32, INDEX_WORKER_NOTIFY, 0);

        // Read response from data buffer
        this.data.resetOffset();
        const array = this.data.readStringArray();

        // Clear data buffer
        this.data.clear();

        console.log(`worker ${this.id} received`, array);

        // Release worker lock
        this.lockWorker.release();

        console.log(`worker ${this.id} is done`);

        return array;
    }

    abstract initialize(): Promise<Tool>;

    abstract execute(file: StorageFile<unknown, unknown>): Promise<ToolResult[]>;
}