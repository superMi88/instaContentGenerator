import fs from 'fs/promises';
import path from 'path';
import { PostMeta, PostSummary, PostStatus } from '@/types/post';

const POSTS_DIR = path.join(process.cwd(), 'data', 'posts');

// Ensure base posts directory exists
export async function ensureDataDir(): Promise<void> {
  await fs.mkdir(POSTS_DIR, { recursive: true });
}

// Get directory for a specific post
export function getPostDir(id: string): string {
  return path.join(POSTS_DIR, id);
}

// Check if post exists
export async function postExists(id: string): Promise<boolean> {
  try {
    const metaPath = path.join(getPostDir(id), 'meta.json');
    await fs.access(metaPath);
    return true;
  } catch {
    return false;
  }
}

// Save or update post metadata
export async function savePostMeta(post: PostMeta): Promise<void> {
  const dir = getPostDir(post.id);
  await fs.mkdir(dir, { recursive: true });
  const metaPath = path.join(dir, 'meta.json');
  await fs.writeFile(metaPath, JSON.stringify(post, null, 2), 'utf-8');
}

// Read post metadata
export async function getPostMeta(id: string): Promise<PostMeta | null> {
  try {
    const metaPath = path.join(getPostDir(id), 'meta.json');
    const content = await fs.readFile(metaPath, 'utf-8');
    const post = JSON.parse(content) as PostMeta;

    // Backward-compatibility: Ensure slides array exists
    if (!post.slides || post.slides.length === 0) {
      post.slides = [
        {
          id: 'slide_1',
          slideNumber: 1,
          layoutType: 'bild_mit_text',
          category: post.category,
          text: post.slide1_question || '',
          imageUrl: `/api/posts/${id}/assets/character.png`,
        },
        {
          id: 'slide_2',
          slideNumber: 2,
          layoutType: 'bild_mit_text',
          category: post.category,
          text: post.slide2_answer || '',
          imageUrl: `/api/posts/${id}/assets/character.png`,
        },
      ];
    }

    // Ensure gallery array exists
    if (!post.gallery) {
      post.gallery = [
        {
          id: 'preset_boy',
          filename: 'chibi_boy.jpg',
          url: '/assets/characters/chibi_boy.jpg',
          prompt: 'Chibi Junge Preset',
          createdAt: new Date().toISOString(),
          isAiGenerated: false,
        },
        {
          id: 'preset_girl',
          filename: 'chibi_girl.jpg',
          url: '/assets/characters/chibi_girl.jpg',
          prompt: 'Chibi Mädchen Preset',
          createdAt: new Date().toISOString(),
          isAiGenerated: false,
        },
      ];
    }

    return post;
  } catch (error) {
    console.error(`Error reading post ${id}:`, error);
    return null;
  }
}

// List all posts
export async function listPosts(): Promise<PostSummary[]> {
  await ensureDataDir();
  try {
    const entries = await fs.readdir(POSTS_DIR, { withFileTypes: true });
    const postDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    const summaries: PostSummary[] = [];

    for (const dirName of postDirs) {
      const meta = await getPostMeta(dirName);
      if (meta) {
        summaries.push({
          id: meta.id,
          createdAt: meta.createdAt,
          topic: meta.topic,
          category: meta.category,
          slide1_question: meta.slide1_question,
          status: meta.status,
          scheduledAt: meta.scheduledAt,
          publishedAt: meta.publishedAt,
          thumbnailUrl: `/api/posts/${meta.id}/assets/slide_1.png`,
        });
      }
    }

    // Sort descending by creation date
    return summaries.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Error listing posts:', error);
    return [];
  }
}

