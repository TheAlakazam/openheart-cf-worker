import { vi } from 'vitest';

// Global test setup and mocks

// Mock console methods to avoid noise in test output
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
};

// Mock global fetch and related Web APIs for Cloudflare Workers
global.Request = class MockRequest {
  url: string;
  method: string;
  headers: { get: (name: string) => string | null };
  body: string | null;

  constructor(url: string, init?: RequestInit) {
    this.url = url;
    this.method = init?.method || 'GET';
    const headerMap = new Map<string, string>();
    this.body = typeof init?.body === 'string' ? init.body : null;

    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((value, key) => {
          headerMap.set(key.toLowerCase(), value);
        });
      } else if (Array.isArray(init.headers)) {
        init.headers.forEach(([key, value]) => {
          headerMap.set(key.toLowerCase(), value);
        });
      } else {
        Object.entries(init.headers).forEach(([key, value]) => {
          headerMap.set(key.toLowerCase(), value);
        });
      }
    }

    this.headers = {
      get: (name: string): string | null => {
        return headerMap.get(name.toLowerCase()) || null;
      }
    };
  }

  async text(): Promise<string> {
    return this.body || '';
  }

  async json(): Promise<any> {
    if (!this.body) return {};
    return JSON.parse(this.body);
  }
} as any;

global.Response = class MockResponse {
  status: number;
  headers: Map<string, string>;
  body: string;

  constructor(body?: BodyInit | null, init?: ResponseInit) {
    this.status = init?.status || 200;
    this.headers = new Map();
    this.body = typeof body === 'string' ? body : '';

    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((value, key) => {
          this.headers.set(key, value);
        });
      } else if (Array.isArray(init.headers)) {
        init.headers.forEach(([key, value]) => {
          this.headers.set(key, value);
        });
      } else {
        Object.entries(init.headers).forEach(([key, value]) => {
          this.headers.set(key, value);
        });
      }
    }
  }

  get(name: string): string | null {
    return this.headers.get(name) || null;
  }

  set(name: string, value: string): void {
    this.headers.set(name, value);
  }

  async json(): Promise<any> {
    if (!this.body) return {};
    return JSON.parse(this.body);
  }
} as any;

global.URL = class MockURL {
  pathname: string;
  
  constructor(url: string) {
    const urlParts = url.replace(/^https?:\/\/[^\/]+/, '');
    this.pathname = urlParts || '/';
  }
} as any;

// Add vi to global scope for easier access in tests
global.vi = vi;