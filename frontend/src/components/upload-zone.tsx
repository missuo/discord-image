"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Upload, Image, Copy, Link } from "lucide-react";

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
    <div className="w-full max-w-2xl mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-6 h-6" />
            Discord Image Upload
          </CardTitle>
          <CardDescription>
            Upload your images to Discord. Supports drag & drop and clipboard paste.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/10"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg mb-2">
              {isDragging ? "Drop your image here" : "Drag & drop an image here"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse files (max 25MB)
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              You can also paste images from clipboard (Ctrl/Cmd + V)
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              size="lg"
            >
              {uploading ? "Uploading..." : "Select Image"}
            </Button>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="w-5 h-5" />
              Upload Complete
            </CardTitle>
            <CardDescription>
              Your image has been uploaded. Copy the links below:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium min-w-[80px]">Direct URL:</label>
              <Input
                readOnly
                value={linkFormats.direct}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(linkFormats.direct, "Direct URL")}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium min-w-[80px]">Markdown:</label>
              <Input
                readOnly
                value={linkFormats.markdown}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(linkFormats.markdown, "Markdown")}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium min-w-[80px]">HTML:</label>
              <Input
                readOnly
                value={linkFormats.html}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(linkFormats.html, "HTML")}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Preview:</p>
              <img
                src={uploadResult.url}
                alt="Uploaded image preview"
                className="max-w-full max-h-64 object-contain rounded-lg border"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}