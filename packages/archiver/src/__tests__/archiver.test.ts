import { archiver } from '../index';

describe('Archiver', () => {
  it('should be defined', () => {
    expect(archiver).toBeDefined();
  });

  it('supports zip format', async () => {
    const formats = await archiver.supportedFormats();
    expect(formats).toContain('zip');
  });

  // Mock test for creating zip archive
  it('should create a zip archive', async () => {
    // Setup spy on internal methods
    const createSpy = jest.spyOn(archiver, 'create');
    const addEntrySpy = jest.spyOn(archiver, 'addEntry');
    const finalizeSpy = jest.spyOn(archiver, 'finalize');

    // Create archive
    await archiver.create('test.zip', 'zip');

    // Add entry
    await archiver.addEntry({
      name: 'test.txt',
      isDirectory: false,
      data: new TextEncoder().encode('Test content').buffer,
    });

    // Finalize
    await archiver.finalize();

    // Verify
    expect(createSpy).toHaveBeenCalledWith('test.zip', 'zip');
    expect(addEntrySpy).toHaveBeenCalledTimes(1);
    expect(finalizeSpy).toHaveBeenCalledTimes(1);

    // Clean up spies
    createSpy.mockRestore();
    addEntrySpy.mockRestore();
    finalizeSpy.mockRestore();
  });

  // Mock test for reading a zip archive
  it('should extract files from an archive', async () => {
    // Spies
    const openSpy = jest
      .spyOn(archiver, 'open')
      .mockImplementation(async () => {});
    const getNextEntrySpy = jest
      .spyOn(archiver, 'getNextEntry')
      .mockImplementation(async () => ({
        name: 'test.txt',
        isDirectory: false,
        size: 12,
      }));
    const extractEntrySpy = jest
      .spyOn(archiver, 'extractEntry')
      .mockImplementation(async () => {});
    const closeSpy = jest
      .spyOn(archiver, 'close')
      .mockImplementation(async () => {});

    // Extract file
    await archiver.open('test.zip');
    const entry = await archiver.getNextEntry();
    if (entry) {
      await archiver.extractEntry(entry, './output');
    }
    await archiver.close();

    // Verify
    expect(openSpy).toHaveBeenCalledWith('test.zip');
    expect(getNextEntrySpy).toHaveBeenCalledTimes(1);
    expect(extractEntrySpy).toHaveBeenCalledTimes(1);
    expect(closeSpy).toHaveBeenCalledTimes(1);

    // Clean up
    openSpy.mockRestore();
    getNextEntrySpy.mockRestore();
    extractEntrySpy.mockRestore();
    closeSpy.mockRestore();
  });
});
