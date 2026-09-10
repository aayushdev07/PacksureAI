import React, { useRef, useState, useEffect } from 'react';
import { createSamplePackageFiles } from '../utils/sampleImages';
import {
  UploadCloud,
  FolderOpen,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  FileImage,
  Camera,
  X,
  RefreshCw,
  VideoOff,
} from 'lucide-react';

interface UploadZoneProps {
  onImagesSelected: (files: File[]) => void;
  currentCount: number;
  maxImages?: number;
  disabled?: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onImagesSelected,
  currentCount,
  maxImages = 3,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraFallbackInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  // Camera modal state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const remainingSlots = Math.max(0, maxImages - currentCount);

  // Stop camera tracks cleanly
  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [cameraStream]);

  const validateAndAddFiles = (fileList: FileList | File[]) => {
    setValidationError(null);
    const filesArray = Array.from(fileList);

    if (filesArray.length === 0) return;

    // Check count limit
    if (filesArray.length > remainingSlots) {
      setValidationError(
        `Maximum 3 images allowed per inspection. You currently have ${currentCount} and can add ${remainingSlots} more.`
      );
      return;
    }

    // Check empty files
    const emptyFile = filesArray.find((f) => f.size === 0);
    if (emptyFile) {
      setValidationError(`The file "${emptyFile.name}" is empty (0 bytes). Please upload a valid package photograph.`);
      return;
    }

    // Supported formats check: JPG, JPEG, PNG, WEBP
    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFile = filesArray.find((f) => {
      const isExtValid = /\.(jpe?g|png|webp)$/i.test(f.name);
      return !validMimes.includes(f.type.toLowerCase()) && !isExtValid;
    });

    if (invalidFile) {
      setValidationError(
        `Unsupported file format for "${invalidFile.name}". Only JPG, JPEG, PNG, and WEBP images are supported.`
      );
      return;
    }

    onImagesSelected(filesArray);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || remainingSlots === 0) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || remainingSlots === 0) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleLoadSample = async () => {
    try {
      setIsLoadingSample(true);
      setValidationError(null);
      const sampleFiles = await createSamplePackageFiles();
      onImagesSelected(sampleFiles);
    } catch {
      setValidationError('Failed to generate sample package images.');
    } finally {
      setIsLoadingSample(false);
    }
  };

  // Start live webcam / mobile camera
  const handleStartCamera = async () => {
    if (disabled || remainingSlots === 0) return;
    setValidationError(null);
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Fallback directly to native camera input
      cameraFallbackInputRef.current?.click();
      return;
    }

    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: unknown) {
      console.warn('Direct camera stream inaccessible, using fallback camera input:', err);
      setIsCameraActive(false);
      // Seamlessly trigger standard mobile camera input
      cameraFallbackInputRef.current?.click();
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const filename = `camera_surface_${Date.now()}.jpg`;
          const cameraFile = new File([blob], filename, { type: 'image/jpeg' });
          validateAndAddFiles([cameraFile]);
        }
        handleCloseCamera();
      },
      'image/jpeg',
      0.95
    );
  };

  const handleCloseCamera = () => {
    stopCameraStream();
    setIsCameraActive(false);
    setCameraError(null);
  };

  return (
    <div id="upload-zone-container" className="space-y-3">
      {/* Fallback camera file input for devices where getUserMedia isn't directly usable */}
      <input
        ref={cameraFallbackInputRef}
        type="file"
        id="camera-fallback-input"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Standard multi-file input */}
      <input
        ref={fileInputRef}
        type="file"
        id="package-file-input"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        multiple
        disabled={disabled || remainingSlots === 0}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drag & Drop Area */}
      <div
        id="drop-zone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center transition-all ${
          disabled || remainingSlots === 0
            ? 'border-slate-200 bg-slate-50/70 cursor-not-allowed dark:bg-slate-900/50 dark:border-slate-800'
            : isDragOver
            ? 'border-teal-700 bg-teal-50/80 scale-[1.01] shadow-md dark:bg-teal-950/40 ring-4 ring-teal-100 dark:ring-teal-900/40'
            : validationError
            ? 'border-rose-300 bg-rose-50/30 hover:border-rose-400 dark:border-rose-800 dark:bg-rose-950/20'
            : 'border-slate-300 bg-white hover:bg-slate-50/70 hover:border-teal-600 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:bg-slate-900/90 shadow-2xs'
        }`}
      >
        <div className="max-w-lg mx-auto space-y-4 flex flex-col items-center">
          {/* Upload Icon Circle */}
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-150 shadow-xs ${
              isDragOver
                ? 'bg-teal-800 text-white scale-105'
                : 'bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-100 dark:border-teal-900/60'
            }`}
          >
            <UploadCloud size={30} className="stroke-[2.2]" />
          </div>

          {/* Heading & Instructions */}
          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {remainingSlots === 0
                ? 'Maximum 3 images selected'
                : isDragOver
                ? 'Drop package photographs to upload'
                : 'Upload 1–3 package images'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Drag & drop commodity photographs or take a live photo covering the principal display, back declaration panel, or side nutritional surfaces.
            </p>
          </div>

          {/* Action buttons inside dropzone */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              id="browse-files-btn"
              type="button"
              disabled={disabled || remainingSlots === 0}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-teal-800 hover:bg-teal-700 active:bg-teal-900 text-white shadow-xs transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <FolderOpen size={16} />
              <span>Browse Files</span>
            </button>

            {/* CAMERA CAPTURE BUTTON */}
            <button
              id="camera-capture-btn"
              type="button"
              disabled={disabled || remainingSlots === 0}
              onClick={handleStartCamera}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 shadow-xs transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              title="Capture package photograph using camera"
            >
              <Camera size={16} className="text-teal-700 dark:text-teal-400" />
              <span>Take Photo</span>
            </button>

            <button
              id="load-sample-package-btn"
              type="button"
              disabled={disabled || isLoadingSample}
              onClick={handleLoadSample}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 shadow-xs dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              title="Load pre-built 3-panel commodity images for instant inspection test"
            >
              <Sparkles size={15} className="text-amber-500 shrink-0" />
              <span>{isLoadingSample ? 'Generating...' : 'Load Sample Package'}</span>
            </button>
          </div>

          {/* Supported format specs */}
          <div className="pt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-3 flex-wrap font-medium">
            <span className="inline-flex items-center gap-1">
              <FileImage size={13} className="text-slate-400" />
              Formats: <strong>JPG, JPEG, PNG, WEBP</strong>
            </span>
            <span>•</span>
            <span>Limit: <strong>1 to 3 images</strong></span>
          </div>
        </div>
      </div>

      {/* Validation alert if error occurred */}
      {validationError && (
        <div
          id="upload-validation-error"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5 transition-all duration-150"
        >
          <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block">Upload Notice:</span>
            <span>{validationError}</span>
          </div>
        </div>
      )}

      {/* Intake Status Bar */}
      <div className="flex items-center justify-between text-xs px-1 text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Selected Count:</span>
          <span className="font-mono font-semibold text-slate-900 dark:text-white px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {currentCount} / {maxImages} images
          </span>
        </div>

        <div className="flex items-center gap-1">
          {currentCount >= 1 ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
              <CheckCircle2 size={14} className="stroke-[2.2]" />
              Ready to Start Inspection
            </span>
          ) : (
            <span className="text-slate-400 italic">
              Upload at least 1 image to enable scan
            </span>
          )}
        </div>
      </div>

      {/* ====================================================
          LIVE CAMERA MODAL CAPTURE VIEW
          ==================================================== */}
      {isCameraActive && (
        <div
          id="camera-modal-backdrop"
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            id="camera-capture-dialog"
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col space-y-4 p-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-teal-400" />
                <h4 className="font-bold text-sm tracking-tight">Capture Package Surface</h4>
              </div>
              <button
                type="button"
                onClick={handleCloseCamera}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Close camera"
              >
                <X size={18} />
              </button>
            </div>

            {/* Video Feed */}
            <div className="relative aspect-4/3 bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder reticle overlay */}
              <div className="pointer-events-none absolute inset-4 border border-dashed border-teal-400/50 rounded-lg" />
              <div className="pointer-events-none absolute top-2 left-3 text-[9px] font-mono text-teal-300 uppercase tracking-wider">
                Align Package Surface Within Frame
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center text-rose-300 space-y-2">
                  <VideoOff size={32} />
                  <p className="text-xs">{cameraError}</p>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handleCloseCamera}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCapturePhoto}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white shadow-md transition-all cursor-pointer"
              >
                <Camera size={16} />
                <span>Capture Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
