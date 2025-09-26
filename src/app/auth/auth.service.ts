import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private user: any = null;

  constructor(private http: HttpClient) {
    const storedId = localStorage.getItem('loggedUserId');
    if (storedId) {
      this.http.get<any>('http://localhost:3000/users/' + storedId).subscribe(u => {
        this.user = u;
      });
    }
  }

  async login(username: string, password: string): Promise<boolean> {
    const users: any = await this.http.get<any[]>('http://localhost:3000/users?username=' + username + '&password=' + password).toPromise();
    if (users.length > 0) {
      this.user = users[0];
      localStorage.setItem('loggedUserId', String(this.user.id));
      localStorage.setItem('userId', String(this.user.id));
      return true;
    }
    return false;
  }

  isAuthenticated(): boolean {
    return this.user !== null && localStorage.getItem('loggedUserId') !== null;
  }

  isAdmin(): boolean {
    return this.user?.role === 'admin';
  }

  isCustomer(): boolean {
    return this.user?.role === 'customer';
  }

  getUser() {
    return this.user;
  }

  logout() {
    this.user = null;
    localStorage.removeItem('loggedUserId');
    localStorage.removeItem('userId');
  }
}
