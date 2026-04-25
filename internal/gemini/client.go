package gemini

import (
	"context"
	"fmt"
	"io"

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
