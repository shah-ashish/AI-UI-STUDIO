import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE } from '../constants/prompts';
import { consumeSSEStream } from '../api/sseClient';
import { fetchProjects, fetchProjectById, deleteProjectApi } from '../api/studioApi';

export function useChatSession() {
  const [sessionId, setSessionId] = useState(() => `proj_${Date.now()}`);
  const [projectTitle, setProjectTitle] = useState('New UI Project');
  const [projects, setProjects] = useState([]);
  const [messages, setMessages] = useState([]);
  const [artifacts, setArtifacts] = useState({
    research: '',
    designPlan: '',
    htmlCode: '',
    previewUrl: '',
  });

  const [activeTab, setActiveTab] = useState('preview');
  const [isArtifactOpen, setIsArtifactOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMilestones, setStreamingMilestones] = useState([]);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState(null);
  const [previewKey, setPreviewKey] = useState(Date.now());
  const [pendingAction, setPendingAction] = useState(null);

  const chatEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Auto-scroll chat feed on new message or stream tokens
  const scrollToBottom = useCallback(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, streamingMilestones, scrollToBottom]);

  // Load project list on mount
  const refreshProjectsList = useCallback(async () => {
    const list = await fetchProjects();
    setProjects(list);
  }, []);

  useEffect(() => {
    refreshProjectsList();
  }, [refreshProjectsList]);

  // Select and load a project from SQLite
  const loadChat = useCallback(async (id) => {
    try {
      const proj = await fetchProjectById(id);
      if (!proj) return;

      setSessionId(proj.id);
      setProjectTitle(proj.title || 'Untitled Project');
      setArtifacts({
        research: proj.research || '',
        designPlan: proj.design_plan || '',
        htmlCode: proj.html_code || '',
        previewUrl: proj.html_code ? `${API_BASE}/preview/${proj.id}?t=${Date.now()}` : '',
      });

      // Fetch messages
      const res = await fetch(`${API_BASE}/projects/${id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      } else {
        setMessages(proj.messages || []);
      }

      if (proj.html_code) {
        setActiveTab('preview');
        setIsArtifactOpen(true);
      } else if (proj.design_plan) {
        setActiveTab('design');
        setIsArtifactOpen(true);
      } else if (proj.research) {
        setActiveTab('research');
        setIsArtifactOpen(true);
      } else {
        setIsArtifactOpen(false);
      }

      setPreviewKey(Date.now());
      setError(null);
    } catch (err) {
      console.error('Error loading chat:', err);
      setError(err.message);
    }
  }, []);

  // Start fresh chat
  const newChat = useCallback(() => {
    const newId = `proj_${Date.now()}`;
    setSessionId(newId);
    setProjectTitle('New UI Project');
    setMessages([]);
    setArtifacts({
      research: '',
      designPlan: '',
      htmlCode: '',
      previewUrl: '',
    });
    setActiveTab('preview');
    setIsArtifactOpen(false);
    setIsStreaming(false);
    setStreamingMilestones([]);
    setStreamingText('');
    setPendingAction(null);
    setError(null);
  }, []);

  // Delete chat
  const deleteChat = useCallback(
    async (id, e) => {
      if (e) e.stopPropagation();
      const confirmed = window.confirm('Delete this project and chat history?');
      if (!confirmed) return;

      await deleteProjectApi(id);
      await refreshProjectsList();
      if (sessionId === id) {
        newChat();
      }
    },
    [sessionId, refreshProjectsList, newChat]
  );

  // Send message and stream background execution milestones + artifacts
  const sendMessage = useCallback(
    async (text) => {
      if (!text || !text.trim() || isStreaming) return;
      const cleanText = text.trim();

      setError(null);
      setPendingAction(null);

      // Optimistic user message
      const userMsg = {
        id: `temp_user_${Date.now()}`,
        role: 'user',
        content: cleanText,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setStreamingMilestones([]);
      setStreamingText('');

      // Create new AbortController for this turn
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        await consumeSSEStream(
          `${API_BASE}/chat`,
          { sessionId, message: cleanText },
          {
            signal: controller.signal,
            onMilestone: (milestone, allMilestones) => {
              setStreamingMilestones(allMilestones || []);
            },
            onArtifact: (artifact) => {
              if (artifact.key === 'research') {
                setArtifacts((prev) => ({ ...prev, research: artifact.content }));
                setActiveTab('research');
                setIsArtifactOpen(true);
              } else if (artifact.key === 'design') {
                setArtifacts((prev) => ({ ...prev, designPlan: artifact.content }));
                setActiveTab('design');
                setIsArtifactOpen(true);
              } else if (artifact.key === 'code') {
                setArtifacts((prev) => ({
                  ...prev,
                  htmlCode: artifact.content,
                  previewUrl: `${API_BASE}/preview/${sessionId}?t=${Date.now()}`,
                }));
                setActiveTab('preview');
                setIsArtifactOpen(true);
                setPreviewKey(Date.now());
              }
            },
            onToken: (token, stage) => {
              setStreamingText((prev) => prev + token);
              if (stage === 'code' || stage === 'code_refine') {
                setArtifacts((prev) => ({
                  ...prev,
                  htmlCode: (prev.htmlCode || '') + token,
                }));
              }
            },
            onDone: async (event) => {
              setIsStreaming(false);
              setStreamingMilestones([]);
              setStreamingText('');
              abortControllerRef.current = null;
              if (event?.actionRequired) {
                setPendingAction(event.actionRequired);
              } else {
                setPendingAction(null);
              }
              await refreshProjectsList();

              // Fetch updated messages
              try {
                const res = await fetch(`${API_BASE}/projects/${sessionId}/messages`);
                if (res.ok) {
                  const data = await res.json();
                  setMessages(data.messages || []);
                }
              } catch (_) {}

              // Fetch updated project details
              const proj = await fetchProjectById(sessionId);
              if (proj) {
                setProjectTitle(proj.title || 'Untitled Project');
                setArtifacts({
                  research: proj.research || '',
                  designPlan: proj.design_plan || '',
                  htmlCode: proj.html_code || '',
                  previewUrl: proj.html_code ? `${API_BASE}/preview/${sessionId}?t=${Date.now()}` : '',
                });
              }
            },
            onError: (err) => {
              if (controller.signal.aborted) {
                console.log('Stream aborted by user.');
              } else {
                console.error('Chat stream error:', err);
                setError(err.message || 'Error occurred during generation.');
              }
              setIsStreaming(false);
              abortControllerRef.current = null;
            },
          }
        );
      } catch (err) {
        if (controller.signal.aborted) {
          console.log('Stream request cancelled.');
        } else {
          console.error('Send message failed:', err);
          setError(err.message);
        }
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [sessionId, isStreaming, refreshProjectsList]
  );

  // Stop / abort running model execution
  const stopGeneration = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setIsStreaming(false);
    setStreamingMilestones([]);
    setStreamingText('');

    try {
      await fetch(`${API_BASE}/chat/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    } catch (_) {}

    // Refresh messages from server after cancellation
    setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/projects/${sessionId}/messages`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (_) {}
    }, 300);
  }, [sessionId]);

  const refreshPreview = useCallback(() => {
    setPreviewKey(Date.now());
  }, []);

  return {
    sessionId,
    projectTitle,
    projects,
    messages,
    artifacts,
    activeTab,
    setActiveTab,
    isArtifactOpen,
    setIsArtifactOpen,
    isStreaming,
    streamingMilestones,
    streamingText,
    error,
    setError,
    previewKey,
    pendingAction,
    chatEndRef,
    sendMessage,
    stopGeneration,
    loadChat,
    newChat,
    deleteChat,
    refreshPreview,
    refreshProjectsList,
  };
}
