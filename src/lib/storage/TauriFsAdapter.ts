import { StorageAdapter } from './StorageAdapter';

export class TauriFsAdapter extends StorageAdapter {
    private _readTextFile: any;
    private _writeTextFile: any;
    private _exists: any;
    private _BaseDirectory: any;
    private fileName: string;

    constructor(fileName: string) {
        if (fileName.length == 0) {
            throw new Error("Tauri FS: Empty filename given.");
        }

        super();
        this.fileName = fileName;
    }

    static create(fileName: string) : Promise<TauriFsAdapter> {
        const adapter = new this(fileName);
        return adapter.init().then(() => {
            return adapter;
        });
    }

    public async init() {
        let fs = await import('@tauri-apps/api/fs');
        this._readTextFile = fs.readTextFile;
        this._writeTextFile = fs.writeTextFile;
        this._exists = fs.exists;
        this._BaseDirectory = fs.BaseDirectory;

        // Tauri FS is sooo dumb, I need this to create appdata directory
        if (!(await this._exists("dummy", { dir: this._BaseDirectory.AppData }))) {
            await fs.createDir("dummy", { dir: this._BaseDirectory.AppData, recursive: true });
        }
        console.log("Loaded tauri filesystem adapter.");
    }

    public async readJson(): Promise<string> {
        try {
            if (!(await this._exists(this.fileName, { dir : this._BaseDirectory.AppData }))) {
                await this._writeTextFile(this.fileName, "", { dir: this._BaseDirectory.AppData });
            }

            return await this._readTextFile(this.fileName, { dir: this._BaseDirectory.AppData });

        } catch (error) {
            console.error(error);
            throw(error);
        }
    }

    public async writeJson(contents: string) {
        try {
            await this._writeTextFile(this.fileName, contents, { 
                dir: this._BaseDirectory.AppData, 
                append: false 
            });
        } catch (error) {
            console.error(error);
            throw(error);
        }
    }
}