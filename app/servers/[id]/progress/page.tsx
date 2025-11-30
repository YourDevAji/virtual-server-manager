'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Instance } from '@/lib/types'
import { ProgressTimeline, TimelineStep } from '@/components/progress-timeline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ErrorDialog } from '@/components/error-dialog'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function ServerProgressPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [instance, setInstance] = useState<Instance | null>(null)
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; title: string; message: string; details?: string }>({ open: false, title: 'Error', message: '' })

  const checkAuth = useCallback(async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push('/')
        return
      }
      setAuthLoading(false)
    } catch (error: unknown) {
      console.error('Auth error:', error)
      router.push('/')
    }
  }, [router])

  const fetchServerDetails = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        return
      }
      const response = await fetch(`/api/servers/${id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (response.status === 404) {
        setInstance(null)
        setLoading(false)
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to load server details')
      }
      const data = await response.json()
      setInstance(data)
    } catch (error: unknown) {
      const errMsg = (error instanceof Error && error.message) ? error.message : 'Unknown error'
      setErrorDialog({
        open: true,
        title: 'Error Loading Server',
        message: errMsg,
        details: error instanceof Error ? error.stack : undefined
      })
      setInstance(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (id && !authLoading) {
      fetchServerDetails()
      // Only poll if we have an instance (don't poll if server not found)
      const interval = setInterval(() => {
        if (instance) {
          fetchServerDetails()
        }
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [id, authLoading, instance, fetchServerDetails])

  const getTimelineSteps = (): TimelineStep[] => {
    if (!instance) return []

    const steps: TimelineStep[] = [
      {
        id: 'database',
        label: 'Create database record',
        status: 'completed',
        timestamp: new Date(instance.created_at),
      },
      {
        id: 'script',
        label: 'Execute VM creation script',
        status: instance.script_status || 'pending',
        error: instance.script_error || undefined,
      },
    ]

    // If script completed, add VM status step
    if (instance.script_status === 'completed') {
      steps.push({
        id: 'vm-status',
        label: `VM is ${instance.status}`,
        status: instance.status === 'running' ? 'completed' : 'pending',
      })
    }

    return steps
  }

  const handleRetryScript = async () => {
    if (!instance) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/servers/${id}/retry-script`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || data.message || 'Failed to retry script'
        setErrorDialog({
          open: true,
          title: 'Failed to retry script',
          message: errorMessage,
          details: data.error || data.message
        })
        return
      }

      toast.success('Script retry initiated', {
        description: 'The script execution has been restarted. This page will update automatically.'
      })

      await fetchServerDetails()
    } catch (error) {
      console.error('Error retrying script:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setErrorDialog({
        open: true,
        title: 'Failed to retry script',
        message: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      })
    }
  }

  if (authLoading || (loading && !instance)) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">Loading server details...</div>
        </div>
      </ThemeProvider>
    )
  }

  if (!instance) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center max-w-md">
            <p className="mb-4 text-lg font-semibold">Server not found</p>
            <p className="mb-4 text-sm text-muted-foreground">
              The server with ID <code className="text-xs bg-muted px-1 py-0.5 rounded">{id}</code> could not be found.
              This might happen if:
            </p>
            <ul className="text-sm text-left mb-4 space-y-1 text-muted-foreground">
              <li>• The server was deleted</li>
              <li>• You do not have permission to view this server</li>
              <li>• The server ID is incorrect</li>
            </ul>
            <div className="flex gap-2 justify-center">
              <Link href="/dashboard">
                <Button>Back to Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </ThemeProvider>
    )
  }

  const steps = getTimelineSteps()
  const canRetry = instance.script_status === 'failed'

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background">
        <nav className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Virtual Server Manager
              </Link>
              <div className="flex gap-4 items-center">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-8">
          <Link href={`/servers/${id}`}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Server Details
            </Button>
          </Link>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Server: {instance.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">OS:</span>
                  <p className="font-medium">{instance.os}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">CPU:</span>
                  <p className="font-medium">{instance.cpu} cores</p>
                </div>
                <div>
                  <span className="text-muted-foreground">RAM:</span>
                  <p className="font-medium">{instance.ram} GB</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Storage:</span>
                  <p className="font-medium">{instance.storage} GB</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Creation Progress</CardTitle>
                {canRetry && (
                  <Button onClick={handleRetryScript} size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry Script
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ProgressTimeline steps={steps} />
              
              {instance.script_status === 'failed' && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                    <strong>VM Creation Failed</strong>
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                    The database record was created, but the VirtualBox VM was not created. 
                    This can happen if VirtualBox is not properly configured or if there was an error during VM creation.
                  </p>
                  {instance.script_error && (
                    <div className="mb-3 p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded text-sm">
                      <strong>Error:</strong> {instance.script_error}
                    </div>
                  )}
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Click &quot;Retry Script&quot; above to attempt VM creation again, or check the Environment Status on the dashboard to ensure VirtualBox is properly configured.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error Dialog */}
          <ErrorDialog
            open={errorDialog.open}
            onOpenChange={(open) => setErrorDialog(prev => ({ ...prev, open }))}
            title={errorDialog.title}
            message={errorDialog.message}
            details={errorDialog.details}
          />
        </div>
      </div>
    </ThemeProvider>
  )
}

