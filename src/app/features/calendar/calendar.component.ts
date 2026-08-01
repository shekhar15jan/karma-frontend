import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../shared/services/api.service';

interface ScheduledPublish {
  id: string;
  title: string;
  time: string;
  day: string;
  platform: string;
  status: 'pending' | 'completed' | 'failed';
  url?: string;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {
  days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  schedule: ScheduledPublish[] = [];

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.api.get<any[]>('/v1/calendar/events').subscribe({
      next: (res) => {
        this.schedule = (res?.data || []).map((e: any) => ({
          id: e.id,
          title: e.title,
          time: e.time || '10:00',
          day: e.day || 'Monday',
          platform: e.platform || 'webhook',
          status: e.status || 'pending',
          url: e.url
        }));
      }
    });
  }

  getEventsForDay(day: string): ScheduledPublish[] {
    return this.schedule.filter(s => s.day === day);
  }
}
