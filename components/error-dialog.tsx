'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

interface ErrorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  message: string
  details?: string
  actionLabel?: string
  onAction?: () => void
}

// Remove ANSI color codes from error messages
function stripAnsiCodes(text: string): string {
  // Remove ANSI escape sequences (e.g., [0;31m, [0m, etc.)
  return text.replace(/\x1b\[[0-9;]*m/g, '').trim()
}

export function ErrorDialog({ open, onOpenChange, title = 'Error', message, details, actionLabel, onAction }: ErrorDialogProps) {
  const cleanMessage = stripAnsiCodes(message)
  const cleanDetails = details ? stripAnsiCodes(details) : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-left">{title}</DialogTitle>
            </div>
          </div>
        </DialogHeader>
        <div className="py-4">
          <DialogDescription className="text-base text-foreground mb-3">
            {cleanMessage}
          </DialogDescription>
          {cleanDetails && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md max-h-60 overflow-y-auto">
              <p className="text-sm text-red-700 dark:text-red-400 font-mono whitespace-pre-wrap break-words">
                {cleanDetails}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          {onAction && actionLabel && (
            <Button onClick={onAction} variant="default">
              {actionLabel}
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)} variant={onAction ? "outline" : "default"}>
            {onAction ? 'Cancel' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

