'use client'

import { CheckCircle2, Circle, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TimelineStep {
  id: string
  label: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  error?: string
  timestamp?: Date
}

interface ProgressTimelineProps {
  steps: TimelineStep[]
  className?: string
}

export function ProgressTimeline({ steps, className }: ProgressTimelineProps) {
  const getStepIcon = (status: TimelineStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'skipped':
        return <Circle className="h-5 w-5 text-gray-400" />
      default:
        return <Circle className="h-5 w-5 text-gray-300" />
    }
  }

  const getStepColor = (status: TimelineStep['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400'
      case 'running':
        return 'text-blue-600 dark:text-blue-400'
      case 'failed':
        return 'text-red-600 dark:text-red-400'
      case 'skipped':
        return 'text-gray-400'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {steps.map((step) => {
        const isActiveStep = step.status === 'running' // rename from `isActive`
        return (
          <div key={step.id} className="flex gap-4">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              {getStepIcon(step.status)}
              {!isActiveStep && (
                <div
                  className={cn(
                    'w-0.5 flex-1 mt-2',
                    step.status === 'completed'
                      ? 'bg-green-500'
                      : step.status === 'running'
                      ? 'bg-blue-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  )}
                />
              )}
            </div>

            {/* Step content */}
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2">
                <h3
                  className={cn(
                    'font-medium',
                    getStepColor(step.status),
                    step.status === 'pending' && 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </h3>
                {step.status === 'completed' && step.timestamp && (
                  <span className="text-xs text-muted-foreground">
                    {step.timestamp.toLocaleTimeString()}
                  </span>
                )}
              </div>
              
              {step.error && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
                  <strong>Error:</strong> {step.error}
                </div>
              )}
              
              {step.status === 'pending' && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Waiting to start...
                </p>
              )}
              
              {step.status === 'running' && (
                <p className="mt-1 text-sm text-muted-foreground">
                  In progress...
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

