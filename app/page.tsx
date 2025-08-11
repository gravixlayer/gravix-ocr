"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Copy, Check, X } from "lucide-react"
import { SetupGuide } from "@/components/setup-guide"
import { FormattedTextDisplay } from "@/components/formatted-text-display"

export default function OCRApp() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [resizedPreviewUrl, setResizedPreviewUrl] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [processingTime, setProcessingTime] = useState<number | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showSetupGuide, setShowSetupGuide] = useState(false)

  // Function to resize image for display while maintaining aspect ratio
  const resizeImageForDisplay = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const img = new Image()
      
      img.onload = () => {
        // Calculate container dimensions to fit within flex container
        const maxWidth = 500   // Conservative max width for container
        const maxHeight = 350  // Conservative max height for container
        
        let { width, height } = img
        
        // Calculate scaling factor to fit within container
        const scaleX = maxWidth / width
        const scaleY = maxHeight / height
        const scale = Math.min(scaleX, scaleY, 1) // Don't upscale, only downscale
        
        // Apply scaling
        width *= scale
        height *= scale
        
        canvas.width = width
        canvas.height = height
        
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.9))
      }
      
      img.src = URL.createObjectURL(file)
    })
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + V to paste image
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        navigator.clipboard.read().then(clipboardItems => {
          for (const clipboardItem of clipboardItems) {
            for (const type of clipboardItem.types) {
              if (type.startsWith('image/')) {
                clipboardItem.getType(type).then(blob => {
                  const file = new File([blob], 'pasted-image.png', { type })
                  processFile(file)
                })
              }
            }
          }
        }).catch(() => {
          // Clipboard access failed, ignore silently
        })
      }
      
      // Cmd/Ctrl + C to copy text
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && extractedText && !window.getSelection()?.toString()) {
        e.preventDefault()
        handleCopy()
      }
      
      // Escape to clear
      if (e.key === 'Escape' && selectedFile) {
        clearFile()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedFile, extractedText])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const processFile = async (file: File) => {
    if (file.type.startsWith("image/")) {
      if (file.size > 10 * 1024 * 1024) {
        setError("File must be under 10MB")
        return
      }
      setSelectedFile(file)
      setError(null)
      setExtractedText("")
      setProcessingTime(null)

      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      
      // Create resized version for display
      try {
        const resizedUrl = await resizeImageForDisplay(file)
        setResizedPreviewUrl(resizedUrl)
      } catch (error) {
        console.error("Error resizing image:", error)
        setResizedPreviewUrl(url) // Fall back to original
      }
      
      // Automatically start OCR processing with original file
      handleOCR(file)
    } else {
      setError("Please select an image file")
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      processFile(files[0])
    }
  }

  const handleOCR = async (fileToProcess?: File) => {
    const file = fileToProcess || selectedFile
    if (!file) return

    setIsLoading(true)
    setError(null)
    setExtractedText("")
    setProcessingTime(null)

    const startTime = Date.now()

    try {
      const formData = new FormData()
      formData.append("image", file)

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      })

      const endTime = Date.now()
      setProcessingTime(endTime - startTime)

      if (!response.ok) {
        let errorMessage = "Processing failed"
        const contentType = response.headers.get("content-type")

        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } else {
          // If not JSON, read as text
          errorMessage = await response.text()
          // Truncate long error messages for display
          if (errorMessage.length > 200) {
            errorMessage = errorMessage.substring(0, 200) + "..."
          }
          // Try to make it more user-friendly if it's a common server error
          if (errorMessage.toLowerCase().includes("internal server error")) {
            errorMessage = "An internal server error occurred. Please try again later."
          } else if (errorMessage.toLowerCase().includes("forbidden")) {
            errorMessage = "Access forbidden. Check your API key permissions."
          } else if (errorMessage.toLowerCase().includes("not found")) {
            errorMessage = "Resource not found. The API endpoint might be incorrect."
          }
        }

        // Show setup guide if API key is missing based on the error message content
        if (
          errorMessage.includes("API key") ||
          errorMessage.includes("environment variable") ||
          errorMessage.includes("Invalid API key")
        ) {
          setShowSetupGuide(true)
        } else {
          setShowSetupGuide(false) // Hide if it's not an API key issue
        }

        throw new Error(errorMessage)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setExtractedText(data.text)
      setShowSetupGuide(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to extract text"
      setError(errorMessage)
      setProcessingTime(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    if (extractedText) {
      await navigator.clipboard.writeText(extractedText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setResizedPreviewUrl(null)
    setExtractedText("")
    setError(null)
    setCopied(false)
    setProcessingTime(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-black text-white flex flex-col">
      {/* Setup Guide */}
      {showSetupGuide && (
        <div className="border-b border-zinc-800 bg-zinc-900 px-6 py-4 flex-shrink-0">
          <SetupGuide />
        </div>
      )}

      {/* Header */}
      <div className="border-b border-zinc-800/30 bg-zinc-950/50 backdrop-blur-sm flex-shrink-0">
        <div className="w-full pl-4 pr-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
                <img 
                  src="/Gravix Layer Logo.jpg" 
                  alt="Gravix Layer Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-lg font-medium text-white">
                <span className="font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">Gravix Layer</span>
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="font-light text-zinc-200">GravixOCR</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full w-full px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full max-w-none items-stretch">
          
            {/* Left Section - Image */}
            <div className="flex flex-col space-y-3 h-full">
              <div className="flex items-center justify-between flex-shrink-0">
              <h2 className="text-sm text-zinc-400 font-medium tracking-wide">IMAGE</h2>
              {selectedFile && (
                <div className="flex items-center gap-3">
                  <div className="text-xs text-zinc-500 font-mono">
                    {(selectedFile.size / 1024).toFixed(0)}KB
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFile}
                    className="text-zinc-500 hover:text-zinc-300 w-6 h-6 p-0 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>

                          <div className="flex-1 flex flex-col min-h-0">
              {!selectedFile ? (
                /* Upload Area */
                <div
                  className={`flex-1 flex items-center justify-center border border-zinc-800/60 rounded-lg transition-all duration-200 relative overflow-hidden group min-h-0 ${
                    isDragOver
                      ? "border-zinc-600 bg-zinc-900/30 scale-[1.02]"
                      : "hover:border-zinc-700 hover:bg-zinc-900/10"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/0 to-zinc-900/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <label className="cursor-pointer w-full h-full flex items-center justify-center relative z-10">
                    <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                    <div className="text-center space-y-6">
                      <div className="relative">
                        <Upload className="w-10 h-10 mx-auto text-zinc-500 transition-transform group-hover:scale-110" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-zinc-400 text-sm font-medium">Drop image or click to upload</p>
                        <p className="text-zinc-600 text-xs">PNG, JPG, JPEG, WebP • Max 10MB</p>
                      </div>
                    </div>
                  </label>
                </div>
              ) : (
                /* Image Display */
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Image Preview */}
                  {resizedPreviewUrl && (
                    <div className="flex-1 border border-zinc-800/60 rounded-lg overflow-hidden bg-zinc-950 relative group flex items-center justify-center min-h-0">
                      <div className="p-4">
                        <img
                          src={resizedPreviewUrl}
                          alt="Preview"
                          className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-[1.02] rounded-md"
                          style={{ 
                            objectFit: 'contain',
                            objectPosition: 'center',
                            display: 'block'
                          }}
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                  )}

                  {/* Processing Status */}
                  {isLoading && (
                    <div className="flex items-center justify-center gap-3 py-6 bg-zinc-900/30 rounded-lg border border-zinc-800/40 flex-shrink-0">
                      <div className="relative">
                        <div className="w-4 h-4 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 w-4 h-4 border-2 border-transparent border-t-white/20 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                      </div>
                      <span className="text-xs text-zinc-400 font-medium tracking-wide">PROCESSING IMAGE...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-4 border border-red-900/50 rounded-lg bg-gradient-to-r from-red-950/20 to-red-900/10 backdrop-blur-sm flex-shrink-0">
                  <div className="flex items-start gap-3">
                    <div className="w-1 h-4 bg-red-500 rounded-full mt-0.5 flex-shrink-0" />
                    <p className="text-red-300 text-xs leading-relaxed">{error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Section - Text */}
          <div className="flex flex-col space-y-3 h-full">
            <div className="flex items-center justify-between flex-shrink-0">
              <h2 className="text-sm text-zinc-400 font-medium tracking-wide">EXTRACTED TEXT</h2>
              {extractedText && (
                <div className="flex items-center gap-3">
                  <div className="text-xs text-zinc-600 font-mono">
                    {extractedText.length} chars
                  </div>
                  <Button
                    onClick={handleCopy}
                    variant="ghost"
                    size="sm"
                    className={`transition-all duration-200 px-4 py-2 h-8 text-xs font-medium rounded-lg border ${
                      copied 
                        ? "bg-green-900/30 border-green-700/50 text-green-300 hover:bg-green-900/40" 
                        : "bg-zinc-800/50 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/50 hover:border-zinc-600 hover:text-white"
                    }`}
                  >
                    {copied ? (
                      <span className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        Copied!
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <Copy className="w-3.5 h-3.5" />
                        Copy Text
                      </span>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Text Display */}
            <div className="flex-1 border border-zinc-800/60 rounded-lg overflow-hidden bg-zinc-950/50 backdrop-blur-sm relative min-h-0">
              <div className="w-full h-full overflow-auto p-4">
                <FormattedTextDisplay
                  text={extractedText}
                  className="w-full h-full text-xs leading-relaxed text-zinc-300 min-h-full"
                  placeholder={
                    isLoading 
                      ? "Processing image and extracting text..." 
                      : selectedFile 
                        ? "Text will appear here once processing is complete"
                        : "Upload an image to extract text with AI-powered OCR"
                  }
                />
              </div>
              {!extractedText && !isLoading && (
                <div className="absolute bottom-4 right-4 text-zinc-700 text-xs font-mono">
                  Ready
                </div>
              )}
            </div>

            {/* Text Stats */}
            {extractedText && processingTime && (
              <div className="flex justify-between items-center text-xs text-zinc-600 px-1 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <span className="font-mono">{extractedText.length} characters</span>
                  <span className="font-mono">{extractedText.split(/\s+/).filter((w) => w).length} words</span>
                  <span className="font-mono">{extractedText.split('\n').length} lines</span>
                </div>
                <span className="font-mono bg-zinc-900/50 px-2 py-1 rounded text-green-400">
                  {processingTime}ms
                </span>
              </div>
            )}

            {/* Disclaimer */}
            <div className="text-xs text-zinc-500 px-1 flex-shrink-0">
              <p className="leading-relaxed">
                <span className="text-zinc-400">Disclaimer:</span> Text extraction accuracy may vary. Please verify extracted content for critical applications.
              </p>
            </div>
          </div>
        </div>
        </div>
      </main>

      {/* Footer */}
      <div className="border-t border-zinc-800/30 bg-zinc-950/50 backdrop-blur-sm flex-shrink-0 py-3">
        <div className="w-full px-4 flex items-center justify-between">
          <p className="text-xs text-zinc-500 font-medium">
            Made with <a href="https://gravixlayer.com" target="_blank" rel="noopener noreferrer" className="text-zinc-300 font-semibold underline hover:text-white transition-colors">Gravix Layer</a> | Gemma3:12b
          </p>
          <div className="flex items-center gap-4 flex-1 justify-end">
            <a
              href="https://github.com/gravixlayer/GravixOCR"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#888] hover:text-white transition-colors p-1"
              aria-label="GitHub"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
            <a
              href="https://x.com/GravixLayer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#888] hover:text-white transition-colors p-1"
              aria-label="X (Twitter)"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/company/gravixlayer/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#888] hover:text-white transition-colors p-1"
              aria-label="LinkedIn"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
