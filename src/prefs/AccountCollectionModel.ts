import Gtk from '@girs/gtk-4.0';
import GObject from '@girs/gobject-2.0';
import Gio from '@girs/gio-2.0';
import { registerGObjectClass } from '../gjs';
import { Defaults } from '../defaults';

const ACCOUNTS_KEY = 'accounts';

export class ConfigModel {
  private attributes: Record<string, unknown>;

  constructor(
    private listStore: Gtk.ListStore,
    private iter: Gtk.TreeIter,
    private column = 1,
  ) {
    this.attributes = JSON.parse(String(this.listStore.get_value(iter, this.column)));
  }

  set(key: string, value: unknown) {
    this.attributes[key] = value;
    this.listStore.set(this.iter, [this.column], [JSON.stringify(this.attributes)]);
  }

  get(key: string) {
    if (key in this.attributes) {
      return this.attributes[key];
    }
    return Defaults[key as keyof typeof Defaults];
  }
}

export class AccountCollectionModel extends Gtk.ListStore {
  private _settings: Gio.Settings;
  private Columns: Record<string, number> = {};

  constructor(settings: Gio.Settings) {
    super();

    this.Columns = {
      LABEL: 0,
      CONFIG: 1,
    };

    this.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);

    this._settings = settings;

    this._reloadFromSettings();

    let flag: boolean;

    const mutex = (func: (...args: any[]) => void) =>
      function (...args: any[]) {
        if (!flag) {
          flag = true;
          func(...args);
          flag = false;
        }
      };

    this.connect('row-changed', mutex(this._onRowChanged.bind(this)));
    this.connect('row-inserted', mutex(this._onRowInserted.bind(this)));
    this.connect('row-deleted', mutex(this._onRowDeleted.bind(this)));
  }

  getConfig(iter: Gtk.TreeIter): ConfigModel {
    return new ConfigModel(this, iter, this.Columns.CONFIG);
  }

  _getLabel(config: any): string {
    const provider = config.provider || 'unknown';
    const label = config.label || provider;
    return `${label} (${provider})`;
  }

  _reloadFromSettings() {
    this.clear();

    const configs = this._settings.get_strv(ACCOUNTS_KEY);

    configs.forEach((json) => {
      try {
        const config = JSON.parse(json);
        const label = this._getLabel(config);
        this.set(this.append(), [this.Columns.LABEL, this.Columns.CONFIG], [label, json]);
      } catch (e) {
        console.error('Error loading account config:', e);
      }
    });
  }

  _writeSettings() {
    const [res, iter] = this.get_iter_first();
    const configs: string[] = [];

    while (res) {
      configs.push(String(this.get_value(iter, this.Columns.CONFIG)));
      res = this.iter_next(iter);
    }

    this._settings.set_strv(ACCOUNTS_KEY, configs);
  }

  _onRowChanged(self: AccountCollectionModel, path: Gtk.TreePath, iter: Gtk.TreeIter) {
    const config = String(this.get_value(iter, this.Columns.CONFIG));

    this.set(iter, [this.Columns.LABEL, this.Columns.CONFIG], [
      this._getLabel(JSON.parse(config)),
      config,
    ] as unknown as GObject.Value[]);

    this._writeSettings();
  }

  _onRowInserted(self: AccountCollectionModel, path: Gtk.TreePath, iter: Gtk.TreeIter) {
    this.set(iter, [this.Columns.LABEL, this.Columns.CONFIG], [
      'New Account',
      JSON.stringify(Defaults),
    ] as unknown as GObject.Value[]);

    this._writeSettings();
  }

  _onRowDeleted(_self: AccountCollectionModel, _path: Gtk.TreePath, _iter: Gtk.TreeIter) {
    this._writeSettings();
  }
}

export const RegisteredAccountCollectionModel = registerGObjectClass(AccountCollectionModel);
