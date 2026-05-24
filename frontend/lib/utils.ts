import type { Deployment } from '@/types';

export function getFieldValue(deployment: Deployment, path: string): string {
  if (path.startsWith('attributes.')) {
    const key = path.slice('attributes.'.length);
    return deployment.attributes[key] ?? '';
  }
  switch (path) {
    case 'deployment_id': return deployment.deployment_id;
    case 'version': return deployment.version;
    case 'status': return deployment.status;
    case 'type': return deployment.type;
    case 'environment': return deployment.environment;
    case 'created_by': return deployment.created_by;
    case 'created_at': return deployment.created_at;
    case 'updated_at': return deployment.updated_at;
    default: return '';
  }
}
