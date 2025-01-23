import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ServiceStatus } from '@/types/service';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Get list of running containers
    const { stdout } = await execAsync('docker ps --format "{{.Names}}"');
    const runningContainers = stdout.split('\n').filter(Boolean);

    // Get list of all containers (including stopped ones)
    const { stdout: allContainersStdout } = await execAsync('docker ps -a --format "{{.Names}},{{.Status}}"');
    const containerStatuses = allContainersStdout
      .split('\n')
      .filter(Boolean)
      .reduce<Record<string, ServiceStatus>>((acc, line) => {
        const [name, status] = line.split(',');
        let serviceStatus: ServiceStatus = 'stopped';
        
        if (status.includes('Up')) {
          serviceStatus = 'running';
        } else if (status.includes('Exited') || status.includes('Error')) {
          serviceStatus = 'error';
        }
        
        acc[name] = serviceStatus;
        return acc;
      }, {});

    return NextResponse.json(containerStatuses);
  } catch (error) {
    console.error('Error fetching service status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service status' },
      { status: 500 }
    );
  }
} 