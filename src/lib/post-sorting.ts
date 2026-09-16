import { PostSummary } from '@/types/post';

/**
 * Sortiert Posts nach der gewünschten Priorität:
 * 1. Entwürfe ('draft') immer als erstes (neueste Entwürfe zuerst)
 * 2. Geplante Posts ('scheduled') nach frühestem geplantem Release-Datum
 * 3. Veröffentlichte Posts ('published') nach neuestem Veröffentlichungsdatum
 */
export function sortPostSummaries(summaries: PostSummary[]): PostSummary[] {
  return [...summaries].sort((a, b) => {
    // 1. Entwürfe immer als erstes
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
    if (aIsScheduled && !bIsScheduled) return -1;
    if (!aIsScheduled && bIsScheduled) return 1;

    if (aIsScheduled && bIsScheduled) {
      // Geplant: Chronologisch nächstes Release-Datum zuerst
      const dateA = new Date(a.scheduledAt || a.createdAt).getTime();
      const dateB = new Date(b.scheduledAt || b.createdAt).getTime();
      return dateA - dateB;
    }

    // Veröffentlicht: Neueste Veröffentlichung zuerst
    const dateA = new Date(a.publishedAt || a.createdAt).getTime();
    const dateB = new Date(b.publishedAt || b.createdAt).getTime();
    return dateB - dateA;
  });
}
