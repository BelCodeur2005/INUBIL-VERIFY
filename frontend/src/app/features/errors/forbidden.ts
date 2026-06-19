import { Component } from '@angular/core';

@Component({
  selector: 'app-page',
  standalone: true,
  template: `<div class="p-6"><h1 class="text-headline-md text-primary font-bold">Accès Refusé (403)</h1><p class="text-on-surface-variant mt-2">Page en construction...</p></div>`,
})
export class ForbiddenPage {}
