import type { PackageContext } from '@siteed/publisher';
import { exec } from '@siteed/publisher';

export async function preRelease(context: PackageContext): Promise<void> {
  // Run tests
  await exec('{{packageManager}} test', { cwd: context.path });
  
  // Run type checking
  await exec('{{packageManager}} typecheck', { cwd: context.path });
  
  // Build the package
  await exec('{{packageManager}} build', { cwd: context.path });
}

export async function postRelease(context: PackageContext): Promise<void> {
  // Clean up build artifacts
  await exec('{{packageManager}} clean', { cwd: context.path });
  
  // Run any post-release notifications or integrations
  console.log(`Successfully released ${context.name}@${context.newVersion}`);
}
