export interface DockerRunOptions {
  image: string;
  cmd: string[];
}

export async function runInDocker(_opts: DockerRunOptions): Promise<void> {
  // placeholder for future Docker isolation
  return;
}
