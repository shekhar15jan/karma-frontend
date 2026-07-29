import { Injectable, NgZone, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../shared/services/api.service';

export interface VoiceCommand {
  text: string;
  intent: string;
  action: string;
  target?: string;
  confidence: number;
  display_text: string;
  params?: Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class VoiceCommandService {
  isListening = signal(false);
  lastCommand = signal<VoiceCommand | null>(null);
  transcript = signal('');
  error = signal('');
  availableCommands: { command: string; description: string }[] = [
    { command: 'Go to [page]', description: 'Navigate: dashboard, workflows, executions, artifacts, prompts, providers, analytics, administration' },
    { command: 'Create project', description: 'Create a new project' },
    { command: 'Run workflow', description: 'Run the current workflow' },
    { command: 'What can I say?', description: 'Show available voice commands' },
    { command: 'Stop listening', description: 'Turn off voice control' },
  ];

  private recognition: any = null;
  private isListeningInternal = false;

  constructor(
    private router: Router,
    private api: ApiService,
    private ngZone: NgZone,
  ) {}

  start(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.error.set('Speech recognition not supported in this browser. Try Chrome or Edge.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        this.ngZone.run(() => {
          this.transcript.set(finalTranscript);
          this.processCommand(finalTranscript);
        });
      }
    };

    this.recognition.onerror = (event: any) => {
      this.ngZone.run(() => {
        this.error.set(`Error: ${event.error}`);
        if (event.error === 'not-allowed') {
          this.stop();
        }
      });
    };

    this.recognition.onend = () => {
      if (this.isListeningInternal) {
        this.recognition.start();
      }
    };

    this.isListeningInternal = true;
    this.isListening.set(true);
    this.error.set('');
    this.recognition.start();
  }

  stop(): void {
    this.isListeningInternal = false;
    this.isListening.set(false);
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
  }

  toggle(): void {
    if (this.isListening()) {
      this.stop();
    } else {
      this.start();
    }
  }

  private async processCommand(text: string): Promise<void> {
    const lower = text.toLowerCase().trim();

    const navMap: [RegExp, string][] = [
      [/go to dashboard|show dashboard|open dashboard|home/i, '/dashboard'],
      [/go to workflow|open workflow|workflow designer|designer/i, '/workflows'],
      [/go to execution|show execution|open execution|monitor|pipeline/i, '/executions'],
      [/go to artifact|open artifact|show artifact|files/i, '/artifacts'],
      [/go to prompt|open prompt|prompt studio/i, '/prompts'],
      [/go to provider|open provider|provider center/i, '/providers'],
      [/show analytic|open analytic|go to analytic|reports/i, '/analytics'],
      [/go to admin|open admin|administration|settings/i, '/administration'],
      [/go back|go home|back/i, '/'],
    ];

    for (const [pattern, route] of navMap) {
      if (pattern.test(lower)) {
        const cmd: VoiceCommand = {
          text,
          intent: 'navigate',
          action: 'navigate',
          target: route,
          confidence: 0.9,
          display_text: `Navigating to ${route.replace('/', '') || 'home'}...`,
        };
        this.lastCommand.set(cmd);
        this.ngZone.run(() => this.router.navigate([route]));
        return;
      }
    }

    if (/create project|new project/i.test(lower)) {
      const cmd: VoiceCommand = { text, intent: 'create_project', action: 'create_project', confidence: 0.9, display_text: 'Opening project creation...' };
      this.lastCommand.set(cmd);
      this.ngZone.run(() => this.router.navigate(['/dashboard']));
      return;
    }

    if (/run workflow|execute|start pipeline/i.test(lower)) {
      const cmd: VoiceCommand = { text, intent: 'run_workflow', action: 'run_workflow', confidence: 0.9, display_text: 'Starting workflow execution...' };
      this.lastCommand.set(cmd);
      return;
    }

    if (/what can I say|help|commands|what do you do/i.test(lower)) {
      const cmd: VoiceCommand = { text, intent: 'help', action: 'help', confidence: 0.95, display_text: 'Showing available commands...' };
      this.lastCommand.set(cmd);
      return;
    }

    if (/stop listening|shut up|stop/i.test(lower)) {
      this.stop();
      const cmd: VoiceCommand = { text, intent: 'stop', action: 'stop_listening', confidence: 0.95, display_text: 'Voice control stopped.' };
      this.lastCommand.set(cmd);
      return;
    }

    try {
      const res = await this.api.post<VoiceCommand>('/voice/command', {
        text,
        context: { current_page: this.router.url },
      }).toPromise();
      if (res && res.action === 'navigate' && res.target) {
        this.ngZone.run(() => this.router.navigate([res.target]));
      }
      this.lastCommand.set(res || null);
    } catch {
      // Silent fallback
    }
  }
}
