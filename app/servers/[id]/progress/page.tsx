'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Instance } from '@/lib/types'
import { ProgressTimeline, TimelineStep } from '@/components/progress-timeline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export default function ServerProgressPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [instance, setInstance] = useState<Instance | null>(null)
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (id && !authLoading) {
      fetchServerDetails()
      // Poll for updates every 2 seconds
      const interval = setInterval(fetchServerDetails, 2000)
      return () => clearInterval(interval)
    }
  }, [id, authLoading])

  const checkAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push('/')
        return
      }
      setAuthLoading(false)
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/')
    }
  }

  const fetchServerDetails = async () => {
    try {
      const { data: { user, session } } = await supabase.auth.getUser()
      if (!user || !session) return

      const { data, error } = await supabase
        .from('instances')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      setInstance(data)
    } catch (error) {
      console.error('Error fetching server details:', error)
    } finally {
      setLoading(false)
    }
  }

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

      if (response.ok) {
        await fetchServerDetails()
      }
    } catch (error) {
      console.error('Error retrying script:', error)
    }
  }

  if (authLoading || loading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">Loading...</div>
        </div>
      </ThemeProvider>
    )
  }

  if (!instance) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <p className="mb-4">Server not found</p>
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </ThemeProvider>
  )
}

