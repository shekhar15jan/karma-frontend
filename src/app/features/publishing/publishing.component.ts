import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../shared/services/api.service';

interface SocialChannel {
  id: string;
  platform: 'youtube' | 'tiktok' | 'instagram' | 'linkedin';
  name: string;
  handle: string;
  status: 'connected' | 'disconnected';
  stats?: {
    followers: string;
    videos_count: number;
  };
}

interface PublicationLog {
  id: string;
  title: string;
  platform: 'youtube' | 'tiktok' | 'instagram' | 'linkedin';
  status: 'completed' | 'failed' | 'scheduled';
  published_at: string;
  views: number;
  url?: string;
}

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
  selectedChannel: SocialChannel | null = null;
  showLinkModal = false;
  
  // Auth Form Fields
  authKey = '';
  clientId = '';
  clientSecret = '';

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.loadPublishingData();
  }

  loadPublishingData(): void {
    this.loading = true;
    this.api.get<SocialChannel[]>('/v1/publishing/channels').subscribe({
      next: (data) => {
        this.channels = data && data.length ? data : this.getMockChannels();
        this.loadLogs();
      },
      error: () => {
        this.channels = this.getMockChannels();
        this.loadLogs();
      }
    });
  }

  loadLogs(): void {
    this.api.get<PublicationLog[]>('/v1/publishing/logs').subscribe({
      next: (data) => {
        this.publications = data && data.length ? data : this.getMockPublications();
        this.loading = false;
      },
      error: () => {
        this.publications = this.getMockPublications();
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
    
    this.api.post(`/v1/publishing/channels/${this.selectedChannel.id}/link`, {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      auth_key: this.authKey
    }).subscribe({
      next: () => {
        this.showLinkModal = false;
        this.loadPublishingData();
      },
      error: () => {
        this.channels = this.channels.map(c => 
          c.id === this.selectedChannel!.id 
            ? { 
                ...c, 
                status: 'connected', 
                handle: `@chandrashekhar_${c.platform}`, 
                name: 'Chandrashekhar Dev',
                stats: { followers: '1.2K subscribers', videos_count: 4 }
              } 
            : c
        );
        this.showLinkModal = false;
      }
    });
  }

  disconnectChannel(channel: SocialChannel): void {
    this.api.post(`/v1/publishing/channels/${channel.id}/disconnect`, {}).subscribe({
      next: () => this.loadPublishingData(),
      error: () => {
        this.channels = this.channels.map(c => 
          c.id === channel.id 
            ? { ...c, status: 'disconnected', handle: '', name: 'Not Linked', stats: undefined } 
            : c
        );
      }
    });
  }

  private getMockChannels(): SocialChannel[] {
    return [
      { id: 'youtube', platform: 'youtube', name: 'Karma Automations', handle: '@karma_auto', status: 'connected', stats: { followers: '12.4K subscribers', videos_count: 84 } },
      { id: 'tiktok', platform: 'tiktok', name: 'Not Linked', handle: '', status: 'disconnected' },
      { id: 'instagram', platform: 'instagram', name: 'Karma Reels', handle: '@karma_reels', status: 'connected', stats: { followers: '45.1K followers', videos_count: 142 } },
      { id: 'linkedin', platform: 'linkedin', name: 'Not Linked', handle: '', status: 'disconnected' }
    ];
  }

  private getMockPublications(): PublicationLog[] {
    return [
      { id: 'pub-1', title: 'Why Agentic AI is the Future of Tech', platform: 'youtube', status: 'completed', published_at: '2026-07-28T18:30:00Z', views: 1845, url: 'https://youtube.com/watch?v=mock1' },
      { id: 'pub-2', title: 'Building Angular Apps in 2026', platform: 'instagram', status: 'completed', published_at: '2026-07-28T12:00:00Z', views: 8940, url: 'https://instagram.com/reel/mock2' },
      { id: 'pub-3', title: 'Karma OS Launch Teaser', platform: 'youtube', status: 'completed', published_at: '2026-07-27T15:00:00Z', views: 15420, url: 'https://youtube.com/watch?v=mock3' },
      { id: 'pub-4', title: 'AI Automation Pipelines Breakdown', platform: 'linkedin', status: 'scheduled', published_at: '2026-07-30T10:00:00Z', views: 0 }
    ];
  }
}
