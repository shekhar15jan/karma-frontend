import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

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

  ngOnInit(): void {
    this.items = [
      { id: 'item-1', name: 'TikTok Hooks Generator Pro', category: 'prompt', downloads: '8.4K', description: 'Advanced script openings optimized for high visual retention in 3s.', rating: 4.8, installed: true },
      { id: 'item-2', name: 'Short-Form Vertical Presets', category: 'preset', downloads: '12.5K', description: 'FFmpeg layout parameters for compiling 9:16 vertical shorts.', rating: 4.9, installed: false },
      { id: 'item-3', name: 'LinkedIn Writer Agent template', category: 'agent', downloads: '4.2K', description: 'Agent profile configured with cold hook and structural formatting.', rating: 4.6, installed: false },
      { id: 'item-4', name: 'Voice Narration Presets', category: 'preset', downloads: '6.8K', description: 'Ready-to-use audio templates containing narration characters.', rating: 4.7, installed: true }
    ];
  }

  installItem(item: MarketplaceItem): void {
    item.installed = true;
  }
}
