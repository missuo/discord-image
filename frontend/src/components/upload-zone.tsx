"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Upload, Copy, Link } from "lucide-react";

interface UploadResult {
  url: string;
}

interface LinkFormats {
  direct: string;
  markdown: string;
  html: string;
}

export default function UploadZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [linkFormats, setLinkFormats] = useState<LinkFormats | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateLinkFormats = useCallback((url: string): LinkFormats => {
    return {
      direct: url,
      markdown: `![Image](${url})`,
      html: `<img src="${url}" alt="Image" />`,
    };
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image size must be less than 25MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const result: UploadResult = await response.json();
      setUploadResult(result);
      setLinkFormats(generateLinkFormats(result.url));
      
      toast({
        title: "Upload successful",
        description: "Your image has been uploaded successfully.",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [generateLinkFormats]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf("image") !== -1) {
          const file = item.getAsFile();
          if (file) {
            handleFileUpload(file);
          }
          break;
        }
      }
    }
  }, [handleFileUpload]);

  const copyToClipboard = useCallback((text: string, format: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied to clipboard",
        description: `${format} link copied successfully.`,
      });
    });
  }, []);

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [handlePaste]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="mb-6 shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <CardContent className="p-8">
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
              isDragging
                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-105"
                : "border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50/50 dark:hover:bg-gray-700/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center">
              <div className={`p-4 rounded-full mb-6 transition-all duration-300 ${
                isDragging 
                  ? "bg-blue-100 dark:bg-blue-900/40" 
                  : "bg-gray-100 dark:bg-gray-700"
              }`}>
                <Upload className={`w-12 h-12 transition-colors ${
                  isDragging 
                    ? "text-blue-600 dark:text-blue-400" 
                    : "text-gray-400 dark:text-gray-500"
                }`} />
              </div>
              
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                {isDragging ? "Drop your image here" : "Upload your image"}
              </h3>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md">
                Drag & drop, browse files, or paste from clipboard
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-medium transition-all duration-200"
                >
                  {uploading ? "Uploading..." : "Browse Files"}
                </Button>
                
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  or press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">Ctrl+V</kbd>
                </div>
              </div>
              
              <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
                Maximum file size: 25MB • Supported formats: PNG, JPG, GIF, WebP
              </div>
            </div>
            
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {uploadResult && linkFormats && (
        <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                <Link className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              Upload Complete
            </CardTitle>
            <CardDescription className="text-base">
              Your image has been uploaded successfully. Choose your preferred format:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Direct URL</label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={linkFormats.direct}
                    className="flex-1 font-mono text-sm bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-600"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(linkFormats.direct, "Direct URL")}
                    className="shrink-0 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Markdown</label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={linkFormats.markdown}
                    className="flex-1 font-mono text-sm bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-600"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(linkFormats.markdown, "Markdown")}
                    className="shrink-0 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">HTML</label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={linkFormats.html}
                    className="flex-1 font-mono text-sm bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-600"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(linkFormats.html, "HTML")}
                    className="shrink-0 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Preview</p>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploadResult.url}
                  alt="Uploaded image preview"
                  className="max-w-full max-h-80 object-contain rounded-lg mx-auto shadow-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}