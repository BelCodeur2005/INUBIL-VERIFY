import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="flex h-screen bg-surface overflow-hidden">
      <!-- Sidebar -->
      <aside class="w-64 bg-primary flex-shrink-0 flex flex-col">
        <div class="p-4 border-b border-white/10">
          <img src="/images/logo_inubil_verify.png" alt="INUBIL Verify" class="h-10" />
        </div>
        <!-- Navigation injectée par chaque feature -->
        <nav class="flex-1 overflow-y-auto p-3">
          <!-- Les items de nav seront dans des composants sidebar spécifiques -->
        </nav>
      </aside>

      <!-- Contenu principal -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Topbar -->
        <header class="bg-white border-b border-outline-variant px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div class="flex-1 max-w-md">
            <input type="search" placeholder="Rechercher un matricule ou document..."
              class="input-field text-sm" />
          </div>
          <div class="flex items-center gap-3 ml-4">
            <button class="relative p-2 rounded hover:bg-surface transition-colors">
              <svg class="w-5 h-5 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <div class="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold cursor-pointer">
              MN
            </div>
          </div>
        </header>

        <!-- Page content -->
        <main class="flex-1 overflow-y-auto p-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AppLayout {}
