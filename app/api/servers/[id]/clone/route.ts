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

    const body = await request.json().catch(() => ({})) as { name?: string }

    const { supabase, user } = await verifyAuth(request)

    const { data: instance, error: instanceError } = await supabase
      .from('instances')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (instanceError || !instance) {
      return NextResponse.json(
        { error: 'Instance not found' },
        { status: 404 }
      )
    }

    const baseName = body.name && body.name.trim().length > 0
      ? body.name.trim()
      : `${instance.name}-copy-1`

    // Ensure name is unique for this user
    const { data: existing } = await supabase
      .from('instances')
      .select('id')
      .eq('name', baseName)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'A server with this clone name already exists' },
        { status: 400 }
      )
    }

    const { data: clonedInstance, error: cloneInsertError } = await supabase
      .from('instances')
      .insert({
        user_id: user.id,
        name: baseName,
        os: instance.os,
        cpu: instance.cpu,
        ram: instance.ram,
        storage: instance.storage,
        status: 'stopped',
        script_status: 'running',
      })
      .select('*')
      .single()

    if (cloneInsertError || !clonedInstance) {
      throw cloneInsertError || new Error('Failed to create clone record')
    }

    const { data: services } = await supabase
      .from('services')
      .select('service_name')
      .eq('instance_id', instance.id)

    const { data: usersData } = await supabase
      .from('vm_users')
      .select('username, sudo')
      .eq('instance_id', instance.id)

    const scriptResult = await executeScript('clone_vm.sh', [instance.name, baseName])

    const scriptStatus = scriptResult.success ? 'completed' : 'failed'

    await supabase
      .from('instances')
      .update({
        script_status: scriptStatus,
        script_error: scriptResult.error || null,
      })
      .eq('id', clonedInstance.id)

    if (services && services.length > 0) {
      await supabase.from('services').insert(
        services.map((s) => ({
          instance_id: clonedInstance.id,
          service_name: s.service_name,
          status: 'installed',
        }))
      )
    }

    if (usersData && usersData.length > 0) {
      await supabase.from('vm_users').insert(
        usersData.map((u) => ({
          instance_id: clonedInstance.id,
          username: u.username,
          sudo: u.sudo || false,
        }))
      )
    }

    const response: { id: string; redirectTo?: string } = { id: clonedInstance.id }

    if (!scriptResult.success) {
      response.redirectTo = `/servers/${clonedInstance.id}/progress`
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error cloning server:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to clone server' },
      { status: 500 }
    )
  }
}
