export interface Instance {
  id: string
  name: string
  os: string
  cpu: number
  ram: number
  storage: number
  ip_address: string | null
  status: 'running' | 'stopped'
  script_status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  script_error?: string | null
  created_at: string
}

export interface Service {
  id: string
  instance_id: string
  service_name: string
  status: string
  installed_at: string
}

export interface VMUser {
  id: string
  instance_id: string
  username: string
  sudo: boolean
  created_at: string
}

export interface CreateServerData {
  name: string
  os: 'Ubuntu' | 'Debian' | 'CentOS' | 'Windows'
  cpu: number
  ram: number
  storage: number
  services: string[]
  users: {
    username: string
    password: string
    sudo: boolean
  }[]
}

