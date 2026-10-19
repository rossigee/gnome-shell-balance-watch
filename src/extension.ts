import type Gio from 'gi://Gio';
import type Clutter from 'gi://Clutter';
import {
  Extension,
  ExtensionBase,
  ExtensionMetadata,
} from 'resource:///org/gnome/shell/extensions/extension.js';
import St from 'gi://St';
import { registerGObjectClass } from './gjs';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import * as ApiService from './ApiService';
import * as Format from './format/Format';
import * as HTTP from './HTTP';
import * as KeyringManager from './KeyringManager';
import { getProvider, ProviderKey } from './providers';
import { removeAllTimeouts } from './timeouts';
import { AccountOptions, BalanceData } from './types';

const ACCOUNTS_KEY = 'accounts';
const FIRST_RUN_KEY = 'first-run';

const _Symbols = {
  error: '\u26A0',
  refresh: '\u27f3',
};

function escapeMarkup(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface AccountConfig extends AccountOptions {
  id: string;
}

type ClutterTextLike = {
  set_line_wrap(wrap: boolean): void;
  set_markup(markup: string): void;
};

type StLabelWithClutterText = {
  set_style(style: string): void;
  clutter_text: ClutterTextLike;
};

type PopupMenuItemWithLabel = PopupMenu.PopupMenuItem & {
  label: StLabelWithClutterText;
};

type PreferencesOpener = ExtensionBase & {
  openPreferences(): void | Promise<void>;
};

class BalanceIndicatorView extends PanelMenu.Button {
  accountId!: string;
  options?: AccountOptions;
  providerLabel!: string;
  _indicatorView!: St.Label;
  _statusView!: St.Label;
  _popupItemStatus!: PopupMenuItemWithLabel;
  _popupItemRetry?: PopupMenu.PopupMenuItem;
  _popupItemSettings!: PopupMenu.PopupMenuItem;
  _currentError?: Error | null;
  _apiKey: string = '';
  _balanceLevel: 'normal' | 'warning' | 'critical' = 'normal';

  actor!: Clutter.Actor;

  constructor(
    private ext: ExtensionBase,
    accountId: string,
    options: AccountOptions,
    apiKey: string,
  ) {
    super(1.0, 'Balance Watch Indicator', false);
    this.accountId = accountId;
    this._apiKey = apiKey;
    this._initLayout();
    this.setOptions(options);
  }

  setOptions(options: AccountOptions) {
    try {
      this.providerLabel = getProvider(options.provider as ProviderKey).getLabel(options);
    } catch (e) {
      console.error(e);
      this.providerLabel = `[${options.provider}]`;
      this.onUpdateError(e as Error);
      return;
    }

    this.options = options;
    this._clearError();
  }

  async refreshApiKey() {
    const key = await KeyringManager.retrieveApiKey(this.accountId);
    if (key) {
      this._apiKey = key;
    }
  }

  _clearError() {
    this._currentError = null;
    this._resetBalanceStyling();
    this._displayStatus(_Symbols.refresh);
    this._setTooltip(null);
    this._updatePopupItemLabel();
    this._updateRetryButton();
  }

  _updateRetryButton(): void {
    if (!this._popupItemRetry || !this.options) {
      return;
    }
    ApiService.hasPermanentError(this.options.provider as ProviderKey);
  }

  _handleRetry(): void {
    if (!this.options) {
      return;
    }
    ApiService.clearPermanentError(this.options.provider as ProviderKey);
    this._clearError();
  }

  destroy(): void {
    PanelMenu.Button.prototype.destroy.call(this);
  }

  _initLayout() {
    const layout = new St.BoxLayout();

    this._indicatorView = new St.Label({
      y_align: Clutter.ActorAlign.CENTER,
      style_class: 'indicator',
    });

    this._statusView = new St.Label({
      y_align: Clutter.ActorAlign.CENTER,
      style_class: 'status',
    });

    layout.add_child(this._statusView);
    layout.add_child(this._indicatorView);

    (this as unknown as { add_child: (child: Clutter.Actor) => void }).add_child(layout);

    this._popupItemStatus = new PopupMenu.PopupMenuItem('', {
      activate: false,
      hover: false,
      can_focus: false,
    }) as PopupMenuItemWithLabel;
    this._popupItemStatus.label.set_style('max-width: 12em;');
    this._popupItemStatus.label.clutter_text.set_line_wrap(true);
    (this.menu as unknown as PopupMenu.PopupMenu).addMenuItem(this._popupItemStatus);

    this._popupItemRetry = new PopupMenu.PopupMenuItem('Retry');
    (this.menu as unknown as PopupMenu.PopupMenu).addMenuItem(this._popupItemRetry);
    this._popupItemRetry.connect('activate', () => {
      this._handleRetry();
    });

    (this.menu as unknown as PopupMenu.PopupMenu).addMenuItem(
      new PopupMenu.PopupSeparatorMenuItem(),
    );

    this._popupItemSettings = new PopupMenu.PopupMenuItem('Settings');
    (this.menu as unknown as PopupMenu.PopupMenu).addMenuItem(this._popupItemSettings);
    const extRef = this.ext;
    this._popupItemSettings.connect('activate', () => {
      const ext = extRef as PreferencesOpener;
      Promise.resolve(ext.openPreferences()).catch((err: unknown) => {
        console.error('Failed to open preferences:', err);
      });
    });

    this._updateRetryButton();
  }

  onUpdateStart() {
    this._showLoading();
  }

  onUpdateError(error: Error) {
    this._currentError = error;
    this._displayText('error');
    this._displayStatus(_Symbols.error);
    this._updatePopupItemLabel(error);
    this._setTooltip(error);
    this._updateRetryButton();
  }

  onClearValue() {
    this._showLoading();
    this._displayText(
      Format.format(undefined, this.providerLabel, this.options?.format || '{provider} ...'),
    );
  }

  onUpdateBalance(data: BalanceData) {
    const displayFormat = this.options?.format || '{provider} {v} {cs}';
    this._displayText(Format.format(data, this.providerLabel, displayFormat));
    this._displayStatus('');
    this._setBalanceLevel(data.available);
    this._updatePopupItemLabel();
    this._setTooltip(null);
  }

  private _setBalanceLevel(available: number) {
    const critical = this.options?.criticalThreshold ?? 1;
    const warning = this.options?.warningThreshold ?? 2;

    let newLevel: 'normal' | 'warning' | 'critical' = 'normal';
    if (available < critical) {
      newLevel = 'critical';
    } else if (available < warning) {
      newLevel = 'warning';
    }

    if (newLevel !== this._balanceLevel) {
      this._indicatorView.remove_style_class_name('balance-warning');
      this._indicatorView.remove_style_class_name('balance-critical');
      this._statusView.remove_style_class_name('balance-warning-status');
      this._statusView.remove_style_class_name('balance-critical-status');

      if (newLevel === 'warning') {
        this._indicatorView.add_style_class_name('balance-warning');
        this._statusView.add_style_class_name('balance-warning-status');
        this._displayStatus('\u26A0');
      } else if (newLevel === 'critical') {
        this._indicatorView.add_style_class_name('balance-critical');
        this._statusView.add_style_class_name('balance-critical-status');
        this._displayStatus('\u26A0');
      } else {
        this._displayStatus('');
      }

      this._balanceLevel = newLevel;
    }
  }

  private _showLoading() {
    this._resetBalanceStyling();
    this._displayStatus(_Symbols.refresh);
    this._setTooltip(null);
    this._updatePopupItemLabel();
  }

  private _resetBalanceStyling() {
    this._balanceLevel = 'normal';
    this._indicatorView.remove_style_class_name('balance-warning');
    this._indicatorView.remove_style_class_name('balance-critical');
    this._statusView.remove_style_class_name('balance-warning-status');
    this._statusView.remove_style_class_name('balance-critical-status');
    const label = (this._popupItemStatus as unknown as { label: St.Label }).label;
    if (label) {
      label.remove_style_class_name('menu-item-warning');
      label.remove_style_class_name('menu-item-critical');
    }
  }

  private _setTooltip(error?: Error | null) {
    if (!this.actor) {
      return;
    }
    const tooltipText = !error ? '' : error instanceof Error ? error.message : String(error);
    (this.actor as Clutter.Actor & { set_tooltip_text: (text: string) => void }).set_tooltip_text(
      tooltipText,
    );
  }

  _displayStatus(text: string) {
    this._statusView.text = text;
  }

  _displayText(text: string) {
    this._indicatorView.text = text;
  }

  _updatePopupItemLabel(err?: Error) {
    const label = (this._popupItemStatus as unknown as { label: St.Label }).label;
    if (label) {
      label.remove_style_class_name('menu-item-warning');
      label.remove_style_class_name('menu-item-critical');
      if (this._balanceLevel === 'warning') {
        label.add_style_class_name('menu-item-warning');
      } else if (this._balanceLevel === 'critical') {
        label.add_style_class_name('menu-item-critical');
      }
    }

    let text = escapeMarkup(this.providerLabel);
    if (err) {
      const errorMsg = err instanceof HTTP.HTTPError ? err.format('\n\n') : String(err);
      text += '\n\n<b>\u26A0 Error:</b>\n' + escapeMarkup(errorMsg);
    }
    this._popupItemStatus.label.clutter_text.set_markup(text);
  }
}

const RegisteredBalanceIndicatorView = registerGObjectClass(BalanceIndicatorView);

function hasValidOptions(
  indicator: InstanceType<typeof RegisteredBalanceIndicatorView>,
): indicator is InstanceType<typeof RegisteredBalanceIndicatorView> & ApiService.Subscriber {
  return indicator.options !== undefined && indicator._apiKey !== undefined;
}

class AccountCollection {
  private settings: Gio.Settings;
  private _indicators: InstanceType<typeof RegisteredBalanceIndicatorView>[];
  private _settingsChangedId: number;

  constructor(private ext: ExtensionBase) {
    this.settings = ext.getSettings();
    this._indicators = [];

    if (this.settings.get_boolean(FIRST_RUN_KEY)) {
      this.settings.set_boolean(FIRST_RUN_KEY, false);
    }

    const tryUpdateIndicators = () => {
      try {
        this._updateIndicators();
      } catch (e) {
        console.error(e);
      }
    };

    this._settingsChangedId = this.settings.connect(
      'changed::' + ACCOUNTS_KEY,
      tryUpdateIndicators,
    );

    tryUpdateIndicators();
  }

  async _updateIndicators() {
    const accountStrings = this.settings.get_strv(ACCOUNTS_KEY);
    const accounts: AccountConfig[] = [];

    for (const str of accountStrings) {
      try {
        accounts.push(JSON.parse(str) as AccountConfig);
      } catch (e: any) {
        console.error('Error parsing account:', e);
      }
    }

    if (accounts.length === this._indicators.length) {
      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        const indicator = this._indicators[i];
        if (account && indicator) {
          try {
            indicator.setOptions(account);
            const apiKey = await KeyringManager.retrieveApiKey(account.id);
            if (apiKey) {
              indicator._apiKey = apiKey;
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    } else {
      this._removeAll();
      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        if (account) {
          const apiKey = await KeyringManager.retrieveApiKey(account.id);
          const view = new RegisteredBalanceIndicatorView(
            this.ext,
            account.id,
            account,
            apiKey || '',
          );
          Main.panel.addToStatusArea(`balance-watch-${i}`, view);
          this._indicators.push(view);
        }
      }
    }

    const subscribers = this._indicators.filter(hasValidOptions).map((ind) => ({
      accountId: ind.accountId,
      options: ind.options!,
      apiKey: ind._apiKey,
      onUpdateStart: () => ind.onUpdateStart(),
      onUpdateError: (err: Error) => ind.onUpdateError(err),
      onUpdateBalance: (data: BalanceData) => ind.onUpdateBalance(data),
    }));

    ApiService.setSubscribers(subscribers);
  }

  _removeAll() {
    this._indicators.forEach((i) => i.destroy());
    this._indicators = [];
  }

  destroy() {
    this._removeAll();
    ApiService.setSubscribers([]);
    this.settings.disconnect(this._settingsChangedId);
  }
}

export default class BalanceWatchExtension extends Extension {
  _accountCollection: AccountCollection | null = null;

  constructor(props: ExtensionMetadata) {
    super(props);
    ApiService.setExtension(this);
  }

  enable(): void {
    console.log('balance-watch: enable() called');
    try {
      this._accountCollection = new AccountCollection(this);
      console.log('balance-watch: AccountCollection created');
    } catch (e) {
      console.error('balance-watch: Error in enable():', e);
    }
  }

  disable(): void {
    this._accountCollection?.destroy();
    this._accountCollection = null;
    ApiService.destroy();
    removeAllTimeouts();
    HTTP.destroy();
  }
}
