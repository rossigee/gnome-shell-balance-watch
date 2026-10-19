import Gtk from 'gi://Gtk';
import { registerGObjectClass } from '../gjs';

export function makeConfigRow(labelText: string, widget: Gtk.Widget): Gtk.Grid {
  const grid = new Gtk.Grid({
    column_spacing: 12,
    halign: Gtk.Align.FILL,
  });

  const label = new Gtk.Label({
    label: labelText,
    halign: Gtk.Align.END,
    valign: Gtk.Align.CENTER,
  });

  grid.attach(label, 0, 0, 1, 1);
  grid.attach(widget, 1, 0, 1, 1);

  return grid;
}

export class ComboBoxView extends Gtk.ComboBoxText {
  constructor(options: Array<{ value: string; label: string; active?: boolean }>) {
    super();

    options.forEach((opt) => {
      this.append(opt.value, opt.label);
      if (opt.active) {
        this.set_active_id(opt.value);
      }
    });
  }

  connectChanged(callback: (value: string) => void): number {
    return this.connect('changed', () => {
      const activeId = this.get_active_id();
      if (activeId) {
        callback(activeId);
      }
    });
  }
}

export const RegisteredComboBoxView = registerGObjectClass(ComboBoxView);

export interface ProviderConfigView {
  widget: Gtk.Widget;
  destroy(): void;
}

export class BaseProviderConfigView {
  public widget: Gtk.Box;
  private _provider: string;
  private _config: any;

  constructor(
    private gettext: (s: string) => string,
    provider: string,
    parent: Gtk.Widget,
    config: any,
  ) {
    this._provider = provider;
    this._config = config;

    this.widget = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      margin_start: 12,
      margin_end: 12,
      margin_top: 12,
      margin_bottom: 12,
      spacing: 12,
    });

    this._buildExtraParams();
    (parent as Gtk.Box).append(this.widget);
  }

  private _buildExtraParams() {
    const extraFields: string[] = [];

    if (this._provider === 'ppq') {
      extraFields.push('credit_id');
    }

    if (this._provider === 'xai') {
      extraFields.push('team_id');
    }

    extraFields.forEach((field) => {
      const entry = new Gtk.Entry({
        placeholder_text: field === 'credit_id' ? 'PPQ.AI Credit ID' : 'xAI Team ID',
        text: this._config.get('extraParams')?.[field] || '',
      });

      entry.connect('changed', () => {
        const current = this._config.get('extraParams') || {};
        current[field] = entry.text;
        this._config.set('extraParams', current);
      });

      const row = makeConfigRow(field === 'credit_id' ? 'Credit ID' : 'Team ID', entry);

      this.widget.append(row);
    });
  }

  destroy() {
    (this.widget as any).destroy();
  }
}
