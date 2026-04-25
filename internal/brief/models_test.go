package brief

import "testing"

func TestBriefAnalyzeRequestValidate(t *testing.T) {
	req := BriefAnalyzeRequest{
		Goal:     "Implement payments",
		Audience: "junior",
		Doc:      "# Payments",
	}
	if err := req.Validate(); err != nil {
		t.Fatalf("expected valid request, got error: %v", err)
	}
}

func TestBriefGenerateRequestValidateRejectsBadAudience(t *testing.T) {
	req := BriefGenerateRequest{
		Goal:     "Implement payments",
		Audience: "student",
		Doc:      "# Payments",
	}
	if err := req.Validate(); err == nil {
		t.Fatalf("expected validation error for invalid audience")
	}
}
