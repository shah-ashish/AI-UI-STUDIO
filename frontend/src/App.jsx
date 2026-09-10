import React, { useState } from 'react';
import { STEPS } from './constants/prompts';
import { usePipelineStream } from './hooks/usePipelineStream';

import Header from './components/Header/Header';
import ErrorAlert from './components/Common/ErrorAlert';
import PromptIntake from './components/PromptIntake/PromptIntake';
import ResearchStageView from './components/ResearchStage/ResearchStageView';
import DesignStageView from './components/DesignStage/DesignStageView';
import StudioView from './components/Studio/StudioView';
import ProjectHistoryDrawer from './components/ProjectHistory/ProjectHistoryDrawer';

/**
 * Determine the header status label based on current step
 */
function getStatusLabel(step, streaming) {
  if (step === STEPS.PROMPT) return 'NEURAL WORKSPACE V4.2';
  if (step === STEPS.RESEARCH_STREAM) return 'LIVE SYNTHESIS • RESEARCHING';
  if (step === STEPS.RESEARCH_REVIEW) return 'RESEARCH • VERIFICATION';
  if (step === STEPS.DESIGN_STREAM) return 'SPECIFICATION • DESIGN PLAN V1';
  if (step === STEPS.DESIGN_REVIEW) return 'DESIGN • VERIFICATION';
  if (step === STEPS.STUDIO) return streaming ? 'LIVE SYNTHESIS • CODE GEN' : 'STUDIO • LIVE PREVIEW';
  return 'NEURAL WORKSPACE V4.2';
}

export default function App() {
  const [historyOpen, setHistoryOpen] = useState(false);

  const {
    sessionId,
    step,
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
  } = usePipelineStream();

  const statusLabel = getStatusLabel(step, streaming);

  return (
    <div className="h-screen bg-[#f0f2f5] text-slate-800 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-hidden relative">
      {/* 1. Saved Projects Drawer (SQLite persistence) */}
      <ProjectHistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onLoadProject={loadProject}
        onNewProject={resetAll}
        currentProjectId={sessionId}
      />

      {/* 2. Header — hidden on prompt screen for clean fullscreen look */}
      {step !== STEPS.PROMPT && (
        <Header
          step={step}
          onReset={resetAll}
          statusLabel={statusLabel}
          onOpenHistory={() => setHistoryOpen(true)}
        />
      )}

      {/* 3. Global Error Alert */}
      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {/* 4. Dynamic Step View Router */}
      <main className="flex-1 max-w-[1400px] mx-auto w-full p-4 sm:p-6 flex flex-col min-h-0 overflow-hidden">
        {step === STEPS.PROMPT && (
          <PromptIntake
            prompt={prompt}
            setPrompt={setPrompt}
            onStartResearch={startResearch}
            streaming={streaming}
            onOpenHistory={() => setHistoryOpen(true)}
          />
        )}

        {(step === STEPS.RESEARCH_STREAM || step === STEPS.RESEARCH_REVIEW) && (
          <ResearchStageView
            step={step}
            research={research}
            streaming={streaming}
            statusMessage={statusMessage}
            streamEndRef={streamEndRef}
            onProceed={proceedToDesignPlan}
            onRefine={refineResearch}
            prompt={prompt}
            sessionId={sessionId}
          />
        )}

        {(step === STEPS.DESIGN_STREAM || step === STEPS.DESIGN_REVIEW) && (
          <DesignStageView
            step={step}
            designPlan={designPlan}
            streaming={streaming}
            statusMessage={statusMessage}
            streamEndRef={streamEndRef}
            onProceed={generateCode}
            onRefine={refineDesignPlan}
            prompt={prompt}
            sessionId={sessionId}
          />
        )}

        {step === STEPS.STUDIO && (
          <StudioView
            sessionId={sessionId}
            previewKey={previewKey}
            htmlCode={htmlCode}
            streaming={streaming}
            statusMessage={statusMessage}
            streamEndRef={streamEndRef}
            onRefineCode={refineCode}
            onRefreshPreview={refreshPreview}
          />
        )}
      </main>
    </div>
  );
}
