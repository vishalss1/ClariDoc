package brief

import (
	"fmt"
	"strings"
)

// BuildAnalyzePrompt builds the gap-detection prompt and asks for JSON-only output.
func BuildAnalyzePrompt(audience, goal, doc string) string {
	return fmt.Sprintf(`System: You are a senior engineer helping a %s complete a specific task.
You will be given a goal and a doc. Identify:
1. What the doc covers that is directly relevant to the goal.
2. What is vague, missing, or assumed in the doc relative to this goal.
3. Specific files the user should provide to fill those gaps. For each file,
   state exactly why it is needed. Ask for the minimum number of files possible.
Return JSON only: {"covered":[],"gaps":[],"requested_files":[{"filename":"","reason":""}]}

User: Goal: %s

Doc:
%s`, audienceLabel(audience), goal, doc)
}

// BuildGeneratePrompt builds a briefing prompt using doc + user-provided context files.
func BuildGeneratePrompt(audience, targetLang, goal, doc string, files []ContextFile) string {
	if strings.TrimSpace(targetLang) == "" {
		targetLang = "English"
	}

	return fmt.Sprintf(`System: You are a senior engineer briefing a %s on exactly what to do.
You have their goal, the relevant doc, and the context files they provided.
Write a precise work briefing in %s:
- What they are looking at (plain terms for their level)
- What they need to implement or change, step by step
- Dependencies and gotchas to watch for
- A concrete first step
Be specific. Reference actual function names, types, and file paths from the context.
Do not pad. Do not repeat the doc back to them.

User: Goal: %s

Doc:
%s

Context:
%s`, audienceLabel(audience), targetLang, goal, doc, formatContextFiles(files))
}

func formatContextFiles(files []ContextFile) string {
	if len(files) == 0 {
		return "(No additional context files provided.)"
	}

	var b strings.Builder
	for i, file := range files {
		if i > 0 {
			b.WriteString("\n\n")
		}

		filename := strings.TrimSpace(file.Filename)
		if filename == "" {
			filename = fmt.Sprintf("context_file_%d", i+1)
		}

		b.WriteString("File: ")
		b.WriteString(filename)
		b.WriteString("\n---\n")
		b.WriteString(file.Content)
	}

	return b.String()
}

func audienceLabel(audience string) string {
	switch audience {
	case "junior":
		return "junior developer"
	case "senior":
		return "senior developer"
	case "nontechnical":
		return "non-technical stakeholder"
	default:
		return "junior developer"
	}
}
