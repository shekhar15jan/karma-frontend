import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ScheduledPublish {
  id: string;
  title: string;
  time: string;
  day: string;
  platform: 'youtube' | 'tiktok' | 'instagram' | 'linkedin';
  status: 'pending' | 'completed';
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent {
  days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  schedule: ScheduledPublish[] = [
    { id: '1', title: 'Viral AI Tech Trends', time: '10:00 AM', day: 'Monday', platform: 'youtube', status: 'completed' },
    { id: '2', title: 'Spring Boot automation trick', time: '02:00 PM', day: 'Wednesday', platform: 'linkedin', status: 'pending' },
    { id: '3', title: 'Product Launch teaser', time: '06:00 PM', day: 'Friday', platform: 'tiktok', status: 'pending' },
    { id: '4', title: 'Why developers love Karma OS', time: '11:00 AM', day: 'Sunday', platform: 'instagram', status: 'pending' }
  ];

  getEventsForDay(day: string): ScheduledPublish[] {
    return this.schedule.filter(s => s.day === day);
  }
}
