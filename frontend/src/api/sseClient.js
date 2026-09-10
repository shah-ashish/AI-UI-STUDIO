/**
 * Universal SSE Stream Reader supporting multiline chunks, escaped newlines, and proper event framing.
 *
 * @param {string} url - Target POST URL
 * @param {object} body - Request JSON body
 * @param {object} callbacks - { onToken, onStatus, onDone, onError }
 */
export async function consumeSSEStream(url, body, { onToken, onStatus, onDone, onError }) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    let errMessage = `Request failed with status ${response.status}`;
    try {
      const errJson = JSON.parse(errText);
      if (errJson.error) errMessage = errJson.error;
    } catch (_) {
      if (errText) errMessage = errText;
    }
    throw new Error(errMessage);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE events are framed by double newlines (\n\n or \r\n\r\n)
    const eventBlocks = buffer.split(/\r?\n\r?\n/);
    buffer = eventBlocks.pop() || ''; // Keep the last incomplete block in buffer

    for (const block of eventBlocks) {
      if (!block.trim()) continue;

      // Extract all data: lines in the event block
      const dataLines = block
        .split(/\r?\n/)
        .filter((line) => line.trim().startsWith('data:'))
        .map((line) => line.replace(/^data:\s*/, '').trim())
        .join('');

      if (!dataLines) continue;

      try {
        const event = JSON.parse(dataLines);
        if (event.type === 'token') {
          if (onToken) onToken(event.text);
        } else if (event.type === 'status' || event.type === 'tool' || event.type === 'tool_done') {
          if (onStatus) onStatus(event.message || event.query);
        } else if (event.type === 'done') {
          if (onDone) onDone(event);
        } else if (event.type === 'error') {
          if (onError) onError(new Error(event.error));
        }
      } catch (parseErr) {
        console.warn('SSE Chunk parse warning:', parseErr.message);
      }
    }
  }
}
