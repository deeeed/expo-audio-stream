import { Platform } from 'react-native';
import { SherpaOnnxAPI } from '../SherpaOnnxAPI';
import type { SystemInfo } from '../types/api';

// Mock React Native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
    select: jest.fn((obj) => obj.web || obj.default),
  },
}));

// Mock the native module
jest.mock('../NativeSherpaOnnxSpec', () => null);

describe('SystemInfo', () => {
  describe('Web Platform', () => {
    beforeEach(() => {
      // Reset platform to web
      (Platform as any).OS = 'web';
    });

    it('should return system info for web platform', async () => {
      const systemInfo = await SherpaOnnxAPI.getSystemInfo();

      // Verify structure
      expect(systemInfo).toHaveProperty('architecture');
      expect(systemInfo).toHaveProperty('memory');
      expect(systemInfo).toHaveProperty('cpu');
      expect(systemInfo).toHaveProperty('device');
      expect(systemInfo).toHaveProperty('gpu');
      expect(systemInfo).toHaveProperty('libraryLoaded');
      expect(systemInfo).toHaveProperty('thread');

      // Verify architecture for web
      expect(systemInfo.architecture.type).toBe('old');
      expect(systemInfo.architecture.description).toBe('Web (WASM)');
      expect(systemInfo.architecture.jsiAvailable).toBe(false);
      expect(systemInfo.architecture.turboModulesEnabled).toBe(false);
      expect(systemInfo.architecture.moduleType).toBe('WASM');

      // Verify device info for web
      expect(systemInfo.device.device).toBe('browser');
      expect(systemInfo.device.webPlatform).toBeDefined();

      // Verify GPU info for web
      expect(systemInfo.gpu.webGLVersion).toBeDefined();
    });

    it('should return architecture info for web platform', async () => {
      const archInfo = await SherpaOnnxAPI.getArchitectureInfo();

      expect(archInfo.architecture).toBe('web');
      expect(archInfo.jsiAvailable).toBe(false);
      expect(archInfo.turboModulesEnabled).toBe(false);
      expect(archInfo.moduleType).toBe('WASM');
    });
  });

  describe('SystemInfo Type Structure', () => {
    it('should have optional platform-specific fields', () => {
      // This is a compile-time test to ensure our types are correct
      const mockSystemInfo: SystemInfo = {
        architecture: {
          type: 'new',
          description: 'Test',
          jsiAvailable: true,
          turboModulesEnabled: true,
          moduleType: 'TurboModule',
        },
        memory: {
          maxMemoryMB: 100,
          totalMemoryMB: 100,
          freeMemoryMB: 50,
          usedMemoryMB: 50,
        },
        cpu: {
          availableProcessors: 4,
          supportedAbis: ['arm64'],
        },
        device: {
          brand: 'Test',
          model: 'Test',
          device: 'Test',
          manufacturer: 'Test',
          // These should all be optional
          sdkVersion: undefined,
          androidVersion: undefined,
          iosVersion: undefined,
          webPlatform: undefined,
        },
        gpu: {
          // These should all be optional
          supportsVulkan: undefined,
          openGLESVersion: undefined,
          metalVersion: undefined,
          webGLVersion: undefined,
        },
        libraryLoaded: true,
        thread: {
          currentThread: 'main',
          threadId: 1,
        },
      };

      // This test passes if it compiles
      expect(mockSystemInfo).toBeDefined();
    });
  });
});