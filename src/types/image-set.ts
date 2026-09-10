export interface ImageSetItem {
  id: string;
  filename: string;
  url: string;
  name: string;
  createdAt: string;
}

export interface ImageSet {
  id: string;
  name: string;
  description?: string;
  images: ImageSetItem[];
  createdAt: string;
  isDefault?: boolean;
}

