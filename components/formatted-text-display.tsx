import React from 'react'

interface FormattedTextDisplayProps {
  text: string
  className?: string
  placeholder?: string
}

export function FormattedTextDisplay({ text, className = '', placeholder = '' }: FormattedTextDisplayProps) {
  // Function to convert markdown-like formatting to HTML
  const formatText = (input: string): string => {
    if (!input) return ''

    let formatted = input
      // Convert **bold** to <strong> with better styling
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
      // Convert *italic* to <em>
      .replace(/\*(.*?)\*/g, '<em class="italic text-zinc-200">$1</em>')
      // Convert "quotes" to proper quotes with styling
      .replace(/"([^"]*)"/g, '<span class="text-blue-300 font-medium">"$1"</span>')
      // Convert ` (backticks) to code styling
      .replace(/`([^`]*)`/g, '<code class="bg-zinc-800 text-green-300 px-1 rounded text-xs">$1</code>')
      // Convert Rs. amounts to highlighted currency
      .replace(/(Rs\.?\s*\d+(?:,\d{3})*(?:\.\d{2})?(?:\/-)?)/g, '<span class="text-green-400 font-semibold bg-zinc-800/50 px-1 rounded">$1</span>')
      // Convert dates (DD/MM/YY or DD-MM-YYYY format) to highlighted
      .replace(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g, '<span class="text-blue-400 font-mono">$1</span>')
      // Convert numbers/codes that look like account numbers or IDs
      .replace(/\b(\d{10,})\b/g, '<span class="text-purple-400 font-mono text-xs">$1</span>')
      // Convert bank names and organizations (all caps words)
      .replace(/\b([A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]{2,})*)\b/g, '<span class="text-yellow-400 font-semibold">$1</span>')
      // Convert line breaks to <br>
      .replace(/\n/g, '<br>')
      // Convert multiple spaces to proper spacing
      .replace(/\s{2,}/g, (match) => '&nbsp;'.repeat(match.length))
    
    return formatted
  }

  if (!text && placeholder) {
    return (
      <div className={`text-zinc-600 ${className}`}>
        {placeholder}
      </div>
    )
  }

  return (
    <div 
      className={`whitespace-pre-wrap break-words select-text ${className}`}
      dangerouslySetInnerHTML={{ __html: formatText(text) }}
      style={{ 
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
        lineHeight: '1.6'
      }}
    />
  )
}
