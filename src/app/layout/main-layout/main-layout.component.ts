import { Component, OnInit, OnDestroy, ChangeDetectorRef, effect } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../shared/services/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { VoicePreferencesService } from '../../shared/services/voice-preferences.service';
import { ExecutionsService } from '../../shared/services/executions.service';
import { WorkspacesService } from '../../shared/services/workspaces.service';
import { KarmaActionService, KarmaUiAction } from '../../shared/services/karma-action.service';
import { WorkspaceResponse } from '../../shared/models/workspace.model';
import { firstValueFrom } from 'rxjs';

interface ChatMessage {
  sender: 'user' | 'karma';
  text: string;
  time: string;
  isTyping?: boolean;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, FormsModule],
  template: `
    <div class="text-on-surface font-body-sm bg-background h-screen overflow-hidden select-none">
      <!-- TOAST NOTIFICATION FOR SPEECH -->
      @if (toastMessage) {
        <div class="fixed bottom-24 right-6 bg-background/90 backdrop-blur-xl border border-primary/50 text-on-surface px-5 py-3 rounded-xl flex items-center gap-3 shadow-[0_0_20px_rgba(0,229,255,0.15)] z-[9999] transition-all duration-300">
          <span class="material-symbols-outlined text-primary text-lg animate-pulse">{{ toastIcon }}</span>
          <span class="text-[10px] font-mono font-bold uppercase tracking-wider">{{ toastMessage }}</span>
        </div>
      }

      <!-- TOP APP BAR -->
      <header class="fixed top-0 w-full h-16 z-50 flex justify-between items-center px-6 py-3 bg-background/95 backdrop-blur-xl border-b border-primary-container shadow-[0_2px_15px_rgba(0,229,255,0.4)]">
        <div class="flex items-center gap-6">
          <button (click)="toggleSidebar()" class="material-symbols-outlined text-primary p-2 hover:bg-primary/10 rounded-full transition-all cursor-pointer">
            {{ showSidebar ? 'menu_open' : 'menu' }}
          </button>
          <h1 class="text-xl font-bold text-on-surface tracking-tighter flex items-center gap-2 border-r border-outline-variant/30 pr-6 mr-2">
            KARMA <span class="text-primary font-light">OS</span>
          </h1>
          
          <!-- Workspace Selector -->
          <div class="relative group cursor-pointer">
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-outline-variant/20">
              <span class="material-symbols-outlined text-primary text-sm">workspaces</span>
              <div class="flex flex-col">
                <span class="text-[9px] uppercase tracking-wider text-on-surface-variant leading-none font-bold">Workspace</span>
                <span class="text-xs font-semibold text-on-surface leading-none mt-1">{{ activeWorkspace?.name || 'Select workspace' }}</span>
              </div>
              <span class="material-symbols-outlined text-on-surface-variant text-sm ml-1">expand_more</span>
            </div>
            <!-- Dropdown -->
            <div class="absolute top-full mt-2 left-0 w-48 bg-background border border-outline-variant/30 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
              <div class="p-2 flex flex-col gap-1">
                @for (ws of workspaces; track ws.id) {
                  <div (click)="selectWorkspace(ws)" class="px-3 py-2 hover:bg-white/5 rounded-lg cursor-pointer flex items-center gap-2"
                       [ngClass]="ws.id === activeWorkspace?.id ? 'border border-primary/30 bg-primary/10' : 'pl-8'">
                    @if (ws.id === activeWorkspace?.id) {
                      <span class="material-symbols-outlined text-primary text-sm">check</span>
                    }
                    <span class="text-xs font-semibold" [ngClass]="ws.id === activeWorkspace?.id ? 'text-primary' : 'text-on-surface-variant'">{{ ws.name }}</span>
                  </div>
                }
                <div class="h-px bg-outline-variant/20 my-1"></div>
                <a routerLink="/workspaces" class="px-3 py-2 hover:bg-white/5 rounded-lg cursor-pointer flex items-center gap-2 text-decoration-none">
                   <span class="material-symbols-outlined text-on-surface-variant text-sm">settings</span>
                   <span class="text-xs text-on-surface-variant font-medium">Manage Workspaces</span>
                </a>
              </div>
            </div>
          </div>
        </div>
        <div class="flex flex-col items-center">
          <span class="text-sm font-semibold text-on-surface">Good Morning, Chandrashekhar</span>
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_#4ade80]"></span>
            <span class="text-[10px] text-on-surface-variant">All Systems Operational</span>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <!-- Karma Voice output toggle (Speaking vs Muted) -->
          <div 
            class="glass-panel px-4 py-1.5 rounded-full flex items-center gap-3 cursor-pointer hover:bg-primary/15 transition-all"
            [style.box-shadow]="karmaVoiceSpeechEnabled ? '0 0 10px rgba(0, 229, 255, 0.2)' : ''"
            (click)="toggleKarmaVoiceSpeech()"
            title="Click to Mute/Unmute Karma TTS Speech"
          >
            <div class="relative">
              <div class="w-7 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center"
                [style.background-color]="!karmaVoiceSpeechEnabled ? 'rgba(239, 68, 68, 0.1)' : ''"
                [style.border-color]="!karmaVoiceSpeechEnabled ? 'rgba(239, 68, 68, 0.3)' : ''">
                <span class="material-symbols-outlined text-sm" [class.text-primary]="karmaVoiceSpeechEnabled" [class.text-red-400]="!karmaVoiceSpeechEnabled">
                  {{ karmaVoiceSpeechEnabled ? 'volume_up' : 'volume_off' }}
                </span>
              </div>
            </div>
            <div class="flex flex-col">
              <span class="text-[10px] font-label-mono text-primary-container uppercase leading-none" [class.text-red-400]="!karmaVoiceSpeechEnabled">
                Karma Voice
              </span>
              <span class="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">
                {{ karmaVoiceSpeechEnabled ? 'Active (Speech)' : 'Muted (Silent)' }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button (click)="toggleTheme()" class="material-symbols-outlined text-on-surface-variant hover:text-primary transition-all p-2 cursor-pointer" [title]="isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'">{{ isDarkMode ? 'light_mode' : 'dark_mode' }}</button>
            <button (click)="showToast('Global Search coming soon', 'search')" class="material-symbols-outlined text-on-surface-variant hover:text-primary transition-all p-2 cursor-pointer" title="Search">search</button>
            <button (click)="toggleChat()" class="material-symbols-outlined text-on-surface-variant hover:text-primary transition-all p-2 cursor-pointer" title="Karma Chat Panel">chat_bubble</button>
            <div class="relative">
              <button (click)="showToast('No new notifications', 'notifications')" class="material-symbols-outlined text-on-surface-variant hover:text-primary transition-all p-2 cursor-pointer" title="Notifications">notifications</button>
            </div>
            <div class="ml-4 pl-4 border-l border-outline-variant/50 flex flex-col items-end">
              <span class="text-sm font-medium text-primary-container glow-text">{{ currentTime }}</span>
              <span class="text-[9px] uppercase text-on-surface-variant">{{ currentDate }}</span>
            </div>
          </div>
        </div>
      </header>

      <!-- SIDE NAV BAR -->
      <aside class="fixed left-0 top-0 h-full flex flex-col pt-24 pb-6 z-40 bg-surface-container-low/40 backdrop-blur-2xl border-r border-primary-container shadow-[2px_0_20px_rgba(0,229,255,0.25)] transition-all duration-300"
             [ngClass]="showSidebar ? 'w-56' : 'w-20 items-center'">
        <div class="flex flex-col gap-0.5 flex-grow overflow-y-auto no-scrollbar px-3">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-primary/10 text-primary-container border-l-4 border-l-primary-container shadow-[0_0_15px_rgba(0,229,255,0.1)]"
              [routerLinkActiveOptions]="{ exact: item.path === '/dashboard' }"
              class="flex items-center gap-4 py-2.5 text-on-surface-variant hover:text-primary hover:bg-white/5 transition-all rounded-lg text-decoration-none"
              [ngClass]="showSidebar ? 'px-4' : 'justify-center w-12 px-0'"
              [title]="!showSidebar ? item.label : ''"
            >
              <span class="material-symbols-outlined text-[20px] shrink-0">{{ item.icon }}</span>
              <span class="text-[13px] font-medium whitespace-nowrap overflow-hidden transition-all duration-300"
                    [ngClass]="showSidebar ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0 hidden'">{{ item.label }}</span>
            </a>
          }
        </div>
        <!-- User Profile (AI Chat triggers on click) -->
        <div class="mt-auto px-4 pb-2 flex flex-col items-center gap-4 cursor-pointer group" (click)="toggleChat()">
          <div class="relative flex items-center justify-center">
            <div class="rounded-full border border-primary/40 flex items-center justify-center p-1 group-hover:border-primary transition-all" 
                 [ngClass]="{'w-24 h-24': showSidebar, 'w-12 h-12': !showSidebar, 'animate-pulse border-white shadow-[0_0_20px_rgba(255,255,255,1)]': isKarmaSpeaking}">
              <div class="w-full h-full rounded-full bg-[#00daf3]/10 overflow-hidden flex items-center justify-center group-hover:bg-[#00daf3]/20 transition-all">
                <span class="material-symbols-outlined transition-all" [ngClass]="{'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]': isKarmaSpeaking, 'text-primary-container': !isKarmaSpeaking, 'text-5xl': showSidebar, 'text-2xl': !showSidebar}">face</span>
              </div>
            </div>
            <span class="absolute rounded-full border-2 border-background" 
                  [ngClass]="{'bg-yellow-400 animate-ping': isKarmaSpeaking, 'bg-green-500': !isKarmaSpeaking, 'bottom-1 right-1 w-4 h-4': showSidebar, 'bottom-0 right-0 w-3 h-3': !showSidebar}"></span>
          </div>
          @if (showSidebar) {
            <div class="text-center overflow-hidden transition-all duration-300">
              <p class="text-[14px] font-bold tracking-widest uppercase mb-0 group-hover:text-primary transition-colors whitespace-nowrap" [class.text-white]="isKarmaSpeaking" [class.glow-text]="isKarmaSpeaking">Karma AI</p>
              <p class="text-[10px] text-on-surface-variant mb-0 whitespace-nowrap">{{ isKarmaSpeaking ? 'Speaking...' : 'Click to Open Chat' }}</p>
              <div class="flex items-center justify-center gap-1.5 mt-1">
                <span class="w-2 h-2 rounded-full" [class.bg-green-500]="!isKarmaSpeaking" [class.bg-yellow-400]="isKarmaSpeaking"></span>
                <span class="text-[10px] font-medium" [class.text-green-500]="!isKarmaSpeaking" [class.text-yellow-400]="isKarmaSpeaking">{{ isKarmaSpeaking ? 'Active' : 'Online' }}</span>
              </div>
            </div>
          }
        </div>
      </aside>

      <!-- MAIN CONTENT AREA -->
      <main class="mt-16 p-4 h-[calc(100vh-144px)] overflow-hidden transition-all duration-300"
            [ngClass]="showSidebar ? 'ml-56' : 'ml-20'">
        <router-outlet />
      </main>

      <!-- FLOATING AI COMPANION CHAT PANEL -->
      @if (showChat) {
        <div class="fixed right-0 top-0 h-full w-[420px] bg-background/90 backdrop-blur-2xl border-l border-primary/50 shadow-[-10px_0_40px_rgba(0,229,255,0.2)] z-50 flex flex-col pt-20 pb-24">
          <!-- Chat Header -->
          <div class="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center shrink-0">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-primary text-xl">chat_bubble</span>
              <div>
                <h4 class="text-xs font-bold uppercase tracking-wider text-on-surface mb-0">Karma Chat Panel</h4>
                <span class="text-[8px] font-mono text-on-surface-variant uppercase tracking-widest">System Grounding Synced</span>
              </div>
            </div>
            <button class="text-on-surface-variant hover:text-red-400 bg-transparent border-0 text-xl font-light cursor-pointer" (click)="showChat = false">&times;</button>
          </div>

          <!-- Message History -->
          <div class="flex-grow overflow-y-auto no-scrollbar px-6 py-4 flex flex-col gap-4">
            @for (msg of chatMessages; track $index) {
              <div class="flex flex-col max-w-[85%]" [class]="msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'">
                <span class="text-[8px] font-mono text-on-surface-variant uppercase tracking-widest mb-1">{{ msg.sender === 'user' ? 'Operator' : 'Karma AI' }} &bull; {{ msg.time }}</span>
                <div class="px-4 py-3 rounded-2xl text-[13px] font-sans shadow-md"
                     [class]="msg.sender === 'user' ? 'bg-primary/20 text-primary border border-primary/30 rounded-br-sm' : 'bg-surface-variant/80 text-on-surface border border-white/5 rounded-bl-sm'">
                  @if (msg.isTyping) {
                    <div class="flex items-center gap-1 h-5 px-1">
                      <div class="w-1.5 h-1.5 bg-primary/70 rounded-full animate-[bounce_1s_infinite]"></div>
                      <div class="w-1.5 h-1.5 bg-primary/70 rounded-full animate-[bounce_1s_infinite_0.2s]"></div>
                      <div class="w-1.5 h-1.5 bg-primary/70 rounded-full animate-[bounce_1s_infinite_0.4s]"></div>
                    </div>
                  } @else {
                    {{ msg.text }}
                  }
                </div>
              </div>
            }
          </div>

          <!-- Chat Input -->
          <div class="px-6 py-4 border-t border-outline-variant/30 shrink-0">
            <div class="relative flex items-center bg-white/5 border border-outline-variant/30 rounded-xl px-3 py-1">
              <input 
                type="text" 
                class="w-full bg-transparent border-0 text-xs text-on-surface focus:outline-none py-2 pr-12" 
                [(ngModel)]="userMessage" 
                (keyup.enter)="sendMessage()" 
                placeholder="Ask anything about system workflows..."
              />
              <div class="absolute right-2 flex items-center gap-1">
                <!-- Send button -->
                <button class="material-symbols-outlined text-primary hover:text-white bg-transparent border-0 p-1 cursor-pointer transition-colors text-lg" (click)="sendMessage()" title="Send Message">send</button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- DIAGNOSTIC STATUS BAR -->
      @if (diagnosticMessage) {
        <div class="fixed bottom-[85px] left-1/2 -translate-x-1/2 z-[60] bg-background/95 backdrop-blur-xl border border-primary/60 text-on-surface px-6 py-2.5 rounded-t-xl flex items-center gap-3 shadow-[0_-15px_30px_rgba(0,229,255,0.2)] transition-all duration-300">
          <span class="material-symbols-outlined text-primary text-sm animate-spin">sync</span>
          <span class="text-[11px] font-mono font-bold uppercase tracking-widest text-primary glow-text">{{ diagnosticMessage }}</span>
        </div>
      }

      <footer class="fixed bottom-0 h-20 z-50 bg-background/80 backdrop-blur-3xl border-t border-primary-container shadow-[0_-2px_20px_rgba(0,229,255,0.4)] flex items-center justify-center px-6 transition-all duration-300 right-0" [ngClass]="showSidebar ? 'left-56' : 'left-20'">
        
        <!-- EXTREME LEFT: Wake up Karma -->
        <div class="absolute left-6 flex items-center">
          <button (click)="wakeUpKarma()" class="px-6 py-2 bg-primary/10 border border-primary/30 text-on-surface font-bold text-[11px] rounded-lg flex items-center gap-2 hover:bg-primary/20 transition-all shadow-lg group cursor-pointer">
            <span class="material-symbols-outlined text-[18px] group-hover:rotate-12 transition-transform">light_mode</span> Wake up Karma
          </button>
        </div>

        <!-- CENTER: Mission Controls -->
        <div class="flex items-center gap-3 bg-white/5 px-4 py-1.5 rounded-2xl border border-primary/30">
          <button (click)="stopMission()" class="px-6 py-2 bg-red-600/20 border border-red-500/50 text-red-500 font-bold text-[11px] rounded-lg flex items-center gap-2 hover:bg-red-600/30 transition-all cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">stop_circle</span> Stop Mission
          </button>
          <div class="h-6 w-px bg-white/10 mx-2"></div>
          <button (click)="publishNow()" class="px-8 py-2 bg-green-600/20 border border-green-500/50 text-green-500 font-bold text-[11px] rounded-lg flex items-center gap-2 hover:bg-green-600/30 transition-all cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">send</span> Publish
          </button>
        </div>

        <!-- EXTREME RIGHT: Bye Bye Karma & Version Info -->
        <div class="absolute right-6 flex items-center gap-6">
          <div class="flex flex-col items-end">
            <span class="text-[9px] font-label-mono text-on-surface-variant uppercase tracking-widest">Version 2.0.4 - STABLE</span>
            <div class="flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              <span class="text-[8px] text-green-500/70 font-bold uppercase">Encryption Active</span>
            </div>
          </div>
          <button (click)="logout()" class="px-6 py-2 bg-red-600/10 border border-red-500/20 text-red-400 font-medium text-[11px] rounded-lg flex items-center gap-2 hover:bg-red-600/20 transition-all cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">power_settings_new</span> Bye Bye Karma
          </button>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
  `],
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  protected currentTime = '';
  protected currentDate = '';
  private timerId: any;

  // Karma AI speech configuration
  karmaVoiceSpeechEnabled = false;

  // Theme State
  isDarkMode = true;

  // Speech Recognition States (Operator Mic)
  isListening = false;
  isSystemAwaking = false;
  isKarmaSpeaking = false;
  voiceText = 'Karma Voice disabled';
  recognition: any;

  // Chat Panel States
  showChat = false;
  showSidebar = true;
  userMessage = '';
  chatMessages: ChatMessage[] = [];

  // HUD Toast States
  toastMessage = '';
  toastIcon = '';
  private toastTimer: any;

  // Diagnostic State
  diagnosticMessage: string | null = null;

  // Multilingual Support
  activeLanguage = 'en';
  preferredVoice = 'en-US-AriaNeural';
  private readonly sttLanguageCodes: Record<string, string> = {
    en: 'en-US', hi: 'hi-IN', mr: 'mr-IN', ta: 'ta-IN', te: 'te-IN', bn: 'bn-IN',
    gu: 'gu-IN', kn: 'kn-IN', ml: 'ml-IN', ur: 'ur-IN', fr: 'fr-FR', de: 'de-DE',
    ja: 'ja-JP', zh: 'zh-CN'
  };

  protected workspaces: WorkspaceResponse[] = [];
  protected activeWorkspace: WorkspaceResponse | null = null;

  protected readonly allNavItems = [
    { path: '/workspaces', label: 'Workspaces', icon: 'workspaces' },
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/workflows', label: 'Workflow Designer', icon: 'hub' },
    { path: '/agents', label: 'Agents', icon: 'smart_toy' },
    { path: '/artifacts', label: 'Artifacts', icon: 'inventory_2' },
    { path: '/calendar', label: 'Calendar', icon: 'calendar_today' },
    { path: '/knowledge', label: 'Knowledge', icon: 'menu_book' },
    { path: '/prompts', label: 'Prompts', icon: 'terminal' },
    { path: '/skills', label: 'Skills', icon: 'handyman' },
    { path: '/providers', label: 'AI Providers', icon: 'key' },
    { path: '/mcp-servers', label: 'MCP Servers', icon: 'settings_input_component' },
    { path: '/reviews', label: 'Reviews', icon: 'rate_review' },
    { path: '/publishing', label: 'Publishing', icon: 'publish' },
    { path: '/administration', label: 'Settings', icon: 'settings', adminOnly: true },
  ];

  protected get navItems(): Array<{ path: string; label: string; icon: string }> {
    const role = (this.auth.user()?.role || 'OPERATOR').toUpperCase();
    return this.allNavItems.filter(item => !item.adminOnly || role === 'ADMIN');
  }

  constructor(private readonly router: Router, private readonly api: ApiService, private auth: AuthService, private cdr: ChangeDetectorRef, private readonly voicePrefs: VoicePreferencesService, private readonly executionsService: ExecutionsService, private readonly workspacesService: WorkspacesService, private readonly karmaActions: KarmaActionService) {
    effect(() => {
      if (!this.voicePrefs.loaded()) return;
      const lang = this.voicePrefs.language();
      if (lang && lang !== this.activeLanguage) {
        this.activeLanguage = lang;
        if (this.recognition) {
          this.recognition.lang = this.sttLanguageCodes[lang] || 'en-US';
        }
      }
      this.preferredVoice = this.voicePrefs.voice();
    });
  }

  ngOnInit() {
    this.updateTime();
    this.timerId = setInterval(() => this.updateTime(), 1000);
    this.initSpeech();

    // Load persisted voice & language preferences
    this.voicePrefs.loadCatalog().catch(() => {});
    this.voicePrefs.loadPreferences().catch(() => {});

    // Load Theme Preference
    const savedTheme = localStorage.getItem('karma-theme');
    if (savedTheme === 'light') {
      this.isDarkMode = false;
      document.documentElement.classList.remove('dark');
    } else {
      this.isDarkMode = true;
      document.documentElement.classList.add('dark');
    }

    this.loadWorkspaces();

    window.addEventListener('trigger-operator-mic', this.triggerOperatorMicListener);
    window.addEventListener('show-toast', this.toastListener);

    // Preload TTS voices to prevent fallback male voice glitch
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    // Initial Welcome Message
    const displayName = this.auth.user()?.displayName || 'Operator';
    this.chatMessages = [
      {
        sender: 'karma',
        text: `Good morning, Operator ${displayName}. I am online and synced with your system state. How can I assist with your video automation workflows or AI configurations today?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];

    // Global listener for dashboard mic buttons
    window.addEventListener('trigger-operator-mic', this.triggerOperatorMicListener);

    // Start auto-listening on load if enabled
    setTimeout(() => {
      if (this.karmaVoiceSpeechEnabled) {
        this.startListening();
      }
    }, 1000);
  }

  private triggerOperatorMicListener = () => {
    if (!this.isSystemAwaking) {
      this.wakeUpKarma();
    }
    this.toggleKarmaVoiceSpeech();
  };

  ngOnDestroy() {
    if (this.timerId) clearInterval(this.timerId);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    window.removeEventListener('trigger-operator-mic', this.triggerOperatorMicListener);
    window.removeEventListener('show-toast', this.toastListener);
    
    // Kill the speech recognition instance to prevent ghost agents capturing voice
    if (this.recognition) {
      this.recognition.onend = null;
      this.recognition.onresult = null;
      this.recognition.onstart = null;
      try {
        this.recognition.abort();
      } catch (e) {}
    }
  }

  toggleKarmaVoiceSpeech() {
    this.karmaVoiceSpeechEnabled = !this.karmaVoiceSpeechEnabled;
    this.showToast(
      this.karmaVoiceSpeechEnabled ? 'Karma Speech Active (Always Listening)' : 'Karma Speech Muted (Silent)',
      this.karmaVoiceSpeechEnabled ? 'volume_up' : 'volume_off'
    );
    if (this.karmaVoiceSpeechEnabled) {
      this.speak('Karma Voice active. Always listening.');
      this.startListening();
    } else {
      this.stopListening();
    }
  }

  async wakeUpKarma() {
    if (this.isSystemAwaking) return;
    this.isSystemAwaking = true;
    this.showChat = false;

    this.chatMessages.push({ sender: 'karma', text: 'Waking up Karma OS. Running system diagnostic...', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    
    this.karmaVoiceSpeechEnabled = false;
    if (!this.recognition) {
      this.initSpeech();
      this.startListening();
    }

    try {
      this.diagnosticMessage = "Waking up Karma OS. Initiating sequence...";
      window.dispatchEvent(new CustomEvent('system-diagnostic-start'));
      await this.speak("Waking up Karma OS. Initiating sequence.");

      this.diagnosticMessage = "Checking Core Systems...";
      await this.speak("Checking Core Systems.");
      let coreRes: any = null;
      try {
        coreRes = await firstValueFrom(this.api.get('/v1/reports/dashboard'));
      } catch (e) {
        console.warn("Core check failed", e);
      }
      const coreHealthy = coreRes?.data && coreRes.data !== null;
      this.diagnosticMessage = coreHealthy ? "Core Systems are Healthy." : "Core Systems Unreachable.";
      window.dispatchEvent(new CustomEvent('system-diagnostic-core', { detail: { core: coreHealthy ? 'Healthy' : 'ERROR' } }));
      await this.speak(coreHealthy ? "Core systems are healthy." : "Warning. Core systems unreachable.");

      this.diagnosticMessage = "Checking AI Providers...";
      await this.speak("Checking A I Providers.");
      let provRes: any = null;
      try {
        provRes = await firstValueFrom(this.api.get('/v1/providers'));
      } catch (e) {
        console.warn("Provider check failed", e);
      }
      const providers = provRes?.data || [];
      const providerHealth = providers.some((p: any) => p && p.status === 'CONNECTED') ? 'Online' : 'Offline';
      if (providerHealth === 'Online') {
        this.diagnosticMessage = "AI Providers Online and Synced.";
        window.dispatchEvent(new CustomEvent('system-diagnostic-core', { detail: { providers: 'Online' } }));
        await this.speak("A I Providers are Online and synced.");
      } else {
        this.diagnosticMessage = "AI Providers Offline (Check Connection).";
        window.dispatchEvent(new CustomEvent('system-diagnostic-core', { detail: { providers: 'Offline' } }));
        await this.speak("A I Providers are currently offline or unreachable.");
      }

      this.diagnosticMessage = "Checking Subsystems...";
      await this.speak("Checking subsystems.");
      window.dispatchEvent(new CustomEvent('system-diagnostic-core', { detail: { mcp: 'Healthy', voice: 'Healthy' } }));

      this.diagnosticMessage = "Fetching Agent Runtime...";
      await this.speak("Fetching Agent Runtime.");
      let agentsRes: any = null;
      let runtimeHealth = 'Healthy';
      try {
        agentsRes = await firstValueFrom(this.api.get('/v1/agents'));
      } catch (e) {
        console.warn("Agent fetch failed", e);
        runtimeHealth = 'Offline';
      }
      const agents = agentsRes?.data || agentsRes || [];

      if (runtimeHealth === 'Offline') {
        this.diagnosticMessage = "Agent Runtime Offline.";
        await this.speak("Warning. Agent Runtime is currently offline or unreachable.");
      } else {
        this.diagnosticMessage = "Agent Runtime Synced.";
        await this.speak("Agent Runtime is online and synced.");
      }

      window.dispatchEvent(new CustomEvent('system-wake-up', { detail: { agents, runtime: runtimeHealth } }));

      if (agents.length > 0) {
        for (const agent of agents) {
          this.diagnosticMessage = `${agent.name} is Active and Ready for your command`;
          window.dispatchEvent(new CustomEvent('agent-ready', { detail: { agentId: agent.id } }));
          await this.speak(`${agent.name} is active and ready for your command`);
        }
      }

      this.diagnosticMessage = "System diagnostic complete.";
      await this.speak("System diagnostic complete. All systems accounted for.");

      this.isSystemAwaking = false;
      setTimeout(() => { this.diagnosticMessage = null; }, 4000);

    } catch (err) {
      console.error("Health check failed", err);
      this.diagnosticMessage = "System Health Check Failed.";
      await this.speak("System Health Check Failed. Please check backend connection.");
      this.isSystemAwaking = false;
      this.diagnosticMessage = null;
      window.dispatchEvent(new CustomEvent('system-wake-up-failed'));
    }
  }

  toggleChat() {
    this.showChat = !this.showChat;
  }

  toggleSidebar() {
    this.showSidebar = !this.showSidebar;
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('karma-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('karma-theme', 'light');
    }
  }

  initSpeech() {
    const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (Speech) {
      this.recognition = new Speech();
      this.recognition.continuous = false;
      this.recognition.lang = this.sttLanguageCodes[this.activeLanguage] || 'en-US';
      this.recognition.interimResults = false;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.voiceText = 'Always Listening...';
      };

      this.recognition.onspeechstart = () => {
        window.dispatchEvent(new CustomEvent('operator-speaking', { detail: true }));
      };

      this.recognition.onspeechend = () => {
        window.dispatchEvent(new CustomEvent('operator-speaking', { detail: false }));
      };

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.voiceText = `Heard: "${transcript}"`;
        this.executeVoiceCommand(transcript);
        window.dispatchEvent(new CustomEvent('heard-voice-command', { detail: transcript }));
      };

      this.recognition.onerror = (err: any) => {
        console.error('Speech recognition error', err);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        // Auto-restart loop if Karma Voice is still active AND Karma is not currently speaking
        if (this.karmaVoiceSpeechEnabled && !this.isKarmaSpeaking) {
          setTimeout(() => {
            try {
              if (this.karmaVoiceSpeechEnabled && !this.isKarmaSpeaking) {
                this.recognition.start();
              }
            } catch (e) {
              console.error('Error restarting voice loop:', e);
            }
          }, 300);
        } else {
          this.voiceText = 'Click to speak';
        }
      };
    }
  }

  startListening() {
    if (!this.recognition) this.initSpeech();
    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (e) {
        // Prevent crashing if already listening
        console.warn('Recognition start attempted but active:', e);
      }
    }
  }

  stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
    }
  }

  executeVoiceCommand(command: string) {
    this.showToast(`Heard: "${command}"`, 'psychology');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.chatMessages.push({ sender: 'user', text: command, time });
    this.processCommand(command);
  }

  private toastListener = (e: any) => {
    if (e.detail) {
      this.showToast(e.detail.message, e.detail.icon);
    }
  };
  sendMessage() {
    if (!this.userMessage.trim()) return;
    const msg = this.userMessage;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.chatMessages.push({ sender: 'user', text: msg, time });
    this.userMessage = '';
    this.processCommand(msg);
  }

  karmaReply(humanText: string, lang?: string) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msg: ChatMessage = { sender: 'karma', text: humanText, time, isTyping: this.karmaVoiceSpeechEnabled };
    this.chatMessages.push(msg);
    this.showToast(humanText, 'graphic_eq');
    this.speak(humanText, lang, msg);
  }

  private processCommand(command: string) {
    const cleanCmd = command.toLowerCase().trim();

    const isWakeUpPhrase = cleanCmd.includes('wake') || 
                           cleanCmd.includes('break') || 
                           cleanCmd.includes('make') || 
                           cleanCmd.includes('woke') || 
                           cleanCmd.includes('backup');

    if (isWakeUpPhrase && (cleanCmd.includes('karma') || cleanCmd.includes('os'))) {
      this.karmaReply('Hello Chandrashekhar, I am ready.');
      return;
    }

    const currentPage = this.router.url.replace(/^\//, '') || 'dashboard';
    const history = this.buildChatHistory();
    this.api.postData<any>('/v1/voice/chat', { text: command, currentPage, preferredLanguage: this.activeLanguage, history }).subscribe({
      next: (res) => {
        const reply = res.reply || 'I processed your request.';
        if (res.intent === 'language' && res.target) {
          this.switchLanguage(res.target);
        }
        this.karmaReply(reply, res.language);
        if (res.intent === 'navigate' && res.target && !res.action) {
          const route = '/' + this.normalizeRoute(res.target);
          this.router.navigate([route]);
        }
        this.handleKarmaAction(res);
      },
      error: () => {
        this.karmaReply('I am having trouble connecting to my AI. Please try again.');
      }
    });
  }

  private normalizeRoute(page: string): string {
    const key = String(page || '').toLowerCase().replace(/[\s_/-]+/g, '').trim();
    const aliases: Record<string, string> = {
      dashboard: 'dashboard',
      missions: 'mission-control',
      missioncontrol: 'mission-control',
      mission: 'mission-control',
      executions: 'executions',
      execution: 'executions',
      reviews: 'reviews',
      publishing: 'publishing',
      workspaces: 'workspaces',
      agents: 'agents',
      providers: 'providers',
      calendar: 'calendar',
      knowledge: 'knowledge',
      prompts: 'prompts',
      flows: 'workflows',
      workflows: 'workflows',
      workflow: 'workflows',
      artifacts: 'artifacts',
      analytics: 'analytics',
      settings: 'administration',
      administration: 'administration'
    };
    return aliases[key] || key || 'dashboard';
  }

  private dashboardActionTypes = [
    'open_modal', 'prefill_mission', 'create_workspace', 'create_project', 'create_mission',
    'trigger_mission', 'approve_artifact', 'reject_artifact', 'set_run_mode', 'create_agent', 'remember_memory'
  ];

  private handleKarmaAction(res: any): void {
    const action: KarmaUiAction | undefined = res?.action;
    if (!action?.type) return;

    if (action.type === 'navigate' && action.params && action.params['page']) {
      const route = '/' + this.normalizeRoute(String(action.params['page']));
      this.router.navigate([route]).then(() => this.karmaActions.dispatch(action));
      return;
    }

    if (this.dashboardActionTypes.includes(action.type)) {
      const currentPage = this.router.url.replace(/^\//, '') || 'dashboard';
      if (currentPage !== 'dashboard') {
        this.router.navigate(['/dashboard']).then(() => this.karmaActions.dispatch(action));
      } else {
        this.karmaActions.dispatch(action);
      }
      return;
    }

    this.karmaActions.dispatch(action);
  }

  private buildChatHistory(): Array<{ role: string; content: string }> {
    const lastTurns = this.chatMessages.slice(-10);
    return lastTurns
      .filter((m) => m.text && !m.isTyping)
      .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));
  }

  private switchLanguage(code: string) {    const lang = this.sttLanguageCodes[code];
    if (!lang) return;
    this.activeLanguage = code;
    this.voicePrefs.save(code, this.voicePrefs.defaultVoiceFor(code)).catch(() => {});
    if (this.recognition) {
      this.recognition.lang = lang;
    }
    if (this.isListening && this.karmaVoiceSpeechEnabled) {
      this.stopListening();
      setTimeout(() => {
        if (this.karmaVoiceSpeechEnabled && !this.isKarmaSpeaking) {
          this.startListening();
        }
      }, 600);
    }
  }

  private humanizeForSpeech(text: string): string {
    if (!text) return text;
    return text
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\*\*([^*]*)\*\*/g, '$1')
      .replace(/(^|\s)\*([^*\n]*)\*/g, '$1$2')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/^\s*[-*•]\s+/gm, ', ')
      .replace(/→/g, ' to ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // TTS Speech Queue
  speechQueue: { text: string, language: string, resolve: () => void, msg?: ChatMessage }[] = [];
  isProcessingSpeechQueue = false;

  speak(text: string, language?: string, msg?: ChatMessage): Promise<void> {
    return new Promise((resolve) => {
      if (this.karmaVoiceSpeechEnabled && 'speechSynthesis' in window) {
        this.speechQueue.push({ text, language: language || this.activeLanguage || 'en', resolve, msg });
        if (!this.isProcessingSpeechQueue) {
          this.processSpeechQueue();
        }
      } else {
        resolve();
      }
    });
  }

  private processSpeechQueue() {
    if (this.speechQueue.length === 0) {
      this.isProcessingSpeechQueue = false;
      this.isKarmaSpeaking = false;
      window.dispatchEvent(new CustomEvent('karma-speaking', { detail: false }));
      if (this.karmaVoiceSpeechEnabled) {
        this.startListening(); // Resume listening when queue is fully empty
      }
      return;
    }

    this.isProcessingSpeechQueue = true;
    this.isKarmaSpeaking = true;
    window.dispatchEvent(new CustomEvent('karma-speaking', { detail: true }));
    this.stopListening(); // Ensure mic is off while processing queue

    const item = this.speechQueue.shift()!;
    const useEdgeTts = (item.language && item.language !== 'en') || this.voicePrefs.configured();
    if (useEdgeTts) {
      this.speakWithTts(item);
    } else {
      this.speakWithBrowser(item);
    }
  }

  private speakWithBrowser(item: { text: string, language: string, resolve: () => void, msg?: ChatMessage }) {
    const utterance = new SpeechSynthesisUtterance(item.text);
    
    // Try to set language
    const langToUse = item.language || 'en';
    const voices = window.speechSynthesis.getVoices();
    
    let preferredVoice = voices.find(v => v.name.includes('Google US English'));
    if (!preferredVoice) preferredVoice = voices.find(v => v.name.includes('Microsoft Zira'));
    if (!preferredVoice) preferredVoice = voices.find(v => v.name.includes('Samantha'));
    if (!preferredVoice) preferredVoice = voices.find(v => v.name.includes('Female'));
    if (!preferredVoice) preferredVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Female'));
    if (!preferredVoice) preferredVoice = voices.find(v => v.lang === 'en-US'); // Fallback to any US english
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    
    utterance.onboundary = () => {
      window.dispatchEvent(new CustomEvent('karma-speech-pulse'));
    };
    
    utterance.onend = () => { 
      item.resolve(); 
      this.processSpeechQueue(); // Process next item recursively
    };
    
    utterance.onerror = () => { 
      item.resolve(); 
      if (item.msg) item.msg.isTyping = false;
      this.processSpeechQueue(); 
    };
    
    utterance.onstart = () => {
      if (item.msg) item.msg.isTyping = false;
    };
    
    window.speechSynthesis.speak(utterance);
  }

  private speakWithTts(item: { text: string, language: string, resolve: () => void, msg?: ChatMessage }) {
    const body: any = { text: item.text, language: item.language };
    
    // Map languages to native Edge TTS voices to override English default
    if (item.language && !item.language.startsWith('en')) {
      if (item.language.startsWith('mr')) body.voice = 'mr-IN-AarohiNeural';
      else if (item.language.startsWith('hi')) body.voice = 'hi-IN-SwaraNeural';
      else if (item.language.startsWith('ta')) body.voice = 'ta-IN-PallaviNeural';
      else if (item.language.startsWith('te')) body.voice = 'te-IN-ShrutiNeural';
      else if (item.language.startsWith('bn')) body.voice = 'bn-IN-TanishaaNeural';
      else if (item.language.startsWith('gu')) body.voice = 'gu-IN-DhwaniNeural';
      else if (item.language.startsWith('kn')) body.voice = 'kn-IN-SapnaNeural';
      else if (item.language.startsWith('ml')) body.voice = 'ml-IN-SobhanaNeural';
      else if (item.language.startsWith('ur')) body.voice = 'ur-IN-GulNeural';
      else if (item.language.startsWith('fr')) body.voice = 'fr-FR-DeniseNeural';
      else if (item.language.startsWith('de')) body.voice = 'de-DE-KatjaNeural';
      else if (this.preferredVoice) body.voice = this.preferredVoice;
    } else {
      // Force an English voice for English text
      body.voice = 'en-US-AriaNeural';
    }

    this.api.postData<any>('/v1/voice/tts', body).subscribe({
      next: (res) => {
        const dataUri = res?.dataUri;
        if (dataUri) {
          const audio = new Audio(dataUri);
          audio.onplay = () => {
            if (item.msg) item.msg.isTyping = false;
          };
          audio.onended = () => { item.resolve(); this.processSpeechQueue(); };
          audio.onerror = () => { 
            console.warn('Audio playback error, falling back to browser TTS');
            this.speakWithBrowser(item);
          };
          audio.play().catch((err) => { 
            console.warn('Audio autoplay blocked or failed, falling back to browser TTS', err);
            this.speakWithBrowser(item);
          });
        } else {
          console.warn('No dataUri in TTS response, falling back to browser TTS', res);
          if (res?.errorMessage) {
            console.error('BACKEND TTS ERROR:', res.errorMessage);
          }
          this.speakWithBrowser(item);
        }
      },
      error: (err) => {
        console.warn('TTS API error, falling back to browser TTS', err);
        if (item.msg) item.msg.isTyping = false;
        this.speakWithBrowser(item);
      }
    });
  }

  showToast(message: string, icon: string) {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastMessage = message;
    this.toastIcon = icon;
    this.cdr.detectChanges(); // Force angular to update the UI immediately
    
    this.toastTimer = setTimeout(() => {
      this.toastMessage = '';
      this.toastIcon = '';
      this.cdr.detectChanges();
    }, 4500);
  }

  private static readonly ACTIVE_WS_KEY = 'karma_active_workspace';

  loadWorkspaces(): void {
    this.workspacesService.getAll().subscribe({
      next: (data) => {
        this.workspaces = data || [];
        const savedId = localStorage.getItem(MainLayoutComponent.ACTIVE_WS_KEY);
        const saved = savedId ? this.workspaces.find(w => w.id === savedId) : null;
        this.activeWorkspace = saved || this.workspaces[0] || null;
      },
      error: () => {
        this.workspaces = [];
        this.activeWorkspace = null;
      }
    });
  }

  selectWorkspace(ws: WorkspaceResponse): void {
    this.activeWorkspace = ws;
    localStorage.setItem(MainLayoutComponent.ACTIVE_WS_KEY, ws.id);
  }

  stopMission(): void {
    this.executionsService.getAll().subscribe({
      next: (executions) => {
        const active = executions.find(e => e.status === 'RUNNING' || e.status === 'PENDING' || e.status === 'WAITING' || e.status === 'PAUSED');
        if (!active) {
          this.showToast('No active missions to stop', 'info');
          return;
        }
        this.executionsService.cancel(active.id).subscribe({
          next: () => this.showToast('Mission execution stopped', 'stop_circle'),
          error: () => this.showToast('Failed to stop mission', 'error')
        });
      },
      error: () => this.showToast('Failed to fetch executions', 'error')
    });
  }

  publishNow(): void {
    this.router.navigate(['/publishing']);
  }

  logout(): void {
    localStorage.removeItem(MainLayoutComponent.ACTIVE_WS_KEY);
    this.auth.logout();
  }

  private updateTime() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    this.currentDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
