'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    const logout = async () => {
      await supabase.auth.signOut()
      router.push('/auth/login')
      router.refresh()
    }
    logout()
  }, [router])

  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <p>Signing out...</p>
    </div>
  )
}

