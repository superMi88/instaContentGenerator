import fs from 'fs/promises';
import path from 'path';

export interface StoredInstagramAuth {
  connected: boolean;
  instagramUserId?: string;
  instagramUsername?: string;
  pageId?: string;
  pageName?: string;
  accessToken?: string;
  pageAccessToken?: string;
  expiresIn?: number;
  connectedAt?: string;
  error?: string;
}

const AUTH_FILE_PATH = path.join(process.cwd(), 'data', 'auth.json');

// Read stored Instagram auth credentials
export async function getStoredInstagramAuth(): Promise<StoredInstagramAuth | null> {
  try {
    const data = await fs.readFile(AUTH_FILE_PATH, 'utf-8');
    return JSON.parse(data) as StoredInstagramAuth;
  } catch {
    return null;
  }
}

// Save Instagram auth credentials to local file system
export async function saveStoredInstagramAuth(auth: StoredInstagramAuth): Promise<void> {
  const dir = path.dirname(AUTH_FILE_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(AUTH_FILE_PATH, JSON.stringify(auth, null, 2), 'utf-8');
}

// Disconnect / remove auth
export async function deleteStoredInstagramAuth(): Promise<void> {
  try {
    await fs.rm(AUTH_FILE_PATH, { force: true });
  } catch (error) {
    console.error('Error deleting auth file:', error);
  }
}
