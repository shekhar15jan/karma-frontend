import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../shared/services/api.service';

interface AnalyticsSummary {
  total_executions: number;
  avg_duration_ms: number;
  total_cost: number;
  success_rate: number;
}

interface DailyExecution {
  date: string;
  count: number;
  avg_duration_ms: number;
}

interface CostBreakdown {
  provider: string;
  cost: number;
  percentage: number;
}

interface SlowWorkflow {
  id: string;
  name: string;
  avg_duration_ms: number;
  execution_count: number;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss'],
})
export class AnalyticsComponent implements OnInit {
  periods = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: 'custom', label: 'Custom' },
  ];
  selectedPeriod = '7d';
  dateFrom = '';
  dateTo = '';

  summary: AnalyticsSummary | null = null;
  dailyData: DailyExecution[] = [];
  costData: CostBreakdown[] = [];
  slowWorkflows: SlowWorkflow[] = [];
  loading = false;

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    const period = this.selectedPeriod === 'custom' ? 'custom' : this.selectedPeriod;

    this.api.get<AnalyticsSummary>(`/v1/analytics/summary?period=${period}`).subscribe({
      next: (data) => (this.summary = data),
    });

    const dailyParams =
      this.selectedPeriod === 'custom'
        ? `from=${this.dateFrom}&to=${this.dateTo}`
        : `period=${this.selectedPeriod}`;
    this.api.get<DailyExecution[]>(`/v1/analytics/daily?${dailyParams}`).subscribe({
      next: (data) => {
        this.dailyData = data;
        this.loading = false;
      },
    });

    this.api.get<CostBreakdown[]>(`/v1/analytics/costs?period=${this.selectedPeriod}`).subscribe({
      next: (data) => (this.costData = data),
    });

    this.api.get<SlowWorkflow[]>('/v1/analytics/slow-workflows?limit=10').subscribe({
      next: (data) => (this.slowWorkflows = data),
    });
  }

  get maxCount(): number {
    return Math.max(...this.dailyData.map((d) => d.count), 1);
  }

  barHeight(count: number): number {
    return (count / this.maxCount) * 100;
  }

  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  exportCsv(type: string): void {
    let csv = '';
    const filename = `analytics-${type}-${new Date().toISOString().slice(0, 10)}.csv`;

    if (type === 'daily' && this.dailyData.length) {
      csv = 'Date,Count,Avg Duration (ms)\n';
      csv += this.dailyData.map((d) => `${d.date},${d.count},${d.avg_duration_ms}`).join('\n');
    } else if (type === 'costs' && this.costData.length) {
      csv = 'Provider,Cost,Percentage\n';
      csv += this.costData.map((c) => `${c.provider},${c.cost},${c.percentage}`).join('\n');
    } else if (type === 'slow' && this.slowWorkflows.length) {
      csv = 'Workflow ID,Name,Avg Duration (ms),Executions\n';
      csv += this.slowWorkflows.map((w) => `${w.id},${w.name},${w.avg_duration_ms},${w.execution_count}`).join('\n');
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  onPeriodChange(): void {
    if (this.selectedPeriod !== 'custom') {
      this.loadData();
    }
  }
}
