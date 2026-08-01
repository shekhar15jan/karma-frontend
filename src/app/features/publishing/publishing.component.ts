import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../shared/services/api.service';

interface SocialChannel {
  id: string;
  platform: string;
  name: string;
  handle: string;
  status: 'connected' | 'disconnected';
  custom?: boolean;
  authType?: string;
  contentFormat?: string;
  authConfigured?: boolean;
  stats?: {
    followers: string;
    videos_count: number;
  };
}

interface PublicationLog {
  id: string;
  title: string;
  platform: string;
  status: 'completed' | 'failed' | 'scheduled';
  published_at: string;
  views: number;
  url?: string;
}

interface PlatformMeta {
  icon: string;
  color: string;
}

const PLATFORM_META: Record<string, PlatformMeta> = {
  youtube: { icon: 'video_library', color: 'text-red-500' },
  instagram: { icon: 'photo_camera', color: 'text-pink-500' },
  linkedin: { icon: 'work', color: 'text-blue-500' },
  facebook: { icon: 'thumb_up', color: 'text-blue-400' },
  'x (twitter)': { icon: 'alternate_email', color: 'text-sky-400' },
  x: { icon: 'alternate_email', color: 'text-sky-400' },
  pinterest: { icon: 'pin_drop', color: 'text-red-400' },
  threads: { icon: 'forum', color: 'text-sky-300' },
  snapchat: { icon: 'bolt', color: 'text-yellow-400' },
  tiktok: { icon: 'music_note', color: 'text-cyan-300' },
  wordpress: { icon: 'web', color: 'text-blue-400' },
  blogger: { icon: 'edit_note', color: 'text-orange-400' },
  medium: { icon: 'article', color: 'text-neutral-300' },
  substack: { icon: 'rss_feed', color: 'text-orange-300' },
  reddit: { icon: 'chat_bubble', color: 'text-orange-400' },
  tumblr: { icon: 'local_fire_department', color: 'text-blue-300' }
};

const DEFAULT_META: PlatformMeta = { icon: 'link', color: 'text-primary' };

@Component({
  selector: 'app-publishing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './publishing.component.html',
  styleUrls: ['./publishing.component.scss']
})
export class PublishingComponent implements OnInit {
  channels: SocialChannel[] = [];
  publications: PublicationLog[] = [];
  loading = false;
  error: string | null = null;
  selectedChannel: SocialChannel | null = null;
  showLinkModal = false;

  authKey = '';
  clientId = '';
  clientSecret = '';

  showCustomModal = false;
  editingCustomId: string | null = null;
  customName = '';
  customPlatform = '';
  customEndpoint = '';
  customAuthType = 'Bearer';
  customAuthToken = '';
  customContentFormat = 'text/markdown';
  customNotes = '';

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.loadPublishingData();
  }

  platformMeta(platform: string): PlatformMeta {
    const key = (platform || '').toLowerCase().trim();
    return PLATFORM_META[key] || (key.includes('x') ? PLATFORM_META['x'] : DEFAULT_META);
  }

  loadPublishingData(): void {
    this.loading = true;
    this.error = null;
    this.api.get<SocialChannel[]>('/v1/publishing/channels').subscribe({
      next: (res) => {
        const data = (res as any).data || res || [];
        this.channels = Array.isArray(data) ? data : [];
        this.loadLogs();
      },
      error: () => {
        this.error = 'Publishing channels unavailable.';
        this.loading = false;
      }
    });
  }

  loadLogs(): void {
    this.api.get<PublicationLog[]>('/v1/publishing/logs').subscribe({
      next: (data) => {
        this.publications = (data as any).data || data || [];
        this.loading = false;
      },
      error: () => {
        this.publications = [];
        this.loading = false;
      }
    });
  }

  openLinkModal(channel: SocialChannel): void {
    this.selectedChannel = channel;
    this.authKey = '';
    this.clientId = '';
    this.clientSecret = '';
    this.showLinkModal = true;
  }

  linkChannel(): void {
    if (!this.selectedChannel) return;
    const handle = this.authKey.trim() || this.clientId.trim() || '';
    this.api.put(`/v1/publishing/channels/${this.selectedChannel.id}/connect`, { handle, authKey: this.authKey.trim() }).subscribe({
      next: (res) => {
        const updated = (res as any).data;
        this.channels = this.channels.map(c => c.id === this.selectedChannel!.id ? { ...c, ...updated } : c);
        this.showLinkModal = false;
      },
      error: () => {
        this.error = 'Failed to link channel.';
        this.showLinkModal = false;
      }
    });
  }

  disconnectChannel(channel: SocialChannel): void {
    this.api.put(`/v1/publishing/channels/${channel.id}/disconnect`, {}).subscribe({
      next: (res) => {
        const updated = (res as any).data;
        this.channels = this.channels.map(c => c.id === channel.id ? { ...c, ...updated, stats: undefined } : c);
      },
      error: () => {
        this.channels = this.channels.map(c =>
          c.id === channel.id ? { ...c, status: 'disconnected', handle: '', name: 'Not Linked', stats: undefined } : c
        );
      }
    });
  }

  openCustomModal(channel?: SocialChannel): void {
    this.editingCustomId = channel ? channel.id : null;
    this.customName = channel ? channel.name : '';
    this.customPlatform = channel && channel.custom ? channel.platform : '';
    this.customEndpoint = channel ? channel.handle : '';
    this.customAuthType = channel?.authType || 'Bearer';
    this.customAuthToken = '';
    this.customContentFormat = channel?.contentFormat || 'text/markdown';
    this.customNotes = '';
    this.showCustomModal = true;
  }

  saveCustomChannel(): void {
    const body = {
      name: this.customName,
      platform: this.customPlatform || 'custom',
      endpoint: this.customEndpoint,
      authType: this.customAuthType,
      authToken: this.customAuthToken,
      contentFormat: this.customContentFormat,
      notes: this.customNotes
    };
    const request = this.editingCustomId
      ? this.api.put(`/v1/publishing/channels/${this.editingCustomId}`, body)
      : this.api.post('/v1/publishing/channels/custom', body);
    request.subscribe({
      next: (res) => {
        const saved = (res as any).data;
        if (this.editingCustomId) {
          this.channels = this.channels.map(c => c.id === saved.id ? { ...c, ...saved } : c);
        } else {
          this.channels = [...this.channels, saved];
        }
        this.showCustomModal = false;
      },
      error: () => {
        this.error = this.editingCustomId ? 'Failed to update custom channel.' : 'Failed to add custom channel.';
        this.showCustomModal = false;
      }
    });
  }

  removeChannel(channel: SocialChannel): void {
    if (!confirm(`Remove custom channel "${channel.name}"?`)) return;
    this.api.delete(`/v1/publishing/channels/${channel.id}`).subscribe({
      next: () => {
        this.channels = this.channels.filter(c => c.id !== channel.id);
      },
      error: () => {
        this.error = 'Failed to remove custom channel.';
      }
    });
  }
}
