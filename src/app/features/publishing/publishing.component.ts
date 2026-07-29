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
  error: string | null = null;
  selectedChannel: SocialChannel | null = null;
  showLinkModal = false;
  
  authKey = '';
  clientId = '';
  clientSecret = '';

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.loadPublishingData();
  }

  loadPublishingData(): void {
    this.loading = true;
    this.error = null;
    this.api.get<SocialChannel[]>('/v1/publishing/channels').subscribe({
      next: () => {
        this.channels = [];
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
    this.showLinkModal = false;
  }

  disconnectChannel(channel: SocialChannel): void {
    this.channels = this.channels.map(c => 
      c.id === channel.id 
        ? { ...c, status: 'disconnected', handle: '', name: 'Not Linked', stats: undefined } 
        : c
    );
  }
}
