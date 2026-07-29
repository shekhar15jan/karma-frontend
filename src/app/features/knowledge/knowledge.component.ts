import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface KnowledgeDoc {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'txt' | 'csv';
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

  ngOnInit(): void {
    this.docs = [
      { id: 'doc-1', name: 'Stitch UI Brand Guidelines', type: 'pdf', size: '4.2 MB', status: 'ready', uploaded_at: '2026-07-28T10:00:00Z' },
      { id: 'doc-2', name: 'Product Marketing Pitch deck', type: 'docx', size: '12.8 MB', status: 'ready', uploaded_at: '2026-07-28T12:00:00Z' },
      { id: 'doc-3', name: 'Target Audience Analytics data', type: 'csv', size: '890 KB', status: 'ready', uploaded_at: '2026-07-27T18:00:00Z' },
      { id: 'doc-4', name: 'Developer Q&A transcripts', type: 'txt', size: '124 KB', status: 'processing', uploaded_at: '2026-07-29T01:00:00Z' }
    ];
  }
}
