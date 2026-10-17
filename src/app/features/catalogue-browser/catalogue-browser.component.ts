import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogueService } from '../../shared/services/catalogue.service';
import { Catalogue, CatalogueFrame, CatalogueWidget, CatalogueIcon } from '../../shared/models/catalogue.model';

type Tab = 'frames' | 'widgets' | 'icons';

@Component({
  selector: 'app-catalogue-browser',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalogue-browser.component.html',
  styleUrls: ['./catalogue-browser.component.scss'],
})
export class CatalogueBrowserComponent implements OnInit {
  loading = true;
  error: string | null = null;
  catalogue: Catalogue | null = null;

  tab: Tab = 'frames';
  search = '';
  familyFilter = '';
  atomFilter = '';
  categoryFilter = '';
  showProposedOnly = false;

  constructor(private readonly catalogueService: CatalogueService) {}

  ngOnInit(): void {
    this.catalogueService.get().subscribe({
      next: (c) => {
        this.catalogue = c;
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.error?.error?.message || 'Could not load the catalogue from the renderer.';
        this.loading = false;
      },
    });
  }

  setTab(t: Tab): void {
    this.tab = t;
    this.search = '';
  }

  get families(): string[] {
    if (!this.catalogue) return [];
    return [...new Set(this.catalogue.frames.map((f) => f.family))].sort();
  }

  get atoms(): string[] {
    return this.catalogue?.atoms ?? [];
  }

  get iconCategories(): string[] {
    if (!this.catalogue) return [];
    return [...new Set(this.catalogue.icons.map((i) => i.category))].sort();
  }

  get filteredFrames(): CatalogueFrame[] {
    if (!this.catalogue) return [];
    const q = this.search.trim().toLowerCase();
    return this.catalogue.frames.filter((f) => {
      if (this.familyFilter && f.family !== this.familyFilter) return false;
      if (this.showProposedOnly && f.status !== 'proposed') return false;
      if (q && !f.id.includes(q) && !f.title.toLowerCase().includes(q) && !f.use.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  get filteredWidgets(): CatalogueWidget[] {
    if (!this.catalogue) return [];
    const q = this.search.trim().toLowerCase();
    return this.catalogue.widgets.filter((w) => {
      if (this.atomFilter && w.atom !== this.atomFilter) return false;
      if (this.showProposedOnly && w.status !== 'proposed') return false;
      if (q && !w.id.includes(q) && !w.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  get filteredIcons(): CatalogueIcon[] {
    if (!this.catalogue) return [];
    const q = this.search.trim().toLowerCase();
    return this.catalogue.icons.filter((i) => {
      if (this.categoryFilter && i.category !== this.categoryFilter) return false;
      if (q && !i.slug.includes(q) && !i.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  get liveCount(): number {
    return this.catalogue?.frames.filter((f) => f.status === 'live').length ?? 0;
  }
  get proposedCount(): number {
    return this.catalogue?.frames.filter((f) => f.status === 'proposed').length ?? 0;
  }
  get migratedCount(): number {
    return this.catalogue?.frames.filter((f) => f.migrated).length ?? 0;
  }
  get liveWidgetCount(): number {
    return this.catalogue?.widgets.filter((w) => w.status === 'live').length ?? 0;
  }

  trackFrame(_i: number, f: CatalogueFrame): string { return f.id; }
  trackWidget(_i: number, w: CatalogueWidget): string { return w.id; }
  trackIcon(_i: number, ic: CatalogueIcon): string { return ic.slug; }
}
