'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import Link from 'next/link'
import { Server, Zap, Shield, Users, ArrowRight } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

export default function LandingPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const checkUser = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        router.push('/dashboard')
      }
    } catch (error: unknown) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    checkUser()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        router.push('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [checkUser, router])

  if (loading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">Loading...</div>
        </div>
      </ThemeProvider>
    )
  }

  // If user is logged in, show loading while redirecting
  if (user) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">Redirecting...</div>
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        {/* Navigation */}
        <nav className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Virtual Server Manager
              </div>
              <div className="flex gap-4 items-center">
                <ThemeToggle />
                <Link href="/auth/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/auth/login">
                  <Button>Get Started <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="container mx-auto px-4 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Manage Your Virtual Servers
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                From Your Browser
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Create, manage, and control VirtualBox virtual machines through an intuitive web interface.
              Perfect for learning Linux server management.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/auth/login">
                <Button size="lg" className="text-lg px-8 h-12">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button size="lg" variant="outline" className="text-lg px-8 h-12">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Server className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Create VMs</CardTitle>
                <CardDescription>
                  Create virtual machines with custom configurations for CPU, RAM, and storage
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-yellow-500" />
                </div>
                <CardTitle>Control Servers</CardTitle>
                <CardDescription>
                  Start, stop, and delete virtual servers with a single click
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-green-500" />
                </div>
                <CardTitle>Install Services</CardTitle>
                <CardDescription>
                  Install Nginx, MySQL, Docker, and other services on your servers
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-purple-500" />
                </div>
                <CardTitle>Manage Users</CardTitle>
                <CardDescription>
                  Create and manage users on your virtual servers with sudo privileges
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* How It Works */}
          <div className="mt-20">
            <h2 className="text-3xl font-bold text-center mb-12">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Sign Up</h3>
                <p className="text-muted-foreground">
                  Create a free account to get started
                </p>
              </div>
              <div className="text-center">
                <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Create Servers</h3>
                <p className="text-muted-foreground">
                  Fill out a form to create your virtual machine
                </p>
              </div>
              <div className="text-center">
                <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Manage & Control</h3>
                <p className="text-muted-foreground">
                  Start, stop, and manage your servers from the dashboard
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-20 text-center">
            <Card className="bg-gradient-to-r from-primary to-primary/80 border-0">
              <CardContent className="py-12">
                <h2 className="text-3xl font-bold text-primary-foreground mb-4">
                  Ready to Get Started?
                </h2>
                <p className="text-primary-foreground/90 mb-6 text-lg">
                  Start managing your virtual servers in minutes
                </p>
                <Link href="/auth/login">
                  <Button size="lg" variant="secondary" className="text-lg px-8 h-12">
                    Create Free Account
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t bg-muted/50 mt-20">
          <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
            <p>Virtual Server Manager - COSC 8312 Introduction to Linux</p>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  )
}
