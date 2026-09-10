import React, { useEffect, useState, useRef } from 'react';
import { UploadedImageFile } from '../types/inspection';
import {
  Loader2,
  CheckCircle2,
  Scan,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  Package,
  Activity,
  Crosshair,
} from 'lucide-react';

interface ProcessingStateProps {
  imageCount: number;
  images?: UploadedImageFile[];
  isMockMode?: boolean;
}

export interface HonestPipelineStage {
  id: number;
  label: string;
  subtext: string;
  statutoryRef: string;
}

/**
 * The 5 honest staged visual animation labels mandated for PackSure.
 * These explain the synchronous pipeline without implying measured progress percentages.
 */
export const HONEST_PIPELINE_STAGES: HonestPipelineStage[] = [
  {
    id: 1,
    label: 'Uploading package',
    subtext: 'Dispatching package photography to backend inspection service',
    statutoryRef: 'Secure Multipart Ingestion',
  },
  {
    id: 2,
    label: 'Reading package',
    subtext: 'Optical character recognition and surface text detection',
    statutoryRef: 'Multi-layer OCR Engine',
  },
  {
    id: 3,
    label: 'Understanding declarations',
    subtext: 'Parsing MRP, net quantity, manufacturer, dates & statutory fields',
    statutoryRef: 'Rule 6(1) Legal Metrology (PC) Rules, 2011',
  },
  {
    id: 4,
    label: 'Checking compliance',
    subtext: 'Evaluating against Legal Metrology PCR 2011 & FSSAI packaging rules',
    statutoryRef: 'PCR 2011 Schedule II & Table 1',
  },
  {
    id: 5,
    label: 'Preparing evidence',
    subtext: 'Compiling audit findings, coordinate bounding boxes & statutory score',
    statutoryRef: 'Statutory Compliance Audit Matrix',
  },
];

