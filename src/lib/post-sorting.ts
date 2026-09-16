import { PostSummary } from '@/types/post';

/**
 * Sortiert Posts nach der gewünschten Priorität:
 * 1. Entwürfe ('draft') immer als erstes (neueste Entwürfe zuerst)
 * 2. Geplante Posts ('scheduled') nach Release-Datum (Standard: Neuestes/späteres Datum zuerst, z. B. 17.09. vor 16.09.)
 * 3. Veröffentlichte Posts ('published') nach neuestem Veröffentlichungsdatum
 */
export function sortPostSummaries(
  summaries: PostSummary[],
  direction: 'desc' | 'asc' = 'desc'
): PostSummary[] {
  return [...summaries].sort((a, b) => {
    // 1. Entwürfe ('draft') immer als erstes
    const aIsDraft = a.status === 'draft';
    const bIsDraft = b.status === 'draft';
    if (aIsDraft && !bIsDraft) return -1;
    if (!aIsDraft && bIsDraft) return 1;
    if (aIsDraft && bIsDraft) {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
    }

    // 2. Geplante vs. bereits veröffentlichte Beiträge
    const aIsScheduled = a.status === 'scheduled';
    const bIsScheduled = b.status === 'scheduled';

    // Geplante Beiträge kommen vor bereits gesendeten Beiträgen
    if (aIsScheduled && !bIsScheduled) return -1;
    if (!aIsScheduled && bIsScheduled) return 1;

    const getDate = (p: PostSummary) => {
      return new Date(p.scheduledAt || p.publishedAt || p.createdAt).getTime();
    };

    const dateA = getDate(a);
    const dateB = getDate(b);

    if (direction === 'desc') {
      // Neuestes Datum zuerst (17.09. vor 16.09.)
      return dateB - dateA;
    } else {
      // Frühestes Datum zuerst
      return dateA - dateB;
    }
  });
}
