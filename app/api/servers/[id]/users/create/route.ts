import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/supabase/api-client'
import { executeScript } from '@/lib/scripts/executor'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { username, password, sudo } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Verify authentication
    const { supabase, user } = await verifyAuth(request)

    // Get instance (verify ownership)
    const { data: instance, error: instanceError } = await supabase
      .from('instances')
      .select('name, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (instanceError || !instance) {
      return NextResponse.json(
        { error: 'Instance not found' },
        { status: 404 }
      )
    }

    // Execute manage_users.sh script
    const scriptResult = await executeScript('manage_users.sh', [
      instance.name,
      username,
      password,
      sudo ? 'true' : 'false',
    ])

    if (!scriptResult.success) {
      console.error('Script execution failed:', scriptResult.error)
      // Continue anyway - user record will be created
    }

    // Create user record in database
    const { data: userData, error: userError } = await supabase
      .from('vm_users')
      .insert({
        instance_id: id,
        username,
        sudo: sudo || false,
      })
      .select()
      .single()

    if (userError) throw userError

    return NextResponse.json({ success: true, data: userData })
  } catch (error) {
    console.error('Error adding user:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to add user' },
      { status: 500 }
    )
  }
}
