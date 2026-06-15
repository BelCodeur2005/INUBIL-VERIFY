import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Utilisateur, AuthResponse, ROLE_DASHBOARDS } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'inubil_token';
  private readonly USER_KEY  = 'inubil_user';

  private _utilisateur = signal<Utilisateur | null>(this.chargerUtilisateur());

  readonly utilisateur  = this._utilisateur.asReadonly();
  readonly estConnecte  = computed(() => this._utilisateur() !== null);
  readonly role         = computed(() => this._utilisateur()?.role);
  readonly nomComplet   = computed(() => {
    const u = this._utilisateur();
    return u ? `${u.prenom} ${u.nom}` : '';
  });

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, motDePasse: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, {
      email,
      mot_de_passe: motDePasse,
    }).pipe(
      tap(res => {
        localStorage.setItem(this.TOKEN_KEY, res.access_token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(res.utilisateur));
        this._utilisateur.set(res.utilisateur);
      })
    );
  }

  logout() {
    this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({
      complete: () => this.nettoyerSession(),
      error:    () => this.nettoyerSession(),
    });
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getDashboard(): string {
    const role = this.role();
    return role ? ROLE_DASHBOARDS[role] : '/auth/connexion';
  }

  private nettoyerSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._utilisateur.set(null);
    this.router.navigate(['/auth/connexion']);
  }

  private chargerUtilisateur(): Utilisateur | null {
    try {
      const json = localStorage.getItem(this.USER_KEY);
      return json ? JSON.parse(json) : null;
    } catch {
      return null;
    }
  }
}
