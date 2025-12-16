import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, FileVideo, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DragDropUploadProps {
    onFileSelect: (file: File) => void;
    accept: Record<string, string[]>;
    icon?: React.ReactNode;
    label?: string;
    preview?: string | null;
    onClear?: () => void;
    maxSize?: number;
    progress?: number;
}

export function DragDropUpload({
    onFileSelect,
    accept,
    icon,
    label = "Drag and drop your file here",
    preview,
    onClear,
    maxSize = 500 * 1024 * 1024,
    progress = 0
}: DragDropUploadProps) {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles?.[0]) {
            onFileSelect(acceptedFiles[0]);
        }
    }, [onFileSelect]);

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop,
        accept,
        maxSize,
        multiple: false
    });

    return (
        <div className="w-full">
            <AnimatePresence mode="wait">
                {!preview ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        {...getRootProps()}
                        className={cn(
                            "relative group cursor-pointer border-2 border-dashed rounded-xl p-8 transition-all duration-300 ease-in-out",
                            isDragActive
                                ? "border-primary bg-primary/10 scale-[1.02]"
                                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
                            isDragReject && "border-destructive bg-destructive/10"
                        )}
                    >
                        <input {...getInputProps()} />
                        <div className="flex flex-col items-center justify-center text-center space-y-4">
                            <div className={cn(
                                "p-4 rounded-full bg-muted transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/10",
                                isDragActive && "scale-110 bg-primary/20"
                            )}>
                                {icon || <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />}
                            </div>
                            <div>
                                <p className="font-medium text-lg mb-1">
                                    {isDragActive ? "Drop it like it's hot!" : label}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    or click to browse
                                </p>
                            </div>
                            {isDragReject && (
                                <p className="text-sm text-destructive font-medium">
                                    File type not accepted
                                </p>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="relative rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-border shadow-sm"
                    >
                        {Object.keys(accept)[0].startsWith("video") ? (
                            <div className="aspect-video bg-black flex items-center justify-center">
                                <video src={preview} className="w-full h-full object-contain" controls={false} />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                    <FileVideo className="w-12 h-12 text-white/80" />
                                </div>
                            </div>
                        ) : (
                            <img src={preview} alt="Preview" className="w-full aspect-video object-cover" />
                        )}

                        <div className="absolute top-2 right-2 flex gap-2">
                            <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClear?.();
                                }}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        {progress > 0 && progress < 100 && (
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t">
                                <div className="flex justify-between text-xs mb-1.5 font-medium">
                                    <span>Uploading...</span>
                                    <span>{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                            </div>
                        )}

                        {progress === 100 && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="text-center"
                                >
                                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="w-8 h-8 text-primary" />
                                    </div>
                                    <p className="font-semibold text-lg">Upload Complete!</p>
                                </motion.div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
