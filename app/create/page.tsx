'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ErrorDialog } from '@/components/error-dialog'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CreateServerData } from '@/lib/types'
import { toast } from 'sonner'

export default function CreateServerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const [formData, setFormData] = useState<CreateServerData>({
    name: '',
    os: 'Ubuntu',
    cpu: 2,
    ram: 4,
    storage: 20,
    services: [],
    users: [],
  })
  const [newUser, setNewUser] = useState({ username: '', password: '', sudo: false })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/servers/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || data.message || 'Failed to create server'
        setErrorDialog({
          open: true,
          title: 'Failed to create server',
          message: errorMessage,
          details: data.error || data.message
        })
        return
      }

      toast.success('Server creation started', {
        description: 'Your server is being created. You will be redirected to the progress page.'
      })

      // If script failed, redirect to progress page, otherwise to dashboard
      if (data.redirectTo) {
        router.push(data.redirectTo)
      } else {
        router.push(`/dashboard`)
      }
    } catch (error) {
      console.error('Error creating server:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setErrorDialog({
        open: true,
        title: 'Failed to create server',
        message: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleService = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service],
    }))
  }

  const addUser = () => {
    if (newUser.username && newUser.password) {
      setFormData(prev => ({
        ...prev,
        users: [...prev.users, { ...newUser }],
      }))
      setNewUser({ username: '', password: '', sudo: false })
    }
  }

  const removeUser = (index: number) => {
    setFormData(prev => ({
      ...prev,
      users: prev.users.filter((_, i) => i !== index),
    }))
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
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mb-6">Create New Server</h1>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Server Configuration</CardTitle>
            <CardDescription>Configure your virtual server settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Server Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                placeholder="my-server"
              />
            </div>

            <div>
              <Label htmlFor="os">Operating System</Label>
              <Select
                id="os"
                value={formData.os}
                onChange={(e) => setFormData(prev => ({ ...prev, os: e.target.value as 'Ubuntu' | 'Debian' | 'CentOS' | 'Windows' }))}
                required
              >
                <option value="Ubuntu">Ubuntu</option>
                <option value="Debian">Debian</option>
                <option value="CentOS">CentOS</option>
                <option value="Windows">Windows</option>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="cpu">CPU Cores</Label>
                <Input
                  id="cpu"
                  type="number"
                  min="1"
                  max="16"
                  value={formData.cpu}
                  onChange={(e) => setFormData(prev => ({ ...prev, cpu: parseInt(e.target.value) || 1 }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="ram">RAM (GB)</Label>
                <Input
                  id="ram"
                  type="number"
                  min="1"
                  max="64"
                  value={formData.ram}
                  onChange={(e) => setFormData(prev => ({ ...prev, ram: parseInt(e.target.value) || 1 }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="storage">Storage (GB)</Label>
                <Input
                  id="storage"
                  type="number"
                  min="10"
                  max="1000"
                  value={formData.storage}
                  onChange={(e) => setFormData(prev => ({ ...prev, storage: parseInt(e.target.value) || 10 }))}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Services</CardTitle>
            <CardDescription>Select services to install</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {['Nginx', 'Apache', 'MySQL', 'PostgreSQL', 'Docker'].map((service) => (
                <div key={service} className="flex items-center space-x-2">
                  <Checkbox
                    id={service}
                    checked={formData.services.includes(service)}
                    onCheckedChange={() => toggleService(service)}
                  />
                  <Label htmlFor={service} className="cursor-pointer">
                    {service}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Create users for this server</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <div className="flex items-end">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sudo"
                    checked={newUser.sudo}
                    onCheckedChange={(checked) => setNewUser(prev => ({ ...prev, sudo: checked as boolean }))}
                  />
                  <Label htmlFor="sudo" className="cursor-pointer">Sudo</Label>
                </div>
              </div>
              <div className="flex items-end">
                <Button type="button" onClick={addUser} variant="outline">
                  Add User
                </Button>
              </div>
            </div>

            {formData.users.length > 0 && (
              <div className="mt-4 space-y-2">
                <Label>Added Users:</Label>
                {formData.users.map((user, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    <span className="text-sm">
                      {user.username} {user.sudo && '(sudo)'}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeUser(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                <span>Creating...</span>
              </span>
            ) : (
              'Create Server'
            )}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>

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

