import { Component, signal, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  styles: [`
    .login-card {
      background: #ffffff;
      border-radius: 1rem;
      padding: 2.5rem 2rem;
      box-shadow: 0 4px 24px rgba(0, 44, 83, 0.08), 0 1px 4px rgba(0, 44, 83, 0.04);
    }

    .icon-badge {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: #F0EDE6;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }

    .card-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #002C53;
      text-align: center;
      margin: 0 0 0.375rem;
    }

    .card-subtitle {
      font-size: 0.875rem;
      color: #42474F;
      text-align: center;
      margin: 0 0 2rem;
      line-height: 1.5;
    }

    .error-alert {
      background: #FFDAD6;
      color: #BA1A1A;
      border: 1px solid #F2B8B5;
      border-radius: 0.5rem;
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      line-height: 1.4;
    }
    .error-alert svg { flex-shrink: 0; margin-top: 1px; }

    .field { margin-bottom: 1.25rem; }

    .field-label {
      display: block;
      font-size: 0.6875rem;
      font-weight: 600;
      color: #42474F;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 0.375rem;
    }

    .input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 0.75rem;
      color: #737780;
      pointer-events: none;
      display: flex;
      align-items: center;
    }

    .input-toggle {
      position: absolute;
      right: 0;
      top: 0;
      height: 100%;
      padding: 0 0.75rem;
      background: none;
      border: none;
      cursor: pointer;
      color: #737780;
      display: flex;
      align-items: center;
      border-radius: 0 0.375rem 0.375rem 0;
      transition: color 0.15s;
    }
    .input-toggle:hover { color: #002C53; }
    .input-toggle:focus-visible { outline: 2px solid #0060AC; outline-offset: -2px; }

    .field-input {
      width: 100%;
      height: 44px;
      padding: 0 0.75rem 0 2.5rem;
      border: 1px solid #C2C6D1;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      color: #191C1D;
      background: #ffffff;
      font-family: inherit;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .field-input.with-toggle { padding-right: 2.75rem; }
    .field-input::placeholder { color: #9AA0AA; }
    .field-input:focus {
      outline: none;
      border-color: #0060AC;
      box-shadow: 0 0 0 2px rgba(0, 96, 172, 0.15);
    }
    .field-input.ng-touched.ng-invalid {
      border-color: #BA1A1A;
      box-shadow: 0 0 0 2px rgba(186, 26, 26, 0.1);
    }

    .field-error {
      font-size: 0.75rem;
      color: #BA1A1A;
      margin-top: 0.3rem;
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }

    .btn-connexion {
      width: 100%;
      height: 48px;
      background: #002C53;
      color: #ffffff;
      border: none;
      border-radius: 0.375rem;
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 1.75rem;
      transition: background-color 0.15s;
      font-family: inherit;
      letter-spacing: 0.01em;
    }
    .btn-connexion:hover:not(:disabled) { background-color: #0A4275; }
    .btn-connexion:focus-visible { outline: 2px solid #0060AC; outline-offset: 2px; }
    .btn-connexion:disabled { opacity: 0.6; cursor: not-allowed; }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.35);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .forgot-link {
      display: block;
      text-align: center;
      margin-top: 1.5rem;
      font-size: 0.875rem;
      color: #42474F;
      text-decoration: none;
      transition: color 0.15s;
    }
    .forgot-link:hover { color: #002C53; text-decoration: underline; }
    .forgot-link:focus-visible { outline: 2px solid #0060AC; border-radius: 2px; }
  `],
  template: `
    <div class="login-card">

      <!-- Icon badge -->
      <div class="icon-badge" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke="#9C8A5A" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>

      <!-- Title -->
      <h1 class="card-title">Connexion</h1>
      <p class="card-subtitle">Accédez à votre espace INUBIL Verify</p>

      <!-- Error -->
      @if (erreur()) {
        <div class="error-alert" role="alert" aria-live="polite">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {{ erreur() }}
        </div>
      }

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="connexion()" novalidate>

        <!-- Email -->
        <div class="field">
          <label class="field-label" for="email">Adresse e-mail</label>
          <div class="input-wrap">
            <span class="input-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
            </span>
            <input
              id="email"
              type="email"
              formControlName="email"
              class="field-input"
              placeholder="ex: m.ngo@universite-douala.cm"
              autocomplete="email"
              inputmode="email"
            />
          </div>
          @if (f['email'].touched && f['email'].errors?.['required']) {
            <p class="field-error" role="alert">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              L'adresse e-mail est requise
            </p>
          }
          @if (f['email'].touched && f['email'].errors?.['email']) {
            <p class="field-error" role="alert">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              Format d'adresse e-mail invalide
            </p>
          }
        </div>

        <!-- Mot de passe -->
        <div class="field">
          <label class="field-label" for="motDePasse">Mot de passe</label>
          <div class="input-wrap">
            <span class="input-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input
              id="motDePasse"
              [type]="voirMdp() ? 'text' : 'password'"
              formControlName="motDePasse"
              class="field-input with-toggle"
              placeholder="••••••••"
              autocomplete="current-password"
            />
            <button
              type="button"
              class="input-toggle"
              (click)="toggleMdp()"
              [attr.aria-label]="voirMdp() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
            >
              @if (voirMdp()) {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <path d="m17.73 17.73-1.46-1.46"/>
                  <path d="m14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              } @else {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              }
            </button>
          </div>
          @if (f['motDePasse'].touched && f['motDePasse'].errors?.['required']) {
            <p class="field-error" role="alert">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              Le mot de passe est requis
            </p>
          }
        </div>

        <!-- Bouton connexion -->
        <button
          type="submit"
          class="btn-connexion"
          [disabled]="chargement() || form.invalid"
        >
          @if (chargement()) {
            <span class="spinner" aria-hidden="true"></span>
            Connexion en cours…
          } @else {
            Connexion
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14"/>
              <path d="m12 5 7 7-7 7"/>
            </svg>
          }
        </button>

      </form>

      <!-- Lien mot de passe oublié -->
      <a routerLink="/auth/mot-de-passe-oublier" class="forgot-link">
        Mot de passe oublié ?
      </a>

    </div>
  `,
})
export class LoginPage {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);

  chargement = signal(false);
  erreur     = signal<string | null>(null);
  voirMdp    = signal(false);

  form = this.fb.group({
    email:      ['', [Validators.required, Validators.email]],
    motDePasse: ['', [Validators.required]],
  });

  get f() { return this.form.controls; }

  toggleMdp() { this.voirMdp.update(v => !v); }

  connexion() {
    if (this.form.invalid || this.chargement()) return;
    this.erreur.set(null);
    this.chargement.set(true);

    const { email, motDePasse } = this.form.value;

    this.auth.login(email!, motDePasse!).subscribe({
      next: () => {
        this.chargement.set(false);
        this.router.navigateByUrl(this.auth.getDashboard());
      },
      error: (err) => {
        this.chargement.set(false);
        if (err.status === 401) {
          this.erreur.set('Email ou mot de passe incorrect.');
        } else if (err.status === 403) {
          this.erreur.set('Votre compte est désactivé. Contactez votre administrateur.');
        } else if (err.status === 0) {
          this.erreur.set('Impossible de joindre le serveur. Vérifiez votre connexion.');
        } else {
          const msg = err?.error?.message;
          this.erreur.set(typeof msg === 'string' ? msg : 'Une erreur est survenue. Réessayez.');
        }
      },
    });
  }
}