// Delete a post directory
export async function deletePost(id: string): Promise<boolean> {
  try {
    const dir = getPostDir(id);
    await fs.rm(dir, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error(`Error deleting post ${id}:`, error);
    return false;
  }
}

// Save image asset (slide_1.png, slide_2.png, character.png)
export async function savePostAsset(
  id: string,
  filename: 'slide_1.png' | 'slide_2.png' | 'character.png',
  buffer: Buffer
): Promise<string> {
  const dir = getPostDir(id);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

// Get asset file buffer (slide_1.png, character.png, etc.)
export async function getPostAsset(
  id: string,
  rawFilename: string
): Promise<Buffer | null> {
  const filename = decodeURIComponent(rawFilename.split('?')[0]);
  try {
    const filePath = path.join(getPostDir(id), filename);
    return await fs.readFile(filePath);
  } catch {
    try {
      const galleryPath = path.join(getPostDir(id), 'gallery', filename);
      return await fs.readFile(galleryPath);
    } catch {
      return null;
    }
  }
}

// Save asset to post gallery folder
export async function saveGalleryAsset(
  id: string,
  filename: string,
  buffer: Buffer
): Promise<string> {
  const galleryDir = path.join(getPostDir(id), 'gallery');
  await fs.mkdir(galleryDir, { recursive: true });
  const filePath = path.join(galleryDir, filename);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

// Get asset from post gallery folder
export async function getGalleryAsset(
  id: string,
  rawFilename: string
): Promise<Buffer | null> {
  const filename = decodeURIComponent(rawFilename.split('?')[0]);
  try {
    const filePath = path.join(getPostDir(id), 'gallery', filename);
    return await fs.readFile(filePath);
  } catch {
    try {
      const postPath = path.join(getPostDir(id), filename);
      return await fs.readFile(postPath);
    } catch {
      return null;
    }
  }
}

// Find posts that are due for publication
export async function getDuePosts(): Promise<PostMeta[]> {
  await ensureDataDir();
  const allSummaries = await listPosts();
  const now = new Date();
  const duePosts: PostMeta[] = [];

  for (const item of allSummaries) {
    if (item.status === 'scheduled' && item.scheduledAt) {
      const scheduledDate = new Date(item.scheduledAt);
      if (scheduledDate <= now) {
        const fullPost = await getPostMeta(item.id);
        if (fullPost) {
          duePosts.push(fullPost);
        }
      }
    }
  }

  return duePosts;
}

// ==========================================
// GLOBAL IMAGE SETS STORAGE (Independent of posts)
// ==========================================
const IMAGE_SETS_DIR = path.join(process.cwd(), 'data', 'image-sets');
const IMAGE_SETS_INDEX = path.join(IMAGE_SETS_DIR, 'sets.json');

export async function ensureImageSetsDir(): Promise<void> {
  await fs.mkdir(IMAGE_SETS_DIR, { recursive: true });
}

// Get all global image sets
export async function getImageSets(): Promise<import('@/types/image-set').ImageSet[]> {
  await ensureImageSetsDir();
  try {
    const data = await fs.readFile(IMAGE_SETS_INDEX, 'utf-8');
    const sets = JSON.parse(data);
    if (Array.isArray(sets)) return sets;
  } catch {}

  return [];
}

// Save image sets list
export async function saveImageSets(sets: import('@/types/image-set').ImageSet[]): Promise<void> {
  await ensureImageSetsDir();
  await fs.writeFile(IMAGE_SETS_INDEX, JSON.stringify(sets, null, 2), 'utf-8');
}

// Set a specific image set as default (starred)
export async function setDefaultImageSet(id: string): Promise<import('@/types/image-set').ImageSet[]> {
  const sets = await getImageSets();
  for (const s of sets) {
    s.isDefault = s.id === id;
  }
  await saveImageSets(sets);
  return sets;
}

// Save or update a single image set
export async function saveImageSet(set: import('@/types/image-set').ImageSet): Promise<void> {
  const sets = await getImageSets();
  const index = sets.findIndex((s) => s.id === set.id);
  if (index >= 0) {
    sets[index] = set;
  } else {
    // If this is the first set, make it default automatically
    if (sets.length === 0) {
      set.isDefault = true;
    }
    sets.unshift(set);
  }
  await saveImageSets(sets);
}

// Delete an image set
export async function deleteImageSet(id: string): Promise<void> {
  const sets = await getImageSets();
  const deleted = sets.find((s) => s.id === id);
  const wasDefault = deleted?.isDefault;
  const filtered = sets.filter((s) => s.id !== id);

  // If deleted set was default, assign default to first remaining set
  if (wasDefault && filtered.length > 0 && !filtered.some((s) => s.isDefault)) {
    filtered[0].isDefault = true;
  }

  await saveImageSets(filtered);

  // Remove set asset folder if exists
  try {
    await fs.rm(path.join(IMAGE_SETS_DIR, id), { recursive: true, force: true });
  } catch {}
}

// Save an asset file into an image set folder
export async function saveImageSetAsset(
  setId: string,
  filename: string,
  buffer: Buffer
): Promise<string> {
  const setDir = path.join(IMAGE_SETS_DIR, setId);
  await fs.mkdir(setDir, { recursive: true });
  const filePath = path.join(setDir, filename);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

// Read an asset file from an image set folder
export async function getImageSetAsset(
  setId: string,
  rawFilename: string
): Promise<Buffer | null> {
  const filename = decodeURIComponent(rawFilename.split('?')[0]);
  try {
    const directPath = path.join(IMAGE_SETS_DIR, setId, filename);
    return await fs.readFile(directPath);
  } catch {
    try {
      const subPath = path.join(IMAGE_SETS_DIR, setId, 'assets', filename);
      return await fs.readFile(subPath);
    } catch {
      return null;
    }
  }
}

// Duplicate all assets (gallery, character, rendered slides) from one post to another
export async function duplicatePostAssets(fromId: string, toId: string): Promise<void> {
  const fromDir = path.join(POSTS_DIR, fromId);
  const toDir = path.join(POSTS_DIR, toId);
  await fs.mkdir(toDir, { recursive: true });

  try {
    const entries = await fs.readdir(fromDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'meta.json') continue;
      const srcPath = path.join(fromDir, entry.name);
      const destPath = path.join(toDir, entry.name);
      if (entry.isDirectory()) {
        await fs.cp(srcPath, destPath, { recursive: true });
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  } catch (err) {
    console.error('Error duplicating post assets:', err);
  }
}

