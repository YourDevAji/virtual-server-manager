'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, AlertTriangle, Info, ExternalLink } from 'lucide-react'

// Define types here to avoid importing server-side code
export interface EnvironmentCheck {
  name: string
  status: 'ok' | 'warning' | 'error'
  message: string
  fixable: boolean
  fixCommand?: string
  fixInstructions?: string
}

function getEnvironmentStatus(checks: EnvironmentCheck[]): {
  allOk: boolean
  hasErrors: boolean
  hasWarnings: boolean
  canExecuteScripts: boolean
} {
  const hasErrors = checks.some(c => c.status === 'error')
  const hasWarnings = checks.some(c => c.status === 'warning')
  const allOk = checks.every(c => c.status === 'ok')
  
  // Can execute scripts if VirtualBox and Bash are OK (scripts check is just informational)
  const vboxOk = checks.find(c => c.name.includes('VirtualBox'))?.status === 'ok'
  const bashOk = checks.find(c => c.name.includes('Bash'))?.status === 'ok'
  const canExecuteScripts = vboxOk && bashOk

  return {
    allOk,
    hasErrors,
    hasWarnings,
    canExecuteScripts,
  }
}

export function EnvironmentStatus() {
  const [checks, setChecks] = useState<EnvironmentCheck[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadChecks()
  }, [])

  const loadChecks = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/environment/check')
      if (!response.ok) throw new Error('Failed to check environment')
      const results = await response.json()
      setChecks(results)
    } catch (error) {
      console.error('Error checking environment:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Environment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Checking environment...</p>
        </CardContent>
      </Card>
    )
  }

  const status = getEnvironmentStatus(checks)

  const getStatusIcon = (check: EnvironmentCheck) => {
    switch (check.status) {
      case 'ok':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Info className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (check: EnvironmentCheck) => {
    switch (check.status) {
      case 'ok':
        return <Badge variant="success">OK</Badge>
      case 'warning':
        return <Badge variant="warning">Warning</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Environment Status</CardTitle>
        <CardDescription>
          {status.allOk
            ? 'All systems ready'
            : status.hasErrors
            ? 'Some issues detected'
            : 'Warnings detected'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {checks.map((check) => (
          <div key={check.name} className="flex items-start gap-3 p-3 border rounded-lg">
            <div className="mt-0.5">{getStatusIcon(check)}</div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{check.name}</span>
                {getStatusBadge(check)}
              </div>
              <p className="text-sm text-muted-foreground mb-2">{check.message}</p>
              {check.fixInstructions && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <strong>Fix:</strong> {check.fixInstructions}
                  {check.name.includes('VirtualBox') && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open('https://www.virtualbox.org/wiki/Downloads', '_blank')}
                        className="mt-2"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Download VirtualBox
                      </Button>
                    </div>
                  )}
                  {check.name.includes('Bash') && (
                    <div className="mt-2">
                      {typeof window !== 'undefined' && navigator.platform.toLowerCase().includes('win') ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open('https://git-scm.com/download/win', '_blank')}
                          className="mt-2"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Download Git Bash
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open('https://git-scm.com/downloads', '_blank')}
                          className="mt-2"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Download Git
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {!status.canExecuteScripts && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> Scripts will be simulated until the environment is properly configured.
              Server records will still be created in the database.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

