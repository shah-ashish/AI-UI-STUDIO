import { useState, useRef, useEffect, useCallback } from 'react';
import { API_BASE, STEPS } from '../constants/prompts';
import { consumeSSEStream } from '../api/sseClient';
import { useTokenUsage } from './useTokenUsage';

export function usePipelineStream() {
  const [sessionId, setSessionId] = useState(() => 'sess_' + Math.random().toString(36).substring(2, 9));
  const [step, setStep] = useState(STEPS.PROMPT);
  const [prompt, setPrompt] = useState('');

  // Data artifacts
  const [research, setResearch] = useState('');
  const [designPlan, setDesignPlan] = useState('');
  const [htmlCode, setHtmlCode] = useState('');
  const [previewKey, setPreviewKey] = useState(0);

  // Status & Streaming flags
  const [streaming, setStreaming] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);

  // Token tracker
  const { usage, refreshUsage, updateUsageDirectly, resetUsage } = useTokenUsage(sessionId);

  const streamEndRef = useRef(null);

  // Refresh token usage on step transitions
  useEffect(() => {
    refreshUsage();
  }, [step, refreshUsage]);

  // -------------------------------------------------------------
  // Stage 1: Discovery & Research
  // -------------------------------------------------------------
  const startResearch = useCallback(async (customPrompt) => {
    const activePrompt = (customPrompt || prompt).trim();
    if (!activePrompt) return;

    setError(null);
    setStreaming(true);
    setResearch('');
    setStep(STEPS.RESEARCH_STREAM);
    setStatusMessage('Analyzing prompt & searching live web context...');

    try {
      await consumeSSEStream(
        `${API_BASE}/research`,
        { prompt: activePrompt, sessionId },
        {
          onToken: (token) => {
            setResearch((prev) => prev + token);
          },
          onStatus: (msg) => {
            setStatusMessage(msg);
          },
          onDone: (data) => {
            setResearch(data.result);
            if (data.usage) updateUsageDirectly(data.usage);
            setStreaming(false);
            setStep(STEPS.RESEARCH_REVIEW);
          },
          onError: (err) => {
            throw err;
          },
        }
      );
    } catch (err) {
      setError(err.message);
      setStreaming(false);
      setStep(STEPS.PROMPT);
    }
  }, [prompt, sessionId, updateUsageDirectly]);

  const refineResearch = useCallback(async (feedback) => {
    if (!feedback?.trim()) return;

    setError(null);
    setStreaming(true);
    const prevResearch = research;
    setResearch('');
    setStatusMessage('Refining research with your feedback...');

    try {
      await consumeSSEStream(
        `${API_BASE}/research/refine`,
        {
          feedback,
          currentResearch: prevResearch,
          prompt,
          sessionId,
        },
        {
          onToken: (token) => {
            setResearch((prev) => prev + token);
          },
          onStatus: (msg) => {
            setStatusMessage(msg);
          },
          onDone: (data) => {
            setResearch(data.result);
            if (data.usage) updateUsageDirectly(data.usage);
            setStreaming(false);
          },
          onError: (err) => {
            throw err;
          },
        }
      );
    } catch (err) {
      setError(err.message);
      setResearch(prevResearch);
      setStreaming(false);
    }
  }, [research, prompt, sessionId, updateUsageDirectly]);

  // -------------------------------------------------------------
  // Stage 2: Web UI Design Plan
  // -------------------------------------------------------------
  const proceedToDesignPlan = useCallback(async () => {
    setError(null);
    setStreaming(true);
    setDesignPlan('');
    setStep(STEPS.DESIGN_STREAM);
    setStatusMessage('Formulating custom color palette, typography & layout blueprints...');

    try {
      await consumeSSEStream(
        `${API_BASE}/design-plan`,
        { prompt, research, sessionId },
        {
          onToken: (token) => {
            setDesignPlan((prev) => prev + token);
          },
          onStatus: (msg) => {
            setStatusMessage(msg);
          },
          onDone: (data) => {
            setDesignPlan(data.result);
            if (data.usage) updateUsageDirectly(data.usage);
            setStreaming(false);
            setStep(STEPS.DESIGN_REVIEW);
          },
          onError: (err) => {
            throw err;
          },
        }
      );
    } catch (err) {
      setError(err.message);
      setStreaming(false);
      setStep(STEPS.RESEARCH_REVIEW);
    }
  }, [prompt, research, sessionId, updateUsageDirectly]);

  const refineDesignPlan = useCallback(async (feedback) => {
    if (!feedback?.trim()) return;

    setError(null);
    setStreaming(true);
    const prevPlan = designPlan;
    setDesignPlan('');
    setStatusMessage('Revising design plan with your requested changes...');

    try {
      await consumeSSEStream(
        `${API_BASE}/design-plan/refine`,
        {
          feedback,
          currentPlan: prevPlan,
          prompt,
          research,
          sessionId,
        },
        {
          onToken: (token) => {
            setDesignPlan((prev) => prev + token);
          },
          onStatus: (msg) => {
            setStatusMessage(msg);
          },
          onDone: (data) => {
            setDesignPlan(data.result);
            if (data.usage) updateUsageDirectly(data.usage);
            setStreaming(false);
          },
          onError: (err) => {
            throw err;
          },
        }
      );
    } catch (err) {
      setError(err.message);
      setDesignPlan(prevPlan);
      setStreaming(false);
    }
  }, [designPlan, prompt, research, sessionId, updateUsageDirectly]);

  // -------------------------------------------------------------
  // Stage 3: HTML5/Tailwind Code Generator
  // -------------------------------------------------------------
  const generateCode = useCallback(async () => {
    setError(null);
    setStreaming(true);
    setHtmlCode('');
    setStep(STEPS.STUDIO);
    setStatusMessage('Generating production-ready HTML5 + Tailwind CSS code...');

    try {
      await consumeSSEStream(
        `${API_BASE}/code-gen`,
        { prompt, designPlan, research, sessionId },
        {
          onToken: (token) => {
            setHtmlCode((prev) => prev + token);
          },
          onStatus: (msg) => {
            setStatusMessage(msg);
          },
          onDone: (data) => {
            setHtmlCode(data.html);
            setPreviewKey((prev) => prev + 1);
            if (data.usage) updateUsageDirectly(data.usage);
            setStreaming(false);
          },
          onError: (err) => {
            throw err;
          },
        }
      );
    } catch (err) {
      setError(err.message);
      setStreaming(false);
      setStep(STEPS.DESIGN_REVIEW);
    }
  }, [prompt, designPlan, research, sessionId, updateUsageDirectly]);

  const refineCode = useCallback(async (feedback) => {
    if (!feedback?.trim()) return;

    setError(null);
    setStreaming(true);
    const prevCode = htmlCode;
    setHtmlCode('');
    setStatusMessage('Applying live code updates with your changes...');

    try {
      await consumeSSEStream(
        `${API_BASE}/code-gen/refine`,
        {
          feedback,
          currentCode: prevCode,
          prompt,
          designPlan,
          sessionId,
        },
        {
          onToken: (token) => {
            setHtmlCode((prev) => prev + token);
          },
          onStatus: (msg) => {
            setStatusMessage(msg);
          },
          onDone: (data) => {
            setHtmlCode(data.html);
            setPreviewKey((prev) => prev + 1);
            if (data.usage) updateUsageDirectly(data.usage);
            setStreaming(false);
          },
          onError: (err) => {
            throw err;
          },
        }
      );
    } catch (err) {
      setError(err.message);
      setHtmlCode(prevCode);
      setStreaming(false);
    }
  }, [htmlCode, prompt, designPlan, sessionId, updateUsageDirectly]);

  const refreshPreview = useCallback(() => {
    setPreviewKey((prev) => prev + 1);
  }, []);

  const loadProject = useCallback((project) => {
    if (!project) return;
    setSessionId(project.id);
    setPrompt(project.prompt || '');
    setResearch(project.research || '');
    setDesignPlan(project.design_plan || '');
    setHtmlCode(project.html_code || '');
    setError(null);
    setStatusMessage('');

    // Restore step based on project state
    if (project.html_code && project.html_code.trim().length > 0) {
      setStep(STEPS.STUDIO);
    } else if (project.design_plan && project.design_plan.trim().length > 0) {
      setStep(STEPS.DESIGN_REVIEW);
    } else if (project.research && project.research.trim().length > 0) {
      setStep(STEPS.RESEARCH_REVIEW);
    } else {
      setStep(STEPS.PROMPT);
    }

    // Restore token usage counts
    const researchUsed = project.research_tokens || 0;
    const designUsed = project.design_tokens || 0;
    const codeUsed = project.code_tokens || 0;
    updateUsageDirectly({
      research: {
        used: researchUsed,
        max: 10000,
        percentage: (researchUsed / 10000) * 100,
        remaining: Math.max(0, 10000 - researchUsed),
      },
      design: {
        used: designUsed,
        max: 10000,
        percentage: (designUsed / 10000) * 100,
        remaining: Math.max(0, 10000 - designUsed),
      },
      code: { used: codeUsed },
    });

    setPreviewKey((k) => k + 1);
  }, [updateUsageDirectly]);

  const resetAll = useCallback(async () => {
    await resetUsage();
    setSessionId('sess_' + Math.random().toString(36).substring(2, 9));
    setPrompt('');
    setResearch('');
    setDesignPlan('');
    setHtmlCode('');
    setStep(STEPS.PROMPT);
    setError(null);
    setStatusMessage('');
  }, [resetUsage]);

  return {
    sessionId,
    step,
    setStep,
    prompt,
    setPrompt,
    research,
    designPlan,
    htmlCode,
    previewKey,
    streaming,
    statusMessage,
    error,
    setError,
    usage,
    streamEndRef,
    startResearch,
    refineResearch,
    proceedToDesignPlan,
    refineDesignPlan,
    generateCode,
    refineCode,
    refreshPreview,
    resetAll,
    loadProject,
  };
}
