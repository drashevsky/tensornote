import { StorageAdapter } from "./StorageAdapter";

export class WebStorageAdapter extends StorageAdapter {
    private storeName: string;

    constructor(storeName: string) {
        if (storeName.length == 0) {
            throw new Error("WebStorage: Empty store name given.");
        }

        super();
        this.storeName = storeName;
    }

    static create(storeName: string) : Promise<WebStorageAdapter> {
        const adapter = new this(storeName);
        return adapter.init().then(() => {
            return adapter;
        });
    }

    public async init() {
        if (!localStorage.getItem(this.storeName)) {
            localStorage.setItem(this.storeName, "");
        }
        console.log("Loaded webstorage adapter.");
    }

    public async readJson(): Promise<string> {
        let json = localStorage.getItem(this.storeName);
        return localStorage.getItem(this.storeName) || "";
    }

    public async writeJson(contents: string) {
        localStorage.setItem(this.storeName, contents);
    }
}