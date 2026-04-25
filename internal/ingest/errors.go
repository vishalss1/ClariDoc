package ingest

import "errors"

// ErrUnsupportedFormat is returned when an uploaded file has an unsupported extension.
var ErrUnsupportedFormat = errors.New("unsupported file format: only .md and .txt files are accepted")
