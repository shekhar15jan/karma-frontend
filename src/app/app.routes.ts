import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () =>
      import('./core/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent,
      ),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'workspaces',
        loadComponent: () =>
          import('./features/workspaces/workspaces.component').then(
            (m) => m.WorkspacesComponent,
          ),
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'mission-control',
        loadComponent: () =>
          import('./features/mission-control/mission-control.component').then(
            (m) => m.MissionControlComponent,
          ),
      },
      {
        path: 'agents',
        loadComponent: () =>
          import('./features/agents/agents.component').then(
            (m) => m.AgentsComponent,
          ),
      },
      {
        path: 'agents/:id/trace',
        loadComponent: () =>
          import('./features/agent-trace/agent-trace.component').then(
            (m) => m.AgentTraceComponent,
          ),
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./features/calendar/calendar.component').then(
            (m) => m.CalendarComponent,
          ),
      },
      {
        path: 'knowledge',
        loadComponent: () =>
          import('./features/knowledge/knowledge.component').then(
            (m) => m.KnowledgeComponent,
          ),
      },
      {
        path: 'reviews',
        loadComponent: () =>
          import('./features/reviews/reviews.component').then(
            (m) => m.ReviewsComponent,
          ),
      },
      {
        path: 'publishing',
        loadComponent: () =>
          import('./features/publishing/publishing.component').then(
            (m) => m.PublishingComponent,
          ),
      },
      {
        path: 'workflows',
        loadComponent: () =>
          import('./features/workflow-designer/workflow-designer.component').then(
            (m) => m.WorkflowDesignerComponent,
          ),
      },
      {
        path: 'executions',
        loadComponent: () =>
          import('./features/execution-monitor/execution-monitor.component').then(
            (m) => m.ExecutionMonitorComponent,
          ),
      },
      {
        path: 'artifacts',
        loadComponent: () =>
          import('./features/artifact-explorer/artifact-explorer.component').then(
            (m) => m.ArtifactExplorerComponent,
          ),
      },
      {
        path: 'prompts',
        loadComponent: () =>
          import('./features/prompt-studio/prompt-studio.component').then(
            (m) => m.PromptStudioComponent,
          ),
      },
      {
        path: 'skills',
        loadComponent: () =>
          import('./features/skill-library/skill-library.component').then(
            (m) => m.SkillLibraryComponent,
          ),
      },
      {
        path: 'providers',
        loadComponent: () =>
          import('./features/provider-center/provider-center.component').then(
            (m) => m.ProviderCenterComponent,
          ),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./features/analytics/analytics.component').then(
            (m) => m.AnalyticsComponent,
          ),
      },
      {
        path: 'administration',
        loadComponent: () =>
          import('./features/administration/administration.component').then(
            (m) => m.AdministrationComponent,
          ),
      },
      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },
];
