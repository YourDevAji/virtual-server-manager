import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

/**
 * Create an authenticated Supabase client from API route request
 */
export function createApiClient(request: NextRequest) {
  // Get authorization header
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized - No token provided')
  }

  const token = authHeader.replace('Bearer ', '')

  // Create Supabase client with the token
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  )

  return { supabase, token }
}

/**
 * Verify user authentication and return user
 */
export async function verifyAuth(request: NextRequest) {
  const { supabase, token } = createApiClient(request)
  
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  
  if (authError || !user) {
    throw new Error('Unauthorized - Invalid token')
  }

  return { supabase, user }
}

