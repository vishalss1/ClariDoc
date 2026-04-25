package gemini

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"google.golang.org/genai"
)

type Client struct {
	provider     string
	geminiClient *genai.Client
	groqAPIKey   string
	httpClient   *http.Client
}

// NewClient initializes an AI client for provider "gemini" or "groq".
// Provider defaults to gemini when empty.
func NewClient(ctx context.Context, provider, geminiAPIKey, groqAPIKey string) (*Client, error) {
	provider = strings.ToLower(strings.TrimSpace(provider))
	if provider == "" {
		provider = "gemini"
	}

	c := &Client{
		provider: provider,
		httpClient: &http.Client{
			Timeout: 70 * time.Second,
		},
	}

	switch provider {
	case "gemini":
		config := &genai.ClientConfig{
			APIKey:  geminiAPIKey,
			Backend: genai.BackendGeminiAPI,
		}
		client, err := genai.NewClient(ctx, config)
		if err != nil {
			return nil, fmt.Errorf("failed to create gemini client: %w", err)
		}
		c.geminiClient = client
	case "groq":
		if strings.TrimSpace(groqAPIKey) == "" {
			return nil, fmt.Errorf("GROQ_API_KEY is required when PROVIDER=groq")
		}
		c.groqAPIKey = groqAPIKey
	default:
		return nil, fmt.Errorf("unsupported provider %q (use gemini or groq)", provider)
	}

	return c, nil
}

// StreamTransform calls Gemini 2.0 Flash and streams response chunks to w.
func (c *Client) StreamTransform(ctx context.Context, prompt string, w io.Writer, flusher http.Flusher) error {
	if c.provider == "groq" {
		return c.streamGroqTransform(ctx, prompt, w, flusher)
	}

	model := "gemini-2.5-flash"
	contents := []*genai.Content{{
		Parts: []*genai.Part{{Text: prompt}},
	}}

	resp := c.geminiClient.Models.GenerateContentStream(ctx, model, contents, nil)

	for chunk, err := range resp {
		if err != nil {
			return fmt.Errorf("stream chunk: %w", err)
		}
		if len(chunk.Candidates) > 0 && len(chunk.Candidates[0].Content.Parts) > 0 {
			text := chunk.Candidates[0].Content.Parts[0].Text
			if _, err := w.Write([]byte(text)); err != nil {
				return err
			}
			flusher.Flush()
		}
	}

	return nil
}

// GenerateText calls Gemini with a single prompt and returns the full text output.
func (c *Client) GenerateText(ctx context.Context, prompt string) (string, error) {
	if c.provider == "groq" {
		return c.generateGroqText(ctx, prompt)
	}

	model := "gemini-2.5-flash"
	contents := []*genai.Content{{
		Parts: []*genai.Part{{Text: prompt}},
	}}

	resp, err := c.geminiClient.Models.GenerateContent(ctx, model, contents, nil)
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

func (c *Client) generateGroqText(ctx context.Context, prompt string) (string, error) {
	reqBody := groqChatRequest{
		Model: "llama-3.3-70b-versatile",
		Messages: []groqMessage{
			{
				Role:    "user",
				Content: prompt,
			},
		},
		Temperature: 0.2,
		Stream:      false,
	}

	raw, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("marshal groq request: %w", err)
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		"https://api.groq.com/openai/v1/chat/completions",
		bytes.NewReader(raw),
	)
	if err != nil {
		return "", fmt.Errorf("build groq request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.groqAPIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("groq request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("groq error status=%d body=%s", resp.StatusCode, string(body))
		return "", fmt.Errorf("groq api error: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read groq response: %w", err)
	}

	var parsed groqChatResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", fmt.Errorf("parse groq response: %w", err)
	}
	if len(parsed.Choices) == 0 {
		return "", fmt.Errorf("groq returned no choices")
	}

	text := strings.TrimSpace(parsed.Choices[0].Message.Content)
	if text == "" {
		return "", fmt.Errorf("groq returned empty text")
	}
	return text, nil
}

func (c *Client) streamGroqTransform(ctx context.Context, prompt string, w io.Writer, flusher http.Flusher) error {
	log.Printf("groq StreamTransform called, prompt length=%d", len(prompt))

	reqBody := groqChatRequest{
		Model: "llama-3.3-70b-versatile",
		Messages: []groqMessage{
			{
				Role:    "user",
				Content: prompt,
			},
		},
		Temperature: 0.2,
		Stream:      true,
	}

	raw, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("marshal groq request: %w", err)
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		"https://api.groq.com/openai/v1/chat/completions",
		bytes.NewReader(raw),
	)
	if err != nil {
		return fmt.Errorf("build groq request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.groqAPIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("groq request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("groq error status=%d body=%s", resp.StatusCode, string(body))
		return fmt.Errorf("groq api error: %d", resp.StatusCode)
	}

	reader := bufio.NewReader(resp.Body)
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if err == io.EOF {
				return nil
			}
			return fmt.Errorf("read groq stream: %w", err)
		}

		line = strings.TrimSpace(line)
		if line == "" || !strings.HasPrefix(line, "data:") {
			continue
		}

		data := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if data == "[DONE]" {
			return nil
		}

		var chunk groqStreamChunkResponse
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			return fmt.Errorf("parse groq stream chunk: %w", err)
		}
		if len(chunk.Choices) == 0 {
			continue
		}

		text := chunk.Choices[0].Delta.Content
		if text == "" {
			continue
		}

		if _, err := w.Write([]byte(text)); err != nil {
			return err
		}
		flusher.Flush()
	}
}

type groqChatRequest struct {
	Model       string        `json:"model"`
	Messages    []groqMessage `json:"messages"`
	Temperature float64       `json:"temperature,omitempty"`
	Stream      bool          `json:"stream"`
}

type groqMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type groqChatResponse struct {
	Choices []struct {
		Message groqMessage `json:"message"`
	} `json:"choices"`
}

type groqStreamChunkResponse struct {
	Choices []struct {
		Delta struct {
			Content string `json:"content"`
		} `json:"delta"`
	} `json:"choices"`
}
