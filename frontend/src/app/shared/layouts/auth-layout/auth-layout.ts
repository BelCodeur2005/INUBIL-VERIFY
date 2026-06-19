import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  styles: [`
    .auth-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .auth-header {
      background-color: #002C53;
      height: 60px;
      display: flex;
      align-items: center;
      padding: 0 24px;
      flex-shrink: 0;
    }
    .auth-logo {
      height: 38px;
      width: auto;
      display: block;
    }
    .auth-body {
      flex: 1;
      background-color: #F8F9FA;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1rem;
    }
    .auth-container {
      width: 100%;
      max-width: 480px;
    }
  `],
  template: `
    <div class="auth-shell">
      <nav class="auth-header">
        <img src="/images/logo_inubil_verify.png" alt="INUBIL Verify" class="auth-logo" />
      </nav>
      <main class="auth-body">
        <div class="auth-container">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class AuthLayout {}
