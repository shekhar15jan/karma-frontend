import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

export interface VoiceLanguage {
  code: string;
  name: string;
  voice: string;
}

@Injectable({ providedIn: 'root' })
export class VoicePreferencesService {
  readonly language = signal('en');
  readonly voice = signal('en-IN-NeerjaNeural');
  readonly languages = signal<VoiceLanguage[]>([]);
  readonly voices = signal<string[]>([]);
  readonly loaded = signal(false);
  readonly configured = signal(false);

  constructor(private readonly api: ApiService) {}

  async loadCatalog(): Promise<void> {
    try {
      const res = await firstValueFrom(this.api.getData<any>('/v1/voice/voices'));
      this.languages.set(Array.isArray(res?.languages) ? res.languages : []);
      this.voices.set(Array.isArray(res?.voices) ? res.voices : []);
    } catch (e) {
      console.warn('Voice catalog unavailable', e);
    }
  }

  async loadPreferences(): Promise<void> {
    try {
      const res = await firstValueFrom(this.api.getData<any>('/v1/settings'));
      const data = this.parseSettingsData(res?.settingsData);
      const lang = data.voice_language || 'en';
      this.language.set(lang);
      this.voice.set(data.voice_id || this.defaultVoiceFor(lang));
      this.configured.set(!!(data.voice_language || data.voice_id));
    } catch (e) {
      // No settings stored yet — keep defaults
      console.warn('Voice preferences unavailable', e);
    } finally {
      this.loaded.set(true);
    }
  }

  async save(language: string, voice: string): Promise<void> {
    this.language.set(language);
    this.voice.set(voice);
    this.configured.set(true);
    let data: any = {};
    try {
      const existing = await firstValueFrom(this.api.getData<any>('/v1/settings'));
      data = this.parseSettingsData(existing?.settingsData);
    } catch (e) {
      // No existing settings — start fresh
    }
    data.voice_language = language;
    data.voice_id = voice;
    try {
      await firstValueFrom(this.api.put<any>('/v1/settings', { settingsData: JSON.stringify(data) }));
    } catch (e) {
      console.error('Failed to save voice preferences', e);
    }
  }

  defaultVoiceFor(language: string): string {
    const found = this.languages().find(l => l.code === language);
    return found?.voice || 'en-IN-NeerjaNeural';
  }

  voicesForLanguage(language: string): string[] {
    const prefix = (language || 'en').split('-')[0];
    const all = this.voices();
    const matched = all.filter(v => v.toLowerCase().startsWith(prefix.toLowerCase()));
    return matched.length > 0 ? matched : all;
  }

  private parseSettingsData(raw: unknown): any {
    if (raw == null) return {};
    if (typeof raw === 'string' && raw.trim()) {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    if (typeof raw === 'object') {
      return raw;
    }
    return {};
  }
}
