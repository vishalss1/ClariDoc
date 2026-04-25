package brief

import (
	"strings"
	"testing"
)

func TestBuildAnalyzePromptIncludesJSONContract(t *testing.T) {
	prompt := BuildAnalyzePrompt("junior", "Add new payment provider", "# Checkout")

	if !strings.Contains(prompt, "Return JSON only") {
		t.Fatalf("expected JSON-only instruction in prompt")
	}
	if !strings.Contains(prompt, "Goal: Add new payment provider") {
		t.Fatalf("expected goal in prompt")
	}
	if !strings.Contains(prompt, "Doc:\n# Checkout") {
		t.Fatalf("expected doc in prompt")
	}
}

func TestBuildGeneratePromptIncludesContextFiles(t *testing.T) {
	files := []ContextFile{
		{Filename: "internal/payment/gateway.go", Content: "type PaymentGateway interface{}"},
		{Filename: "internal/checkout/service.go", Content: "func Process() {}"},
	}

	prompt := BuildGeneratePrompt("junior", "English", "Add provider", "# Checkout", files)

	if !strings.Contains(prompt, "File: internal/payment/gateway.go") {
		t.Fatalf("expected first context file name")
	}
	if !strings.Contains(prompt, "type PaymentGateway interface{}") {
		t.Fatalf("expected first context file content")
	}
	if !strings.Contains(prompt, "File: internal/checkout/service.go") {
		t.Fatalf("expected second context file name")
	}
}

func TestBuildGeneratePromptWithNoFiles(t *testing.T) {
	prompt := BuildGeneratePrompt("senior", "English", "Goal", "Doc", nil)
	if !strings.Contains(prompt, "(No additional context files provided.)") {
		t.Fatalf("expected fallback text for empty context files")
	}
}
