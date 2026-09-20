import { env } from 'cloudflare:workers';
export function registrationDb(){if(!env.DB) throw new Error('Registration storage unavailable');return env.DB;}
