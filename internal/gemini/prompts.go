package gemini

import (
	"fmt"
	"strings"
)

// BuildPrompt returns a fully assembled prompt based on audience × language combination.
// audience: "junior", "senior", "nontechnical"
// sameLang: true if targetLang == sourceLang (case-insensitive)
func BuildPrompt(audience, targetLang, sourceLang, content string) string {
	sameLang := strings.EqualFold(targetLang, sourceLang)

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
into %s. Preserve all code blocks exactly. Return valid Markdown only.

User: %s`, targetLang, content)

	case "senior":
		if sameLang {
			// No-op: pass content through with minimal instruction
			return fmt.Sprintf(`System: You are a technical editor. Return the following documentation
unchanged. Preserve all code blocks and inline code exactly. Return valid Markdown only.

User: %s`, content)
		}
		return fmt.Sprintf(`System: You are a technical translator. Translate the following documentation into
%s. Do not simplify. Do not modify any code blocks or inline code.
Preserve structure. Return valid Markdown only.

User: %s`, targetLang, content)

	case "nontechnical":
		if sameLang {
			return fmt.Sprintf(`System: You are a technical communicator. Rewrite the following documentation as a
non-technical summary for a business stakeholder. Remove implementation detail.
Focus on what it does, why it matters, and how to get started. Return valid Markdown only.

User: %s`, content)
		}
		return fmt.Sprintf(`System: You are a technical communicator. Rewrite the following documentation as a
non-technical summary for a business stakeholder, then translate into %s.
Remove implementation detail. Return valid Markdown only.

User: %s`, targetLang, content)

	default:
		// Fallback to junior same-language
		return fmt.Sprintf(`System: You are a technical writing assistant. Rewrite the following documentation
in plain, beginner-friendly language. Explain jargon. Use short sentences.
Preserve all code blocks and inline code exactly. Return valid Markdown only.

User: %s`, content)
	}
}
