import Gtk from '@girs/gtk-4.0';
import Secret from '@girs/secret-1';
import { makeConfigRow } from './BaseProviderConfigView';

export class ApiKeyEntry extends Gtk.Box {
  private entry: Gtk.Entry;
  private saveButton: Gtk.Button;
  private statusLabel: Gtk.Label;
  private accountId: string;

  constructor(accountId: string, currentKey: string = '') {
    super({
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 8,
      valign: Gtk.Align.START,
    });

    this.accountId = accountId;

    this.entry = new Gtk.Entry({
      text: currentKey,
      placeholder_text: 'Enter API key...',
      visibility: false,
      width_chars: 40,
    });

    this.saveButton = new Gtk.Button({ label: 'Save to Keyring' });
    this.saveButton.get_style_context().add_class('suggested-action');

    this.statusLabel = new Gtk.Label({ label: '' });

    const keyRow = makeConfigRow('API Key', this.entry);
    this.append(keyRow);

    const buttonBox = new Gtk.Box({ spacing: 8 });
    buttonBox.append(this.saveButton);
    buttonBox.append(this.statusLabel);
    this.append(buttonBox);

    this.saveButton.connect('clicked', () => this.saveApiKey());
  }

  private async saveApiKey() {
    const apiKey = this.entry.get_text();
    if (!apiKey.trim()) {
      this.statusLabel.set_label('Error: API key is empty');
      return;
    }

    try {
      await Secret.password_store(
        null,
        { 'account-id': this.accountId },
        Secret.COLLECTION_DEFAULT,
        `Balance Watch - ${this.accountId}`,
        apiKey,
      );
      this.statusLabel.set_label('Saved to Keyring!');
      this.statusLabel.get_style_context().add_class('success');
      setTimeout(() => {
        this.statusLabel.set_label('');
        this.statusLabel.get_style_context().remove_class('success');
      }, 3000);
    } catch (e) {
      this.statusLabel.set_label('Error saving: ' + String(e));
    }
  }

  destroy() {
    (this as any).destroy();
  }
}
