export interface User {
  id: number;
  username: string;
  password: string;
  name: string;
  email: string;
  role: 'admin' | 'customer';
  document?: string;
}
