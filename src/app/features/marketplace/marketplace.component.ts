import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../shared/services/api.service';

interface MarketplaceItem {
  id: string;
  name: string;
  category: 'agent' | 'preset' | 'prompt';
  downloads: string;
  description: string;
  rating: number;
  installed: boolean;
}

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './marketplace.component.html',
  styleUrls: ['./marketplace.component.scss']
})
export class MarketplaceComponent implements OnInit {
  items: MarketplaceItem[] = [];
  loading = false;

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.loadItems();
  }

  loadItems(): void {
    this.loading = true;
    this.api.get<MarketplaceItem[]>('/v1/skills').subscribe({
      next: (data) => {
        this.items = (data?.data || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          category: 'agent' as const,
          downloads: '0',
          description: s.description || '',
          rating: 4.0,
          installed: false
        }));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  installItem(item: MarketplaceItem): void {
    item.installed = true;
  }
}
