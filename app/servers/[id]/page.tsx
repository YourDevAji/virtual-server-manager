'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { addActivityLog, getActivityLogsForInstance, ActivityLogEntry, ActivityType } from '@/lib/activity-log'
import { Instance, Service, VMUser } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ErrorDialog } from '@/components/error-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import { Play, Square, Trash2, Plus, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { toast } from 'sonner'

export default function ServerDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [instance, setInstance] = useState<Instance | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [users, setUsers] = useState<VMUser[]>([])
  const [loading, setLoading] = useState(true)
  const [startLoading, setStartLoading] = useState(false)
  const [stopLoading, setStopLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [installLoading, setInstallLoading] = useState(false)
  const [addUserLoading, setAddUserLoading] = useState(false)
  const [installServiceDialog, setInstallServiceDialog] = useState(false)
  const [addUserDialog, setAddUserDialog] = useState(false)
  const [newService, setNewService] = useState('')
  const [newUser, setNewUser] = useState({ username: '', password: '', sudo: false })
  const [authLoading, setAuthLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [stopDialog, setStopDialog] = useState(false)
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; title: string; message: string; details?: string; actionLabel?: string; onAction?: () => void }>({ open: false, title: 'Error', message: '' })
  const [metrics, setMetrics] = useState<{ cpu: number; ram_used: number; ram_total: number } | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [metricsError, setMetricsError] = useState<string | null>(null)
  const [cloneDialog, setCloneDialog] = useState(false)
  const [cloneName, setCloneName] = useState('')
  const [snapshotsDialog, setSnapshotsDialog] = useState(false)
  const [snapshotName, setSnapshotName] = useState('')
  const [snapshotRestoreName, setSnapshotRestoreName] = useState('')
  const [cloneLoading, setCloneLoading] = useState(false)
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [snapshotLogs, setSnapshotLogs] = useState<{
    id: number
    timestamp: string
    action: 'create' | 'restore'
    name: string
    success: boolean
    message?: string
  }[]>([])
  const [, setActivityLogs] = useState<ActivityLogEntry[]>([])

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
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const [instanceRes, servicesRes, usersRes] = await Promise.all([
        supabase.from('instances').select('*').eq('id', id).eq('user_id', user.id).single(),
        supabase.from('services').select('*').eq('instance_id', id),
        supabase.from('vm_users').select('*').eq('instance_id', id),
      ])

      if (instanceRes.error) throw instanceRes.error
      if (servicesRes.error) throw servicesRes.error
      if (usersRes.error) throw usersRes.error

      setInstance(instanceRes.data)
      setServices(servicesRes.data || [])
      setUsers(usersRes.data || [])
    } catch (error: unknown) {
      console.error('Error fetching server details:', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadActivityLogs = useCallback(async () => {
    try {
      if (!id) return
      const logs = await getActivityLogsForInstance(id)
      setActivityLogs(logs)
    } catch (error) {
      console.error('Error loading activity logs:', error)
    }
  }, [id])

  const fetchMetrics = useCallback(async () => {
    try {
      if (!id) return
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      if (!metrics) {
        setMetricsLoading(true)
      }

      const response = await fetch(`/api/servers/${id}/metrics`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const message = errorData.error || errorData.message || 'Failed to fetch metrics'
        setMetricsError(message)
        return
      }

      const data = await response.json()
      if (data && data.metrics) {
        setMetrics(data.metrics)
        setMetricsError(null)
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
      const message = error instanceof Error ? error.message : 'Failed to fetch metrics'
      setMetricsError(message)
    } finally {
      setMetricsLoading(false)
    }
  }, [id, metrics])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (id && !authLoading) {
      fetchServerDetails()
      loadActivityLogs()
    }
  }, [id, authLoading, fetchServerDetails, loadActivityLogs])

  const appendActivityLog = async (type: ActivityType, title: string, options?: { description?: string; status?: 'success' | 'error' }) => {
    try {
      const entry: ActivityLogEntry = {
        id: Date.now(),
        instanceId: id,
        type,
        title,
        description: options?.description,
        status: options?.status || 'success',
        createdAt: new Date().toISOString(),
      }
      setActivityLogs(prev => [entry, ...prev])
      await addActivityLog(entry)
    } catch (error) {
      console.error('Failed to append activity log:', error)
    }
  }

  useEffect(() => {
    if (!instance || instance.status !== 'running') {
      return
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 3000)

    return () => {
      clearInterval(interval)
    }
  }, [instance, fetchMetrics])

  const handleAction = async (action: 'start' | 'stop' | 'delete') => {
    if (action === 'start') setStartLoading(true)
    if (action === 'stop') setStopLoading(true)
    if (action === 'delete') setDeleteLoading(true)
    try {
      // Get the session so we can forward the token to the API
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/servers/${id}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        // Extract error details
        const errorMessage = data.error || data.message || 'Action failed'
        const errorDetails = data.error || data.message || undefined
        
        // If VM needs to be created, offer to create it
        if (data.needsCreation && action === 'start') {
          const handleCreateVM = async () => {
            setErrorDialog(prev => ({ ...prev, open: false }))
            // Navigate to progress page to retry script
            router.push(`/servers/${id}/progress`)
          }
          
          setErrorDialog({
            open: true,
            title: 'VM Not Found',
            message: errorMessage,
            details: errorDetails,
            actionLabel: 'Create VM Now',
            onAction: handleCreateVM
          })
          return
        }
        
        // Show error dialog for critical errors
        setErrorDialog({
          open: true,
          title: `Failed to ${action} server`,
          message: errorMessage,
          details: errorDetails
        })
        
        if (action === 'stop') {
          setStopDialog(false)
        }
        return
      }

      // Show success message
      if (action === 'start') {
        toast.success('Server started successfully', {
          description: data.message || 'The server is now running'
        })
        appendActivityLog('start', 'Server started', { description: data.message, status: 'success' })
      } else if (action === 'stop') {
        toast.success('Server stopped successfully', {
          description: data.message || 'The server has been stopped'
        })
        appendActivityLog('stop', 'Server stopped', { description: data.message, status: 'success' })
      } else if (action === 'delete') {
        toast.success('Server deleted successfully', {
          description: data.message || 'The server has been deleted'
        })
        appendActivityLog('delete', 'Server deleted', { description: data.message, status: 'success' })
      }

      if (action === 'delete') {
        router.push('/dashboard')
      } else {
        await fetchServerDetails()
        setStopDialog(false)
      }
    } catch (error) {
      console.error(`Error ${action}ing server:`, error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Show error dialog for critical errors
      setErrorDialog({
        open: true,
        title: `Failed to ${action} server`,
        message: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      })

      appendActivityLog(
        action === 'start' ? 'start' : action === 'stop' ? 'stop' : 'delete',
        `Failed to ${action} server`,
        { description: errorMessage, status: 'error' },
      )
      
      if (action === 'stop') {
        setStopDialog(false)
      }
    } finally {
      if (action === 'start') setStartLoading(false)
      if (action === 'stop') setStopLoading(false)
      if (action === 'delete') setDeleteLoading(false)
    }
  }

  const handleClone = async () => {
    setCloneLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/servers/${id}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: cloneName || undefined }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || data.message || 'Failed to clone server'
        setErrorDialog({
          open: true,
          title: 'Failed to clone server',
          message: errorMessage,
          details: data.error || data.message,
        })
        appendActivityLog('clone', 'Failed to clone server', { description: errorMessage, status: 'error' })
        return
      }

      toast.success('Server cloned successfully', {
        description: 'Your cloned server is being prepared.',
      })

      appendActivityLog('clone', 'Server cloned', { status: 'success' })

      setCloneDialog(false)
      setCloneName('')

      if (data.redirectTo) {
        router.push(data.redirectTo)
      } else if (data.id) {
        router.push(`/servers/${data.id}`)
      }
    } catch (error) {
      console.error('Error cloning server:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setErrorDialog({
        open: true,
        title: 'Failed to clone server',
        message: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      })
    } finally {
      setCloneLoading(false)
    }
  }

  const handleCreateSnapshot = async () => {
    if (!snapshotName) return

    setSnapshotLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/servers/${id}/snapshots/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: snapshotName }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || data.message || 'Failed to create snapshot'
        setErrorDialog({
          open: true,
          title: 'Failed to create snapshot',
          message: errorMessage,
          details: data.error || data.message,
        })
        setSnapshotLogs(prev => [
          {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            action: 'create',
            name: snapshotName,
            success: false,
            message: errorMessage,
          },
          ...prev,
        ])
        appendActivityLog('snapshot_create', 'Failed to create snapshot', { description: errorMessage, status: 'error' })
        return
      }

      toast.success('Snapshot created successfully', {
        description: data.name || snapshotName,
      })

      setSnapshotLogs(prev => [
        {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          action: 'create',
          name: data.name || snapshotName,
          success: true,
        },
        ...prev,
      ])

      appendActivityLog('snapshot_create', 'Snapshot created', { description: data.name || snapshotName, status: 'success' })

      setSnapshotName('')
    } catch (error) {
      console.error('Error creating snapshot:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setErrorDialog({
        open: true,
        title: 'Failed to create snapshot',
        message: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      })
    } finally {
      setSnapshotLoading(false)
    }
  }

  const handleRestoreSnapshot = async () => {
    if (!snapshotRestoreName) return

    setSnapshotLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/servers/${id}/snapshots/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: snapshotRestoreName }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || data.message || 'Failed to restore snapshot'
        setErrorDialog({
          open: true,
          title: 'Failed to restore snapshot',
          message: errorMessage,
          details: data.error || data.message,
        })
        setSnapshotLogs(prev => [
          {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            action: 'restore',
            name: snapshotRestoreName,
            success: false,
            message: errorMessage,
          },
          ...prev,
        ])
        return
      }

      toast.success('Snapshot restored successfully', {
        description: data.name || snapshotRestoreName,
      })

      setSnapshotLogs(prev => [
        {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          action: 'restore',
          name: data.name || snapshotRestoreName,
          success: true,
        },
        ...prev,
      ])

      await fetchServerDetails()
    } catch (error) {
      console.error('Error restoring snapshot:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setErrorDialog({
        open: true,
        title: 'Failed to restore snapshot',
        message: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      })
    } finally {
      setSnapshotLoading(false)
    }
  }

  const handleInstallService = async () => {
    if (!newService) return

    setInstallLoading(true)
    try {
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/servers/${id}/services/install`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ service: newService }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || data.message || 'Failed to install service'
        setErrorDialog({
          open: true,
          title: 'Failed to install service',
          message: errorMessage,
          details: data.error || data.message
        })
        appendActivityLog('install_service', 'Failed to install service', { description: errorMessage, status: 'error' })
        return
      }

      toast.success('Service installed successfully', {
        description: data.message || `${newService} has been installed`
      })

      appendActivityLog('install_service', 'Service installed', { description: newService, status: 'success' })

      setInstallServiceDialog(false)
      setNewService('')
      await fetchServerDetails()
    } catch (error) {
      console.error('Error installing service:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setErrorDialog({
        open: true,
        title: 'Failed to install service',
        message: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      })
    } finally {
      setInstallLoading(false)
    }
  }

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) return

    setAddUserLoading(true)
    try {
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/servers/${id}/users/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(newUser),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || data.message || 'Failed to add user'
        setErrorDialog({
          open: true,
          title: 'Failed to add user',
          message: errorMessage,
          details: data.error || data.message
        })
        appendActivityLog('add_user', 'Failed to add user', { description: errorMessage, status: 'error' })
        return
      }

      toast.success('User created successfully', {
        description: data.message || `User ${newUser.username} has been created`
      })

      appendActivityLog('add_user', 'User added', { description: newUser.username, status: 'success' })

      setAddUserDialog(false)
      setNewUser({ username: '', password: '', sudo: false })
      await fetchServerDetails()
    } catch (error) {
      console.error('Error adding user:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setErrorDialog({
        open: true,
        title: 'Failed to add user',
        message: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      })
    } finally {
      setAddUserLoading(false)
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
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{instance.name}</h1>
          <Badge
            variant={instance.status === 'running' ? 'success' : 'destructive'}
            className="mt-2"
          >
            {instance.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          {instance.status === 'stopped' ? (
            <Button
              onClick={() => handleAction('start')}
              disabled={startLoading}
            >
              {startLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  <span>Starting...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  <span>Start</span>
                </span>
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setStopDialog(true)}
              disabled={stopLoading}
            >
              {stopLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  <span>Stopping...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Square className="h-4 w-4" />
                  <span>Stop</span>
                </span>
              )}
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={() => setDeleteDialog(true)}
            disabled={deleteLoading}
          >
            {deleteLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                <span>Deleting...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </span>
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link href={`/servers/${id}/progress`}>
          <Button variant="outline" size="sm">
            View Logs
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCloneDialog(true)}
        >
          Clone Server
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSnapshotsDialog(true)}
        >
          Snapshots
        </Button>
      </div>

      {/* Script Status Alert */}
      {instance.script_status === 'failed' && (
        <Card className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  Script Execution Failed
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                  The VM creation script failed to execute. The server record has been created in the database.
                </p>
                {instance.script_error && (
                  <div className="mb-3 p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded text-sm">
                    <strong>Error:</strong> {instance.script_error}
                  </div>
                )}
                <div className="flex gap-2">
                  <Link href={`/servers/${id}/progress`}>
                    <Button size="sm" variant="outline">
                      View Progress
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {instance.script_status === 'running' && (
        <Card className="mb-6 border-blue-500 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  Script Execution In Progress
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  The VM creation script is currently running. This page will update automatically.
                </p>
              </div>
              <Link href={`/servers/${id}/progress`}>
                <Button size="sm" variant="outline">
                  View Progress
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Server Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">OS:</span>
              <span className="font-medium">{instance.os}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">CPU:</span>
              <span className="font-medium">{instance.cpu} cores</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">RAM:</span>
              <span className="font-medium">{instance.ram} GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Storage:</span>
              <span className="font-medium">{instance.storage} GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IP Address:</span>
              <span className="font-medium">{instance.ip_address || 'Not assigned'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span className="font-medium">{format(new Date(instance.created_at), 'MMM dd, yyyy HH:mm')}</span>
            </div>
            {instance.script_status === 'failed' && instance.script_error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                <p className="text-sm text-red-700 dark:text-red-400">
                  <strong>Script Error:</strong> {instance.script_error}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {instance.status !== 'running' ? (
              <p className="text-sm text-muted-foreground">
                Metrics are available when the server is running.
              </p>
            ) : metricsError ? (
              <p className="text-sm text-red-600 dark:text-red-400">{metricsError}</p>
            ) : !metrics || metricsLoading ? (
              <p className="text-sm text-muted-foreground">Loading metrics...</p>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">CPU Usage</span>
                  <span className="font-semibold">{metrics.cpu.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">RAM Usage</span>
                  <span className="font-semibold">
                    {metrics.ram_used} MB
                    {metrics.ram_total > 0 && ` / ${metrics.ram_total} MB`}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Services</CardTitle>
              <Button
                size="sm"
                onClick={() => setInstallServiceDialog(true)}
                disabled={instance.status === 'stopped'}
              >
                <Plus className="mr-2 h-4 w-4" />
                Install
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No services installed</p>
            ) : (
              <div className="space-y-2">
                {services.map((service) => (
                  <div key={service.id} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    <span className="text-sm font-medium">{service.service_name}</span>
                    <Badge variant="secondary">{service.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Users</CardTitle>
            <Button
              size="sm"
              onClick={() => setAddUserDialog(true)}
              disabled={instance.status === 'stopped'}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No users created</p>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div key={user.id} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-800 rounded">
                  <div>
                    <span className="text-sm font-medium">{user.username}</span>
                    {user.sudo && (
                      <Badge variant="secondary" className="ml-2">sudo</Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {format(new Date(user.created_at), 'MMM dd, yyyy')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={installServiceDialog} onOpenChange={setInstallServiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="service">Service Name</Label>
              <Select
                id="service"
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
              >
                <option value="">Select a service</option>
                <option value="Nginx">Nginx</option>
                <option value="MySQL">MySQL</option>
                <option value="Docker">Docker</option>
                <option value="Apache">Apache</option>
                <option value="PostgreSQL">PostgreSQL</option>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInstallServiceDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInstallService} disabled={!newService || installLoading}>
              {installLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  <span>Installing...</span>
                </span>
              ) : (
                'Install'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cloneDialog} onOpenChange={setCloneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Server</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="clone-name">Clone Name (optional)</Label>
              <Input
                id="clone-name"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder={`${instance.name}-copy-1`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleClone} disabled={cloneLoading}>
              {cloneLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  <span>Cloning...</span>
                </span>
              ) : (
                'Clone Server'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={snapshotsDialog} onOpenChange={setSnapshotsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Snapshots</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="snapshot-name">Create Snapshot</Label>
              <Input
                id="snapshot-name"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                placeholder="snapshot-name"
              />
              <Button
                onClick={handleCreateSnapshot}
                disabled={!snapshotName || snapshotLoading}
              >
                {snapshotLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    <span>Creating...</span>
                  </span>
                ) : (
                  'Create Snapshot'
                )}
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="snapshot-restore-name">Restore Snapshot</Label>
              <Input
                id="snapshot-restore-name"
                value={snapshotRestoreName}
                onChange={(e) => setSnapshotRestoreName(e.target.value)}
                placeholder="snapshot-name"
              />
              <Button
                onClick={handleRestoreSnapshot}
                disabled={!snapshotRestoreName || snapshotLoading}
              >
                {snapshotLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    <span>Restoring...</span>
                  </span>
                ) : (
                  'Restore Snapshot'
                )}
              </Button>
            </div>
            <div className="pt-4 border-t mt-4">
              <h3 className="text-sm font-semibold mb-2">Snapshot Activity</h3>
              {snapshotLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground">No snapshot activity yet.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {snapshotLogs.map(log => (
                    <div
                      key={log.id}
                      className="flex justify-between items-start text-xs p-2 rounded border bg-muted/40"
                    >
                      <div>
                        <div className="font-medium">
                          {log.action === 'create' ? 'Created' : 'Restored'} snapshot
                          <span className="ml-1 font-semibold">{log.name}</span>
                        </div>
                        <div className="text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                        {log.message && (
                          <div className="text-red-500 mt-1">{log.message}</div>
                        )}
                      </div>
                      <span
                        className={
                          'ml-2 px-2 py-0.5 rounded text-[10px] font-semibold ' +
                          (log.success
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300')
                        }
                      >
                        {log.success ? 'SUCCESS' : 'FAILED'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addUserDialog} onOpenChange={setAddUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={newUser.username}
                onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                placeholder="username"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                placeholder="password"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sudo"
                checked={newUser.sudo}
                onCheckedChange={(checked) => setNewUser(prev => ({ ...prev, sudo: checked as boolean }))}
              />
              <Label htmlFor="sudo" className="cursor-pointer">Grant sudo privileges</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={!newUser.username || !newUser.password || addUserLoading}
            >
              {addUserLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  <span>Adding...</span>
                </span>
              ) : (
                'Add User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Server</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{instance?.name}</strong>? This action cannot be undone and will permanently delete the server and all its data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleAction('delete')}
              disabled={deleteLoading}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stop Confirmation Dialog */}
      <Dialog open={stopDialog} onOpenChange={setStopDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop Server</DialogTitle>
            <DialogDescription>
              Are you sure you want to stop <strong>{instance?.name}</strong>? The server will be shut down and will need to be started again to use it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStopDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction('stop')}
              disabled={stopLoading}
            >
              {stopLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  <span>Stopping...</span>
                </span>
              ) : (
                'Stop Server'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <ErrorDialog
        open={errorDialog.open}
        onOpenChange={(open) => setErrorDialog(prev => ({ ...prev, open }))}
        title={errorDialog.title}
        message={errorDialog.message}
        details={errorDialog.details}
        actionLabel={errorDialog.actionLabel}
        onAction={errorDialog.onAction}
      />
        </div>
      </div>
    </ThemeProvider>
  )
}

