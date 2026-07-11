import Adw from '@girs/adw-1';
import Gtk from '@girs/gtk-4.0';
import { ExtensionBase } from '@gnome-shell/extensions/extension';
import { ExtensionPreferences } from '@gnome-shell/extensions/prefs';
import { registerGObjectClass } from '../gjs';

import { getAllProviders } from '../providers';
import { BaseProviderConfigView, makeConfigRow, RegisteredComboBoxView as ComboBoxView } from './BaseProviderConfigView';
import { ConfigModel, RegisteredAccountCollectionModel as AccountCollectionModel } from './AccountCollectionModel';
import { GettextFunc } from './gettext';

type PreferencesGroupWithWidgetAdd = Adw.PreferencesGroup & {
  add(child: Gtk.Widget): void;
};

interface ComboBoxOptions {
  value: string;
  label: string;
  active: boolean;
}

function getMarginAll(v: number) {
  return {
    margin_start: v,
    margin_top: v,
    margin_end: v,
    margin_bottom: v,
  };
}

class AccountConfigView {
  public widget: Gtk.Box;
  private _accountConfig: ConfigModel;
  private _layoutSettings: Gtk.Box;
  private _apiConfigView?: BaseProviderConfigView;

  constructor(private gettext: GettextFunc, accountConfig: ConfigModel) {
    this._accountConfig = accountConfig;

    this.widget = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
    });

    const frame = new Gtk.Frame({
      label: this.gettext('Account Settings'),
      ...getMarginAll(8),
    });

    this._layoutSettings = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      ...getMarginAll(12),
    });

    frame.set_child(this._layoutSettings);
    this.widget.append(frame);

    this._addSettings();
  }

  _addSettings() {
    const layout = this._layoutSettings;
    layout.append(this._confProvider());
    layout.append(this._confLabel());
    layout.append(this._confInterval());
  }

  _selectProvider(provider: string) {
    if (this._apiConfigView) {
      this._apiConfigView.destroy();
      this._apiConfigView = undefined;
    }

    try {
      this._apiConfigView = new BaseProviderConfigView(this.gettext, provider, this._layoutSettings, this._accountConfig);
    } catch (e: any) {
      e.message = `Error creating configView for provider ${provider}: ${e.message}`;
      console.error(e);
    }
  }

  destroy() {
    if (this._apiConfigView) {
      this._apiConfigView.destroy();
      this._apiConfigView = undefined;
    }
  }

  _confProvider(): Gtk.Widget {
    const preset = this._accountConfig.get('provider') || 'openai';

    const options: ComboBoxOptions[] = getAllProviders().map((p) => ({
      value: p.apiName.toLowerCase().replace(/\s+/g, '-'),
      label: p.apiName,
      active: false,
    }));

    options.forEach((o) => {
      if (o.value === preset) {
        o.active = true;
      }
    });

    const view = new ComboBoxView(options);

    view.connectChanged((provider: string) => {
      this._accountConfig.set('provider', provider);
      this._selectProvider(provider);
    });

    return makeConfigRow(this.gettext('Provider'), view as unknown as Gtk.Widget);
  }

  _confLabel(): Gtk.Widget {
    const preset = String(this._accountConfig.get('label') || '');

    const entry = new Gtk.Entry({
      text: preset,
      placeholder_text: this.gettext('Account label (optional)'),
    });

    entry.connect('changed', () => {
      this._accountConfig.set('label', entry.text);
    });

    return makeConfigRow(this.gettext('Label'), entry);
  }

  _confInterval(): Gtk.Widget {
    const preset = parseInt(String(this._accountConfig.get('interval') || '300'), 10);

    const adjustment = Gtk.Adjustment.new(preset, 60, 3600, 60, 300, 0);
    const spinButton = new Gtk.SpinButton({
      adjustment: adjustment,
      numeric: true,
    });

    spinButton.connect('value-changed', () => {
      this._accountConfig.set('interval', spinButton.get_value_as_int());
    });

    const box = new Gtk.Box({ spacing: 6 });
    box.append(spinButton);
    box.append(new Gtk.Label({ label: 'seconds' }));

    return makeConfigRow(this.gettext('Update Interval'), box);
  }
}

