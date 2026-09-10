import { PostMeta } from '@/types/post';
import { getStoredInstagramAuth } from '@/lib/auth';

export interface PublishResult {
  success: boolean;
  instagramPostId?: string;
  error?: string;
}

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Publishes a 2-slide carousel post to Instagram via the official Graph API.
 */
export async function publishCarouselPost(
  post: PostMeta,
  publicBaseUrl: string
): Promise<PublishResult> {
  const storedAuth = await getStoredInstagramAuth();

  const userId =
    process.env.INSTAGRAM_USER_ID || storedAuth?.instagramUserId;

  const accessToken =
    storedAuth?.pageAccessToken || storedAuth?.accessToken || process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!userId || !accessToken) {
    return {
      success: false,
      error:
        'Instagram nicht verbunden. Bitte verbinde deinen Account über den Button „Mit Instagram verbinden“ oben im Menü oder trage INSTAGRAM_USER_ID in .env.local ein.',
    };
  }

  try {
    const totalSlides = post.slides?.length || 2;
    const itemIds: string[] = [];

    // Step 1: Create media container for each slide
    for (let i = 1; i <= totalSlides; i++) {
      const slideUrl = `${publicBaseUrl}/api/posts/${post.id}/assets/slide_${i}.png`;
      const itemId = await createCarouselItemContainer(userId, accessToken, slideUrl);
      itemIds.push(itemId);
    }

    // Step 2: Create Carousel parent container with all items
    const carouselContainerId = await createCarouselParentContainer(
      userId,
      accessToken,
      itemIds,
      post.instagram_caption
    );

    // Wait 3 seconds for Meta media processing
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Step 4: Publish the carousel container
    const publishedPostId = await publishMediaContainer(userId, accessToken, carouselContainerId);

    return {
      success: true,
      instagramPostId: publishedPostId,
    };
  } catch (error: any) {
    console.error('Error publishing to Instagram Graph API:', error);
    return {
      success: false,
      error: error?.message || 'Unerwarteter Fehler bei der Veröffentlichung auf Instagram.',
    };
  }
}

// Helper: Create single carousel item container
async function createCarouselItemContainer(
  userId: string,
  accessToken: string,
  imageUrl: string
): Promise<string> {
  const url = new URL(`${GRAPH_BASE_URL}/${userId}/media`);
  url.searchParams.append('image_url', imageUrl);
  url.searchParams.append('is_carousel_item', 'true');
  url.searchParams.append('access_token', accessToken);

  const res = await fetch(url.toString(), { method: 'POST' });
  const data = await res.json();

  if (!res.ok || !data.id) {
    throw new Error(
      `Fehler beim Hochladen des Carousel-Elements: ${data?.error?.message || JSON.stringify(data)}`
    );
  }

  return data.id;
}

// Helper: Create parent carousel container
async function createCarouselParentContainer(
  userId: string,
  accessToken: string,
  childrenIds: string[],
  caption: string
): Promise<string> {
  const url = new URL(`${GRAPH_BASE_URL}/${userId}/media`);
  url.searchParams.append('media_type', 'CAROUSEL');
  url.searchParams.append('children', childrenIds.join(','));
  url.searchParams.append('caption', caption);
  url.searchParams.append('access_token', accessToken);

  const res = await fetch(url.toString(), { method: 'POST' });
  const data = await res.json();

  if (!res.ok || !data.id) {
    throw new Error(
      `Fehler beim Erstellen des Karussell-Containers: ${data?.error?.message || JSON.stringify(data)}`
    );
  }

  return data.id;
}

// Helper: Publish container
async function publishMediaContainer(
  userId: string,
  accessToken: string,
  creationId: string
): Promise<string> {
  const url = new URL(`${GRAPH_BASE_URL}/${userId}/media_publish`);
  url.searchParams.append('creation_id', creationId);
  url.searchParams.append('access_token', accessToken);

  const res = await fetch(url.toString(), { method: 'POST' });
  const data = await res.json();

  if (!res.ok || !data.id) {
    throw new Error(
      `Fehler beim Veröffentlichen des Karussells: ${data?.error?.message || JSON.stringify(data)}`
    );
  }

  return data.id;
}
