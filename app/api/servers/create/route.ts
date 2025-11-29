import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/supabase/api-client'
import { executeScript } from '@/lib/scripts/executor'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, os, cpu, ram, storage, services, users } = body

    if (!name || !os || !cpu || !ram || !storage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify authentication
    const { supabase, user } = await verifyAuth(request)

    // Create instance record in database first (always succeeds)
    const { data: instance, error: instanceError } = await supabase
      .from('instances')
      .insert({
        user_id: user.id,
        name,
        os,
        cpu,
        ram,
        storage,
        status: 'stopped',
        script_status: 'running',
      })
      .select()
      .single()

    if (instanceError) {
      if (instanceError.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'A server with this name already exists' },
          { status: 400 }
        )
      }
      throw instanceError
    }

    // Execute create_vm.sh script (non-blocking)
    let scriptResult
    try {
      scriptResult = await executeScript('create_vm.sh', [
        name,
        os,
        cpu.toString(),
        ram.toString(),
        storage.toString(),
      ])
    } catch (scriptError: any) {
      scriptResult = {
        success: false,
        output: '',
        error: scriptError.message || 'Script execution failed',
      }
    }

    // Update instance with script execution result
    const scriptStatus = scriptResult.success ? 'completed' : 'failed'
    await supabase
      .from('instances')
      .update({
        script_status: scriptStatus,
        script_error: scriptResult.error || null,
      })
      .eq('id', instance.id)

    if (!scriptResult.success) {
      console.error('Script execution failed:', scriptResult.error)
      // Continue - VM record is created, user can retry script execution later
    }

    // Insert services
    if (services && services.length > 0) {
      await supabase.from('services').insert(
        services.map((service: string) => ({
          instance_id: instance.id,
          service_name: service,
          status: 'installed',
        }))
      )
    }

    // Insert users
    if (users && users.length > 0) {
      await supabase.from('vm_users').insert(
        users.map((user: { username: string; sudo: boolean }) => ({
          instance_id: instance.id,
          username: user.username,
          sudo: user.sudo || false,
        }))
      )
    }

    // Return instance with updated script status
    const { data: updatedInstance } = await supabase
      .from('instances')
      .select('*')
      .eq('id', instance.id)
      .single()

    const response: any = { 
      id: instance.id, 
      ...updatedInstance,
    }

    // If script failed, include redirectTo
    if (!scriptResult.success) {
      response.redirectTo = `/servers/${instance.id}/progress`
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error creating server:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create server' },
      { status: 500 }
    )
  }
}

