export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';

export * from './image-set';

export type SlideLayoutType = 'bild_mit_text' | 'nur_text' | 'nur_bild';

export interface SlideItem {
  id: string;
  slideNumber: number;
  layoutType: SlideLayoutType;
  category?: string;
  text: string;
  subText?: string;
  imageUrl?: string; // URL to the selected image from gallery or asset
  imageZoom?: number; // Zoom factor, e.g. 1.0 to 3.0 (default 1.0)
  footerText?: string; // Editable footer text (e.g. "Wische nach links", "Deine Meinung?")
}

export interface GalleryAsset {
  id: string;
  filename: string;
  url: string;
  prompt?: string;
  createdAt: string;
  isAiGenerated: boolean;
}

export interface PostColors {
  topBg: string;        // Soft pastel color (e.g. #FCE7F3, #EDE9FE, #FEF3C7)
  bottomBg: string;     // Solid deep accent color (e.g. #0F172A, #18181B, #1E1B4B)
  textColor: string;    // Text color for bottom half (e.g. #FFFFFF)
  categoryColor: string;// Category badge color (e.g. #F472B6, #818CF8)
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export interface GeminiStructuredPost {
  category: string;
  slide1_question: string;
  slide2_answer: string;
  character_prompt: string;
  instagram_caption: string;
  additional_slides?: Array<{
    layoutType: SlideLayoutType;
    text: string;
    category?: string;
  }>;
  suggested_colors?: Partial<PostColors>;
}

export interface PostMeta {
  id: string;
  createdAt: string;
  updatedAt: string;
  topic: string;
  category: string;
  slide1_question: string;
  slide2_answer: string;
  character_prompt: string;
  instagram_caption: string;
  hashtags: string[];
  colors: PostColors;
  chat_history: ChatMessage[];
  status: PostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  instagramPostId: string | null;
  error: string | null;
  hasCustomCharacter?: boolean;
  slides: SlideItem[];
  gallery: GalleryAsset[];
}

export interface PostSummary {
  id: string;
  createdAt: string;
  topic: string;
  category: string;
  slide1_question: string;
  status: PostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  thumbnailUrl?: string;
  slideCount?: number;
}
