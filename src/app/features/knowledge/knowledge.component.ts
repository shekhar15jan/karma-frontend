import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KnowledgeService } from '../../shared/services/knowledge.service';
import { KnowledgePackResponse } from '../../shared/models/knowledge.model';

interface KnowledgeDoc {
  id: string;
  name: string;
  type: string;
  size: string;
  status: 'ready' | 'processing';
  uploaded_at: string;
}

@Component({
  selector: 'app-knowledge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './knowledge.component.html',
  styleUrls: ['./knowledge.component.scss']
})
export class KnowledgeComponent implements OnInit {
  docs: KnowledgeDoc[] = [];
  loading = false;
  error: string | null = null;

  constructor(private readonly knowledgeService: KnowledgeService) {}

  ngOnInit(): void {
    this.loadKnowledge();
  }

  loadKnowledge(): void {
    this.loading = true;
    this.error = null;
    this.knowledgeService.getAll().subscribe({
      next: (data) => {
        this.docs = data.map((k: KnowledgePackResponse) => ({
          id: k.id,
          name: k.name,
          type: 'txt',
          size: '1 MB',
          status: 'ready' as const,
          uploaded_at: k.createdAt
        }));
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load knowledge packs.';
        this.loading = false;
        console.error(err);
      }
    });
  }
}