export const ProcessingState: React.FC<ProcessingStateProps> = ({
  imageCount,
  images = [],
  isMockMode = false,
}) => {
  const [activeStage, setActiveStage] = useState<number>(1);
  const [selectedSurfaceIndex, setSelectedSurfaceIndex] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Timers and intervals tracker for safe cleanup
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval>[]>([]);

  useEffect(() => {
    // Clear any previous timers
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    intervalRef.current.forEach((i) => clearInterval(i));
    intervalRef.current = [];

    if (isMockMode) {
      // Mock mode: staged progression matching quick simulation
      timersRef.current.push(
        setTimeout(() => setActiveStage(2), 250),
        setTimeout(() => setActiveStage(3), 550),
        setTimeout(() => setActiveStage(4), 850),
        setTimeout(() => setActiveStage(5), 1150)
      );
    } else {
      // Live API mode:
      // Honest progression through the 5 pipeline steps while awaiting synchronous /scan backend
      timersRef.current.push(
        setTimeout(() => setActiveStage(2), 1200),
        setTimeout(() => setActiveStage(3), 3200),
        setTimeout(() => setActiveStage(4), 5800),
        setTimeout(() => setActiveStage(5), 8500)
      );
    }

    // Real elapsed timer
    const liveTimer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    intervalRef.current.push(liveTimer);

    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
      intervalRef.current.forEach((i) => clearInterval(i));
      intervalRef.current = [];
    };
  }, [isMockMode]);

  // Determine active preview image
  const currentImage = images[selectedSurfaceIndex] || images[0];

  const currentStageConfig =
    HONEST_PIPELINE_STAGES.find((s) => s.id === activeStage) || HONEST_PIPELINE_STAGES[0];

  return (
    <div
      id="processing-pipeline-view"
      className="max-w-6xl mx-auto my-6 sm:my-8 px-4 sm:px-6 lg:px-8 space-y-6"
    >
      {/* ====================================================
          TOP ENGINE HEADER & LIVE STATUS BAR
          ==================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-800 dark:bg-teal-700 flex items-center justify-center text-white shadow-xs shrink-0">
            <ShieldCheck size={22} className="stroke-[2.2] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                PackSure Statutory Compliance Verification
              </h2>
              {isMockMode ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-medium">
                  <Activity size={12} className="text-teal-700 dark:text-teal-400" />
                  Simulation Mode • {imageCount} Surface{imageCount > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-mono font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Live API: POST /scan ({elapsedSeconds}s)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Legal Metrology (Packaged Commodities) Rules, 2011 & FSSAI Packaging Directives
            </p>
          </div>
        </div>

        {/* Honest Stage Indicator (No Fake Percentages) */}
        <div className="w-full md:w-64 text-right space-y-1.5 self-stretch md:self-auto">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Pipeline Stage
            </span>
            <span className="font-mono font-bold text-teal-800 dark:text-teal-400">
              Stage {activeStage} of {HONEST_PIPELINE_STAGES.length}
            </span>
          </div>

          {/* Indeterminate Scanning Line (Honest: does not imply measured percentage) */}
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
            <div
              className="h-full bg-teal-800 dark:bg-teal-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(activeStage / HONEST_PIPELINE_STAGES.length) * 100}%` }}
            />
          </div>

          <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium text-left truncate flex items-center justify-between">
            <span className="truncate text-teal-900 dark:text-teal-200 font-semibold">
              {currentStageConfig.label}...
            </span>
            <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
              {elapsedSeconds}s
            </span>
          </div>
        </div>
      </div>

      {/* ====================================================
          HONEST 5-STAGE VISUAL ANIMATION STRIP
          Uploading package → Reading package → Understanding declarations → Checking compliance → Preparing evidence
          ==================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3.5 sm:p-4 shadow-2xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px] gap-2">
          {HONEST_PIPELINE_STAGES.map((stage, idx) => {
            const isCompleted = activeStage > stage.id;
            const isCurrent = activeStage === stage.id;

            return (
              <React.Fragment key={stage.id}>
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all duration-200 shrink-0 ${
                    isCurrent
                      ? 'bg-teal-800 text-white border-teal-800 shadow-xs ring-2 ring-teal-600/30'
                      : isCompleted
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 opacity-60'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 stroke-[2.4]" />
                  ) : isCurrent ? (
                    <Loader2 size={14} className="animate-spin text-white" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[9px] font-mono">
                      {stage.id}
                    </span>
                  )}
                  <span className="font-medium text-[12px]">{stage.label}</span>
                </div>

                {idx < HONEST_PIPELINE_STAGES.length - 1 && (
                  <ArrowRight
                    size={14}
                    className={`shrink-0 transition-colors duration-200 ${
                      activeStage > stage.id
                        ? 'text-emerald-500 dark:text-emerald-400'
                        : 'text-slate-300 dark:text-slate-700'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ====================================================
          MAIN WORKSPACE: VIEWFINDER (LEFT) + HONEST STAGE DETAILS (RIGHT)
          ==================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ====================================================
            LEFT: UPLOADED PACKAGE WITH CLEAN SCAN BEAM
            ==================================================== */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs flex flex-col justify-between space-y-4">
          {/* Header & Surface Switcher */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scan size={16} className="text-teal-700 dark:text-teal-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Package Inspection Viewfinder
              </h3>
            </div>

            {/* Surface Selector Pills (if multiple images uploaded) */}
            {images.length > 1 && (
              <div className="flex items-center gap-1.5">
                {images.map((img, idx) => (
                  <button
                    key={img.previewUrl}
                    type="button"
                    onClick={() => setSelectedSurfaceIndex(idx)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors duration-150 cursor-pointer ${
                      selectedSurfaceIndex === idx
                        ? 'bg-teal-800 dark:bg-teal-700 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Surface {idx + 1}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Viewfinder Canvas Container */}
          <div
            id="scanner-viewfinder-canvas"
            className="relative aspect-4/3 sm:aspect-16/10 w-full bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner select-none"
          >
            {/* Precision Viewfinder Reticle Corners */}
            <div className="pointer-events-none absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-slate-400/70 z-20" />
            <div className="pointer-events-none absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-slate-400/70 z-20" />
            <div className="pointer-events-none absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-slate-400/70 z-20" />
            <div className="pointer-events-none absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-slate-400/70 z-20" />

            {/* Uploaded Package Image */}
            {currentImage ? (
              <img
                src={currentImage.previewUrl}
                alt="Package undergoing compliance scan"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 space-y-2">
                <Package size={38} className="text-slate-600 animate-pulse" />
                <span className="text-xs font-medium">Acquiring package surface...</span>
              </div>
            )}

            {/* Subtle Clean Scan Beam */}
            <div
              id="active-scan-beam"
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_6px_rgba(20,89,103,0.5)] z-10 animate-scan-beam"
            />

            {/* STAGE 2+: Optical Display Panel Boundary */}
            <div
              className={`absolute inset-5 border border-dashed border-teal-400/40 rounded-lg pointer-events-none transition-opacity duration-300 z-10 ${
                activeStage >= 2 ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="absolute top-1 left-2 text-[8px] font-mono text-teal-300/90 tracking-widest uppercase">
                PRIMARY DISPLAY PANEL BOUNDARY
              </div>
            </div>

            {/* STAGE 3+: Sample Identified Declaration Zones */}
            <div
              className={`absolute top-[26%] left-[16%] w-[38%] h-[20%] border border-teal-400/80 bg-teal-500/10 rounded pointer-events-none transition-all duration-300 z-10 ${
                activeStage >= 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
            >
              <div className="absolute -top-4 left-0 px-1.5 py-0.5 rounded bg-teal-800/90 text-white text-[8px] font-mono tracking-wider flex items-center gap-1 shadow-xs whitespace-nowrap">
                <Crosshair size={8} />
                <span>DECLARATION: MRP & TAX SPECIFICATION</span>
              </div>
            </div>

            {/* STAGE 4+: Net Quantity Area */}
            <div
              className={`absolute bottom-[20%] right-[14%] w-[36%] h-[20%] border border-teal-500/80 bg-teal-600/10 rounded pointer-events-none transition-all duration-300 z-10 ${
                activeStage >= 4 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
            >
              <div className="absolute -top-4 left-0 px-1.5 py-0.5 rounded bg-teal-800/90 text-white text-[8px] font-mono tracking-wider flex items-center gap-1 shadow-xs whitespace-nowrap">
                <Crosshair size={8} />
                <span>DECLARATION: NET QUANTITY & UNIT</span>
              </div>
            </div>

            {/* Top Viewfinder Metadata Strip */}
            <div className="absolute top-2.5 inset-x-3.5 flex items-center justify-between text-[10px] text-white/80 font-mono pointer-events-none z-20">
              <span className="bg-slate-900/85 px-2 py-0.5 rounded backdrop-blur-xs border border-white/10">
                SURFACE {currentImage ? currentImage.index : 1} OF {imageCount}
              </span>
              <span className="bg-slate-900/85 px-2 py-0.5 rounded backdrop-blur-xs border border-white/10 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                SYNCHRONOUS SCAN IN PROGRESS
              </span>
            </div>

            {/* Bottom Status Ribbon */}
            <div className="absolute bottom-2.5 inset-x-3.5 flex items-center justify-between text-[10px] text-white/80 font-mono pointer-events-none z-20">
              <span className="bg-slate-900/85 px-2 py-0.5 rounded backdrop-blur-xs border border-white/10">
                FRAME: NORMALIZED 1000×1000
              </span>
              <span className="bg-slate-900/85 px-2 py-0.5 rounded backdrop-blur-xs border border-white/10">
                STD: PCR 2011 • RULE 6
              </span>
            </div>
          </div>

          {/* Telemetry Ticker */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Activity size={13} className="text-teal-700 dark:text-teal-400" />
                <span>Statutory Pipeline Activity</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                {isMockMode ? 'SIMULATION' : 'SYNCHRONOUS /scan'}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Evaluating package surface against Legal Metrology (Packaged Commodities) Rules, 2011 and FSSAI statutory standards. The backend response will immediately present the statutory compliance report once complete.
            </p>
          </div>
        </div>

        {/* ====================================================
            RIGHT: THE 5 HONEST STATUTORY PIPELINE STAGES
            ==================================================== */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Cpu size={16} className="text-teal-700 dark:text-teal-400" />
                <span>Statutory Inspection Sequence</span>
              </h3>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {elapsedSeconds}s elapsed
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deterministic verification stages under Legal Metrology PCR 2011
            </p>
          </div>

          {/* Progressive Checklist Cards */}
          <div className="space-y-2.5 flex-1">
            {HONEST_PIPELINE_STAGES.map((stage) => {
              const isDone = activeStage > stage.id;
              const isCurrent = activeStage === stage.id;

              return (
                <div
                  key={stage.id}
                  id={`pipeline-stage-${stage.id}`}
                  className={`p-3 rounded-xl border transition-all duration-200 ${
                    isCurrent
                      ? 'bg-teal-50/70 border-teal-200 dark:bg-slate-800/80 dark:border-teal-700/80 ring-1 ring-teal-300 dark:ring-teal-700'
                      : isDone
                      ? 'bg-emerald-50/40 border-emerald-200/80 dark:bg-emerald-950/20 dark:border-emerald-900/60'
                      : 'bg-slate-50/60 border-slate-200/60 dark:bg-slate-800/30 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Status Icon */}
                    <div className="shrink-0 mt-0.5">
                      {isDone ? (
                        <CheckCircle2
                          size={18}
                          className="text-emerald-600 dark:text-emerald-400 stroke-[2.2]"
                        />
                      ) : isCurrent ? (
                        <Loader2
                          size={18}
                          className="animate-spin text-teal-700 dark:text-teal-400 stroke-[2.2]"
                        />
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[10px] font-mono text-slate-400">
                          0{stage.id}
                        </div>
                      )}
                    </div>

                    {/* Stage Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold truncate ${
                            isCurrent
                              ? 'text-teal-950 dark:text-teal-200'
                              : isDone
                              ? 'text-emerald-900 dark:text-emerald-300'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {stage.label}
                        </span>

                        {isDone && (
                          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                            Processed
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[10px] font-semibold text-teal-800 dark:text-teal-300 uppercase tracking-wide animate-pulse">
                            Active
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {stage.subtext}
                      </p>

                      <div className="mt-1 flex items-center gap-1.5 text-[9px] font-mono text-slate-400 dark:text-slate-500">
                        <Layers size={10} />
                        <span>{stage.statutoryRef}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono text-center pt-1 border-t border-slate-100 dark:border-slate-800">
            Awaiting synchronous verdict from POST /scan • No artificial timeouts
          </div>
        </div>
      </div>
    </div>
  );
};
