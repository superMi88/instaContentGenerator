'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { SlidePreview } from '@/components/editor/SlidePreview';
import { PostSettings } from '@/components/editor/PostSettings';
import { SchedulerModal } from '@/components/editor/SchedulerModal';
import { ImageSetModal } from '@/components/editor/ImageSetModal';
import { PostArchiveView } from '@/components/posts/PostArchiveView';
import { AiAssistantDrawer } from '@/components/chat/AiAssistantDrawer';
import { PostMeta, PostSummary, ChatMessage, PostColors, SlideItem, GalleryAsset, ImageSet, ImageSetItem } from '@/types/post';
import { PRESET_THEMES } from '@/lib/gemini';
import { Instagram, Layers, Sparkles, ShieldCheck, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';

const DEFAULT_POST: PostMeta = {
  id: `post_${Date.now()}`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  topic: 'Ex-Partner gratulieren',
  category: 'Liebe & Beziehung',
  slide1_question: 'Sollte man dem Ex nach 2 Jahren noch zum Geburtstag gratulieren?',
  slide2_answer:
    'Nein. Wenn kein echter Kontakt mehr besteht, ist es meistens nur ein Vorwand, die Tür wieder einen Spalt zu öffnen.',
  character_prompt:
    'Cute anime chibi boy character with messy brown hair looking thoughtful with hand on chin',
  instagram_caption:
    'Was denkst du darüber? Höflichkeit oder unnötiges Aufwärmen alter Gefühle? 👇 Schreib deine Meinung in die Kommentare!\n\n#dating #beziehung #mindset #psychologie #liebe',
  hashtags: ['#dating', '#beziehung', '#mindset', '#liebe'],
  colors: PRESET_THEMES['Liebe & Beziehung'],
  chat_history: [
    {
      id: 'm1',
      role: 'user',
      content: 'Erstelle einen Carousel-Post über: Sollte man dem Ex zum Geburtstag gratulieren?',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'm2',
      role: 'model',
      content:
        'Hier ist dein fertiges Konzept! Slide 1 stellt die emotionale Frage an die Community, Slide 2 liefert die pointierte Antwort dazu.',
      timestamp: new Date().toISOString(),
    },
  ],
  status: 'draft',
  scheduledAt: null,
  publishedAt: null,
  instagramPostId: null,
  error: null,
  hasCustomCharacter: false,
  slides: [
    {
      id: 'slide_1',
      slideNumber: 1,
      layoutType: 'bild_mit_text',
      category: 'Liebe & Beziehung',
      text: 'Sollte man dem Ex nach 2 Jahren noch zum Geburtstag gratulieren?',
      imageUrl: '/assets/characters/chibi_boy.jpg',
    },
    {
      id: 'slide_2',
      slideNumber: 2,
      layoutType: 'bild_mit_text',
      category: 'Liebe & Beziehung',
      text: 'Nein. Wenn kein echter Kontakt mehr besteht, ist es meistens nur ein Vorwand, die Tür wieder einen Spalt zu öffnen.',
      imageUrl: '/assets/characters/chibi_girl.jpg',
    },
  ],
  gallery: [
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
  ],
};

interface IgAuthStatus {
  connected: boolean;
  username?: string;
  userId?: string;
}

export default function DashboardPage() {
  const [authStatus, setAuthStatus] = useState<IgAuthStatus | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentPost, setCurrentPost] = useState<PostMeta>(DEFAULT_POST);
  const [postsList, setPostsList] = useState<PostSummary[]>([]);
  const [appView, setAppView] = useState<'archive' | 'editor'>('archive');
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [imageSets, setImageSets] = useState<ImageSet[]>([]);
  const [activeImageSetId, setActiveImageSetId] = useState<string>('');
  const [isImageSetModalOpen, setIsImageSetModalOpen] = useState(false);

  const [renderedSlideUrls, setRenderedSlideUrls] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<'live' | 'rendered'>('live');

  // Check Instagram connection status
  const fetchAuthStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/instagram/status');
      const data = await res.json();
      setAuthStatus(data);
    } catch {
      setAuthStatus({ connected: false });
    }
  }, []);

  // Fetch list of posts on mount
  const fetchPostsList = useCallback(async () => {
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      if (data.posts) {
        setPostsList(data.posts);
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  }, []);

  // Fetch global image sets
  const fetchImageSets = useCallback(async () => {
    try {
      const res = await fetch('/api/image-sets');
      const data = await res.json();
      const loadedSets: ImageSet[] = data.imageSets || data.sets || [];
      if (Array.isArray(loadedSets)) {
        setImageSets(loadedSets);
        const defaultSet = loadedSets.find((s) => s.isDefault) || loadedSets[0];
        if (defaultSet && (!activeImageSetId || !loadedSets.some((s) => s.id === activeImageSetId))) {
          setActiveImageSetId(defaultSet.id);
        }
      }
      return loadedSets;
    } catch (err) {
      console.error('Error fetching image sets:', err);
      return [];
    }
  }, [activeImageSetId]);

  useEffect(() => {
    fetchAuthStatus();
    fetchPostsList();
    fetchImageSets();

    // Check for URL query params after OAuth redirect
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('auth_error');
      if (err) {
        setAuthError(decodeURIComponent(err));
      }
      if (params.get('auth') === 'success') {
        fetchAuthStatus();
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [fetchAuthStatus, fetchPostsList, fetchImageSets]);

  // Load a specific post
  const loadPost = async (id: string) => {
    try {
      const res = await fetch(`/api/posts/${id}`);
      const data = await res.json();
      if (data.post) {
        setCurrentPost(data.post);
        const timestamp = Date.now();
        const urls = (data.post.slides || []).map(
          (_: any, idx: number) => `/api/posts/${id}/assets/slide_${idx + 1}.png?t=${timestamp}`
        );
        setRenderedSlideUrls(urls);
        setPreviewMode('live');
      }
    } catch (err) {
      console.error('Error loading post:', err);
    }
  };

  // Save current post to file system
  const savePost = async (postToSave = currentPost): Promise<void> => {
    setIsSaving(true);
    try {
      const checkRes = await fetch(`/api/posts/${postToSave.id}`);
      if (checkRes.ok) {
        await fetch(`/api/posts/${postToSave.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postToSave),
        });
      } else {
        await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postToSave),
        });
      }
      await fetchPostsList();
    } catch (err) {
      console.error('Error saving post:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete an entire post
  const handleDeletePost = async (id: string) => {
    try {
      const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchPostsList();
        if (currentPost.id === id) {
          handleNewPost();
          setAppView('archive');
        }
      } else {
        alert('Fehler beim Löschen des Beitrags.');
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Fehler beim Löschen: ' + err.message);
    }
  };

  // Duplicate an existing post
  const handleDuplicatePost = async (id: string) => {
    try {
      const res = await fetch(`/api/posts/${id}`);
      const data = await res.json();
      if (!res.ok || !data.post) {
        alert('Fehler beim Laden des Beitrags zum Kopieren.');
        return;
      }

      const original: PostMeta = data.post;
      const newId = `post_${Date.now()}`;
      const duplicate = {
        ...original,
        id: newId,
        duplicateFromId: id,
        topic: `${original.topic || 'Karussell'} (Kopie)`,
        status: 'draft',
        scheduledAt: null,
        publishedAt: null,
        instagramPostId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const createRes = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicate),
      });

      const createData = await createRes.json();
      if (createRes.ok && createData.success) {
        await fetchPostsList();
      } else {
        alert(createData.error || 'Fehler beim Duplizieren des Posts.');
      }
    } catch (err: any) {
      console.error('Duplicate error:', err);
      alert('Fehler beim Duplizieren: ' + err.message);
    }
  };

  // Update a single slide
  const handleUpdateSlide = (index: number, updated: Partial<SlideItem>) => {
    const newSlides = [...currentPost.slides];
    newSlides[index] = { ...newSlides[index], ...updated };

    const newPost: PostMeta = {
      ...currentPost,
      slides: newSlides,
      slide1_question: index === 0 && updated.text !== undefined ? updated.text : currentPost.slide1_question,
      slide2_answer: index === 1 && updated.text !== undefined ? updated.text : currentPost.slide2_answer,
      category: updated.category !== undefined ? updated.category : currentPost.category,
      updatedAt: new Date().toISOString(),
    };
    setCurrentPost(newPost);
  };

  // Add a new slide
  const handleAddSlide = async () => {
    const nextNum = currentPost.slides.length + 1;
    const fallbackImage = currentPost.gallery[0]?.url || '/assets/characters/chibi_boy.jpg';
    const newSlide: SlideItem = {
      id: `slide_${Date.now()}`,
      slideNumber: nextNum,
      layoutType: 'bild_mit_text',
      category: currentPost.category,
      text: '',
      imageUrl: fallbackImage,
    };

    const updatedPost: PostMeta = {
      ...currentPost,
      slides: [...currentPost.slides, newSlide],
      updatedAt: new Date().toISOString(),
    };

    setCurrentPost(updatedPost);
    await savePost(updatedPost);
  };

  // Delete a slide
  const handleDeleteSlide = async (index: number) => {
    if (currentPost.slides.length <= 1) return;
    const remaining = currentPost.slides
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, slideNumber: i + 1 }));

    const updatedPost: PostMeta = {
      ...currentPost,
      slides: remaining,
      updatedAt: new Date().toISOString(),
    };

    setCurrentPost(updatedPost);
    await savePost(updatedPost);
  };

  // Assign image from gallery to a specific slide
  const handleSelectImageForSlide = async (slideIndex: number, asset: GalleryAsset) => {
    if (!currentPost.slides[slideIndex]) return;
    const updatedSlides = [...currentPost.slides];
    updatedSlides[slideIndex] = {
      ...updatedSlides[slideIndex],
      imageUrl: asset.url,
    };

    const updatedPost: PostMeta = {
      ...currentPost,
      slides: updatedSlides,
      updatedAt: new Date().toISOString(),
    };

    setCurrentPost(updatedPost);
    await savePost(updatedPost);
  };

  // AI Image generation from gallery box
  const handleGenerateImage = async (prompt: string) => {
    setIsGeneratingImage(true);
    try {
      await savePost();
      const res = await fetch(`/api/posts/${currentPost.id}/gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          prompt,
          backgroundColorHex: currentPost.colors.topBg,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Bildgenerierung fehlgeschlagen');
      }

      const newAsset: GalleryAsset = data.asset;
      const updatedGallery = data.gallery || [newAsset, ...currentPost.gallery];

      // Assign newly generated image to slide 0 as active default
      const updatedSlides = [...currentPost.slides];
      if (updatedSlides.length > 0) {
        updatedSlides[0] = { ...updatedSlides[0], imageUrl: newAsset.url };
      }

      const updatedPost: PostMeta = {
        ...currentPost,
        gallery: updatedGallery,
        slides: updatedSlides,
        character_prompt: prompt,
        updatedAt: new Date().toISOString(),
      };

      setCurrentPost(updatedPost);
      await savePost(updatedPost);
    } catch (err: any) {
      console.error('Image generation error:', err);
      alert('Fehler beim Generieren des Bildes: ' + err.message);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Upload custom image into gallery
  const handleUploadImage = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        await savePost();
        const res = await fetch(`/api/posts/${currentPost.id}/gallery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'upload',
            base64Image: base64Data,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const newAsset: GalleryAsset = data.asset;
          const updatedGallery = data.gallery || [newAsset, ...currentPost.gallery];
          const updatedSlides = [...currentPost.slides];
          if (updatedSlides.length > 0) {
            updatedSlides[0] = { ...updatedSlides[0], imageUrl: newAsset.url };
          }
          const updatedPost: PostMeta = {
            ...currentPost,
            gallery: updatedGallery,
            slides: updatedSlides,
            updatedAt: new Date().toISOString(),
          };
          setCurrentPost(updatedPost);
          await savePost(updatedPost);
        } else {
          alert(data.error || 'Upload fehlgeschlagen');
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert('Upload-Fehler: ' + err.message);
    }
  };

  // Dedicated Image Edit from Gallery Box (Multimodal Image-to-Image without chat clutter)
  const handleEditGalleryImage = async (asset: GalleryAsset, instruction: string) => {
    setIsEditingImage(true);
    try {
      await savePost();
      const res = await fetch(`/api/posts/${currentPost.id}/gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          instruction,
          referenceImageId: asset.id,
          referenceImageUrl: asset.url,
          backgroundColorHex: currentPost.colors.topBg,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Bildbearbeitung fehlgeschlagen');
      }

      const newAsset: GalleryAsset = data.asset;
      const updatedGallery = data.gallery || [newAsset, ...currentPost.gallery];

      // Assign to current active slide or slide 0
      const updatedSlides = [...currentPost.slides];
      if (updatedSlides.length > 0) {
        updatedSlides[0] = { ...updatedSlides[0], imageUrl: newAsset.url };
      }

      const updatedPost: PostMeta = {
        ...currentPost,
        gallery: updatedGallery,
        slides: updatedSlides,
        updatedAt: new Date().toISOString(),
      };

      setCurrentPost(updatedPost);
      await savePost(updatedPost);
    } catch (err: any) {
      console.error('Image edit error:', err);
      alert('Fehler bei der Bildbearbeitung: ' + err.message);
    } finally {
      setIsEditingImage(false);
    }
  };

  // Dedicated Generate in Style from Gallery Box
  const handleGenerateWithSetStyle = async (prompt: string, setId: string) => {
    setIsGeneratingImage(true);
    try {
      await savePost();
      const res = await fetch(`/api/posts/${currentPost.id}/gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          prompt,
          styleSetId: setId,
          backgroundColorHex: currentPost.colors.topBg,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Bildgenerierung im Set-Style fehlgeschlagen');
      }

      const newAsset: GalleryAsset = data.asset;
      const updatedGallery = data.gallery || [newAsset, ...currentPost.gallery];

      // Assign newly generated image to slide 0 as active
      const updatedSlides = [...currentPost.slides];
      if (updatedSlides.length > 0) {
        updatedSlides[0] = { ...updatedSlides[0], imageUrl: newAsset.url };
      }

      const updatedPost: PostMeta = {
        ...currentPost,
        gallery: updatedGallery,
        slides: updatedSlides,
        character_prompt: prompt,
        updatedAt: new Date().toISOString(),
      };

      setCurrentPost(updatedPost);
      await savePost(updatedPost);
    } catch (err: any) {
      console.error('Set style generation error:', err);
      alert('Fehler bei der Generierung im Set-Style: ' + err.message);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Handle Gemini Chat generation + Image Set selection or auto image fallback
  const handleGenerate = async (promptText: string) => {
    setIsLoadingChat(true);

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: promptText,
      timestamp: new Date().toISOString(),
    };

    const updatedHistory = [...currentPost.chat_history, userMessage];

    try {
      const contextInfo = currentPost.topic
        ? `[Aktueller Projektkontext: Thema="${currentPost.topic}", Kategorie="${currentPost.category}", Slide 1="${currentPost.slides[0]?.text || ''}", Slide 2="${currentPost.slides[1]?.text || ''}"]\n\nNutzeranweisung: `
        : '';

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${contextInfo}${promptText}`,
          history: updatedHistory,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.data) {
        throw new Error(json.error || 'Fehler beim Abruf von Gemini');
      }

      const generated = json.data;

      const modelMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'model',
        content: `Karussell angepasst!\n• Kategorie: ${generated.category}\n• Slide 1: "${generated.slide1_question}"\n• Slide 2: "${generated.slide2_answer}"`,
        timestamp: new Date().toISOString(),
      };

      // Update slides
      const updatedSlides = [...currentPost.slides];
      if (updatedSlides.length >= 2) {
        updatedSlides[0] = {
          ...updatedSlides[0],
          category: generated.category || updatedSlides[0].category,
          text: generated.slide1_question || updatedSlides[0].text,
        };
        updatedSlides[1] = {
          ...updatedSlides[1],
          category: generated.category || updatedSlides[1].category,
          text: generated.slide2_answer || updatedSlides[1].text,
        };
      }

      let updatedPost: PostMeta = {
        ...currentPost,
        topic: promptText.slice(0, 40),
        category: generated.category || currentPost.category,
        slide1_question: generated.slide1_question || currentPost.slide1_question,
        slide2_answer: generated.slide2_answer || currentPost.slide2_answer,
        character_prompt: generated.character_prompt || currentPost.character_prompt,
        instagram_caption: generated.instagram_caption || currentPost.instagram_caption,
        colors: generated.suggested_colors
          ? { ...currentPost.colors, ...generated.suggested_colors }
          : currentPost.colors,
        slides: updatedSlides,
        chat_history: [...updatedHistory, modelMessage],
        updatedAt: new Date().toISOString(),
      };

      // Use active Image Set images if available
      const activeSet = imageSets.find((s) => s.id === activeImageSetId) || imageSets[0];
      if (activeSet && activeSet.images && activeSet.images.length > 0) {
        if (updatedSlides.length >= 1 && activeSet.images[0]) {
          updatedSlides[0] = { ...updatedSlides[0], imageUrl: activeSet.images[0].url };
        }
        if (updatedSlides.length >= 2) {
          const secondImg = activeSet.images[1] || activeSet.images[0];
          updatedSlides[1] = { ...updatedSlides[1], imageUrl: secondImg.url };
        }
        // Ensure image set items are available in gallery
        const existingUrls = new Set((updatedPost.gallery || []).map((g) => g.url));
        const newSetAssets: GalleryAsset[] = activeSet.images
          .filter((item: ImageSetItem) => !existingUrls.has(item.url))
          .map((item: ImageSetItem) => ({
            id: `set_${item.id}`,
            filename: item.filename,
            url: item.url,
            prompt: `${item.name} (${activeSet.name})`,
            createdAt: item.createdAt,
            isAiGenerated: false,
          }));
        if (newSetAssets.length > 0) {
          updatedPost.gallery = [...newSetAssets, ...(updatedPost.gallery || [])];
        }
        setCurrentPost(updatedPost);
        await savePost(updatedPost);
      } else {
        // Save post text immediately
        setCurrentPost(updatedPost);
        await savePost(updatedPost);

        // Auto-generate AI image in background based on character prompt if no set image
        const imgPromptToUse = generated.character_prompt || updatedPost.character_prompt;
        if (imgPromptToUse) {
          try {
            const imgRes = await fetch(`/api/posts/${updatedPost.id}/gallery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'generate',
                prompt: imgPromptToUse,
                backgroundColorHex: updatedPost.colors.topBg,
              }),
            });
            const imgData = await imgRes.json();
            if (imgData.success && imgData.asset) {
              const newSlides = [...updatedPost.slides];
              if (newSlides.length > 0) {
                newSlides[0] = { ...newSlides[0], imageUrl: imgData.asset.url };
              }
              updatedPost = {
                ...updatedPost,
                gallery: imgData.gallery,
                slides: newSlides,
              };
              setCurrentPost(updatedPost);
              await savePost(updatedPost);
            }
          } catch (imgErr) {
            console.error('Auto image gen failed:', imgErr);
          }
        }
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      alert(err.message || 'Fehler bei der Kommunikation mit Gemini.');
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Re-render Slide PNGs via server-side Satori
  const handleRenderPngs = async () => {
    setIsRendering(true);
    try {
      await savePost();
      const res = await fetch(`/api/posts/${currentPost.id}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentPost),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setRenderedSlideUrls(data.slideUrls || []);
      } else {
        alert(data.error || 'Fehler beim Rendern der Bilder.');
      }
    } catch (err: any) {
      console.error('Render error:', err);
      alert('Rendern fehlgeschlagen: ' + err.message);
    } finally {
      setIsRendering(false);
    }
  };

  // Schedule post
  const handleSchedule = async (dateTimeIso: string) => {
    const updatedPost: PostMeta = {
      ...currentPost,
      scheduledAt: dateTimeIso,
      status: 'scheduled',
      error: null,
      updatedAt: new Date().toISOString(),
    };
    setCurrentPost(updatedPost);
    await savePost(updatedPost);
    alert(`Beitrag erfolgreich für den ${new Date(dateTimeIso).toLocaleString('de-DE')} geplant!`);
    setIsSchedulerOpen(false);
  };

  // Publish post immediately via Instagram Graph API
  const handlePublishNow = async () => {
    setIsPublishing(true);
    try {
      await handleRenderPngs();
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: currentPost.id }),
      });

      const data = await res.json();

      if (data.success) {
        setCurrentPost(data.post);
        alert('Karussell erfolgreich auf Instagram veröffentlicht!');
        setIsSchedulerOpen(false);
      } else {
        alert(data.error || 'Veröffentlichung auf Instagram fehlgeschlagen.');
        if (data.post) setCurrentPost(data.post);
      }
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  // Create brand new post
  const handleNewPost = () => {
    const activeSet = imageSets.find((s) => s.id === activeImageSetId) || imageSets.find((s) => s.isDefault) || imageSets[0];
    const initialSlide1Img = activeSet?.images?.[0]?.url || '';
    const initialSlide2Img = activeSet?.images?.[1]?.url || activeSet?.images?.[0]?.url || '';

    const newSlides = DEFAULT_POST.slides.map((slide, idx) => ({
      ...slide,
      imageUrl: idx === 0 ? (initialSlide1Img || slide.imageUrl) : (initialSlide2Img || slide.imageUrl),
    }));

    const newGallery = (activeSet?.images && activeSet.images.length > 0)
      ? activeSet.images.map((img) => ({
          id: `set_${img.id}`,
          filename: img.filename,
          url: img.url,
          prompt: `${img.name} (${activeSet.name})`,
          createdAt: img.createdAt,
          isAiGenerated: false,
        }))
      : DEFAULT_POST.gallery;

    const newPost: PostMeta = {
      ...DEFAULT_POST,
      id: `post_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      slides: newSlides,
      gallery: newGallery,
      chat_history: [],
      status: 'draft',
      scheduledAt: null,
      publishedAt: null,
      instagramPostId: null,
      error: null,
    };
    setCurrentPost(newPost);
    setRenderedSlideUrls([]);
    setPreviewMode('live');
  };


  // 1. Loading state while checking auth
  if (authStatus === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090D16]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400">Verbindung wird geprüft...</span>
        </div>
      </div>
    );
  }

  // 2. Gated Login Screen: Only show "Mit Instagram anmelden" if not connected
  if (!authStatus.connected) {
    return (
      <div className="min-h-screen bg-[#090D16] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-pink-600/20 via-purple-600/20 to-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full glass-panel border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 flex flex-col items-center text-center space-y-6">
          {/* Logo Badge */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-purple-600/25">
            <Layers className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              InstaCarousel Studio
            </h1>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Vollautomatisierte Erstellung und Veröffentlichung von Instagram-Karussell-Posts mit Gemini KI und pixelgenauem 1080x1350 Rendering.
            </p>
          </div>

          {/* Auth Error Banner if present */}
          {authError && (
            <div className="w-full p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 text-left flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Anmeldung fehlgeschlagen:</span>
                <span className="text-[11px] text-rose-300/90">{authError}</span>
              </div>
            </div>
          )}

          {/* Feature Bullets */}
          <div className="w-full bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 text-left space-y-2.5">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Gemini 2.5 Flash Chat & Image Prompting</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Instagram className="w-3.5 h-3.5 text-pink-400" />
              <span>Direktes Posten in deinen Instagram-Feed</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sichere lokale Dateispeicherung (/data/posts/)</span>
            </div>
          </div>

          {/* Big Connect Button */}
          <a
            href="/api/auth/instagram/login"
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:opacity-95 text-white text-sm font-bold shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2.5 transition active:scale-[0.98]"
          >
            <Instagram className="w-5 h-5" />
            <span>Mit Instagram verbinden</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          <p className="text-[11px] text-slate-500">
            Erfordert einen Instagram Creator- oder Business-Account
          </p>
        </div>
      </div>
    );
  }

  // 3. Full Dashboard: Archive as Start Page / Dedicated Page or Editor View
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header Bar */}
      <Header
        postCount={postsList.length}
        status={currentPost.status}
        isSaving={isSaving}
        onSave={() => savePost()}
        onOpenScheduler={() => setIsSchedulerOpen(true)}
        onNewPost={() => {
          handleNewPost();
          setAppView('editor');
        }}
        currentView={appView}
        onNavigateToArchive={() => setAppView('archive')}
        onToggleAiDrawer={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
        postTopic={currentPost.topic}
      />

      {/* Main View: Archive vs Editor */}
      {appView === 'archive' ? (
        <PostArchiveView
          posts={postsList}
          onSelectPost={(id) => {
            loadPost(id);
            setAppView('editor');
          }}
          onNewPost={() => {
            handleNewPost();
            setAppView('editor');
          }}
          onDuplicatePost={handleDuplicatePost}
          onDeletePost={handleDeletePost}
          authStatus={authStatus}
        />
      ) : (
        /* Full-Width Editor Workspace */
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col space-y-6 animate-in fade-in duration-200">
          {/* Dynamic Multi-Slide Preview with Centered Carousel, 3-Step Workflow & Dots */}
          <SlidePreview
            postId={currentPost.id}
            category={currentPost.category}
            slides={currentPost.slides || []}
            colors={currentPost.colors}
            gallery={currentPost.gallery || []}
            characterPrompt={currentPost.character_prompt}
            isRendering={isRendering}
            renderedSlideUrls={renderedSlideUrls}
            onUpdateSlide={handleUpdateSlide}
            onAddSlide={handleAddSlide}
            onDeleteSlide={handleDeleteSlide}
            onSelectImageForSlide={handleSelectImageForSlide}
            onGenerateImage={handleGenerateImage}
            onUploadImage={handleUploadImage}
            onEditImage={handleEditGalleryImage}
            onOpenImageSetModal={() => setIsImageSetModalOpen(true)}
            activeImageSet={imageSets.find((s) => s.id === activeImageSetId) || imageSets.find((s) => s.isDefault) || imageSets[0]}
            activeImageSetName={imageSets.find((s) => s.id === activeImageSetId)?.name || imageSets.find((s) => s.isDefault)?.name || 'Standard'}
            onGenerateWithSetStyle={handleGenerateWithSetStyle}
            isGeneratingImage={isGeneratingImage}
            isEditingImage={isEditingImage}
            onRenderPngs={handleRenderPngs}
            onThemeSelect={(newCategory, newColors) => {
              setCurrentPost((prev) => {
                const updated = {
                  ...prev,
                  category: newCategory,
                  colors: newColors,
                  slides: prev.slides.map((s) => ({
                    ...s,
                    category: newCategory,
                  })),
                  updatedAt: new Date().toISOString(),
                };
                savePost(updated);
                return updated;
              });
            }}
            onColorsChange={(newColors) => {
              setCurrentPost((prev) => {
                const updated = {
                  ...prev,
                  colors: newColors,
                  updatedAt: new Date().toISOString(),
                };
                savePost(updated);
                return updated;
              });
            }}
            onCategoryChange={(newCategory) => {
              setCurrentPost((prev) => {
                const updated = {
                  ...prev,
                  category: newCategory,
                  slides: prev.slides.map((s) => ({
                    ...s,
                    category: newCategory,
                  })),
                  updatedAt: new Date().toISOString(),
                };
                savePost(updated);
                return updated;
              });
            }}
            onOpenScheduler={() => setIsSchedulerOpen(true)}
            previewMode={previewMode}
            onPreviewModeChange={setPreviewMode}
          />

          {/* Instagram Caption */}
          <PostSettings
            caption={currentPost.instagram_caption}
            onCaptionChange={(newCaption) =>
              setCurrentPost({ ...currentPost, instagram_caption: newCaption })
            }
            isReadOnly={previewMode === 'rendered'}
          />
        </main>
      )}

      {/* Collapsible AI Assistant Drawer (Slide-Over) */}
      <AiAssistantDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        chatHistory={currentPost.chat_history}
        onGenerate={handleGenerate}
        isLoading={isLoadingChat}
        onClearChat={() => setCurrentPost({ ...currentPost, chat_history: [] })}
        projectContext={{
          topic: currentPost.topic,
          category: currentPost.category,
          slides: currentPost.slides.map((s) => ({
            slideNumber: s.slideNumber,
            text: s.text,
            layoutType: s.layoutType,
          })),
        }}
      />

      {/* Instagram Scheduling & Publish Modal */}
      <SchedulerModal
        isOpen={isSchedulerOpen}
        onClose={() => setIsSchedulerOpen(false)}
        status={currentPost.status}
        scheduledAt={currentPost.scheduledAt}
        onSchedule={handleSchedule}
        onPublishNow={handlePublishNow}
        isPublishing={isPublishing}
        publishedAt={currentPost.publishedAt}
        instagramPostId={currentPost.instagramPostId}
        errorMessage={currentPost.error}
      />

      {/* Global Image Sets Management Modal */}
      <ImageSetModal
        isOpen={isImageSetModalOpen}
        onClose={() => setIsImageSetModalOpen(false)}
        imageSets={imageSets}
        activeSetId={activeImageSetId}
        onSelectActiveSet={(setId: string) => {
          setActiveImageSetId(setId);
          const chosen = imageSets.find((s) => s.id === setId);
          if (chosen && chosen.images.length > 0) {
            // Apply chosen set image to slide 1 and gallery
            const updatedSlides = [...currentPost.slides];
            if (updatedSlides.length > 0) {
              updatedSlides[0] = { ...updatedSlides[0], imageUrl: chosen.images[0].url };
            }
            const existingUrls = new Set((currentPost.gallery || []).map((g) => g.url));
            const newSetAssets: GalleryAsset[] = chosen.images
              .filter((item: ImageSetItem) => !existingUrls.has(item.url))
              .map((item: ImageSetItem) => ({
                id: `set_${item.id}`,
                filename: item.filename,
                url: item.url,
                prompt: `${item.name} (${chosen.name})`,
                createdAt: item.createdAt,
                isAiGenerated: false,
              }));
            const updatedPost: PostMeta = {
              ...currentPost,
              slides: updatedSlides,
              gallery: [...newSetAssets, ...(currentPost.gallery || [])],
              updatedAt: new Date().toISOString(),
            };
            setCurrentPost(updatedPost);
            savePost(updatedPost);
          }
        }}
        onRefreshSets={fetchImageSets}
      />
    </div>
  );
}
