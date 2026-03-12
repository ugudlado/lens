import type { ConfigSnapshot, Suggestion } from "@lens/schema";
import { SuggestionCategory } from "@lens/schema";
import { healthRules } from "./health-rules.js";
import { bestPracticeRules } from "./best-practice-rules.js";
import { contextualRules } from "./contextual-rules.js";

export function getSuggestions(config: ConfigSnapshot): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Run health rules first
  for (const rule of healthRules) {
    try {
      suggestions.push(...rule(config));
    } catch (err) {
      console.error("[suggestions] health rule failed:", err);
    }
  }

  // Run best-practice rules
  for (const rule of bestPracticeRules) {
    try {
      suggestions.push(...rule(config));
    } catch (err) {
      console.error("[suggestions] best-practice rule failed:", err);
    }
  }

  // Collect health navSections to suppress overlapping contextual suggestions
  const healthNavSections = new Set(
    suggestions
      .filter((s) => s.category === SuggestionCategory.Health)
      .map((s) => s.navSection),
  );

  // Run contextual rules, suppressing those that duplicate health navSections
  for (const rule of contextualRules) {
    try {
      const results = rule(config);
      for (const suggestion of results) {
        if (!healthNavSections.has(suggestion.navSection)) {
          suggestions.push(suggestion);
        }
      }
    } catch (err) {
      console.error("[suggestions] contextual rule failed:", err);
    }
  }

  return suggestions;
}
