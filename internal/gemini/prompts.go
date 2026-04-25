package gemini

import (
	"fmt"
	"strings"
)

func hinglishClarification(targetLang string) string {
	if strings.EqualFold(strings.TrimSpace(targetLang), "Hinglish") {
		return " Translate into Hinglish - a natural mix of Hindi and English commonly used in informal Indian communication. Write in Roman script (Latin alphabet), not Devanagari. Example style: 'Yeh service JWT-based auth use karti hai, jo RS256 encryption ke saath kaam karta hai.'"
	}
	return ""
}

// BuildPrompt returns a fully assembled prompt based on audience × language combination.
// audience: "junior", "senior", "nontechnical"
// sameLang: true if targetLang == sourceLang (case-insensitive)
func BuildPrompt(audience, targetLang, sourceLang, content string) string {
	sameLang := strings.EqualFold(targetLang, sourceLang)
	hinglishNote := hinglishClarification(targetLang)

	switch audience {
	case "junior":
		if sameLang {
			return fmt.Sprintf(`System: You are a technical writing assistant. Rewrite the following documentation
in plain, beginner-friendly language. Explain jargon. Use short sentences.
Preserve all code blocks and inline code exactly. Return valid Markdown only.

User: %s`, content)
		}
		return fmt.Sprintf(`System: You are a technical writing assistant. First simplify the following
documentation into plain, beginner-friendly language. Then translate the result
into %s.%s Preserve all code blocks exactly. Return valid Markdown only.

User: %s`, targetLang, hinglishNote, content)

	case "senior":
		if sameLang {
			// No-op: pass content through with minimal instruction
			return fmt.Sprintf(`System: You are a technical editor. Return the following documentation
unchanged. Preserve all code blocks and inline code exactly. Return valid Markdown only.

User: %s`, content)
		}
		return fmt.Sprintf(`System: You are a technical translator. Translate the following documentation into
%s.%s Do not simplify. Do not modify any code blocks or inline code.
Preserve structure. Return valid Markdown only.

User: %s`, targetLang, hinglishNote, content)

	case "nontechnical":
		if sameLang {
			return fmt.Sprintf(`System: You are a technical communicator. Rewrite the following documentation as a
non-technical summary for a business stakeholder. Remove implementation detail.
Focus on what it does, why it matters, and how to get started. Return valid Markdown only.

User: %s`, content)
		}
		return fmt.Sprintf(`System: You are a technical communicator. Rewrite the following documentation as a
non-technical summary for a business stakeholder, then translate into %s.%s
Remove implementation detail. Return valid Markdown only.

User: %s`, targetLang, hinglishNote, content)

	default:
		// Fallback to junior same-language
		return fmt.Sprintf(`System: You are a technical writing assistant. Rewrite the following documentation
in plain, beginner-friendly language. Explain jargon. Use short sentences.
Preserve all code blocks and inline code exactly. Return valid Markdown only.

User: %s`, content)
	}
}
