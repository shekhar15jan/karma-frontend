import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SkillsService, SkillRequest } from '../../shared/services/skills.service';
import { SkillResponse } from '../../shared/models/skill.model';
import { StatusToggleComponent } from '../../shared/components/status-toggle/status-toggle.component';

@Component({
  selector: 'app-skill-library',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusToggleComponent],
  templateUrl: './skill-library.component.html',
  styleUrls: ['./skill-library.component.scss']
})
export class SkillLibraryComponent implements OnInit {
  skills: SkillResponse[] = [];
  loading = false;
  error: string | null = null;

  selectedSkill: SkillResponse | null = null;
  isNewSkill = false;
  form: SkillRequest = { name: '', description: '', category: '' };

  categoryFilter = '';
  private readonly togglingIds = new Set<string>();

  constructor(private readonly skillsService: SkillsService) {}

  ngOnInit(): void {
    this.loadSkills();
  }

  get categories(): string[] {
    const set = new Set<string>();
    for (const s of this.skills) {
      if (s.category) set.add(s.category);
    }
    return [...set].sort();
  }

  get filteredSkills(): SkillResponse[] {
    if (!this.categoryFilter) return this.skills;
    return this.skills.filter(s => s.category === this.categoryFilter);
  }

  loadSkills(): void {
    this.loading = true;
    this.error = null;
    this.skillsService.getAll().subscribe({
      next: (data) => {
        this.skills = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load skills.';
        this.loading = false;
        console.error('Failed to fetch skills', err);
      }
    });
  }

  newSkill(): void {
    this.form = { name: '', description: '', category: 'agent' };
    this.selectedSkill = null;
    this.isNewSkill = true;
  }

  editSkill(skill: SkillResponse): void {
    this.selectedSkill = skill;
    this.form = { name: skill.name, description: skill.description, category: skill.category || '' };
    this.isNewSkill = false;
  }

  deleteSkill(skill: SkillResponse): void {
    if (!confirm(`Delete skill "${skill.name}"? This soft-deletes it and detaches it from agents.`)) return;
    this.skillsService.delete(skill.id).subscribe({
      next: () => this.loadSkills(),
      error: (err) => console.error('Failed to delete skill', err)
    });
  }

  toggleSkill(skill: SkillResponse): void {
    if (this.togglingIds.has(skill.id)) return;
    this.togglingIds.add(skill.id);
    const original = skill.status;
    const target = this.isLive(original) ? 'DRAFT' : 'ACTIVE';
    this.skills = this.skills.map(s => s.id === skill.id ? { ...s, status: target } : s);
    const op = target === 'ACTIVE'
      ? this.skillsService.activate(skill.id)
      : this.skillsService.deactivate(skill.id);
    op.subscribe({
      next: () => {
        this.togglingIds.delete(skill.id);
        this.showToast(target === 'ACTIVE' ? `Skill "${skill.name}" activated` : `Skill "${skill.name}" deactivated`, target === 'ACTIVE' ? 'check_circle' : 'toggle_off');
      },
      error: (err) => {
        this.togglingIds.delete(skill.id);
        this.skills = this.skills.map(s => s.id === skill.id ? { ...s, status: original } : s);
        this.showToast(`Failed to update skill: ${err?.error?.message || err?.message || 'unknown error'}`, 'error');
        console.error('Failed to toggle skill', err);
      }
    });
  }

  isLive(status: string): boolean {
    return status === 'ACTIVE' || status === 'INSTALLED';
  }

  saveSkill(): void {
    if (!this.form.name || !this.form.name.trim()) return;
    const payload: SkillRequest = {
      name: this.form.name.trim(),
      description: this.form.description,
      category: this.form.category,
    };
    const op = this.isNewSkill
      ? this.skillsService.create(payload)
      : this.skillsService.update(this.selectedSkill!.id, payload);
    op.subscribe({
      next: () => {
        this.selectedSkill = null;
        this.isNewSkill = false;
        this.loadSkills();
      },
      error: (err) => console.error('Failed to save skill', err)
    });
  }

  showToast(message: string, icon: string = 'info'): void {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, icon } }));
  }
}
