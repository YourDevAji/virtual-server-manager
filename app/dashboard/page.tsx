'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Instance } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ErrorDialog } from '@/components/error-dialog'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import { EnvironmentStatus } from '@/components/environment-status'
import Link from 'next/link'
import { format } from 'date-fns'
import { Play, Square, Trash2, Plus, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function Dashboard() {
  const router = useRouter()
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; instance: Instance | null }>({ open: false, instance: null })
  const [stopDialog, setStopDialog] = useState<{ open: boolean; instance: Instance | null }>({ open: false, instance: null })
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; title: string; message: string; details?: string; actionLabel?: string; onAction?: () => void }>({ open: false, title: 'Error', message: '' })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push('/')
        return
      }
      setUser(user)
      setAuthLoading(false)
      fetchInstances()
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/')
    }
  }

  const fetchInstances = async () => {
    try {
      // Get current session (this includes the access token)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        return
      }

      // Use API route with token
      const response = await fetch('/api/servers', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to fetch servers:', errorData)
        throw new Error(errorData.error || 'Failed to fetch servers')
      }

      const data = await response.json()
      console.log('Fetched instances:', data)
      setInstances(data || [])
    } catch (error) {
      console.error('Error fetching instances:', error)
      // Set empty array on error to show "no servers" message
      setInstances([])
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: 'start' | 'stop' | 'delete', instanceId: string, instanceName: string) => {
    setActionLoading(instanceId)
    try {
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/servers/${instanceId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
      })

      const data = await response.json()

      if (!response.ok) {
        // Extract error details
        const errorMessage = data.error || data.message || 'Action failed'
        const errorDetails = data.error || data.message || undefined
        
        // If VM needs to be created, offer to navigate to progress page
        if (data.needsCreation && action === 'start') {
          const handleCreateVM = () => {
            setErrorDialog(prev => ({ ...prev, open: false }))
            router.push(`/servers/${instanceId}/progress`)
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
        
        if (action === 'delete') {
          setDeleteDialog({ open: false, instance: null })
        } else if (action === 'stop') {
          setStopDialog({ open: false, instance: null })
        }
        return
      }

      // Show success message
      if (action === 'start') {
        toast.success('Server started successfully', {
          description: data.message || 'The server is now running'
        })
      } else if (action === 'stop') {
        toast.success('Server stopped successfully', {
          description: data.message || 'The server has been stopped'
        })
      } else if (action === 'delete') {
        toast.success('Server deleted successfully', {
          description: data.message || 'The server has been deleted'
        })
      }

      if (action === 'delete') {
        setInstances(instances.filter(i => i.id !== instanceId))
        setDeleteDialog({ open: false, instance: null })
      } else {
        await fetchInstances()
        setStopDialog({ open: false, instance: null })
      }
    } catch (error) {
      console.error(`Error ${action}ing instance:`, error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Show error dialog for critical errors
      setErrorDialog({
        open: true,
        title: `Failed to ${action} server`,
        message: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      })
      
      if (action === 'delete') {
        setDeleteDialog({ open: false, instance: null })
      } else if (action === 'stop') {
        setStopDialog({ open: false, instance: null })
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (authLoading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">Loading...</div>
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <nav className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Virtual Server Manager
              </Link>
              <div className="flex gap-4 items-center">
                <ThemeToggle />
                {user && (
                  <span className="text-sm text-muted-foreground">{user.email}</span>
                )}
                <Button variant="ghost" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Virtual Servers</h1>
        <Link href="/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create New Server
          </Button>
        </Link>
      </div>

      {/* Environment Status */}
      <div className="mb-6">
        <EnvironmentStatus />
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading servers...</p>
          </CardContent>
        </Card>
      ) : instances.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No servers found</p>
            <Link href="/create">
              <Button>Create Your First Server</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-white dark:bg-gray-900">
                <th className="p-4 text-left font-semibold text-gray-900 dark:text-white">Name</th>
                <th className="p-4 text-left font-semibold text-gray-900 dark:text-white">OS</th>
                <th className="p-4 text-left font-semibold text-gray-900 dark:text-white">CPU</th>
                <th className="p-4 text-left font-semibold text-gray-900 dark:text-white">RAM (GB)</th>
                <th className="p-4 text-left font-semibold text-gray-900 dark:text-white">Storage (GB)</th>
                <th className="p-4 text-left font-semibold text-gray-900 dark:text-white">Status</th>
                <th className="p-4 text-left font-semibold text-gray-900 dark:text-white">Created</th>
                <th className="p-4 text-left font-semibold text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {instances.map((instance) => (
                <tr
                  key={instance.id}
                  className="border-b hover:bg-muted/50 transition-colors"
                >
                  <td className="p-4">
                    <Link
                      href={`/servers/${instance.id}`}
                      className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {instance.name}
                    </Link>
                  </td>
                  <td className="p-4 text-gray-700 dark:text-gray-300">{instance.os}</td>
                  <td className="p-4 text-gray-700 dark:text-gray-300">{instance.cpu}</td>
                  <td className="p-4 text-gray-700 dark:text-gray-300">{instance.ram}</td>
                  <td className="p-4 text-gray-700 dark:text-gray-300">{instance.storage}</td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant={instance.status === 'running' ? 'success' : 'destructive'}
                      >
                        {instance.status}
                      </Badge>
                      {instance.script_status && instance.script_status !== 'completed' && (
                        <Badge
                          variant={
                            instance.script_status === 'failed'
                              ? 'destructive'
                              : instance.script_status === 'running'
                              ? 'secondary'
                              : 'outline'
                          }
                          className="text-xs"
                        >
                          {instance.script_status}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    {format(new Date(instance.created_at), 'MMM dd, yyyy')}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      {instance.status === 'stopped' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction('start', instance.id, instance.name)}
                          disabled={actionLoading === instance.id}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStopDialog({ open: true, instance })}
                          disabled={actionLoading === instance.id}
                        >
                          <Square className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteDialog({ open: true, instance })}
                        disabled={actionLoading === instance.id}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, instance: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Server</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteDialog.instance?.name}</strong>? This action cannot be undone and will permanently delete the server and all its data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, instance: null })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteDialog.instance) {
                  handleAction('delete', deleteDialog.instance.id, deleteDialog.instance.name)
                }
              }}
              disabled={actionLoading === deleteDialog.instance?.id}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stop Confirmation Dialog */}
      <Dialog open={stopDialog.open} onOpenChange={(open) => setStopDialog({ open, instance: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop Server</DialogTitle>
            <DialogDescription>
              Are you sure you want to stop <strong>{stopDialog.instance?.name}</strong>? The server will be shut down and will need to be started again to use it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStopDialog({ open: false, instance: null })}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (stopDialog.instance) {
                  handleAction('stop', stopDialog.instance.id, stopDialog.instance.name)
                }
              }}
              disabled={actionLoading === stopDialog.instance?.id}
            >
              Stop Server
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