class BalanceWatchSettingsWidget extends Gtk.Box {
  private gettext: GettextFunc;
  private _store: any;
  private _configLayout?: Gtk.Box;
  private _treeView?: Gtk.TreeView;
  private _selection?: Gtk.TreeSelection;
  private _toolbar?: Gtk.Box;
  private _delButton?: Gtk.Button;
  private _accountConfigView: AccountConfigView | null = null;

  constructor(ext: ExtensionBase) {
    super({
      orientation: Gtk.Orientation.HORIZONTAL,
    });

    this.gettext = ext.gettext.bind(ext) as GettextFunc;
    this._store = new AccountCollectionModel(ext.getSettings());

    const sidebar = new Gtk.Box({
      margin_start: 10,
      margin_end: 10,
      margin_top: 10,
      margin_bottom: 10,
      orientation: Gtk.Orientation.VERTICAL,
      width_request: 240,
    });

    sidebar.append(this._getTreeView());
    sidebar.append(this._getToolbar());

    this.append(sidebar);

    this._configLayout = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      hexpand: true,
      vexpand: true,
    });

    this.append(this._configLayout);

    this._selection = this._treeView!.get_selection();
    this._selection.connect('changed', this._onSelectionChanged.bind(this));
  }

  _getTreeView(): Gtk.TreeView {
    this._treeView = new Gtk.TreeView({
      model: this._store,
      headers_visible: false,
      reorderable: true,
      hexpand: false,
      vexpand: true,
    });

    const label = new Gtk.TreeViewColumn({ title: 'Account' });
    const renderer = new Gtk.CellRendererText();
    label.pack_start(renderer, true);
    label.add_attribute(renderer, 'text', 0);
    this._treeView.insert_column(label, 0);

    return this._treeView;
  }

  _getToolbar(): Gtk.Box {
    const toolbar = (this._toolbar = new Gtk.Box({}));

    const newButton = new Gtk.Button({ icon_name: 'list-add-symbolic' });
    newButton.connect('clicked', this._addClicked.bind(this));
    toolbar.append(newButton);

    const delButton = (this._delButton = new Gtk.Button({ icon_name: 'list-remove-symbolic' }));
    delButton.connect('clicked', this._delClicked.bind(this));
    toolbar.append(delButton);

    this._updateToolbar();

    return toolbar;
  }

  _onSelectionChanged() {
    const [isSelected, , iter] = this._selection!.get_selected();

    if (isSelected && iter) {
      this._showAccountConfig(this._store!.getConfig(iter));
    } else {
      this._showAccountConfig(null);
    }

    this._updateToolbar();
  }

  _showAccountConfig(accountConfig: ConfigModel | null) {
    if (this._accountConfigView) {
      this._accountConfigView.destroy();
      this._configLayout!.remove(this._accountConfigView.widget);
      this._accountConfigView = null;
    }

    if (accountConfig === null) {
      return;
    }

    this._accountConfigView = new AccountConfigView(this.gettext, accountConfig);
    this._configLayout!.append(this._accountConfigView.widget);
  }

  _updateToolbar() {
    let sensitive = false;

    if (this._selection) {
      const [isSelected] = this._selection.get_selected();
      sensitive = isSelected;
    }

    this._delButton!.set_sensitive(sensitive);
  }

  _addClicked() {
    this._store!.append();
    this._updateToolbar();
  }

  _delClicked() {
    const [isSelected, , iter] = this._selection!.get_selected();

    if (!iter) {
      throw new Error();
    }

    if (isSelected) {
      this._store!.remove(iter);
    }

    this._updateToolbar();
  }

  destroyView() {
    this._accountConfigView?.destroy();
    this._accountConfigView = null;
  }
}

const RegisteredBalanceWatchSettingsWidget = registerGObjectClass(BalanceWatchSettingsWidget);

export default class BalanceWatchSettings extends ExtensionPreferences {
  fillPreferencesWindow(window: Adw.PreferencesWindow): void {
    const page = new Adw.PreferencesPage();
    const gtkWidget = new RegisteredBalanceWatchSettingsWidget(this);

    const group = new Adw.PreferencesGroup();
    (group as PreferencesGroupWithWidgetAdd).add(gtkWidget);
    page.add(group);

    window.connect('close-request', () => {
      gtkWidget.destroyView();
      return false;
    });

    window.add(page);
  }
}