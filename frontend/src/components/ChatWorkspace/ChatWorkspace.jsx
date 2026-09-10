import React from 'react';
import { useChatSession } from '../../hooks/useChatSession';
import Sidebar from './Sidebar';
import ChatView from './ChatView';
import ArtifactViewer from './ArtifactViewer';
import ErrorAlert from '../Common/ErrorAlert';

export default function ChatWorkspace() {
  const {
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
  } = useChatSession();

  const artifactCount = (artifacts.htmlCode ? 1 : 0) + (artifacts.designPlan ? 1 : 0) + (artifacts.research ? 1 : 0);

  return (
    <div className="h-screen w-screen bg-[#f0f2f5] text-slate-800 flex font-sans overflow-hidden select-none">
      {/* Global Error Alert */}
      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {/* 1. Left Sidebar: Saved Chats & New Project */}
      <Sidebar
        projects={projects}
        currentSessionId={sessionId}
        onSelectProject={loadChat}
        onNewChat={newChat}
        onDeleteProject={deleteChat}
      />

      {/* 2. Center Panel: Conversation Feed & Input */}
      <ChatView
        projectTitle={projectTitle}
        messages={messages}
        isStreaming={isStreaming}
        streamingMilestones={streamingMilestones}
        streamingText={streamingText}
        onSendMessage={sendMessage}
        onStop={stopGeneration}
        onOpenArtifact={(tab) => {
          setActiveTab(tab);
          setIsArtifactOpen(true);
        }}
        isArtifactOpen={isArtifactOpen}
        onToggleArtifact={() => setIsArtifactOpen(!isArtifactOpen)}
        artifactCount={artifactCount}
        pendingAction={pendingAction}
        chatEndRef={chatEndRef}
      />

      {/* 3. Right Panel: Artifacts Canvas (Preview, Code, Design, Research) */}
      <ArtifactViewer
        isOpen={isArtifactOpen}
        onClose={() => setIsArtifactOpen(false)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        artifacts={artifacts}
        previewKey={previewKey}
        onRefreshPreview={refreshPreview}
        sessionId={sessionId}
      />
    </div>
  );
}
