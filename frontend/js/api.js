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
  const response = await fetch(`${BASE_URL}/transform`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Transform failed');
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
