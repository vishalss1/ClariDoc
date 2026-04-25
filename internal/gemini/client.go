package gemini

import (
	"context"
	"fmt"
	"io"
	"strings"

	"google.golang.org/genai"
)

type Client struct {
	client *genai.Client
}

// NewClient initializes a Gemini API client.
func NewClient(ctx context.Context, apiKey string) (*Client, error) {
	config := &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	}
	client, err := genai.NewClient(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create gemini client: %w", err)
	}
	return &Client{client: client}, nil
}

// StreamTransform calls Gemini 2.0 Flash and streams response chunks to w.
func (c *Client) StreamTransform(ctx context.Context, prompt string, w io.Writer) error {
	model := "gemini-2.5-flash"
	contents := []*genai.Content{{
		Parts: []*genai.Part{{Text: prompt}},
	}}

	resp := c.client.Models.GenerateContentStream(ctx, model, contents, nil)

	for chunk, err := range resp {
		if err != nil {
			return fmt.Errorf("stream chunk: %w", err)
		}
		if len(chunk.Candidates) > 0 && len(chunk.Candidates[0].Content.Parts) > 0 {
			text := chunk.Candidates[0].Content.Parts[0].Text
			if _, err := w.Write([]byte(text)); err != nil {
				return err
			}
		}
	}

	return nil
}

// GenerateText calls Gemini with a single prompt and returns the full text output.
func (c *Client) GenerateText(ctx context.Context, prompt string) (string, error) {
	model := "gemini-2.5-flash"
	contents := []*genai.Content{{
		Parts: []*genai.Part{{Text: prompt}},
	}}

	resp, err := c.client.Models.GenerateContent(ctx, model, contents, nil)
	if err != nil {
		return "", fmt.Errorf("generate content: %w", err)
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return "", fmt.Errorf("empty model response")
	}

	var out strings.Builder
	for _, part := range resp.Candidates[0].Content.Parts {
		if part != nil && part.Text != "" {
			out.WriteString(part.Text)
		}
	}

	text := strings.TrimSpace(out.String())
	if text == "" {
		return "", fmt.Errorf("empty model text")
	}

	return text, nil
}
