/**
 * 📁 AssetUploader - Drag, Drop, and Watch the Magic
 *
 * A delightful drag-and-drop uploader with satisfying animations. Files
 * literally glow as they're dragged over, and upload with smooth progress
 * animations that make creators want to upload more content.
 */

import { useState, useRef, useCallback} from 'react';
import {
  Upload, Image, Video, Music, FileText, File, X, Check, AlertCircle, Sparkles, Cloud, HardDrive, Zap, Loader2, Plus} from 'lucide-react';
import { cn} from '../../lib/utils';
import { Button} from '../ui/Button';
import { GradientText} from '../ui/GradientText';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadProgress: number;
  status: 'uploading' | 'completed' | 'error';
  preview?: string;
  viralScore?: number;
}

/**
 * Get file icon based on type
 */
function FileIcon(_{ type, className }: { type: string; className?: string }) {
  if (type.startsWith('image/')) {return <Image className = {className} />;}
  if (type.startsWith('video/')) {return <Video className={className} />;}
  if (type.startsWith('audio/')) {return <Music className={className} />;}
  if (type.includes('text')  ?? type.includes('document')) {return <FileText className={className} />;}
  return <File className={className} />;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Individual file upload card
 */
function FileUploadCard(_{
  file, onRemove
}: {
  file: UploadedFile;
  onRemove: (id: string) => void;
}) {
  const isImage = file.type.startsWith('image/');

  return (
    <div className={cn(
      'relative bg-white dark:bg-slate-800 rounded-xl overflow-hidden',
      'border-2 transition-all duration-300',
      file.status === 'completed'
        ? 'border-green-300 dark:border-green-600 shadow-lg shadow-green-500/10'
        : file.status === 'error'
        ? 'border-red-300 dark:border-red-600 shadow-lg shadow-red-500/10'
        : 'border-slate-200 dark:border-slate-700',
      'hover:shadow-xl hover:scale-102 transform-gpu'
    )}>
      {/* Preview Area */}
      <div className="aspect-video bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
        {isImage && file.preview ? (
          <img
            src={file.preview}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={cn(
              'w-20 h-20 rounded-full flex items-center justify-center',
              'bg-gradient-to-br',
              file.status === 'completed'
                ? 'from-green-400 to-emerald-400'
                : file.status === 'error'
                ? 'from-red-400 to-pink-400'
                : 'from-primary-400 to-viral-400'
            )}>
              <FileIcon type={file.type} className="w-10 h-10 text-white" />
            </div>
          </div>
        )}

        {/* Upload Progress Overlay */}
        {file.status === 'uploading' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center">
              <div className="relative w-20 h-20 mb-2">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-white/20"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - file.uploadProgress / 100)}`}
                    className="text-white transition-all duration-300 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {file.uploadProgress}%
                  </span>
                </div>
              </div>
              <Loader2 className="w-4 h-4 text-white animate-spin mx-auto" />
            </div>
          </div>
        )}

        {/* Status Badge */}
        {file.status === 'completed' && (
          <div className="absolute top-2 right-2">
            <div className="bg-green-500 text-white p-1.5 rounded-full animate-scale-in">
              <Check className="w-4 h-4" />
            </div>
          </div>
        )}

        {file.status === 'error' && (
          <div className="absolute top-2 right-2">
            <div className="bg-red-500 text-white p-1.5 rounded-full animate-scale-in">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Viral Score */}
        {file.status === 'completed' && file.viralScore && (
          <div className="absolute bottom-2 left-2">
            <div className={cn(
              'px-2 py-1 rounded-full text-xs font-medium text-white flex items-center gap-1',
              'bg-gradient-to-r shadow-lg',
              file.viralScore >= 80
                ? 'from-pink-500 to-purple-500 shadow-pink-500/30 animate-pulse'
                : file.viralScore >= 60
                ? 'from-blue-500 to-cyan-500 shadow-blue-500/30'
                : 'from-slate-500 to-slate-600'
            )}>
              <Zap className="w-3 h-3" />
              {file.viralScore}% Viral
            </div>
          </div>
        )}

        {/* Remove Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(file.id)}
          className="absolute top-2 left-2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* File Info */}
      <div className="p-3">
        <h4 className="font-medium text-slate-900 dark:text-white text-sm truncate mb-1">
          {file.name}
        </h4>
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{formatFileSize(file.size)}</span>
          {file.status === 'completed' && (
            <span className="text-green-600 dark:text-green-400 font-medium">
              Ready to use
            </span>
          )}
          {file.status === 'error' && (
            <span className="text-red-600 dark:text-red-400 font-medium">
              Upload failed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Main AssetUploader Component
 */
export function AssetUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  // Handle file selection
  const handleFiles = (selectedFiles: File[]) => {
    const newFiles: UploadedFile[] = selectedFiles.map((file) => ({
      id: `file-${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadProgress: 0,
      status: 'uploading' as const,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Simulate upload progress
    newFiles.forEach((file) => {
      simulateUpload(file.id);
    });
  };

  // Simulate file upload with progress
    let progress = 0;
    const interval = setInterval_(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);

        // Set final status and viral score
        setFiles(prev => prev.map(f =>
          f.id === fileId
            ? {
                ...f,
                uploadProgress: 100,
                status: Math.random() > 0.1 ? 'completed' : 'error',
                viralScore: Math.floor(Math.random() * 100)
              }
            : f
        ));
      } else {
        setFiles(prev => prev.map(f =>
          f.id === fileId ? { ...f, uploadProgress: Math.round(progress) } : f
        ));
      }
    }, 300);
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  // Calculate stats
  const uploadedCount = files.filter(f => f.status === 'completed').length;
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  const averageViralScore = files
    .filter(f => f.status === 'completed' && f.viralScore)
    .reduce((acc, f, _, arr) => acc + (f.viralScore ?? 0) / arr.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Asset Library
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Upload your media assets with drag & drop magic
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {uploadedCount}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Files Ready</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatFileSize(totalSize)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Total Size</div>
          </div>
          {averageViralScore > 0 && (
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {Math.round(averageViralScore)}%
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Avg Viral Score</div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Zone */}
      <div
        className={cn(
          'relative rounded-2xl border-2 border-dashed transition-all duration-300',
          isDragging
            ? 'border-primary-400 bg-gradient-to-br from-primary-50 to-viral-50 dark:from-primary-900/20 dark:to-viral-900/20 scale-102 shadow-2xl shadow-primary-500/20'
            : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:border-primary-300 dark:hover:border-primary-600',
          'hover:shadow-lg'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
          accept="image/*,video/*,audio/*"
        />

        <div className="p-12 text-center">
          {/* Icon Animation */}
          <div className="relative mb-6">
            <div className={cn(
              'w-24 h-24 mx-auto rounded-full flex items-center justify-center transition-all duration-300',
              'bg-gradient-to-br',
              isDragging
                ? 'from-primary-400 to-viral-400 scale-110 animate-pulse shadow-2xl shadow-primary-500/30'
                : 'from-primary-200 to-viral-200 dark:from-primary-800 dark:to-viral-800'
            )}>
              <Upload className={cn(
                'w-12 h-12 transition-all duration-300',
                isDragging ? 'text-white scale-110' : 'text-primary-600 dark:text-primary-400'
              )} />
            </div>

            {/* Floating Icons */}
            {isDragging && (
              <>
                <div className="absolute -top-2 -left-2 animate-bounce">
                  <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center text-white shadow-lg">
                    <Image className="w-4 h-4" />
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 animate-bounce" style={{ animationDelay: '0.1s' }}>
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white shadow-lg">
                    <Video className="w-4 h-4" />
                  </div>
                </div>
                <div className="absolute -bottom-2 -left-2 animate-bounce" style={{ animationDelay: '0.2s' }}>
                  <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center text-white shadow-lg">
                    <Music className="w-4 h-4" />
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 animate-bounce" style={{ animationDelay: '0.3s' }}>
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white shadow-lg">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Text Content */}
          <div className="space-y-2 mb-6">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
              {isDragging ? 'Drop your files here!' : 'Drag & drop your assets'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              or click to browse from your device
            </p>
          </div>

          {/* Upload Button */}
          <Button
            variant="viral"
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            leftIcon={<Plus className="w-5 h-5" />}
            className="hover:scale-105 transition-transform duration-200"
          >
            Choose Files
          </Button>

          {/* Supported Formats */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <Image className="w-3 h-3" />
              <span>Images</span>
            </div>
            <div className="flex items-center gap-1">
              <Video className="w-3 h-3" />
              <span>Videos</span>
            </div>
            <div className="flex items-center gap-1">
              <Music className="w-3 h-3" />
              <span>Audio</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>Documents</span>
            </div>
          </div>
        </div>

        {/* Animated Border */}
        {isDragging && (
          <div className="absolute inset-0 rounded-2xl border-2 border-primary-400 animate-pulse pointer-events-none" />
        )}
      </div>

      {/* Uploaded Files Grid */}
      {files.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Uploaded Files ({files.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {files.map((file) => (
              <FileUploadCard
                key={file.id}
                file={file}
                onRemove={handleRemoveFile}
              />
            ))}
          </div>
        </div>
      )}

      {/* Storage Info */}
      <div className="bg-gradient-to-r from-primary-50 to-viral-50 dark:from-primary-900/20 dark:to-viral-900/20 rounded-xl p-6 border border-primary-200 dark:border-primary-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-viral-500 rounded-lg flex items-center justify-center text-white">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white">Storage Usage</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                2.4 GB of 10 GB used
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" leftIcon={<Cloud className="w-3 h-3" />}>
            Upgrade Storage
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-viral-500 transition-all duration-500"
            style={{ width: '24%' }}
          />
        </div>
      </div>
    </div>
  );
}