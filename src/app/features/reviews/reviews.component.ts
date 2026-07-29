import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface VideoDraft {
  id: string;
  title: string;
  duration: string;
  scriptSnippet: string;
  status: 'pending_review' | 'approved' | 'rejected';
}

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.scss']
})
export class ReviewsComponent implements OnInit {
  drafts: VideoDraft[] = [];
  selectedDraft: VideoDraft | null = null;

  ngOnInit(): void {
    this.drafts = [
      { id: 'draft-1', title: 'Why Agentic AI is the Future of Tech', duration: '00:58', scriptSnippet: 'Artificial Intelligence is evolving rapidly, but the real revolution is in agentic workflows. Instead of standard answers, agents plan and execute...', status: 'pending_review' },
      { id: 'draft-2', title: 'Why developers love Karma OS', duration: '01:15', scriptSnippet: 'Operating systems are built for users, but what about creators? Karma OS acts as your companion, automating the content lifecycle end-to-end...', status: 'pending_review' },
      { id: 'draft-3', title: 'Stitch UI layout explanation', duration: '00:45', scriptSnippet: 'Aesthetics are not just visuals, they represent user experience. Stitch UI brings radial gradients and neon accents to build dark HUD consoles...', status: 'approved' }
    ];
    this.selectedDraft = this.drafts[0];
  }

  selectDraft(draft: VideoDraft): void {
    this.selectedDraft = draft;
  }

  approveDraft(draft: VideoDraft): void {
    draft.status = 'approved';
    this.drafts = this.drafts.map(d => d.id === draft.id ? { ...draft } : d);
  }

  rejectDraft(draft: VideoDraft): void {
    draft.status = 'rejected';
    this.drafts = this.drafts.map(d => d.id === draft.id ? { ...draft } : d);
  }
}
