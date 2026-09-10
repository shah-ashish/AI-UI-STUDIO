import 'dotenv/config';

/**
 * Parses the timeout duration in seconds from .env (defaults to 180 seconds).
 */
function getTimeoutMs() {
  const timeoutSeconds = parseFloat(process.env.TIMEOUT) || 180;
  return timeoutSeconds * 1000;
}

/**
 * Internal single-attempt call with streaming and chunk decoding.
 */
async function callModelAttempt(
  prompt,
  baseUrl,
  modelName,
  systemPrompt,
  options
) {
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const timeoutMs = getTimeoutMs();
  const timeoutSeconds = timeoutMs / 1000;

  const payload = {
    model: modelName,
    prompt: prompt,
    stream: true,
  };

  if (systemPrompt) {
    payload.system = systemPrompt;
  }

  const streamToConsole = options.streamToConsole ?? true;
  const onToken = options.onToken;

  const response = await fetch(`${cleanBaseUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error (${response.status} ${response.statusText}): ${errorText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullResponse = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete trailing line

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.response) {
            fullResponse += parsed.response;
            if (onToken) {
              onToken(parsed.response);
            } else if (streamToConsole) {
              process.stdout.write(parsed.response);
            }
          }
        } catch (e) {
          // Incomplete chunk parse fallback
        }
      }
    }

    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer);
        if (parsed.response) {
          fullResponse += parsed.response;
          if (onToken) {
            onToken(parsed.response);
          } else if (streamToConsole) {
            process.stdout.write(parsed.response);
          }
        }
      } catch (e) {
        // Fallback
      }
    }

    if (streamToConsole && !onToken) {
      process.stdout.write('\n');
    }

    return fullResponse;
  } catch (streamErr) {
    // If stream terminated mid-way after already receiving a full/usable response (>500 chars), preserve it
    const isTerminated = streamErr.message && (
      streamErr.message.includes('terminated') || 
      streamErr.message.includes('premature') ||
      streamErr.message.includes('aborted')
    );

    if (fullResponse.length > 500 && isTerminated) {
      if (streamToConsole && !onToken) {
        process.stdout.write('\n');
      }
      console.warn('\n⚠️ [Model Stream Notice] Tunnel connection closed by host; preserved full output received.');
      return fullResponse;
    }

    throw streamErr;
  }
}

/**
 * Calls the AI model with automatic retry on tunnel/network disconnects.
 * 
 * @param {string} prompt - The prompt text to send to the model.
 * @param {string} [baseUrl=process.env.BASE_URL] - Base URL for the model API.
 * @param {string} [modelName=process.env.MODEL_NAME] - Model name to use.
 * @param {string} [systemPrompt=''] - Optional system prompt / instructions.
 * @param {Object} [options={}] - Streaming options ({ onToken, streamToConsole, maxRetries }).
 * @returns {Promise<string>} The generated response from the model.
 */
export async function callModel(
  prompt,
  baseUrl = process.env.BASE_URL,
  modelName = process.env.MODEL_NAME,
  systemPrompt = '',
  options = {}
) {
  if (!baseUrl) {
    throw new Error('BASE_URL is missing. Please provide it or set it in your .env file.');
  }
  if (!modelName) {
    throw new Error('MODEL_NAME is missing. Please provide it or set it in your .env file.');
  }

  const maxRetries = options.maxRetries ?? 2;
  const timeoutMs = getTimeoutMs();
  const timeoutSeconds = timeoutMs / 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callModelAttempt(prompt, baseUrl, modelName, systemPrompt, options);
    } catch (error) {
      const isRetryable = error.message && (
        error.message.includes('terminated') ||
        error.message.includes('fetch failed') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('524')
      );

      if (attempt < maxRetries && isRetryable) {
        console.warn(`\n⚠️ [Model Call] Connection reset/terminated. Retrying attempt ${attempt + 1}/${maxRetries} in 2s...`);
        await new Promise((res) => setTimeout(res, 2000));
        continue;
      }

      if (error.name === 'TimeoutError') {
        const timeoutErr = new Error(
          `Model request timed out after ${timeoutSeconds}s. You can increase TIMEOUT in your .env file.`
        );
        console.error('Error calling model:', timeoutErr.message);
        throw timeoutErr;
      }

      if (error.cause && error.cause.code === 'ENOTFOUND') {
        const tunnelErr = new Error(
          `Could not resolve host (${error.cause.hostname}). Your Cloudflare tunnel may have expired or closed. Please restart your tunnel and update BASE_URL in .env.`
        );
        console.error('Error calling model:', tunnelErr.message);
        throw tunnelErr;
      }

      console.error('Error calling model:', error.message);
      throw error;
    }
  }
}

// CLI direct test
if (process.argv[1] && process.argv[1].endsWith('model.js')) {
  const prompt = process.argv[2] || 'Hello! Introduce yourself briefly.';
  console.log(`Calling model '${process.env.MODEL_NAME}' at '${process.env.BASE_URL}' (timeout: ${getTimeoutMs() / 1000}s)...\n`);

  callModel(prompt)
    .then((reply) => {
      console.log('\n[Done]');
    })
    .catch((err) => {
      console.error('Execution failed:', err.message);
    });
}

export default { callModel };
