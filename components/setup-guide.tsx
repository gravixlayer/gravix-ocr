"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Copy, Check, Key } from "lucide-react"

export function SetupGuide() {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700/50 p-6 backdrop-blur-sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-red-900 to-red-800 rounded-lg flex items-center justify-center">
            <Key className="w-4 h-4 text-red-200" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">API Key Configuration Required</h3>
            <p className="text-xs text-zinc-400 mt-1">Your Gravix Layer API key is missing</p>
          </div>
        </div>

        <div className="bg-black/50 border border-zinc-700/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-300">Environment Variable:</span>
            <span className="text-xs text-zinc-500 font-mono">GRAVIXLAYER_API_KEY</span>
          </div>
          
          <div className="bg-black border border-zinc-600 rounded p-3 font-mono text-xs relative group">
            <div className="flex items-center justify-between">
              <code className="text-green-400 select-all">GRAVIXLAYER_API_KEY=your_api_key_here</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy("GRAVIXLAYER_API_KEY=your_api_key_here")}
                className="text-zinc-500 hover:text-zinc-300 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-all"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <div className="text-xs text-zinc-500">
            <p>Get your API key from <a href="https://gravixlayer.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">gravixlayer.com</a></p>
          </div>
          <div className="text-xs text-zinc-600 font-mono">
            .env.local
          </div>
        </div>
      </div>
    </Card>
  )
}
