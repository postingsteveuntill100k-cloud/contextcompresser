import { CanonicalConversation, StructuredMemory } from '@/types';

/**
 * ContextOS Dynamic Contextual Question Derivation
 *
 * Implements the core product rule:
 * 1. A fresh account with NO imported history returns an empty array (NO fake or generic questions).
 * 2. When history exists, questions are dynamically synthesized directly from the user's
 *    actual decisions, failed attempts, unresolved issues, and conversation topics.
 */
export function deriveContextualQuestions(
  conversations: CanonicalConversation[] = [],
  memory?: StructuredMemory | null
): string[] {
  // Rule 1: Fresh account with NO imported history must NOT show personalized questions
  if (!conversations || conversations.length === 0) {
    return [];
  }

  const questions: string[] = [];

  // 1. From real decisions
  if (memory?.decisions && memory.decisions.length > 0) {
    const dec = memory.decisions[0];
    if (dec.topic) {
      questions.push(`What did I decide regarding ${dec.topic}?`);
    } else if (dec.decision) {
      const snippet = dec.decision.length > 40 ? dec.decision.slice(0, 38) + '...' : dec.decision;
      questions.push(`Why was "${snippet}" chosen?`);
    }
  }

  // 2. From real failed approaches
  if (memory?.failedApproaches && memory.failedApproaches.length > 0) {
    const failed = memory.failedApproaches[0];
    if (failed.approach) {
      const snippet = failed.approach.length > 35 ? failed.approach.slice(0, 33) + '...' : failed.approach;
      questions.push(`What failed with ${snippet} and what was the lesson?`);
    }
  }

  // 3. From real unresolved issues
  if (memory?.unresolvedIssues && memory.unresolvedIssues.length > 0) {
    const issue = memory.unresolvedIssues[0];
    if (issue.issue) {
      const snippet = issue.issue.length > 40 ? issue.issue.slice(0, 38) + '...' : issue.issue;
      questions.push(`What remains unresolved about ${snippet}?`);
    }
  }

  // 4. From conversation topics
  for (const conv of conversations) {
    if (questions.length >= 4) break;
    if (conv.topics && conv.topics.length > 0) {
      for (const topic of conv.topics) {
        if (questions.length >= 4) break;
        const candidate = `What did we discuss about ${topic}?`;
        if (!questions.includes(candidate)) {
          questions.push(candidate);
        }
      }
    } else if (conv.title && !conv.title.toLowerCase().includes('untitled')) {
      const candidate = `Summarize key decisions from "${conv.title.length > 35 ? conv.title.slice(0, 33) + '...' : conv.title}"`;
      if (!questions.includes(candidate)) {
        questions.push(candidate);
      }
    }
  }

  // 5. Fallback fallback only when conversations exist but lack structured topics
  if (questions.length === 0 && conversations.length > 0) {
    const firstTitle = conversations[0].title || 'my imported conversations';
    questions.push(`What were the main topics discussed in ${firstTitle}?`);
    questions.push(`What architectural decisions were mentioned in my history?`);
  }

  return questions.slice(0, 4);
}
