import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="min-h-screen bg-surface">
      <header class="bg-primary text-white px-6 py-4 flex items-center gap-4 shadow-md">
        <img src="/images/logo_inubil_verify.png" alt="INUBIL Verify" class="h-10" />
        <span class="text-lg font-bold tracking-wide">INUBIL Verify</span>
      </header>
      <main class="max-w-container mx-auto px-6 py-10">
        <router-outlet />
      </main>
    </div>
  `,
})
export class PublicLayout {}
