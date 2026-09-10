import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { checkBackendHealth, getApiBaseUrl } from '../lib/api';
import { BackendHealthResponse } from '../types/inspection';

export type BackendStatus = 'CONNECTING' | 'ONLINE' | 'OFFLINE';

interface BackendHealthIndicatorProps {
  /** Optional callback when status or health response changes */
  onStatusChange?: (status: BackendStatus, data?: BackendHealthResponse) => void;
  /** Whether to render in compact pill form (e.g. for header) or expanded card form */
  variant?: 'compact' | 'badge' | 'detailed';
  className?: string;
}

export const BackendHealthIndicator: React.FC<BackendHealthIndicatorProps> = ({
  onStatusChange,
  variant = 'compact',
  className = '',
}) => {
  const [status, setStatus] = useState<BackendStatus>('CONNECTING');
  const [healthData, setHealthData] = useState<BackendHealthResponse | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const mountedRef = useRef<boolean>(true);

  const runHealthCheck = useCallback(async () => {
    if (isChecking) return;
    setIsChecking(true);
    setStatus('CONNECTING');

    try {
      const data = await checkBackendHealth(4000);
      if (!mountedRef.current) return;

      setStatus('ONLINE');
      setHealthData(data);
      setLastCheckTime(new Date());
      onStatusChange?.('ONLINE', data);
    } catch {
      if (!mountedRef.current) return;

      setStatus('OFFLINE');
      setHealthData(null);
      setLastCheckTime(new Date());
      onStatusChange?.('OFFLINE');
    } finally {
      if (mountedRef.current) {
        setIsChecking(false);
      }
    }
  }, [isChecking, onStatusChange]);

  useEffect(() => {
    mountedRef.current = true;
    runHealthCheck();

    // Periodic non-intrusive background check every 45 seconds
    const interval = setInterval(() => {
      runHealthCheck();
    }, 45_000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  const baseUrl = getApiBaseUrl() || 'same-origin';

  // Format status colors and labels
  const statusConfig = {
    CONNECTING: {
      dotClass: 'bg-amber-400 animate-pulse',
      textClass: 'text-amber-600 dark:text-amber-400',
      label: 'CONNECTING',
      tooltip: `Connecting to backend at ${baseUrl}...`,
    },
    ONLINE: {
      dotClass: 'bg-emerald-500 shadow-xs shadow-emerald-500/50',
      textClass: 'text-emerald-600 dark:text-emerald-400',
      label: 'ONLINE',
      tooltip: healthData?.service
        ? `Backend Online (${healthData.service}${healthData.version ? ` v${healthData.version}` : ''})`
        : `Backend Online at ${baseUrl}`,
    },
    OFFLINE: {
      dotClass: 'bg-rose-500',
      textClass: 'text-rose-600 dark:text-rose-400',
      label: 'OFFLINE',
      tooltip: `Backend Offline at ${baseUrl} (scan will still attempt direct connection)`,
    },
  }[status];

  if (variant === 'detailed') {
    return (
      <div
        id="backend-health-detailed"
        className={`p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className={`w-3 h-3 rounded-full ${statusConfig.dotClass}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Backend Status:
              </span>
              <span className={`text-xs font-mono font-bold ${statusConfig.textClass}`}>
                {statusConfig.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              Target: {baseUrl}
              {healthData?.service && ` • ${healthData.service}`}
              {healthData?.version && ` v${healthData.version}`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={runHealthCheck}
          disabled={isChecking}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer disabled:opacity-50"
          title="Re-check backend health"
          aria-label="Re-check backend health"
        >
          <RefreshCw size={14} className={isChecking ? 'animate-spin text-teal-600' : ''} />
        </button>
      </div>
    );
  }

  // Default compact indicator for header bar or pills
  return (
    <div
      id="backend-health-indicator"
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-mono font-semibold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/90 text-slate-700 dark:text-slate-300 transition-colors select-none ${className}`}
      title={statusConfig.tooltip}
      aria-label={statusConfig.tooltip}
    >
      <Activity size={12} className="text-slate-400 shrink-0" />
      <span className={`w-2 h-2 rounded-full shrink-0 ${statusConfig.dotClass}`} />
      <span className={`${statusConfig.textClass} tracking-wide text-[10px]`}>
        {statusConfig.label}
      </span>
      <button
        type="button"
        onClick={runHealthCheck}
        disabled={isChecking}
        className="ml-0.5 p-0.5 hover:text-teal-600 transition-colors cursor-pointer text-slate-400"
        title="Refresh backend status"
        aria-label="Refresh backend status"
      >
        <RefreshCw size={10} className={isChecking ? 'animate-spin text-teal-600' : ''} />
      </button>
    </div>
  );
};
