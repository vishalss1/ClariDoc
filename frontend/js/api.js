/**
 * API module for ClariDoc backend calls
 */

const BASE_URL = '';

/**
 * POST /ingest - Upload file or paste content
 * @param {FormData} formData - FormData with file or text content
 * @returns {Promise<{content: string}>}
 */
export async function postIngest(formData) {
  const response = await fetch(`${BASE_URL}/ingest`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Ingest failed');
  }

  return response.json();
}

/**
 * GET /locale - Get supported languages list
 * @returns {Promise<{languages: string[]}>}
 */
export async function getLocale() {
  const response = await fetch(`${BASE_URL}/locale`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch languages');
  }

  return response.json();
}

/**
 * POST /transform - Stream transformed content
 * @param {Object} payload - Transform request payload
 * @param {Function} onChunk - Callback for each stream chunk
 * @param {Function} onDone - Callback when stream completes
 * @returns {Promise<void>}
 */
export async function streamTransform(payload, onChunk, onDone) {
  await streamSSE('/transform', payload, onChunk, onDone, 'Transform failed');
}

/**
 * POST /brief/analyze - Analyze gaps for a goal+doc pair
 * @param {Object} payload - Brief analyze request payload
 * @returns {Promise<{covered: string[], gaps: string[], requested_files: {filename: string, reason: string}[]}>}
 */
export async function analyzeBrief(payload) {
  const response = await fetch(`${BASE_URL}/brief/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Brief analysis failed');
  }

  return response.json();
}

/**
 * POST /brief/generate - Stream briefing markdown
 * @param {Object} payload - Brief generate request payload
 * @param {Function} onChunk - Callback for each stream chunk
 * @param {Function} onDone - Callback when stream completes
 * @returns {Promise<void>}
 */
export async function streamBrief(payload, onChunk, onDone) {
  await streamSSE('/brief/generate', payload, onChunk, onDone, 'Brief generation failed');
}

async function streamSSE(path, payload, onChunk, onDone, defaultErrorMessage) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || defaultErrorMessage);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const emitSSEEvents = (raw) => {
    // SSE events are delimited by a blank line. Support LF and CRLF.
    const normalized = raw.replace(/\r\n/g, '\n');
    const events = normalized.split('\n\n');

    // Keep the trailing partial event (if any) in the read buffer.
    buffer = events.pop() ?? '';

    for (const event of events) {
      if (!event) {
        continue;
      }

      const dataParts = [];
      const lines = event.split('\n');
      for (const line of lines) {
        if (line.startsWith('data:')) {
          // Per SSE spec, a single optional leading space after ":" is ignored.
          let data = line.slice(5);
          if (data.startsWith(' ')) {
            data = data.slice(1);
          }
          dataParts.push(data);
        }
      }

      if (dataParts.length > 0) {
        // Multiple data lines in one event are joined with "\n".
        onChunk(dataParts.join('\n'));
      }
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        if (buffer) {
          emitSSEEvents(buffer + '\n\n');
        }
        onDone();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      emitSSEEvents(buffer);
    }
  } catch (err) {
    console.error('Stream error:', err);
    throw err;
  }
}
