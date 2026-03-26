import { execFileSync } from 'node:child_process'

export function hasDockerRuntime(): boolean {
  try {
    execFileSync('docker', ['info'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}
