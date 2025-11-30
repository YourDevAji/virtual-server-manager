'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, AlertTriangle, Info, ExternalLink, RefreshCw } from 'lucide-react'

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
      // Add cache-busting parameter to ensure fresh check
      const response = await fetch(`/api/environment/check?t=${Date.now()}`)
      if (!response.ok) throw new Error('Failed to check environment')
      const results = await response.json()
      setChecks(results)
    } catch (error) {
      console.error('Error checking environment:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    await loadChecks()
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Environment Status</CardTitle>
            <CardDescription>
              {status.allOk
                ? 'All systems ready'
                : status.hasErrors
                ? 'Some issues detected'
                : 'Warnings detected'}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
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
                <div className="mt-2 p-3 bg-muted rounded text-sm space-y-2">
                  <div>
                    <strong className="text-foreground">How to fix:</strong>
                  </div>
                  <div className="text-muted-foreground whitespace-pre-line">
                    {check.fixInstructions}
                  </div>
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
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
              <strong>Note:</strong> Scripts will be simulated until the environment is properly configured.
              Server records will still be created in the database.
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              <strong>Tip:</strong> After installing VirtualBox or Git Bash, click the Refresh button above to re-check the environment.
              You may also need to restart your terminal or IDE for PATH changes to take effect.
            </p>
          </div>
        )}
        
        {status.allOk && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>✓ All checks passed!</strong> Your environment is ready to execute scripts.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

